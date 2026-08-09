/* ── Demos ──
 *
 * A demo is what a runnable project runs: an object the terminal's foreground
 * runner drives, never a command handler of its own.
 *
 *   regDemo('pacelab', {
 *     height,                     // pixels; reserves min-height at insert
 *     minCols,                    // below this many columns, play() is skipped
 *     renderFinal(frame),         // synchronous; depends on no animation state
 *     async play(frame, signal),  // the animation; never draws the ending itself
 *   });
 *
 * `frame` is exactly four members — `paint(html)`, `el`, `sleep(ms)` and
 * `settle(fallbackMs)`. No command `ctx`: every member of it is forbidden,
 * harmful or irrelevant here.
 *
 * This registry is resolved at *run* time, which is what makes this file
 * load-order-free — necessary because the language boot fires while data.js is
 * still being parsed, before any later script exists.
 *
 * Its own file rather than another entry in the commands grab-bag: a
 * multi-second animation with frame data will be the largest single thing on
 * this site. A `demos/` directory would be structure paying for a future that
 * does not exist yet; it becomes one the day a second demo does.
 */

const DEMOS = {};

function regDemo(id, demo) { DEMOS[id] = demo; }

/* ══════════════════════════════════════════════════════════════════════════
   PaceLab — the landing frame

   Every route through the demo ends here: finishing, `Escape`, a click on the
   frame, reduced motion, a terminal too narrow to animate in. For two of those
   it is the only thing the visitor ever sees, so it has to stand entirely on
   its own — synchronous, and a function of these constants alone. Nothing here
   may read animation state, because on most paths there was none.

   It is inline SVG rather than a monospace character grid. An earlier prototype
   set drew the whole thing as terminal text and was rejected for it: the demo
   lives *in* a terminal, it does not have to *be* one, and `paint()` takes
   trusted HTML without ever asking for monospace.
   ══════════════════════════════════════════════════════════════════════════ */

/* Invented, but internally consistent and true to the shape of the tool's
   output: observed pace climbs 20 s/km from April to July while normalized
   pace *falls* 5 s/km, and August is exactly the run the annotation block
   below is about — ran 5:26, NP 5:14. The honest claim is that the correction
   makes a season comparable, revealing fitness the conditions had masked. */
const PACELAB_MONTHS     = ['04', '05', '06', '07', '08'];
const PACELAB_OBSERVED   = [321, 325, 333, 341, 326];   // s/km, as run
const PACELAB_NORMALIZED = [319, 318, 317, 316, 314];   // s/km, weather removed

/* The viewBox width is the terminal's own content width at the 900px window
   cap, so at full size the chart draws 1:1 and never scales up. */
const PACELAB_VIEW_W = 868;
const PACELAB_VIEW_H = 300;

/* The plot stops well short of the right edge: `5:26 ran` is 8 characters at
   12px mono ≈ 58px, and at the naive full width the end labels clip. The
   gutter is geometry, not a guess — see PACELAB_LABEL_X below. */
const PACELAB_PLOT = { x0: 118, x1: 776, y0: 48, y1: 214 };
const PACELAB_PACE_TOP = 310;    // s/km at the top of the plot
const PACELAB_PACE_BOT = 348;    // …and at the bottom

const paceX = i => PACELAB_PLOT.x0 + i * (PACELAB_PLOT.x1 - PACELAB_PLOT.x0) / (PACELAB_MONTHS.length - 1);
const paceY = s => PACELAB_PLOT.y0 + (s - PACELAB_PACE_TOP) / (PACELAB_PACE_BOT - PACELAB_PACE_TOP) * (PACELAB_PLOT.y1 - PACELAB_PLOT.y0);
const mmss  = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* Chart furniture greys — the axis, its ticks and the observed line, all of
   which have to recede behind the green NP line. Deliberately darker than
   `--dim`, which is the dimmest colour the site's palette carries and still too
   bright for a gridline; ported from the approved prototype rather than
   re-picked here. Amber and green are the site's own tokens, below. */
