/* ══════════════════════════════════════════════════════════════════════════
   Chalk — the landing frame

   The frame every route through the demo ends on: finishing, `Escape`, a click
   on it, reduced motion, a terminal too narrow to animate in. Four of those
   five see nothing else, which is why it ships before any motion does — and
   why it stands entirely on its own: synchronous, and a function of the data
   below alone. Nothing here may read animation state, because on most paths
   there was none.

   Chalk is an iOS strength-training app. It logs one *entry* — `reps × weight`
   — and derives twelve *rep-maxes* from every entry ever logged, drawn as a
   *strength curve* over a fixed 1–12 rep axis with the Epley *ghost curve*
   behind it. That vocabulary is binding: never PR, personal record, set,
   session, workout or chart. Kilograms only, and the multiplication sign is ×.
   ══════════════════════════════════════════════════════════════════════════ */

/* Invented, but internally consistent — as PaceLab's season is. No real
   training data goes on a public site. Back Squat is free-weight, so the scope
   is simply every entry for the exercise: no machine qualifier, no machine row,
   no hint, and the fifth verdict state is unreachable.

   Most recent first, which is how a history sheet reads. The most recent entry
   is what seeds the sheet, so the demo opens on `5` reps. */
const CHALK_EXERCISE = 'Back Squat';
const CHALK_ENTRIES = [
  { reps: 5, weight: 120 },
  { reps: 1, weight: 145 },
  { reps: 3, weight: 135 },
  { reps: 8, weight: 105 },
  { reps: 12, weight: 90 },
];

/* The entry the demo logs, and the sheet it lands in. */
const CHALK_ENTRY = { reps: 5, weight: 125 };
const CHALK_SHEET = [CHALK_ENTRY, ...CHALK_ENTRIES];

/* The selected rep count. Chalk's own default, and the one the readout, the
   verdict line and the caption all speak about. */
const CHALK_SEL = 5;

/* The axis is fixed 1–12 for every exercise, so two curves are comparable. */
const CHALK_REPS = 12;

/* ── The derivation ───────────────────────────────────────────────────────
   Written out as the rule and applied at run time, never as twelve literals: a
   staircase typed into the source would make a later refactor's silent mistake
   invisible, and this is the one thing about Chalk the demo is actually
   claiming.

   Monotonic backfill: `best[n] = max(weight) where reps >= n`. A `5 × 120`
   proves 120 kg at 1, 2, 3, 4 and 5 reps, so it floors all of them; nothing is
   inferred beyond what the lift physically demonstrated. One pass, walking n
   down from 12 with a running maximum — not twelve `reps >= n` predicates. A
   cell no entry reaches has no rep-max at all, and is left `undefined` rather
   than filled with a zero that would draw. */
function chalkBackfill(entries) {
  const byReps = [...entries].sort((a, b) => b.reps - a.reps);
  const best = new Array(CHALK_REPS);
  let i = 0;
  let running;

  for (let n = CHALK_REPS; n >= 1; n--) {
    while (i < byReps.length && byReps[i].reps >= n) {
      running = Math.max(running ?? -Infinity, byReps[i].weight);
      i++;
    }
    best[n - 1] = running;
  }
  return best;
}

/* Epley, per entry. The ghost is guidance only — never a rep-max, never a
   number the visitor has lifted. */
function chalkE1rm(entry) {
  return entry.weight * (1 + entry.reps / 30);
}

const CHALK_BEST_BEFORE = chalkBackfill(CHALK_ENTRIES);
const CHALK_BEST = chalkBackfill(CHALK_SHEET);

/* Which cells the new entry floored — derived by comparing the two sheets, so
   the drawing highlights what actually moved rather than what somebody
   remembered moving. `5 × 125` raises 4 and 5 together: a new entry can raise a
   run of cells at once, never one cell alone. */
const CHALK_RAISED = CHALK_BEST
  .map((w, i) => (w !== CHALK_BEST_BEFORE[i] ? i + 1 : 0))
  .filter(Boolean);

/* The single entry with the highest estimate, projected back across 1–12. It
   comes from the `1 × 145` — and the new entry's own estimate is lower, so the
   ghost does not move when that entry lands. That is structural rather than a
   happy choice of numbers: it is why the two curves pinch at n = 1, and why the
   ghost has to be told apart by kind and not by dash alone. */
const CHALK_E1RM = Math.max(...CHALK_SHEET.map(chalkE1rm));
const CHALK_GHOST = Array.from({ length: CHALK_REPS }, (_, i) => CHALK_E1RM / (1 + (i + 1) / 30));

/* Kilograms, with the trailing zero trimmed: `125`, not `125.0`; `57.5` stays. */
const chalkKg = w => (w % 1 ? w.toFixed(1) : String(w));

