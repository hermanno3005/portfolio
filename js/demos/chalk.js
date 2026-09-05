/* ══════════════════════════════════════════════════════════════════════════
   Chalk — the demo

   The file is in two halves. This one is the *landing frame*: the still frame
   every route through the demo ends on — finishing, `Escape`, a click on it,
   reduced motion, a terminal too narrow to animate in. Four of those five see
   nothing else, which is why it stands entirely on its own: synchronous, and a
   function of the data below alone. Nothing in it may read animation state,
   because on most paths there was none. The three beats are the second half,
   further down, and they end on this frame element for element.

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

/* The verdict line, weight stage only, and its colour. The five sentences are
   Chalk's own, quoted from its spec §6.5 — the derivation of what that spec
   fixes is `docs/research/chalk-spec-for-demo.md`, on the branch of the same
   name.
   A function of the weight currently on the sheet rather than one string,
   because the beats step the weight up under it and the line has to answer:
   that it is live is the whole reason it is drawn at all.

   Of the spec's five states this dataset can reach two. The exercise is
   free-weight, so there is no machine row and no hint state; the entry is
   heavier than the rep-max it lands on, so nothing below `matches` is reached
   either. The margin is `weight − best[reps]` against the sheet as it stood
   before the entry. */
function chalkVerdict(weight) {
  const margin = weight - CHALK_BEST_BEFORE[CHALK_SEL - 1];
  return margin === 0
    ? { text: `Matches your ${CHALK_SEL}-rep best`, fill: 'var(--fg)' }
    : { text: `Beats your ${CHALK_SEL}-rep best by ${chalkKg(margin)} kg`, fill: 'var(--green)' };
}

const CHALK_VERDICT = chalkVerdict(CHALK_ENTRY.weight);
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
const CHALK_HEAD_SIZE = 11;
const CHALK_READ_Y  = 96;
const CHALK_READ_SIZE = 12;
const CHALK_NUM_Y   = 176;
const CHALK_NUM_SIZE = 76;
const CHALK_UNIT_SIZE = 20;
const CHALK_VERDICT_Y = 206;
const CHALK_VERDICT_SIZE = 13;
const CHALK_WAS_Y   = 230;
const CHALK_WAS_SIZE = 12;

/* One glyph's advance at the giant size, tracked −2 — so the unit rides beside
   the number rather than sitting at a fixed x, and `120`, `122.5` and `125` each
   carry their `kg` with them. Written as the rule, so the still frame's `kg` is
   wherever the beats' last one stopped, not a literal that has to be checked
   against them. */
const CHALK_ADV = CHALK_NUM_SIZE * 0.6 - 2;
const chalkUnitX = s => CHALK_COL_X + s.length * CHALK_ADV + 27.2;

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

/* One builder, for the same reason the staircase and the column have one: the
   still frame and the beat that assembles the curve must draw the identical
   line, and two copies of five attributes is exactly the drift nothing would
   catch. The beat's `anim` fades it in and never draws it along its path — a
   draw-in's own `stroke-dasharray` would override the dash below, so the ghost
   would arrive solid and turn dashed at the seam. */