const PACELAB_GRID  = '#1e1e1e';
const PACELAB_TICK  = '#3a3f47';
const PACELAB_MUTED = '#4b515a';

/* The end labels' real coordinates. Named constants because the next ticket's
   flying number computes its landing transform from them: hand-guessed offsets
   came out ~78px wide of where the label actually sits. */
const PACELAB_LABEL_X     = PACELAB_PLOT.x1 + 10;
const PACELAB_LABEL_OBS_Y = paceY(PACELAB_OBSERVED.at(-1)) + 4;
const PACELAB_LABEL_NP_Y  = paceY(PACELAB_NORMALIZED.at(-1)) + 4;

/* Catmull-Rom through the points, emitted as cubic béziers — a season of five
   samples read as a curve, not a zigzag. */
function pacelabSpline(points) {
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}`
       + ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}`
       + ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const PACELAB_OBS_PTS = PACELAB_OBSERVED.map((s, i) => [paceX(i), paceY(s)]);
const PACELAB_NP_PTS  = PACELAB_NORMALIZED.map((s, i) => [paceX(i), paceY(s)]);
const PACELAB_OBS_D   = pacelabSpline(PACELAB_OBS_PTS);
const PACELAB_NP_D    = pacelabSpline(PACELAB_NP_PTS);
/* The gap is one closed shape: down the observed line and back along the
   normalized one. It is the correction, drawn. */
const PACELAB_GAP_D   = `${PACELAB_OBS_D} L${pacelabSpline([...PACELAB_NP_PTS].reverse()).slice(1)} Z`;

/* Amber is the site's `--heat`, not a colour this file invents. The gradient
   and filter ids are stable rather than per-paint unique: two runs leave two
   frames in the scrollback and therefore two copies of these defs, but the
   copies are identical, so whichever one a reference resolves to draws the
   same thing — and a unique id per call would break the promise that two
   calls produce identical output. */