/* ── The readout column's own words, all of them derived ──────────────────
   `M` is the count of entries with `reps >= N` in scope, which is four once the
   new entry is in the sheet. */
const CHALK_ENTRY_COUNT = CHALK_SHEET.filter(e => e.reps >= CHALK_SEL).length;
const CHALK_READOUT = `best for ${CHALK_SEL} reps · ${CHALK_ENTRY_COUNT} entries ›`;

/* The verdict line, weight stage only. Of its five states this dataset can only
   reach "beats" — the exercise is free-weight, so there is no hint state, and
   the entry is heavier than the rep-max it lands on. The margin is
   `weight − best[reps]` against the sheet as it stood before. */
const CHALK_MARGIN = CHALK_ENTRY.weight - CHALK_BEST_BEFORE[CHALK_SEL - 1];
const CHALK_VERDICT = `Beats your ${CHALK_SEL}-rep best by ${chalkKg(CHALK_MARGIN)} kg`;
const CHALK_WAS = `was ${chalkKg(CHALK_BEST_BEFORE[CHALK_SEL - 1])} kg`
  + ` · entry ${CHALK_ENTRY.reps} × ${chalkKg(CHALK_ENTRY.weight)} kg`;

/* ── Geometry ─────────────────────────────────────────────────────────────
   PaceLab's viewBox exactly, so the two demos scale identically inside the same
   frame: the terminal's own content width at the 900px window cap, drawn 1:1 at
   full size and never scaled up. */
const CHALK_VIEW_W = 868;
const CHALK_VIEW_H = 300;

/* Readout column left, staircase right. The number is the headline and the
   curve is the evidence beside it — the app's own hierarchy, not a chart with a
   caption. */
const CHALK_COL_X   = 70;
const CHALK_HEAD_Y  = 72;
const CHALK_READ_Y  = 96;
const CHALK_NUM_Y   = 176;
const CHALK_NUM_SIZE = 76;
const CHALK_UNIT_X  = CHALK_COL_X + 158;   /* `kg`, set just clear of `125` */
const CHALK_UNIT_SIZE = 20;
const CHALK_VERDICT_Y = 206;
const CHALK_WAS_Y   = 230;

const CHALK_PLOT = { x0: 392, x1: 800, y0: 62, y1: 224 };

/* Framed to the data, never anchored at zero: real strength curves are shallow
   and a zero axis flattens them into the top third of the plot. */
const CHALK_PLOT_TOP = 150;   // kg at the top of the plot
const CHALK_PLOT_BOT = 85;    // …and at the bottom

const chalkX = n => CHALK_PLOT.x0 + (n - 1) * (CHALK_PLOT.x1 - CHALK_PLOT.x0) / (CHALK_REPS - 1);
const chalkY = w => CHALK_PLOT.y0 + (w - CHALK_PLOT_TOP) / (CHALK_PLOT_BOT - CHALK_PLOT_TOP) * (CHALK_PLOT.y1 - CHALK_PLOT.y0);
const chalkF = v => v.toFixed(1);

/* Chart furniture greys — the gridlines, the tick labels and the axis words,
   all of which have to recede behind the curve. Ported from PaceLab rather than
   re-picked, so the two frames sit in one visual system; they are furniture,
   not values, which is why they are not palette tokens. Amber, green and cyan
   are the site's own tokens wherever a value carries one. */
const CHALK_GRID  = '#1e1e1e';
const CHALK_TICK  = '#3a3f47';
const CHALK_MUTED = '#4b515a';

/* The glow the curve carries, matching the one PaceLab's NP line carries. The
   filter id is stable rather than per-paint unique: two runs leave two frames
   in the scrollback and therefore two copies of this def, but the copies are
   identical, so whichever one a reference resolves to draws the same thing. */
