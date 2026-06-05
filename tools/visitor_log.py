#!/usr/bin/env python3
"""
visitor_log.py — Besucher-Logger für das Terminal-Portfolio.

Liest die bestehenden nginx/Apache Access-Logs, filtert echte Seitenaufrufe
heraus (keine Assets/Bots), ergänzt pro Besucher den groben Standort via GeoIP
und schreibt das Ergebnis als NDJSON-Datei (eine JSON-Zeile pro Besuch).

- Keine externen Python-Pakete nötig (nur Standardbibliothek).
- Läuft inkrementell: merkt sich, bis wohin das Log schon verarbeitet wurde,
  und überspringt beim nächsten Lauf bereits Gesehenes. Ideal für Cron.
- DSGVO: speichert standardmäßig KEINE rohe IP, sondern nur einen gesalzenen
  Hash (für "neu vs. wiederkehrend") plus Stadt/Land. Mit --keep-ip kann die
  rohe IP gespeichert werden.

Beispiele:
    python3 visitor_log.py                  # neue Einträge verarbeiten
    python3 visitor_log.py --show 20        # die letzten 20 Besucher anzeigen
    python3 visitor_log.py --once --show    # einmal verarbeiten, dann anzeigen
"""

from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone

# ─────────────────────────── Konfiguration ───────────────────────────
# Diese Pfade ggf. an deinen Pi anpassen (siehe tools/README.md).

ACCESS_LOG = os.environ.get("PORTFOLIO_ACCESS_LOG", "/var/log/nginx/access.log")
OUTPUT_LOG = os.environ.get("PORTFOLIO_VISITOR_LOG", os.path.expanduser("~/visitors.ndjson"))
STATE_FILE = os.environ.get("PORTFOLIO_LOG_STATE", os.path.expanduser("~/.portfolio_logstate.json"))
GEO_CACHE  = os.environ.get("PORTFOLIO_GEO_CACHE", os.path.expanduser("~/.portfolio_geocache.json"))

# Salt für den IP-Hash. EINMAL setzen und nicht mehr ändern, sonst zählen
# wiederkehrende Besucher als neu. Per Env-Var überschreibbar.
HASH_SALT = os.environ.get("PORTFOLIO_HASH_SALT", "change-me-portfolio-salt")

# Welche Pfade gelten als "Seitenaufruf"? Assets (css/js/bilder) ignorieren wir.
PAGE_PATHS = {"/", "/index.html"}

# Offensichtliche Bots/Crawler anhand des User-Agents überspringen.
BOT_RE = re.compile(r"bot|crawl|spider|slurp|bing|curl|wget|monitor|uptime|headless|python-requests",
                    re.IGNORECASE)

# GeoIP-Dienst: ip-api.com, kostenlos, kein API-Key, Batch bis 100 IPs,
# Limit 15 Batch-Requests/Minute. Für ein Portfolio mehr als genug.
GEO_BATCH_URL = "http://ip-api.com/batch"
GEO_FIELDS = "status,country,countryCode,regionName,city,isp,query"

# nginx "combined" Logformat (Standard). Auch Apache "combined" passt hierauf.
LOG_RE = re.compile(
    r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] '
    r'"(?P<method>\S+) (?P<path>\S+) [^"]*" '
    r'(?P<status>\d{3}) \S+ '
    r'"(?P<referrer>[^"]*)" "(?P<ua>[^"]*)"'
)


# ─────────────────────────── Hilfsfunktionen ───────────────────────────

def load_json(path: str, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_json(path: str, data) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f)
    os.replace(tmp, path)


def hash_ip(ip: str) -> str:
    return hashlib.sha256((HASH_SALT + ip).encode("utf-8")).hexdigest()[:16]


def is_public_ip(ip: str) -> bool:
    """Lokale/private Adressen (eigene Tests, LAN) nicht geolokalisieren."""
    try:
        addr = ipaddress.ip_address(ip)
        return addr.is_global
    except ValueError:
        return False


def parse_apache_time(s: str) -> str:
    """'10/Oct/2025:13:55:36 +0200' -> ISO-8601 UTC."""
    try:
        dt = datetime.strptime(s, "%d/%b/%Y:%H:%M:%S %z")
        return dt.astimezone(timezone.utc).isoformat()
    except ValueError:
        return s


# ─────────────────────────── GeoIP ───────────────────────────

