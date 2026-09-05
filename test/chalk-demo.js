/*
 * Walking Chalk's three beats.
 *
 * The demo is three paints held apart by `settle()`, which waits on the frame's
 * own animations. jsdom runs none, so `settle()` there falls back to its
 * substitute timer and a full run is 9.55 seconds of nothing. `fakeAnimations()`
 * gives the frame something to settle on instead — one beat at a time — which is
 * what lets a test stop on the beat it is about rather than waiting the demo out.
 *
 * Shared by the three beat files rather than copied into each: they walk the
 * same sequence and would otherwise hold three copies of the one thing about it
 * that is easy to get wrong — that beat two ends on a real `sleep()`.
 */

/**
 * Give the frame an animation to settle on, and hand back the switch that ends
 * it — the browser's role in a realm that has none. Each `finish()` ends the
 * beat on screen and arms the next.
 */
export function fakeAnimations(t) {
  const paused = [];
  let animation;
  let resolve;

  const arm = () => {
    animation = { finished: new Promise(r => { resolve = r; }), pause: () => paused.push('paused') };
  };
  arm();

  t.window.Element.prototype.getAnimations = function () {
    return this.classList.contains('demo-frame') ? [animation] : [];
  };

  return {
    finish() { const done = resolve; arm(); done(); },
    paused,
  };
}

/** Let real timers run: the hold that closes beat two is one of them. */
export const wait = (t, ms) => new Promise(r => t.window.setTimeout(r, ms));

/**
 * Run `chalk` up to the numbered beat and stop there.
 *
 * Hands back the beat as painted, the switch that ends it, and the run itself,
 * so a test can choose how it finishes.
 */
export async function chalkBeat(t, n) {
  const { finish, paused } = fakeAnimations(t);
  const done = t.run('chalk');
  await t.flush();

  for (let beat = 1; beat < n; beat++) {
    finish();
    /* Beat two closes on `CHALK_HOLD`, a real 650ms sleep — the one wait in the
       demo that no animation stands in for. */
    await wait(t, beat === 2 ? 750 : 0);
  }

  return { frame: t.frame(), finish, paused, done };
}

/**
 * The beat as painted, with the run already stopped.
 *
 * A snapshot rather than the live element: what these tests ask about is what
 * the beat *draws*, and taking a copy means none of them leaves a demo running.
 */
export async function paintedBeat(t, n) {
  const { frame, done } = await chalkBeat(t, n);
  const beat = frame.cloneNode(true);
  t.press('Escape');
  await done;
  return beat;
}

/** The animation shorthand hung on an element, or '' when it carries none. */
export const animOf = el => (el.getAttribute('style') || '').replace(/^.*animation:\s*/s, '');

/** Every `<text>` in the beat whose content is exactly `s`. */
export const texts = (frame, s) => [...frame.querySelectorAll('svg text')].filter(t => t.textContent === s);