const chalkGhostCurve = (anim = '') =>
  `<path${chalkAnim(anim)} d="${CHALK_GHOST_D}" fill="none" stroke="var(--cyan)" stroke-width="1.5" stroke-opacity=".45" stroke-dasharray="5 4"/>`;

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
      pieces.push({
        id: `plateau:${from}-${n - 1}`,
        /* How much of the rep axis the piece covers: a riser covers none. */
        span: n - 1 - from,
        attrs: '',
        d: `M${chalkF(chalkX(from))},${chalkF(chalkY(w))} L${chalkF(chalkX(n - 1))},${chalkF(chalkY(w))}`,
      });
    }
    if (n <= CHALK_REPS) {
      /* Backfill never rises with the rep count, so a riser is always a drop,
         from the plateau it leaves to the one it lands on. Square caps, so it
         meets both without a notch. */
      pieces.push({
        id: `riser:${n - 1}`,
        span: 0,
        attrs: ' stroke-linecap="square"',
        d: `M${chalkF(chalkX(n - 1))},${chalkF(chalkY(w))} L${chalkF(chalkX(n - 1))},${chalkF(chalkY(values[n - 1]))}`,
      });
    }
    start = n;
  }

  const marks = values.map((w, i) => {
    const n = i + 1;
    /* Hot once the cell has actually been raised to its after-value, so the
       same builder draws the sheet before the entry lands without lighting up
       cells that have not moved yet.

       This is the one thing the builder reads past its own arguments: it is not
       a general staircase renderer, it draws *this* demo's two sheets, and which
       cells are hot is a fact about the entry rather than about the values it
       was handed. Both callers pass one of those two sheets. */
    const hot = CHALK_RAISED.includes(n) && w === CHALK_BEST[i];
    return `<circle${dot(n)} cx="${chalkF(chalkX(n))}" cy="${chalkF(chalkY(w))}" r="${hot ? 4.5 : 3}" fill="${hot ? 'var(--heat)' : 'var(--green)'}"/>`;
  });

  /* One `<path>` per piece rather than one for the whole curve, so a beat can
     move a plateau and scale the two risers that meet it. Each piece carries its
     own `id` and `span`, which is what lets a beat pick out the pieces it moves
     and clock the draw-in without knowing how the staircase was cut up. `seg` is
     handed the piece, its index and the whole list, because a draw-in clock has
     to know how far along the axis this piece starts. */
  return `<g fill="none" stroke="var(--green)" stroke-width="2.5" filter="url(#ck-glow)">
      ${pieces.map((piece, i) => `<path${seg(piece, i, pieces)}${piece.attrs} d="${piece.d}"/>`).join('\n      ')}
    </g>
    <g stroke="none">${marks.join('')}</g>`;
}

/* ── The column, line by line ─────────────────────────────────────────────
 *
 * The still frame and the three beats draw the same five lines at the same five
 * y positions; a beat differs only in what it says there and in what it hangs on
 * it. One builder each, so the sheet that becomes the readout cannot land a
 * pixel away from the frame it becomes — the same argument as the single
 * staircase builder above, applied to the half of the drawing that is words.
 *
 * `anim` is a CSS animation shorthand, and an empty one draws nothing at all:
 * that is how the still frame calls these and why it carries no `animation`.
 */
const chalkText = (x, y, size, fill, s, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}"${extra}>${s}</text>`;

const chalkStyle = (...decls) => {
  const style = decls.filter(Boolean).join('; ');
  return style ? ` style="${style}"` : '';
};
const chalkAnim = anim => chalkStyle(anim && `animation:${anim}`);

const chalkHeader = (anim = '') =>
  chalkText(CHALK_COL_X, CHALK_HEAD_Y, CHALK_HEAD_SIZE, CHALK_MUTED, CHALK_EXERCISE.toUpperCase(), ` letter-spacing="2"${chalkAnim(anim)}`);
const chalkReadoutLine = (s, anim = '') =>
  chalkText(CHALK_COL_X, CHALK_READ_Y, CHALK_READ_SIZE, CHALK_MUTED, s, chalkAnim(anim));
const chalkVerdictLine = (verdict, anim = '') =>
  chalkText(CHALK_COL_X, CHALK_VERDICT_Y, CHALK_VERDICT_SIZE, verdict.fill, verdict.text, chalkAnim(anim));
const chalkWasLine = (anim = '') =>
  chalkText(CHALK_COL_X, CHALK_WAS_Y, CHALK_WAS_SIZE, CHALK_MUTED, CHALK_WAS, chalkAnim(anim));

/* The headline number with its unit beside it, wrapped so the pair can fly,
   slide or fade as one thing. `numAnim` rides on the number alone — beat three
   warms it from white to amber while the unit stays furniture. */
function chalkBig(value, unit, fill, { anim = '', origin = '', numAnim = '' } = {}) {
  return `<g${anim || origin ? ' class="ck-vb"' : ''}${chalkStyle(origin && `transform-origin:${origin}`, anim && `animation:${anim}`)}>`
    + chalkText(CHALK_COL_X, CHALK_NUM_Y, CHALK_NUM_SIZE, fill, value, ` font-weight="300" letter-spacing="-2"${chalkAnim(numAnim)}`)
    + chalkText(chalkF(chalkUnitX(value)), CHALK_NUM_Y, CHALK_UNIT_SIZE, CHALK_TICK, unit)
    + '</g>';
}