const CHALK_DEFS = `<defs>
    <filter id="ck-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

/* The plot's furniture. The rep counts are numerals and the two words on it are
   the domain's own, so nothing here is translated — the drawing reads the same
   in both languages, exactly as PaceLab's does.

   Not every rep count is labelled: the ones that are are where this dataset's
   entries sit, which is also where the staircase turns. Twelve labels at 11px
   across a 408px plot would be a picket fence. */
const CHALK_AXIS_LABELS = [1, 3, 5, 8, 12];

function chalkChrome() {
  const rows = [90, 105, 120, 135, 150].map(w => `
    <line x1="${CHALK_PLOT.x0 - 10}" y1="${chalkY(w)}" x2="${CHALK_PLOT.x1 + 10}" y2="${chalkY(w)}" stroke="${CHALK_GRID}" stroke-width="1"/>
    <text x="${CHALK_PLOT.x0 - 18}" y="${chalkY(w) + 4}" fill="${CHALK_TICK}" font-size="11" text-anchor="end">${chalkKg(w)}</text>`).join('');
  const reps = CHALK_AXIS_LABELS.map(n => `
    <text x="${chalkX(n)}" y="${CHALK_PLOT.y1 + 24}" fill="${CHALK_MUTED}" font-size="11" text-anchor="middle">${n}</text>`).join('');

  return `<text x="${CHALK_PLOT.x0}" y="40" font-size="11" letter-spacing="2"><tspan fill="${CHALK_MUTED}">STRENGTH CURVE · </tspan><tspan fill="var(--cyan)" opacity=".6">GHOST</tspan></text>
    ${rows}${reps}
    <text x="${(CHALK_PLOT.x0 + CHALK_PLOT.x1) / 2}" y="${CHALK_PLOT.y1 + 44}" fill="${CHALK_MUTED}" font-size="10" letter-spacing="2" text-anchor="middle">REPS</text>`;
}

/* The ghost, a smooth continuous function sampled at every rep count. It is
   separated from the curve by *kind* — smooth against stepped — before colour,
   dash or opacity are considered, which is what keeps the two apart at n = 1
   where they nearly coincide. Dashed and translucent on top of that, because
   "impossible to mistake for the solid curve" wants more than one signal. */
const CHALK_GHOST_D = CHALK_GHOST.map((w, i) => `${i ? 'L' : 'M'}${chalkF(chalkX(i + 1))},${chalkF(chalkY(w))}`).join(' ');

/* ── The staircase ────────────────────────────────────────────────────────
 *
 * The one builder. It emits its segments always — this frame calls it with no
 * animation attributes, and the beat that animates the rise later passes hooks
 * for the pieces it needs to move. Two builders would mean the visitor who sets
 * reduced motion and the visitor who watches the animation quietly see two
 * different drawings, with nothing to catch the drift.
 *
 * Step *before* the rep count: the plateau for `best[n]` runs in from `n − 1`,
 * and the drop happens at `n` itself — so the line goes down on the 5 and then
 * over to the 6, never in the gap at 5.5. For this dataset that puts risers at
 * 1, 3, 5 and 8. Stepped, never smoothed: monotonic backfill means an untrained
 * rep count repeats the value above it, and the flat run *is* the claim.
 *
 * A point mark sits on every cell, backfilled or proven alike — the flat run
 * reads as a floor on its own, so marking the difference would be inventing a
 * distinction the app does not draw. The cells the entry floored are the
 * exception, and they are amber because that is where the headline number is.
 *
 * `hooks.seg(index)` and `hooks.dot(n)` return extra attributes for one piece.
 */
function chalkStaircase(values, hooks = {}) {
  const { seg = () => '', dot = () => '' } = hooks;
  const pieces = [];

  let start = 1;   /* the first cell of the run being walked */
  for (let n = 2; n <= CHALK_REPS + 1; n++) {
    if (n <= CHALK_REPS && values[n - 1] === values[start - 1]) continue;

    /* The run [start … n-1] is complete: its plateau runs in from the cell
       before it, and the drop into it stands at that same rep count. */
    const w = values[start - 1];
    const from = Math.max(start - 1, 1);
    if (from !== n - 1) {
      pieces.push(`<path d="M${chalkF(chalkX(from))},${chalkF(chalkY(w))} L${chalkF(chalkX(n - 1))},${chalkF(chalkY(w))}"/>`);
    }
    if (n <= CHALK_REPS) {
      /* Square caps, so the riser meets its two plateaus without a notch. */
      pieces.push(`<path stroke-linecap="square" d="M${chalkF(chalkX(n - 1))},${chalkF(chalkY(w))} L${chalkF(chalkX(n - 1))},${chalkF(chalkY(values[n - 1]))}"/>`);
    }
    start = n;
  }

  const marks = values.map((w, i) => {
    const n = i + 1;
    /* Hot once the cell has actually been raised to its after-value, so the
       same builder draws the sheet before the entry lands without lighting up
       cells that have not moved yet. */
    const hot = CHALK_RAISED.includes(n) && w === CHALK_BEST[i];
    return `<circle${dot(n)} cx="${chalkF(chalkX(n))}" cy="${chalkF(chalkY(w))}" r="${hot ? 4.5 : 3}" fill="${hot ? 'var(--heat)' : 'var(--green)'}"/>`;
  });

  return `<g fill="none" stroke="var(--green)" stroke-width="2.5" filter="url(#ck-glow)">
      ${pieces.map((piece, i) => piece.replace('<path', `<path${seg(i)}`)).join('\n      ')}
    </g>
    <g stroke="none">${marks.join('')}</g>`;
}

/* The readout column: the app's own screen, left of the evidence. */
const CHALK_COLUMN = `<text x="${CHALK_COL_X}" y="${CHALK_HEAD_Y}" font-size="11" letter-spacing="2" fill="${CHALK_MUTED}">${CHALK_EXERCISE.toUpperCase()}</text>
    <text x="${CHALK_COL_X}" y="${CHALK_READ_Y}" font-size="12" fill="${CHALK_MUTED}">${CHALK_READOUT}</text>
    <text x="${CHALK_COL_X}" y="${CHALK_NUM_Y}" font-size="${CHALK_NUM_SIZE}" font-weight="300" letter-spacing="-2" fill="var(--heat)">${chalkKg(CHALK_BEST[CHALK_SEL - 1])}</text>
    <text x="${CHALK_UNIT_X}" y="${CHALK_NUM_Y}" font-size="${CHALK_UNIT_SIZE}" fill="${CHALK_TICK}">kg</text>
    <text x="${CHALK_COL_X}" y="${CHALK_VERDICT_Y}" font-size="13" fill="var(--green)">${CHALK_VERDICT}</text>
    <text x="${CHALK_COL_X}" y="${CHALK_WAS_Y}" font-size="12" fill="${CHALK_MUTED}">${CHALK_WAS}</text>`;

const CHALK_FRAME = `<svg viewBox="0 0 ${CHALK_VIEW_W} ${CHALK_VIEW_H}" font-family="var(--font)" aria-hidden="true">
    ${CHALK_DEFS}
    ${CHALK_COLUMN}
    ${chalkChrome()}
    <path d="${CHALK_GHOST_D}" fill="none" stroke="var(--cyan)" stroke-width="1.5" stroke-opacity=".45" stroke-dasharray="5 4"/>
    ${chalkStaircase(CHALK_BEST)}
  </svg>`;

/* Chalk's own output, and the drawing's only text alternative — the frame above
   is `aria-hidden`, so the redundancy with what it already prints exists purely
   for people who can see the picture.

   One English version, outside the locale blocks, exactly as PaceLab's is: every
   word in it is Chalk's own output, and a German visitor reads an English
   caption here on the same terms they already do there.

   The colouring is the decision. Line one's `125 kg` is amber, matching where
   the drawing lands rather than borrowing PaceLab's cyan headline; line two is
   dim with the entry as its one cyan span — a callback to the chip it was typed
   into. The repo line under this is `demoCaption`'s, not this file's. */
const CHALK_CAPTION = [
  `<div>🏋️ <span class="green bold">Chalk</span> · best for ${CHALK_SEL} reps <span class="heat">${chalkKg(CHALK_BEST[CHALK_SEL - 1])} kg</span> <span class="dim">(was ${chalkKg(CHALK_BEST_BEFORE[CHALK_SEL - 1])} kg)</span></div>`,
  `<div class="dim">${CHALK_EXERCISE} · entry <span class="cyan">${CHALK_ENTRY.reps} × ${chalkKg(CHALK_ENTRY.weight)} kg</span> · ${CHALK_VERDICT}</div>`,
];

/* What the caption occupies once the repo line the helper appends is counted,
   and what one line of it costs at the site's 14px × 1.5 plus the block's own
   top margin. */
const CHALK_CAPTION_LINES = CHALK_CAPTION.length + 1;
const CHALK_CAPTION_LINE_H = Math.round(14 * 1.5);
const CHALK_CAPTION_TOP = 5;

/* The width floor, read off the caption rather than guessed at: below the
   columns its longest line needs, that line wraps into something that reads as
   broken rather than as a terminal. Markup out, code points counted — the
   caption carries an emoji. */
const CHALK_MIN_COLS = Math.max(...CHALK_CAPTION.map(line => [...line.replace(/<[^>]*>/g, '')].length));

regDemo('chalk', {
  /* The drawing at most its viewBox height — it scales down with a narrow
     window, never up — plus the caption. Derived rather than measured, so it
     cannot drift from either of them. */
  height: CHALK_VIEW_H + CHALK_CAPTION_LINES * CHALK_CAPTION_LINE_H + CHALK_CAPTION_TOP,

  minCols: CHALK_MIN_COLS,

  renderFinal(frame) {
    frame.paint(CHALK_FRAME + demoCaption('chalk', CHALK_CAPTION));
  },

  /* No beats yet: this ticket ships the frame that four of the five routes
     through a demo see anyway, so the paths that matter most are complete
     before any motion exists. The runner still walks the animating path —
     which is what keeps the width floor and its notice live — and lands on
     `renderFinal` immediately. */
  async play() {},
});