def geolocate(ips: list[str], cache: dict) -> dict:
    """Schlägt unbekannte IPs in Batches bei ip-api.com nach. Cached Ergebnisse."""
    unknown = sorted({ip for ip in ips if ip not in cache and is_public_ip(ip)})
    for i in range(0, len(unknown), 100):
        batch = unknown[i:i + 100]
        payload = json.dumps([{"query": ip, "fields": GEO_FIELDS} for ip in batch]).encode()
        req = urllib.request.Request(GEO_BATCH_URL, data=payload,
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                results = json.load(resp)
        except Exception as e:  # Netzwerkfehler nicht den ganzen Lauf killen
            print(f"  [geo] Lookup fehlgeschlagen: {e}", file=sys.stderr)
            break
        for r in results:
            ip = r.get("query")
            if not ip:
                continue
            if r.get("status") == "success":
                cache[ip] = {
                    "city": r.get("city") or "",
                    "region": r.get("regionName") or "",
                    "country": r.get("country") or "",
                    "cc": r.get("countryCode") or "",
                    "isp": r.get("isp") or "",
                }
            else:
                cache[ip] = {"city": "", "region": "", "country": "", "cc": "", "isp": ""}
        if i + 100 < len(unknown):
            time.sleep(4)  # unter dem Rate-Limit bleiben (15/min)
    return cache


# ─────────────────────────── Log-Verarbeitung ───────────────────────────

def read_new_lines(state: dict) -> list[str]:
    """Liest nur die seit dem letzten Lauf hinzugekommenen Zeilen."""
    try:
        st = os.stat(ACCESS_LOG)
    except FileNotFoundError:
        print(f"Access-Log nicht gefunden: {ACCESS_LOG}", file=sys.stderr)
        return []

    inode, size = st.st_ino, st.st_size
    offset = state.get("offset", 0)
    # Logrotate erkennen: neuer Inode oder geschrumpfte Datei -> von vorn lesen.
    if state.get("inode") != inode or size < offset:
        offset = 0

    with open(ACCESS_LOG, "r", encoding="utf-8", errors="replace") as f:
        f.seek(offset)
        lines = f.readlines()
        new_offset = f.tell()

    state["inode"] = inode
    state["offset"] = new_offset
    return lines


def process(args) -> int:
    state = load_json(STATE_FILE, {})
    cache = load_json(GEO_CACHE, {})

    lines = read_new_lines(state)
    visits = []
    for line in lines:
        m = LOG_RE.search(line)
        if not m:
            continue
        if m.group("method") != "GET":
            continue
        if m.group("status") not in ("200", "304"):
            continue
        if m.group("path").split("?")[0] not in PAGE_PATHS:
            continue
        ua = m.group("ua")
        if not args.include_bots and BOT_RE.search(ua):
            continue
        visits.append({
            "ip": m.group("ip"),
            "ts": parse_apache_time(m.group("time")),
            "path": m.group("path"),
            "referrer": m.group("referrer") if m.group("referrer") != "-" else "",
            "ua": ua,
        })

    if visits:
        geolocate([v["ip"] for v in visits], cache)

    written = 0
    with open(OUTPUT_LOG, "a", encoding="utf-8") as out:
        for v in visits:
            geo = cache.get(v["ip"], {})
            entry = {
                "ts": v["ts"],
                "visitor": hash_ip(v["ip"]),
                "city": geo.get("city", ""),
                "region": geo.get("region", ""),
                "country": geo.get("country", ""),
                "cc": geo.get("cc", ""),
                "isp": geo.get("isp", ""),
                "referrer": v["referrer"],
                "ua": v["ua"],
            }
            if args.keep_ip:
                entry["ip"] = v["ip"]
            out.write(json.dumps(entry, ensure_ascii=False) + "\n")
            written += 1

    save_json(STATE_FILE, state)
    save_json(GEO_CACHE, cache)
    print(f"{written} neue Besuche protokolliert -> {OUTPUT_LOG}")
    return written


# ─────────────────────────── Anzeige ───────────────────────────

def show(limit: int) -> None:
    entries = []
    try:
        with open(OUTPUT_LOG, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
    except FileNotFoundError:
        print("Noch keine Besucher-Logs vorhanden.")
        return

    entries = entries[-limit:]
    if not entries:
        print("Noch keine Besucher.")
        return

    print(f"\n  Letzte {len(entries)} Besuche:\n")
    print(f"  {'Zeit (UTC)':<20} {'Ort':<28} {'Besucher':<10} Referrer")
    print(f"  {'-'*20} {'-'*28} {'-'*10} {'-'*20}")
    for e in entries:
        ts = e.get("ts", "")[:19].replace("T", " ")
        loc = ", ".join(p for p in (e.get("city"), e.get("country")) if p) or "—"
        ref = e.get("referrer") or "—"
        print(f"  {ts:<20} {loc[:28]:<28} {e.get('visitor','')[:8]:<10} {ref[:30]}")

    total = len(entries)
    uniq = len({e.get("visitor") for e in entries})
    countries = sorted({e.get("country") for e in entries if e.get("country")})
    print(f"\n  {total} Besuche · {uniq} eindeutige Besucher · "
          f"Länder: {', '.join(countries) or '—'}\n")


# ─────────────────────────── Main ───────────────────────────

def main() -> None:
    p = argparse.ArgumentParser(description="Besucher-Logger fürs Portfolio")
    p.add_argument("--show", nargs="?", const=20, type=int, metavar="N",
                   help="die letzten N Besucher anzeigen (Standard 20)")
    p.add_argument("--keep-ip", action="store_true",
                   help="rohe IP mitspeichern (Achtung DSGVO)")
    p.add_argument("--include-bots", action="store_true",
                   help="Bots/Crawler nicht herausfiltern")
    p.add_argument("--no-process", action="store_true",
                   help="nur anzeigen, Log nicht verarbeiten")
    args = p.parse_args()

    if not args.no_process:
        process(args)
    if args.show is not None or args.no_process:
        show(args.show if args.show is not None else 20)


if __name__ == "__main__":
    main()
