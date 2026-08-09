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

/* PaceLab's real output format, verbatim — which is why it is here rather than
   in the locale blocks with the runner's own chrome. It is a screenshot of a
   tool's output, not prose about it, and it says the same thing in both
   languages: the only words in it are `ran` and `NP`, the latter a term of art.
   No leading `~` on the normalized pace either: in the tool that marks a
   *Provisional Analysis*, and borrowing it to mean "approximately" would claim
   something false. Wind is computed and reported but excluded from the
   correction, and says so. */
const PACELAB_CAPTION = `<div class="demo-caption">
  <div>🏃 <span class="green bold">PaceLab</span> · NP <span class="cyan">5:14/km</span> <span class="dim">(ran 5:26/km)</span></div>
  <div class="dim">⛰️ grade +2 · 🌡️ heat +9 · 💨 wind +0 s/km (wind not in NP)</div>
</div>`;

regDemo('pacelab', {
  /* Caption-sized for now. Ticket 07 puts the season chart above it and the
     frame grows to the chart's height. */
  height: 56,

  /* The annotation's second line is 57 characters; below that it wraps into
     something that reads as broken rather than as a terminal. */
  minCols: 60,

  renderFinal(frame) {
    frame.paint(PACELAB_CAPTION);
  },

  /* Placeholder. The choreography lands in tickets 07–09; the hold is here so
     the mechanism this demo exists to exercise — the skip hint, `Escape`,
     `Ctrl+C`, tap-to-skip — is something a visitor can actually reach. */
  async play(frame) {
    frame.paint('<span class="dim">…</span>');
    await frame.sleep(2500);
  },
});
