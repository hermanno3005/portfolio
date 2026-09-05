/* ── The demo registry ──
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
 * This registry is resolved at *run* time, which is what makes the demo layer
 * load-order-free with respect to the rest of the site — necessary because the
 * language boot fires while data.js is still being parsed, before any later
 * script exists.
 *
 * ── The two rules a demo file follows ──
 *
 * The demo files are not modules and not IIFEs: they are bare top-level
 * declarations sharing one global lexical scope, because that is what a plain
 * <script> gives and what the tests reach into by name. Two rules fall out of
 * that, and this is their only home.
 *
 *   1. Every top-level symbol in a demo file is prefixed with its demo id —
 *      `PACELAB_VIEW_W`, `pacelabSpline`. One scope, no collisions.
 *
 *   2. This file loads before any demo file. `regDemo` and the two shared
 *      helpers below are read by a demo file as it is parsed, so the order
 *      inside the demos block is the one order on the page that matters. A
 *      test asserts it, so getting it wrong fails by name.
 */

const DEMOS = {};

function regDemo(id, demo) { DEMOS[id] = demo; }

/* The repo URL is read from the project data rather than written out again in
   a demo — `project <id>` already prints it from there, from the same entry
   whose `runnable` flag is why the demo can be reached at all. Escaped and
   emitted as the site's own `data-url` span, so the delegated click handler
   opens it in a new tab exactly as it does everywhere else. Absent from the
   data, the line is simply not drawn: a link to nowhere is worse than no
   link. */
function demoRepoLine(id) {
  const url = DATA.projects.find(p => p.id === id)?.url;
  if (!url) return '';
  const shown = Term.escHtml(url.replace(/^https?:\/\//, ''));
  return `<div><span class="link" data-url="${Term.escHtml(url)}">${shown}</span></div>`;
}

/* A demo's caption: the drawing above it is `aria-hidden`, and this is its text
   alternative. `lines` are the demo's own `<div>`s, verbatim; the repo line is
   appended for it.

   `style` is how the beats keep the caption present but invisible. The caption
   is in *every* paint, so the frame's height is fixed from the first one.
   Introducing it at the end would grow the element mid-run, and the view has
   already scrolled by then — this is the invariant that bit PaceLab, and it is
   here so the next demo inherits it instead of rediscovering it. */
function demoCaption(id, lines, style = '') {
  return `<div class="demo-caption"${style ? ` style="${style}"` : ''}>
  ${lines.join('\n  ')}
  ${demoRepoLine(id)}
</div>`;
}