const PACELAB_DEFS = `<defs>
    <linearGradient id="pl-gap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--heat)" stop-opacity=".30"/>
      <stop offset="100%" stop-color="var(--heat)" stop-opacity=".07"/>
    </linearGradient>
    <filter id="pl-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

/* Month labels are numerals — `04 05 06 07 08`. English and German diverge at
   May/Mai, and numerals cost nothing to leave untranslated. */
function pacelabAxes() {
  const rows = [316, 324, 332, 340].map(p => `
    <line x1="${PACELAB_PLOT.x0 - 14}" y1="${paceY(p)}" x2="${PACELAB_PLOT.x1 + 14}" y2="${paceY(p)}" stroke="${PACELAB_GRID}" stroke-width="1"/>
    <text x="${PACELAB_PLOT.x0 - 24}" y="${paceY(p) + 4}" fill="${PACELAB_TICK}" font-size="11" text-anchor="end">${mmss(p)}</text>`).join('');
  const months = PACELAB_MONTHS.map((m, i) => `
    <text x="${paceX(i)}" y="${PACELAB_PLOT.y1 + 26}" fill="${PACELAB_MUTED}" font-size="11" text-anchor="middle" letter-spacing="1">${m}</text>`).join('');
  return rows + months;
}

/* The metric carries the metric's colour: `NORMALIZED PACE` is green exactly as
   the NP line is, so the legend and the line read as the same thing. */
const PACELAB_LEGEND = `<text x="${PACELAB_PLOT.x0}" y="26" font-size="11" letter-spacing="2"><tspan fill="${PACELAB_MUTED}">SEASON · </tspan><tspan fill="var(--green)">NORMALIZED PACE</tspan></text>`;

const PACELAB_CHART = `<svg viewBox="0 0 ${PACELAB_VIEW_W} ${PACELAB_VIEW_H}" font-family="var(--font)" aria-hidden="true">
    ${PACELAB_DEFS}
    ${pacelabAxes()}
    ${PACELAB_LEGEND}
    <path d="${PACELAB_GAP_D}" fill="url(#pl-gap)"/>
    <path d="${PACELAB_OBS_D}" fill="none" stroke="${PACELAB_MUTED}" stroke-width="2"/>
    <path d="${PACELAB_NP_D}" fill="none" stroke="var(--green)" stroke-width="2.5" filter="url(#pl-glow)"/>
    ${PACELAB_OBS_PTS.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="${PACELAB_MUTED}"/>`).join('')}
    ${PACELAB_NP_PTS.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--green)"/>`).join('')}
    <text x="${PACELAB_LABEL_X}" y="${PACELAB_LABEL_OBS_Y}" fill="${PACELAB_MUTED}" font-size="12">${mmss(PACELAB_OBSERVED.at(-1))} ran</text>
    <text x="${PACELAB_LABEL_X}" y="${PACELAB_LABEL_NP_Y}" fill="var(--green)" font-size="12" font-weight="700">${mmss(PACELAB_NORMALIZED.at(-1))} NP</text>
  </svg>`;

/* The chart is `aria-hidden` and the caption below is its text alternative: an
   `aria-label` would be an English sentence in a drawing whose whole point is
   that it carries no translated strings, and the caption already states every
   number in it. */

/* PaceLab's real output format, verbatim — which is why it is here rather than
   in the locale blocks with the runner's own chrome. It is a screenshot of a
   tool's output, not prose about it, and it says the same thing in both
   languages: the only words in it are `ran` and `NP`, the latter a term of art.
   No leading `~` on the normalized pace either: in the tool that marks a
   *Provisional Analysis*, and borrowing it to mean "approximately" would claim
   something false. Wind is computed and reported but excluded from the
   correction — only grade and heat are coloured as applied cost, and the wind
   term says so in words. */
function pacelabCaption() {
  return `<div class="demo-caption">
  <div>🏃 <span class="green bold">PaceLab</span> · NP <span class="cyan">5:14/km</span> <span class="dim">(ran 5:26/km)</span></div>
  <div class="dim">⛰️ grade <span class="cyan">+2</span> · 🌡️ heat <span class="heat">+9</span> · 💨 wind +0 s/km (wind not in NP)</div>
  ${pacelabRepoLine()}
</div>`;
}

/* The repo URL is read from the project data rather than written out again
   here — `project pacelab` already prints it from there, from the same entry
   whose `runnable` flag is why this demo can be reached at all. Escaped and
   emitted as the site's own `data-url` span, so the delegated click handler
   opens it in a new tab exactly as it does everywhere else. Absent from the
   data, the line is simply not drawn: a link to nowhere is worse than no
   link. */
function pacelabRepoLine() {
  const url = DATA.projects.find(p => p.id === 'pacelab')?.url;
  if (!url) return '';
  const shown = Term.escHtml(url.replace(/^https?:\/\//, ''));
  return `<div><span class="link" data-url="${Term.escHtml(url)}">${shown}</span></div>`;
}

regDemo('pacelab', {
  /* The chart draws at most its viewBox height — it scales down with a narrow
     window, never up — plus the caption's three lines at 14px × 1.5 and its top
     margin. Derived rather than measured, so it cannot drift from the drawing. */
  height: PACELAB_VIEW_H + 68,

  /* The annotation's second line is 57 characters; below that it wraps into
     something that reads as broken rather than as a terminal. */
  minCols: 60,

  renderFinal(frame) {
    frame.paint(PACELAB_CHART + pacelabCaption());
  },

  /* Placeholder. The choreography lands in tickets 08–09; the hold is here so
     the mechanism this demo exists to exercise — the skip hint, `Escape`,
     `Ctrl+C`, tap-to-skip — is something a visitor can actually reach. */
  async play(frame) {
    frame.paint('<span class="dim">…</span>');
    await frame.sleep(2500);
  },
});
