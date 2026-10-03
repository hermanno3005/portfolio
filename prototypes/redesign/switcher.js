/* ══════════════════════════════════════════════════════════════════════════
   PROTOTYPE: throwaway. The redesign variant switcher.

   Question: what does a graphical overhaul look like that pulls the whole
   site into one visual system, without changing any behaviour?

   Plan: three variants of the site's look, plus the current site as a
   baseline, switchable via `?variant=` on the existing index.html route.
   The variants live in redesign.css, as CSS over the unchanged DOM. This file
   only flips the switch, draws the floating bar, and injects the decorative
   chrome two of the variants need (B's tmux line, C's zone frame and title
   block). That chrome reads the terminal's state and never writes to it.

   Dev-only: on any host but localhost it returns before touching anything, so
   a stray merge can't ship the bar. That covers the jsdom test harness too,
   which boots at https://hermann-aust.com/.

   Run:  npm run proto:redesign  →  http://localhost:3333/?variant=A
   Keys: Alt+← / Alt+→ cycle variants (plain arrows belong to the terminal's
         input, which always has focus), Alt+M toggles the phone preview,
         Alt+H hides the bar.
   URL:  ?variant=current|A|B|C   &card=1 (phone preview)
         &run=neofetch,projects (runs commands once the boot finishes)
   ══════════════════════════════════════════════════════════════════════════ */
