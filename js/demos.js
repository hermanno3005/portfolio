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
   term says so in words.

   `style` is how the beats keep it present but invisible: the caption is in
   *every* paint, so the frame's height is fixed from the first one. Introducing
   it at the end would grow the element mid-run, and the view has already
   scrolled by then. */
function pacelabCaption(style = '') {
  return `<div class="demo-caption"${style ? ` style="${style}"` : ''}>
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

/* ══════════════════════════════════════════════════════════════════════════
   PaceLab — beat one: one number losing weight

   `5:26` alone at 96px. Three chips arrive staggered; the two that count fly
   *into* the number, which counts down on an odometer to `5:14` and turns
   green. Wind never enters — it sits dashed, greyed and struck through, which
   is the constraint "wind is reported but excluded" satisfied visually instead
   of in a footnote.

   Meaning is carried by shape, colour and number. Nothing here gets a locale
   entry: a beat that only works because a sentence explains it is a beat that
   is wrong, and this one says the same thing in both languages.

   The technique is the decision. This is **one paint**, with the motion
   declared as `@keyframes` in the painted SVG and run by the browser at native
   refresh rate — not a JS repaint loop. The hold is `settle()`, so the beat's
   length lives in these keyframes and nowhere else; a matching sleep constant
   beside them would be a second clock, and it drifts the moment someone edits a
   delay.

   The element ids here are stable across paints for the same reason the chart's
   gradient ids are, but the argument has to be made again, because this time
   the ids carry *animation*: a `Ctrl+C` leaves its partial beat in the
   scrollback by design, so a later run puts a second copy of these rules in the
   document, matching that abandoned frame too. Identical declarations compute
   to identical values, and a CSS animation only restarts when its computed
   value changes — so the old frame is left exactly as the visitor stopped it.
   ══════════════════════════════════════════════════════════════════════════ */

/* One left margin for the whole beat: the number, the label under it and the
   strip above it are all flush to the same edge. */
const PACELAB_BEAT_LEFT = 120;

/* Every value the odometer passes through, one per second shed: the number is
   seen doing arithmetic rather than dissolving from one state into another. */
const PACELAB_ODO = Array.from(
  { length: PACELAB_OBSERVED.at(-1) - PACELAB_NORMALIZED.at(-1) + 1 },
  (_, i) => PACELAB_OBSERVED.at(-1) - i,
);

/* The drum's pitch is the type size, so each value lands exactly where the one
   before it sat and the strip can slide by whole multiples of it. The window is
   one value tall with room for the digits' full height, and wide enough that
   the drum is never what clips the number. */
const PACELAB_ODO_SIZE   = 96;
const PACELAB_ODO_Y      = 176;
const PACELAB_ODO_WINDOW = { x: 110, y: 96, w: 420, h: 100 };
const PACELAB_UNIT_X     = 392;   /* `/km`, set just clear of the widest value */
const PACELAB_META_Y     = 70;

/* The label's baseline, and the shift that builds the term. `PACE` starts where
   `NORMALIZED` will and slides out of its way by exactly that word plus the
   space after it, so what lands is spaced as though it had always been one
   string. One character's advance is 12px mono at 7.2px wide, tracked 2px. */
const PACELAB_LABEL_ADVANCE = 9.2;
const PACELAB_LABEL_Y     = 212;
const PACELAB_LABEL_SHIFT = 'NORMALIZED '.length * PACELAB_LABEL_ADVANCE;

/* The three terms, as data — because the whole beat turns on the difference
   between two of them and the third, and that difference should be stated once
   rather than restated in the markup, in the stylesheet and in a boolean.
   A chip with no `go` never flies into the number, and that is the only place
   wind's exclusion is written down.

   `in` and `go` are seconds. The panel tints are chrome rather than palette
   tokens: they are the inside of a shape, not the colour of a value, and at
   token strength they would compete with the number. */
const PACELAB_CHIP  = { x: 560, w: 230, h: 34, gap: 44, y0: 76 };
const PACELAB_CHIPS = [
  { id: 'grade', glyph: '⛰', label: 'grade', value: '+2 s/km', colour: 'var(--cyan)', fill: '#0f1620', line: '#1e2b38', in: 0.5, go: 2.1 },
  { id: 'heat',  glyph: '🌡', label: 'heat',  value: '+9 s/km', colour: 'var(--heat)', fill: '#1d1409', line: '#3a2a12', in: 0.8, go: 2.3 },
  { id: 'wind',  glyph: '💨', label: 'wind',  value: '+0 — not in NP', colour: PACELAB_TICK, fill: '#101010', line: '#232323', in: 1.1 },
];

const pacelabChipY = row => PACELAB_CHIP.y0 + row * PACELAB_CHIP.gap;

/* One chip. The excluded term gets the same box as the applied ones — dashed,
   grey and struck through — because "measured, then left outside" only reads if
   it is standing next to the two that went in, and it keeps its `+0` for the
   same reason: a value that was computed and then declined, not an absence. */
function pacelabChip(chip, row) {
  const y = pacelabChipY(row);
  const out = !chip.go;
  return `<g id="pl-${chip.id}" class="pl-chip">
      <rect x="${PACELAB_CHIP.x}" y="${y}" width="${PACELAB_CHIP.w}" height="${PACELAB_CHIP.h}" rx="4" fill="${chip.fill}" stroke="${chip.line}"${out ? ' stroke-dasharray="3 3"' : ''}/>
      <text x="${PACELAB_CHIP.x + 18}" y="${y + 23}" font-size="15" fill="${chip.colour}">${chip.glyph}</text>
      <text x="${PACELAB_CHIP.x + 42}" y="${y + 23}" font-size="14" fill="${out ? PACELAB_TICK : 'var(--dim)'}"${out ? ' text-decoration="line-through"' : ''}>${chip.label}</text>
      <text x="${PACELAB_CHIP.x + PACELAB_CHIP.w - 20}" y="${y + 23}" font-size="${out ? 13 : 15}" fill="${chip.colour}" text-anchor="end"${out ? '' : ' font-weight="700"'}>${chip.value}</text>
    </g>`;
}

/* A chip's whole timeline, from the same row of data that drew it: it arrives,
   and — if it is one of the two that count — it leaves by flying into the
   number rather than by fading out. */
function pacelabChipCss(chip, row) {
  return `#pl-${chip.id} { transform-origin: ${PACELAB_CHIP.x}px ${pacelabChipY(row) + PACELAB_CHIP.h / 2}px;
                animation: plChipIn .45s cubic-bezier(.2,.9,.3,1) ${chip.in}s both${chip.go ? `, plChipGo .7s ease-in ${chip.go}s both` : ''}; }`;
}

/* Heat is wet-bulb globe temperature — the load a body actually carries, not
   the number on a forecast. The strip says WBGT for the same reason the chip
   carries a thermometer and no unit: `30 °C` would name a different model. */
const PACELAB_BEAT_ONE = `<svg viewBox="0 0 ${PACELAB_VIEW_W} ${PACELAB_VIEW_H}" font-family="var(--font)" aria-hidden="true"><style>
    @keyframes plFade   { from { opacity: 0 } to { opacity: 1 } }
    @keyframes plChipIn { from { opacity: 0; transform: translateX(46px) } to { opacity: 1; transform: translateX(0) } }
    /* the applied terms do not fade out — they fly left, into the number */
    @keyframes plChipGo { from { opacity: 1; transform: translateX(0) scale(1) } to { opacity: 0; transform: translateX(-150px) scale(.55) } }
    @keyframes plOdo    { from { transform: translateY(0) } to { transform: translateY(-${(PACELAB_ODO.length - 1) * PACELAB_ODO_SIZE}px) } }
    @keyframes plHue    { from { fill: var(--fg) } to { fill: var(--green) } }
    @keyframes plShift  { from { transform: translateX(0) } to { transform: translateX(${PACELAB_LABEL_SHIFT}px) } }
    @keyframes plGreen  { from { fill: ${PACELAB_TICK} } to { fill: var(--green) } }
    .pl-chip  { transform-box: view-box; }
    ${PACELAB_CHIPS.map(pacelabChipCss).join('\n    ')}
    /* the drum and the colour run on one clock, so the number turns green *as*
       it lands and the colour reads as the verdict on the count */
    #pl-odo      { animation: plOdo 1.5s steps(${PACELAB_ODO.length - 1}) 2.2s both; }
    #pl-odo text { animation: plHue 1.5s linear 2.2s both; }
    /* the term is built, not swapped: PACE stays on screen and slides right by
       exactly the width of the word arriving in front of it */
    #pl-pace       { transform-box: view-box;
                     animation: plFade .5s ease .15s both,
                                plShift .55s cubic-bezier(.5,0,.2,1) 3.3s both,
                                plGreen .55s linear 3.3s both; }
    #pl-normalized { animation: plFade .45s ease 3.5s both; }
    #pl-meta       { animation: plFade .6s ease .25s both; }
    #pl-unit       { animation: plFade .5s ease .15s both; }
  </style>

    <text id="pl-meta" x="${PACELAB_BEAT_LEFT}" y="${PACELAB_META_Y}" fill="${PACELAB_TICK}" font-size="11" letter-spacing="2">05 AUG · 9.6 km · WBGT 29</text>

    <clipPath id="pl-odo-clip"><rect x="${PACELAB_ODO_WINDOW.x}" y="${PACELAB_ODO_WINDOW.y}" width="${PACELAB_ODO_WINDOW.w}" height="${PACELAB_ODO_WINDOW.h}"/></clipPath>
    <g clip-path="url(#pl-odo-clip)"><g id="pl-odo">
      ${PACELAB_ODO.map((s, i) => `<text x="${PACELAB_BEAT_LEFT}" y="${PACELAB_ODO_Y}" dy="${i * PACELAB_ODO_SIZE}" font-size="${PACELAB_ODO_SIZE}" font-weight="300" letter-spacing="-3">${mmss(s)}</text>`).join('')}
    </g></g>
    <text id="pl-unit" x="${PACELAB_UNIT_X}" y="${PACELAB_ODO_Y}" fill="${PACELAB_TICK}" font-size="20">/km</text>

    <text id="pl-pace" x="${PACELAB_BEAT_LEFT}" y="${PACELAB_LABEL_Y}" fill="${PACELAB_TICK}" font-size="12" letter-spacing="2">PACE</text>
    <text id="pl-normalized" x="${PACELAB_BEAT_LEFT}" y="${PACELAB_LABEL_Y}" fill="var(--green)" font-size="12" letter-spacing="2">NORMALIZED</text>

    ${PACELAB_CHIPS.map(pacelabChip).join('\n    ')}
  </svg>`;

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

  /* Three paints in total, and this is the first of them. `settle()` rather
     than `sleep()`: the beat is over when its keyframes are, and the number
     passed here is the substitute for a browser that cannot say — never a race
     against one that can.

     Beat two lands in the next ticket. Until it does, the runner paints the
     landing frame straight after this, so there is a visible jump from the big
     number to the season chart. */
  async play(frame) {
    frame.paint(PACELAB_BEAT_ONE + pacelabCaption('opacity:0'));
    await frame.settle(4100);
  },
});