/* The readout column: the app's own screen, left of the evidence. */
const CHALK_COLUMN = `${chalkHeader()}
    ${chalkReadoutLine(CHALK_READOUT)}
    ${chalkBig(chalkKg(CHALK_BEST[CHALK_SEL - 1]), 'kg', 'var(--heat)')}
    ${chalkVerdictLine(CHALK_VERDICT)}
    ${chalkWasLine()}`;

const CHALK_FRAME = `<svg viewBox="0 0 ${CHALK_VIEW_W} ${CHALK_VIEW_H}" font-family="var(--font)" aria-hidden="true">
    ${CHALK_DEFS}
    ${CHALK_COLUMN}
    ${chalkChrome()}
    ${chalkGhostCurve()}
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
  `<div class="dim">${CHALK_EXERCISE} · entry <span class="cyan">${CHALK_ENTRY.reps} × ${chalkKg(CHALK_ENTRY.weight)} kg</span> · ${CHALK_VERDICT.text}</div>`,
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
   caption carries an emoji.

   Plus a column, because a line that exactly fills the terminal is jammed against
   both edges and reads as the wrap it only just avoided. PaceLab keeps the same
   kind of slack. That lands the floor two columns above PaceLab's, so there is a
   narrow band where `pacelab` animates and `chalk` prints the too-narrow notice —
   accepted: the floor is a property of a demo's own drawing, and shortening
   Chalk's caption to close the band would pay for it with Chalk's vocabulary. */
const CHALK_MIN_COLS = Math.max(...CHALK_CAPTION.map(line => [...line.replace(/<[^>]*>/g, '')].length)) + 1;

/* ══════════════════════════════════════════════════════════════════════════
   The beats

   Three paints, about 9.55 seconds, in PaceLab's technique: one `paint()` per
   beat, every motion declared as `@keyframes` inside the painted SVG, and the
   hold is `settle()` — a beat is over when its animations are, and the fallback
   beside each one is the substitute for a browser that cannot say so, never a
   race against one that can.

   What the beats reproduce is Chalk's own two-stage log. Beat one seeds the
   sheet from the most recent entry and asks for the weight; beat two steps that
   weight up the app's 2.5 kg grid with the verdict answering under it; beat
   three saves, and the sheet *becomes* the readout while the strength curve
   assembles beside it and the two floored cells step up. Nothing leaves the
   column: that the log sheet and the readout are the same five lines is the
   argument the whole demo is making.

   Wordless but for the exercise name, the readout, the numbers with their units,
   the verdict and the history line — and English inside the drawing in both
   locales, exactly as PaceLab's is. Only the runner's chrome around it speaks
   German.

   ── One rule about stacking animations ──

   An *out* animation fills `forwards`, never `both`. With `both` its backward
   fill applies from time zero and overrides an *in* animation listed before it,
   so the element is visible from the first frame — which is how `122.5` came to
   sit on top of `120` in the prototype. It is the reason every exit below is
   `forwards` and every entrance is `both`.
   ══════════════════════════════════════════════════════════════════════════ */

/* The weight walks up the app's own grid, from the rep-max it is about to beat
   to the entry it is going to be: 120 → 122.5 → 125, which is two taps. */
const CHALK_STEP = 2.5;
const CHALK_TAPS = Array.from(
  { length: (CHALK_ENTRY.weight - CHALK_BEST_BEFORE[CHALK_SEL - 1]) / CHALK_STEP + 1 },
  (_, i) => CHALK_BEST_BEFORE[CHALK_SEL - 1] + i * CHALK_STEP,
);

/* Stage two's header chip — where the giant rep count lands once `Next` is
   pressed, and the line that becomes the readout when the entry is saved. */
const CHALK_CHIP = `${CHALK_SEL} reps`;

/* ── The rise, as geometry ────────────────────────────────────────────────
   Every term read off the two sheets rather than typed: which cells moved, how
   far, and what the risers on either side of them have to become. The plateau
   translates up; the riser above it shortens about its top end and the one below
   lengthens about its bottom end, because those two ends do not move. */
const CHALK_RISE_FROM = CHALK_RAISED[0];
const CHALK_RISE_TO   = CHALK_RAISED.at(-1);
const CHALK_W_BEFORE  = CHALK_BEST_BEFORE[CHALK_RISE_FROM - 1];
const CHALK_W_AFTER   = CHALK_BEST[CHALK_RISE_FROM - 1];
/* The plateaus the run is wedged between. Both exist for this dataset: the
   raised run starts at 4 and ends at 5, so neither the top nor the bottom of
   the axis is involved. */
const CHALK_W_ABOVE   = CHALK_BEST[CHALK_RISE_FROM - 2];
const CHALK_W_BELOW   = CHALK_BEST[CHALK_RISE_TO];
const CHALK_RISE_DY   = chalkY(CHALK_W_AFTER) - chalkY(CHALK_W_BEFORE);   /* negative: up */
const CHALK_RISER_ABOVE = (CHALK_W_ABOVE - CHALK_W_AFTER) / (CHALK_W_ABOVE - CHALK_W_BEFORE);
const CHALK_RISER_BELOW = (CHALK_W_AFTER - CHALK_W_BELOW) / (CHALK_W_BEFORE - CHALK_W_BELOW);
const CHALK_RISE_LABEL = `+${chalkKg(CHALK_W_AFTER - CHALK_W_BEFORE)} kg`;

/* The rise is 14 pixels, which is nothing — so it is given a breath before it,
   a full second of travel, dots that swell to 2.4× on the way, and a label that
   rides up with the plateau. The payoff of the animation must not be a movement
   the visitor can miss. */
const CHALK_RISE_AT  = 2.3;
const CHALK_RISE_DUR = 1.0;
const CHALK_EASE = 'cubic-bezier(.4,0,.2,1)';

/* The curve assembles left to right on a `pathLength` clock, the way PaceLab's
   season draws. */
const CHALK_DRAW_AT   = 0.8;
const CHALK_DRAW_DUR  = 1.1;
const CHALK_RISER_UNITS = 0.12;
const CHALK_DOTS_AT   = 0.85;
const CHALK_DOT_STAGGER = 0.085;

/* Every keyframe the beats use, declared in the painted SVG. The still frame
   carries none of this: it is a different paint, and four of the five routes to
   it never see a beat at all.

   The ids and the filter id are stable rather than unique per paint. `Ctrl+C`
   leaves an abandoned frame in the scrollback, so a second run puts a second
   copy of these rules in the document — identical declarations compute to
   identical values, and a CSS animation only restarts when its computed value
   changes, so the abandoned frame stays exactly where the visitor stopped it. */
const CHALK_KEYFRAMES = `<style>
    @keyframes ckFade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes ckOut  { from { opacity: 1 } to { opacity: 0 } }
    @keyframes ckIn   { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes ckUp   { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-10px) } }
    @keyframes ckDraw { to { stroke-dashoffset: 0 } }
    @keyframes ckHeat { from { fill: var(--fg) } to { fill: var(--heat) } }
    @keyframes ckPop  { 0% { opacity: 0; transform: scale(.6) } 35% { opacity: 1; transform: scale(1.15) } 100% { opacity: 0; transform: scale(1) } }
    @keyframes ckFlyReps { to { transform: translate(0px, ${chalkF(CHALK_READ_Y - CHALK_NUM_Y)}px) scale(${(CHALK_READ_SIZE / CHALK_NUM_SIZE).toFixed(3)}) } }
    @keyframes ckRise { to { transform: translateY(${chalkF(CHALK_RISE_DY)}px) } }
    @keyframes ckRiserAbove { to { transform: scaleY(${CHALK_RISER_ABOVE.toFixed(3)}) } }
    @keyframes ckRiserBelow { to { transform: scaleY(${CHALK_RISER_BELOW.toFixed(3)}) } }
    /* The dot swells past where it is going and settles at 1.5× — which is the
       still frame's own hot radius, so the beat lands on it rather than near it. */
    @keyframes ckHot  { 0%   { fill: var(--green); transform: translateY(0) scale(1) }
                        60%  { fill: var(--heat);  transform: translateY(${chalkF(CHALK_RISE_DY)}px) scale(2.4) }
                        100% { fill: var(--heat);  transform: translateY(${chalkF(CHALK_RISE_DY)}px) scale(1.5) } }
    /* With pathLength 1 the dash is the whole line, so 1 → 0 draws it from the
       path's own start — which is the low rep count, and is why the curve runs
       forwards. */
    .ck-draw { stroke-dasharray: 1; stroke-dashoffset: 1; }
    .ck-vb   { transform-box: view-box; }
    .ck-dot  { transform-box: fill-box; transform-origin: center; }
  </style>`;

const chalkSvg = inner => `<svg viewBox="0 0 ${CHALK_VIEW_W} ${CHALK_VIEW_H}" font-family="var(--font)" aria-hidden="true">
    ${CHALK_KEYFRAMES}
    ${CHALK_DEFS}
    ${inner}
  </svg>`;

/* ── Beat one — reps, then weight ─────────────────────────────────────────
   Chalk's log opens on a giant rep count, seeded from the most recent entry.
   `Next` flies the 5 up into the stage-two header chip — the stage change is
   carried by that flight, not by a label — and the weight takes its place. The
   verdict wakes only once there is a weight for it to judge: before that the app
   has nothing to say, and drawing it early would be a caption pretending to be
   a reading. */
const CHALK_BEAT_ONE = chalkSvg(`
    ${chalkHeader('ckFade .5s ease .1s both')}
    ${chalkBig(String(CHALK_SEL), 'reps', 'var(--fg)', {
      origin: `${CHALK_COL_X}px ${CHALK_NUM_Y}px`,
      anim: 'ckIn .45s ease .3s both, ckFlyReps .55s cubic-bezier(.6,0,.25,1) 1.3s forwards, ckOut .2s ease 1.7s forwards',
    })}
    ${chalkReadoutLine(CHALK_CHIP, 'ckFade .25s ease 1.75s both')}
    ${chalkBig(chalkKg(CHALK_TAPS[0]), 'kg', 'var(--fg)', { anim: 'ckIn .45s ease 1.55s both' })}
    ${chalkVerdictLine(chalkVerdict(CHALK_TAPS[0]), 'ckFade .4s ease 2.05s both')}`);

/* ── Beat two — two taps ──────────────────────────────────────────────────
   One rhythm, repeated: the `+` pops beside the unit, the number swaps a tenth
   of a second later, and the verdict answers half a tenth after that. It is the
   verdict changing that makes the point — the sentence is live, computed against
   the rep-max the entry is about to take, and not a caption sitting under a
   number. */
const chalkTapAt  = i => 0.5 + i * 0.9;
const chalkSwapAt = i => chalkTapAt(i) + 0.1;

/* A `+` popping beside the unit at the instant of a tap. */
function chalkTap(value, at) {
  const x = chalkUnitX(value) + 44;
  const y = CHALK_NUM_Y - 26;
  return `<text class="ck-vb" x="${chalkF(x)}" y="${y}" font-size="22" fill="var(--heat)" text-anchor="middle"`
    + chalkStyle(`transform-origin:${chalkF(x)}px ${y - 8}px`, `animation: ckPop .5s ease ${at}s both`)
    + '>+</text>';
}

const CHALK_BEAT_TWO = chalkSvg(`
    ${chalkHeader()}
    ${chalkReadoutLine(CHALK_CHIP)}
    ${CHALK_TAPS.map((w, i) => chalkBig(chalkKg(w), 'kg', 'var(--fg)', {
      anim: [
        i === 0 ? '' : `ckIn .3s ease ${chalkSwapAt(i - 1)}s both`,
        i === CHALK_TAPS.length - 1 ? '' : `ckUp .25s ease ${chalkSwapAt(i)}s forwards`,
      ].filter(Boolean).join(', '),
    })).join('\n    ')}
    ${CHALK_TAPS.slice(0, -1).map((w, i) => chalkTap(chalkKg(w), chalkTapAt(i))).join('\n    ')}
    ${CHALK_TAPS.map((w, i) => chalkVerdictLine(chalkVerdict(w), [
      i === 0 ? '' : `ckIn .3s ease ${chalkSwapAt(i - 1) + 0.05}s both`,
      i === CHALK_TAPS.length - 1 ? '' : `ckUp .25s ease ${chalkSwapAt(i) + 0.05}s forwards`,
    ].filter(Boolean).join(', '))).join('\n    ')}`);

/* The hold that closes beat two. Not a keyframe and not a `settle()`: the beat's
   own animations are over, and this is a deliberate breath on the entry as it
   will be saved. The prototype spent a `1ms` dummy keyframe to buy it, which is
   a sleep in a keyframe costume. */
const CHALK_HOLD = 650;

/* ── Beat three — Save, into the record ───────────────────────────────────
   The chip slides out and the readout line slides in over it, the number warms
   to amber: the sheet has become the readout and nothing left the column. The
   curve assembles on the right — furniture, then the ghost, then the *old*
   staircase drawing left to right with its dots appearing as the pen passes.
   Then the breath, and the two floored cells rise together. They rise together
   because a rep-max is what the lift demonstrated: `5 × 125` proves 125 kg at 5
   reps and at 4, so one of them moving alone would be the wrong claim. */

/* The three pieces of the staircase that move, keyed by the id the builder gives
   them — so which piece moves is derived from `CHALK_RAISED` and cannot drift
   from the cells the still frame highlights. A riser scales about the end that
   stays put, which is what keeps the staircase joined while the plateau between
   them travels: the drop *into* the raised run is pinned at its top, the drop
   *out* of it at its bottom. */
const CHALK_MOVES = {
  [`plateau:${CHALK_RISE_FROM - 1}-${CHALK_RISE_TO}`]: { name: 'ckRise', origin: '' },
  [`riser:${CHALK_RISE_FROM - 1}`]: {
    name: 'ckRiserAbove',
    origin: `${chalkF(chalkX(CHALK_RISE_FROM - 1))}px ${chalkF(chalkY(CHALK_W_ABOVE))}px`,
  },
  [`riser:${CHALK_RISE_TO}`]: {
    name: 'ckRiserBelow',
    origin: `${chalkF(chalkX(CHALK_RISE_TO))}px ${chalkF(chalkY(CHALK_W_BELOW))}px`,
  },
};

/* The draw-in and the rise, hung on the single staircase builder's pieces. */
function chalkSegAnim(piece, i, pieces) {
  /* A riser covers none of the axis, so it is given a token slice of the budget
     rather than a share of nothing — the pen is seen turning the corner. */
  const units = p => p.span || CHALK_RISER_UNITS;
  const per = CHALK_DRAW_DUR / pieces.reduce((sum, p) => sum + units(p), 0);
  const at = CHALK_DRAW_AT + pieces.slice(0, i).reduce((sum, p) => sum + units(p), 0) * per;
  const move = CHALK_MOVES[piece.id];

  const animations = [
    `ckDraw ${(units(piece) * per).toFixed(2)}s linear ${at.toFixed(2)}s both`,
    move && `${move.name} ${CHALK_RISE_DUR}s ${CHALK_EASE} ${CHALK_RISE_AT}s both`,
  ].filter(Boolean).join(', ');

  return ` class="ck-vb ck-draw" pathLength="1"`
    + chalkStyle(move && move.origin && `transform-origin:${move.origin}`, `animation:${animations}`);
}

/* A dot fades in as the pen reaches its cell; the two the entry floored also
   ride up with the plateau, swelling and turning amber on the way. */
function chalkDotAnim(n) {
  const animations = [
    `ckFade .25s ease ${(CHALK_DOTS_AT + (n - 1) * CHALK_DOT_STAGGER).toFixed(3)}s both`,
    CHALK_RAISED.includes(n) && `ckHot ${CHALK_RISE_DUR}s ${CHALK_EASE} ${CHALK_RISE_AT}s both`,
  ].filter(Boolean).join(', ');

  return ' class="ck-dot"' + chalkAnim(animations);
}

/* `+5 kg` floats up with the plateau and leaves again: the still frame does not
   carry it, and a label that stayed would be a second thing to read where the
   number and the sentence are already saying it. */
const CHALK_RISE_LABEL_AT = (CHALK_RISE_AT + CHALK_RISE_DUR + 0.8).toFixed(2);

const CHALK_BEAT_THREE = chalkSvg(`
    ${chalkHeader()}
    ${chalkReadoutLine(CHALK_CHIP, 'ckUp .3s ease .2s forwards')}
    ${chalkReadoutLine(CHALK_READOUT, 'ckIn .35s ease .3s both')}
    ${chalkBig(chalkKg(CHALK_ENTRY.weight), 'kg', 'var(--fg)', { numAnim: 'ckHeat .6s linear .3s both' })}
    ${chalkVerdictLine(CHALK_VERDICT)}
    ${chalkWasLine('ckFade .4s ease 3.7s both')}
    <g style="animation: ckFade .5s ease .3s both">${chalkChrome()}</g>
    ${chalkGhostCurve('ckFade .7s ease .5s both')}
    ${chalkStaircase(CHALK_BEST_BEFORE, { seg: chalkSegAnim, dot: chalkDotAnim })}
    <text class="ck-vb" x="${chalkF((chalkX(CHALK_RISE_FROM) + chalkX(CHALK_RISE_TO)) / 2)}" y="${chalkF(chalkY(CHALK_W_BEFORE) - 16)}" font-size="13" font-weight="700" fill="var(--heat)" text-anchor="middle"
      style="animation: ckFade .3s ease ${CHALK_RISE_AT}s both, ckRise ${CHALK_RISE_DUR}s ${CHALK_EASE} ${CHALK_RISE_AT}s both, ckOut .5s ease ${CHALK_RISE_LABEL_AT}s forwards">${CHALK_RISE_LABEL}</text>`);

/* The caption arrives over the last of beat three, which makes its fade the
   closing motion of the beat and therefore the thing `settle()` is still waiting
   on. That is what the frame's fixed height was bought for: the still frame,
   where the caption is simply opaque, cannot take over before this has played. */
const CHALK_CAP_IN = `animation: ckFade .5s ease ${(CHALK_RISE_AT + CHALK_RISE_DUR + 0.7).toFixed(2)}s both`;

regDemo('chalk', {
  /* The drawing at most its viewBox height — it scales down with a narrow
     window, never up — plus the caption. Derived rather than measured, so it
     cannot drift from either of them. */
  height: CHALK_VIEW_H + CHALK_CAPTION_LINES * CHALK_CAPTION_LINE_H + CHALK_CAPTION_TOP,

  minCols: CHALK_MIN_COLS,

  renderFinal(frame) {
    frame.paint(CHALK_FRAME + demoCaption('chalk', CHALK_CAPTION));
  },

  /* The whole animation, in three paints — and the runner's closing paint of the
     still frame afterwards, which is invisible because beat three already ends
     on it: the same staircase builder draws both, so the seam cannot drift.

     About 9.55 seconds: 2.45, 1.85 plus the hold, and 4.60. Nobody adds that up
     anywhere — it is what the three stylesheets already say.

     `settle()` rather than `sleep()`: a beat is over when its keyframes are, and
     each fallback here is set by the last real animation in its beat, for a
     browser that cannot report one. `CHALK_HOLD` is the one legitimate sleep —
     an explicit breath on the finished entry, which is not the length of any
     animation and has no keyframes to drift from. There are no breaths between
     the beats: beat two opens with air of its own and closes on that hold, so
     PaceLab's 150 ms constant would be inherited shape without the reason.

     One hazard, on the record. `Ctrl+C` is the one exit that does not land on
     the still frame — `freeze()` pauses the frame in place — so an interrupt
     during the rise catches cells 4 and 5 mid-flight, at a rep-max around
     122.4 kg that never happened, on a labelled axis. That is accepted rather
     than overlooked: the interrupt is a deliberate act by someone who was just
     told `press esc to skip`, `^C` prints directly beneath the frozen frame,
     and the airborne `+5 kg` badge is itself a loud signal that the value is in
     motion. Do not "fix" it by landing `Ctrl+C` on the still frame — that would
     make the interrupt lie about where the visitor stopped. */
  async play(frame) {
    frame.paint(CHALK_BEAT_ONE + demoCaption('chalk', CHALK_CAPTION, 'opacity:0'));
    await frame.settle(2600);

    frame.paint(CHALK_BEAT_TWO + demoCaption('chalk', CHALK_CAPTION, 'opacity:0'));
    await frame.settle(2000);
    await frame.sleep(CHALK_HOLD);

    frame.paint(CHALK_BEAT_THREE + demoCaption('chalk', CHALK_CAPTION, CHALK_CAP_IN));
    await frame.settle(4800);
  },
});