(() => {
  const host = location.hostname;
  const DEV = ['localhost', '127.0.0.1', '[::1]', '::1', ''].includes(host) || host.endsWith('.local');
  if (!DEV) return;

  const VARIANTS = [
    { key: 'current', name: 'Current site' },
    { key: 'A',       name: 'Native window' },
    { key: 'B',       name: 'Workstation' },
    { key: 'C',       name: 'Drawing sheet' },
  ];

  const THEME_COLOR = { current: '#0d0d0d', A: '#0a0b0e', B: '#0b0e13', C: '#f3f0e7' };

  const svgIcon = body => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`);
  const glyph = (fill, y = 23) =>
    `<text x="16" y="${y}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="20" font-weight="700" fill="${fill}">H</text>`;
  const FAVICON = {
    current: 'assets/favicon.svg',
    A: svgIcon(`<rect width="32" height="32" rx="7" fill="#111317"/>${glyph('#77dd9f')}`),
    B: svgIcon(`<rect width="32" height="32" fill="#0b0e13"/><rect y="26" width="32" height="6" fill="#8fd897"/>${glyph('#d2d8e2', 20)}`),
    C: svgIcon(`<rect width="32" height="32" fill="#f3f0e7"/><rect x="1.5" y="1.5" width="29" height="29" fill="none" stroke="#1b2230" stroke-width="3"/>${glyph('#1b2230')}`),
  };

  const root     = document.documentElement;
  const $        = id => document.getElementById(id);
  const win      = $('window');
  const termEl   = $('terminal');
  const titlebar = $('titlebar');
  const promptEl = $('prompt-display');
  const outputEl = $('output');
  const card     = $('mobile-card');

  const params = new URLSearchParams(location.search);
  const asked  = VARIANTS.findIndex(v => v.key === (params.get('variant') ?? 'A'));
  let index    = asked < 0 ? 1 : asked;

  /* ── State the chrome reads ── */
  const locale = () => DATA.locales[DATA.lang];
  const cwd    = () => Term.cwd.replace(/^\/home\/hermann/, '~') || '/';
  /* The foreground process, as tmux would name the window: the command a demo
     was started with, or the shell. */
  function proc() {
    if (!termEl.classList.contains('term-busy')) return 'zsh';
    const echoes = outputEl.querySelectorAll('.prompt-echo');
    const typed  = echoes[echoes.length - 1]?.lastElementChild?.textContent ?? '';
    return typed.trim().split(/\s+/)[0] || 'zsh';
  }

  /* ── B: the tmux line, on the desktop and pinned to the bottom of the card.
     After #terminal, so the stylesheet can colour it off `.term-busy` with a
     sibling selector. ── */
  function tmuxLine(id) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'proto-tmux';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="tm-session">portfolio</span><span class="tm-win"></span>'
      + '<span class="tm-fill"></span><span class="tm-seg tm-cwd"></span><span class="tm-seg tm-lang"></span>'
      + `<span class="tm-seg tm-clock"></span><span class="tm-seg tm-host">${DATA.user}@${DATA.hostname}</span>`;
    return el;
  }
  win.appendChild(tmuxLine('proto-tmux'));
  card.appendChild(tmuxLine('proto-tmux-card'));

  /* ── C: the zone frame around the sheet, and the title block's cells. ── */
  const sheet = document.createElement('div');
  sheet.id = 'proto-sheet';
  sheet.setAttribute('aria-hidden', 'true');
  const cols = Array.from({ length: 8 }, (_, i) => `<span>${i + 1}</span>`).join('');
  const rows = ['A', 'B', 'C', 'D'].map(r => `<span>${r}</span>`).join('');
  sheet.innerHTML = `<div class="zs zs-top">${cols}</div><div class="zs zs-bottom">${cols}</div>`
    + `<div class="zs zs-left">${rows}</div><div class="zs zs-right">${rows}</div>`;
  win.after(sheet);

  const today = new Date().toISOString().slice(0, 10);
  const TITLE_BLOCK = [
    ['name',  'Name',              () => locale().about.split('\n')[0]],
    ['role',  'Benennung / Title', () => locale().neofetchRole],
    ['date',  'Datum / Date',      () => today],
    ['lang',  'Sprache / Lang',    () => DATA.lang.toUpperCase()],
    ['sheet', 'Blatt / Sheet',     () => '1 / 1'],
    ['scale', 'Maßstab / Scale',   () => '1 : 1'],
    ['view',  'Ansicht / View',    () => proc() === 'zsh' ? cwd() : `${cwd()} › ${proc()}`],
    ['notes', 'Hinweis / Note',    () => locale().helpHint],
  ];
  for (const [key, label] of TITLE_BLOCK) {
    const cell = document.createElement('div');
    cell.className = `proto-tb tb-${key}`;
    cell.innerHTML = `<small>${label}</small><span></span>`;
    titlebar.appendChild(cell);
  }

  function refresh() {
    const lang = DATA.lang.toUpperCase();
    const time = new Date().toTimeString().slice(0, 5);
    for (const bar of document.querySelectorAll('.proto-tmux')) {
      bar.querySelector('.tm-win').textContent   = `0:${bar.id === 'proto-tmux' ? proc() : 'zsh'}*`;
      bar.querySelector('.tm-cwd').textContent   = bar.id === 'proto-tmux' ? cwd() : '~';
      bar.querySelector('.tm-lang').textContent  = lang;
      bar.querySelector('.tm-clock').textContent = time;
    }
    for (const [key, , value] of TITLE_BLOCK) {
      titlebar.querySelector(`.tb-${key} span`).textContent = value();
    }
  }
  new MutationObserver(refresh).observe(termEl,   { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(refresh).observe(promptEl, { childList: true, subtree: true, characterData: true });
  new MutationObserver(refresh).observe(root,     { attributes: true, attributeFilter: ['lang'] });
  setInterval(refresh, 20000);

  /* ── The floating bar ── */
  const bar = document.createElement('div');
  bar.id = 'proto-switcher';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Prototype variant switcher');
  bar.innerHTML = '<span class="ps-tag">PROTOTYPE</span>'
    + '<button class="ps-prev" aria-label="Previous variant" title="Alt+←">←</button>'
    + '<span class="ps-label"></span>'
    + '<button class="ps-next" aria-label="Next variant" title="Alt+→">→</button>'
    + '<span class="ps-sep"></span>'
    + '<button class="ps-card" aria-pressed="false" title="Alt+M">Phone</button>'
    + '<button class="ps-seed" title="Run neofetch + projects, to judge each variant against real density">Seed</button>';
  document.body.appendChild(bar);
  const label = bar.querySelector('.ps-label');

  /* Clicking the bar must not take focus from the terminal's input, which is
     the site's only keyboard path. */
  bar.addEventListener('mousedown', e => e.preventDefault());

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const iconLink  = document.querySelector('link[rel="icon"]');

  function setUrlParam(name, value) {
    const url = new URL(location.href);
    if (value == null) url.searchParams.delete(name); else url.searchParams.set(name, value);
    history.replaceState(null, '', url);
  }

  function apply(i) {
    index = (i + VARIANTS.length) % VARIANTS.length;
    const v = VARIANTS[index];
    if (v.key === 'current') delete root.dataset.variant;
    else root.dataset.variant = v.key;
    setUrlParam('variant', v.key);
    label.textContent = `${v.key === 'current' ? '0' : v.key} — ${v.name}`;
    themeMeta.content = THEME_COLOR[v.key];
    iconLink.href     = FAVICON[v.key];
    refresh();
  }

  /* ── Phone preview: switch the site's own touch-device media queries on, so
     the card renders through exactly the rules a phone gets. ── */
  const touchRules = [];
  (function collect(list) {
    for (const rule of list) {
      if (rule.media && /pointer:\s*coarse/.test(rule.media.mediaText)) {
        touchRules.push({ rule, media: rule.media.mediaText });
      }
      if (rule.cssRules) collect(rule.cssRules);
    }
  })([...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } }));

  let cardOn = false;
  function setCard(on) {
    cardOn = on;
    root.classList.toggle('proto-card', on);
    for (const { rule, media } of touchRules) rule.media.mediaText = on ? 'all' : media;
    bar.querySelector('.ps-card').setAttribute('aria-pressed', String(on));
    setUrlParam('card', on ? '1' : null);
  }

  /* ── Seeding the scrollback ── */
  const domReady = new Promise(r => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', r, { once: true }) : r());
  async function idle() {
    await domReady;
    const inputLine = $('input-line');
    while (inputLine.classList.contains('hidden') || termEl.classList.contains('term-busy')) {
      await new Promise(r => setTimeout(r, 80));
    }
  }
  async function runAll(cmds) {
    await idle();
    for (const cmd of cmds) await Term.run(cmd);
  }

  bar.querySelector('.ps-prev').addEventListener('click', () => apply(index - 1));
  bar.querySelector('.ps-next').addEventListener('click', () => apply(index + 1));
  bar.querySelector('.ps-card').addEventListener('click', () => setCard(!cardOn));
  bar.querySelector('.ps-seed').addEventListener('click', () => runAll(['neofetch', 'projects']));

  /* Capture phase, so the terminal never sees the chord. */
  window.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.code];
    if (step)                 apply(index + step);
    else if (e.code === 'KeyM') setCard(!cardOn);
    else if (e.code === 'KeyH') bar.classList.toggle('ps-hidden');
    else return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  apply(index);
  if (params.get('card') === '1') setCard(true);
  const queued = params.get('run');
  if (queued) {
    setUrlParam('run', null);   /* once, not on every reload */
    runAll(queued.split(',').map(s => s.trim()).filter(Boolean));
  }
})();
