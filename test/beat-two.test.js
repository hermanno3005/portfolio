/*
 * Beat two — the pull-back, and the hand-off that must not be a cut.
 *
 * The number from beat one is not discarded: it flies to the August slot and
 * crossfades into the `5:14 NP` end label, becoming that month's data point.
 * The season then assembles forwards, April to August.
 *
 * What most of this file is really about is the hard constraint: beat two's
 * final state has to be the landing frame, element for element, so the closing
 * paint is imperceptible. Two mechanisms deliver that and both are tested here
 * — the landing transform is *derived* from the end label's real coordinates,
 * and the drawing itself comes from one source that both paints share.
 *
 * jsdom runs no animations, so `settle()` there falls back to its substitute
 * timer. `fakeAnimations()` gives the frame something to settle on instead, one
 * beat at a time, which is the only way to reach beat two without waiting out
 * eight seconds of fallback.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';
import { css, rule, keyframes, flatten, delayOf } from './animation.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

/**
 * Give the frame an animation to settle on, and hand back the switch that ends
 * it — the browser's role in a realm that has none.
 *
 * Each `finish()` ends the beat currently on screen and arms the next one, so a
 * test can stop between the two beats rather than falling straight through to
 * the landing frame.
 */
function fakeAnimations(t) {
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

/** Let real timers run — the 150ms breath between the beats is one of them. */
const breathe = (t = term) => new Promise(r => t.window.setTimeout(r, 250));

/**
 * Run `pacelab` up to beat two and stop there.
 *
 * Hands back the beat as painted, the switch that ends it, and the run itself
 * so a test can choose how it finishes.
 */
async function beatTwo(t = term) {
  const { finish, paused } = fakeAnimations(t);
  const done = t.run('pacelab');
  await t.flush();

  finish();                 /* beat one is over */
  await breathe(t);         /* …the breath, then beat two paints */

  return { frame: t.frame(), finish, paused, done };
}

/** Beat two as painted, with the run already stopped and nothing left playing. */
async function paintedBeat(t = term) {
  const { frame, finish, done } = await beatTwo(t);
  const beat = frame.cloneNode(true);
  finish();
  await done;
  return beat;
}

/** The landing frame, reached the quick way. */
async function landing(t = term) {
  const done = t.run('pacelab');
  t.press('Escape');
  await done;
  return t.frame();
}

/** When the last animation in a paint finishes, in seconds — the beat's length. */
function beatLength(frame) {
  const ends = [...flatten(css(frame)).matchAll(/animation:\s*([^;]+);/g)]
    .flatMap(([, value]) => value.split(',').map(part => {
      const times = [...part.matchAll(/(-?[\d.]+)s/g)].map(m => Number(m[1]));
      return times.length ? times[0] + (times[1] ?? 0) : 0;
    }));

  /* The caption's fade lives in a style attribute rather than the stylesheet. */
  const style = frame.querySelector('.demo-caption')?.getAttribute('style') ?? '';
  const caption = [...style.matchAll(/(-?[\d.]+)s/g)].map(m => Number(m[1]));
  if (caption.length) ends.push(caption[0] + (caption[1] ?? 0));

  return Math.max(...ends);
}

describe('the number that does not disappear', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat();
  });

  it('carries beat one\'s result into this beat at the size it ended at', () => {
    const fly = beat.querySelector('#pl-fly');

    expect(fly.textContent).toBe('5:14');
    expect(fly.getAttribute('font-size')).toBe(String(term.window.eval('PACELAB_ODO_SIZE')));
    expect(fly.getAttribute('x')).toBe(String(term.window.eval('PACELAB_BEAT_LEFT')));
    expect(fly.getAttribute('y')).toBe(String(term.window.eval('PACELAB_ODO_Y')));
    /* Green, because beat one's verdict travels with it. */
    expect(fly.getAttribute('fill')).toBe('var(--green)');
  });

  it('lands exactly on the end label, by geometry rather than by eye', () => {
    /* Hand-guessed offsets came out ~78px wide of where the label sits. The
       transform has to be the difference of the two positions and the ratio of
       the two font sizes, or the crossfade is a jump. */
    const w = term.window.eval.bind(term.window);
    const [, tx, ty, scale] = keyframes(beat, 'plFly')
      .match(/to\s*\{ transform: translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/);

    expect(Number(tx)).toBeCloseTo(w('PACELAB_LABEL_X') - w('PACELAB_BEAT_LEFT'), 1);
    expect(Number(ty)).toBeCloseTo(w('PACELAB_LABEL_NP_Y') - w('PACELAB_ODO_Y'), 1);
    expect(Number(scale)).toBeCloseTo(w('PACELAB_LABEL_SIZE') / w('PACELAB_ODO_SIZE'), 5);

    /* …and the origin is the point those coordinates are measured from. */
    expect(rule(beat, '#pl-fly')).toContain(`transform-origin: ${w('PACELAB_BEAT_LEFT')}px ${w('PACELAB_ODO_Y')}px`);
  });

  it('crossfades into the label rather than one following the other', () => {
    const fly = rule(beat, '#pl-fly');

    /* One event, so one moment: the number goes as the label comes. */
    expect(delayOf(fly, 'plFadeOut')).toBe(delayOf(rule(beat, '.pl-arrive'), 'plFade'));
    /* And not before it has arrived. */
    const flight = term.window.eval('PACELAB_FLY_DUR');
    expect(delayOf(fly, 'plFadeOut')).toBeGreaterThanOrEqual(delayOf(fly, 'plFly') + flight);
  });

  it('becomes the August data point as well as the label', () => {
    const arrived = [...beat.querySelectorAll('.pl-arrive')];

    expect(arrived.map(el => el.tagName)).toContain('circle');
    expect(arrived.map(el => el.textContent).join('')).toContain('5:14 NP');
    /* The dot it becomes is August's, not another month's. */
    const dot = arrived.find(el => el.tagName === 'circle');
    const npPoints = term.window.eval('PACELAB_NP_PTS');
    expect(Number(dot.getAttribute('cx'))).toBeCloseTo(npPoints.at(-1)[0], 5);
    expect(Number(dot.getAttribute('cy'))).toBeCloseTo(npPoints.at(-1)[1], 5);
  });
});

describe('the season assembling', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat();
  });

  it('draws observed first, then normalized, then fills the gap between them', () => {
    const observed = delayOf(rule(beat, '#pl-obs'), 'plDraw');
    const normalized = delayOf(rule(beat, '#pl-np'), 'plDraw');
    const gap = delayOf(rule(beat, '#pl-gap-in'), 'plFade');

    expect(observed).toBeLessThan(normalized);
    expect(normalized).toBeLessThanOrEqual(gap);
  });

  it('runs forwards, April to August', () => {
    /* `stroke-dashoffset` 1 → 0 reveals from the path's start, and the path
       starts at April. The dots follow in the same direction. */
    expect(keyframes(beat, 'plDraw')).toContain('stroke-dashoffset: 0');
    expect(css(beat)).toMatch(/\.pl-draw\s*\{[^}]*stroke-dashoffset:\s*1/);

    const delays = [...beat.querySelectorAll('circle[style*="animation-delay"]')]
      .map(el => Number(el.getAttribute('style').match(/([\d.]+)s/)[1]));

    expect(delays).not.toHaveLength(0);
    const observed = delays.slice(0, 5);
    expect(observed).toEqual([...observed].sort((a, b) => a - b));
  });

  it('does not fade August\'s normalized dot in with the rest — it flew there', () => {
    const npPoints = term.window.eval('PACELAB_NP_PTS');
    const august = [...beat.querySelectorAll('circle')]
      .find(el => Number(el.getAttribute('cx')) === npPoints.at(-1)[0]
               && Number(el.getAttribute('cy')) === npPoints.at(-1)[1]);

    expect(august.classList.contains('pl-arrive')).toBe(true);
    expect(august.getAttribute('style')).toBeNull();
  });

  it('clears beat one\'s leftovers instead of leaving them under the chart', () => {
    const gone = [...beat.querySelectorAll('.pl-gone')];

    /* The strip, the unit and the term the label was built into. */
    expect(gone.map(el => el.textContent).join(' ')).toContain('NORMALIZED PACE');
    expect(gone.map(el => el.textContent).join(' ')).toContain('/km');
    expect(gone.map(el => el.textContent).join(' ')).toContain('wind');
    expect(rule(beat, '.pl-gone')).toContain('plFadeOut');
  });
});

describe('the seam it opens on', () => {
  /* The other place a pop can appear: beat one is still on screen when this
     paint replaces it, so what it redraws has to sit exactly where beat one
     left it — same place, same size, same colour — before it fades. */
  let beat;
  let one;

  beforeEach(async () => {
    beat = await paintedBeat();
    one = term.document.createElement('div');
    one.innerHTML = term.window.eval('PACELAB_BEAT_ONE');
  });

  const box = el => ['x', 'y', 'fill', 'font-size', 'letter-spacing']
    .map(name => `${name}=${el.getAttribute(name)}`).join(' ');

  const gone = text => [...beat.querySelectorAll('.pl-gone')].find(el => el.textContent === text)
    ?? [...beat.querySelectorAll('.pl-gone')].find(el => el.textContent.includes(text));

  it('redraws beat one\'s strip and unit exactly where they already are', () => {
    expect(box(gone('WBGT'))).toBe(box(one.querySelector('#pl-meta')));
    expect(box(gone('/km'))).toBe(box(one.querySelector('#pl-unit')));
  });

  it('picks the built label up as the two words a slide apart that it is', () => {
    const lead = one.querySelector('#pl-normalized');
    const shift = term.window.eval('PACELAB_LABEL_SHIFT');

    /* Not collapsed into the one string it reads as: `PACE` sits where beat
       one's *transform* put it, and re-deriving that from a per-character
       advance — which is an estimate — is how the seam gets a pop. */
    expect(box(gone('NORMALIZED'))).toBe(box(lead));
    expect(Number(gone('PACE').getAttribute('x')))
      .toBeCloseTo(Number(lead.getAttribute('x')) + shift, 5);
    /* Green by the time the beat ends, which is when this paint picks it up. */
    expect(gone('PACE').getAttribute('fill')).toBe('var(--green)');
  });

  it('starts the flight from where the odometer stopped', () => {
    const fly = beat.querySelector('#pl-fly');
    const odo = [...one.querySelectorAll('#pl-odo text')].at(-1);

    for (const name of ['x', 'font-size', 'font-weight', 'letter-spacing']) {
      expect(fly.getAttribute(name)).toBe(odo.getAttribute(name));
    }
    expect(fly.textContent).toBe(odo.textContent);
  });
});

describe('the hand-off, which may not be a cut', () => {
  /* Every drawn element of a paint, as tag plus the attributes that decide what
     it looks like. Ids, classes, styles and `pathLength` are the animation's
     own hooks and say nothing about the drawing; groups carry no paint at all.
     What is left is the frame a visitor sees. */
  const HOOKS = new Set(['id', 'class', 'style', 'pathLength']);

  function drawing(frame) {
    return [...frame.querySelector('svg').querySelectorAll('*')]
      .filter(el => el.tagName !== 'g' && el.tagName !== 'style' && el.tagName !== 'defs')
      .filter(el => !el.closest('defs'))
      /* What beat two adds and then takes away again: the traveller, and beat
         one's frame clearing out from under it. Both end at `opacity: 0`. */
      .filter(el => el.id !== 'pl-fly' && !el.closest('.pl-gone'))
      .map(el => `${el.tagName}{${[...el.attributes]
        .filter(a => !HOOKS.has(a.name))
        .map(a => `${a.name}=${a.value}`)
        .sort()
        .join(' ')}}${el.children.length ? '' : el.textContent}`);
  }

  it('ends on the landing frame\'s drawing, element for element', async () => {
    const beat = await paintedBeat();
    const final = await landing();

    /* The closing paint is imperceptible because there is nothing to perceive:
       the same elements, the same order, the same coordinates. Four separate
       routes deliver that frame, and a pop on the happy path is a pop in all
       of them. */
    expect(drawing(beat)).toEqual(drawing(final));
  });

  it('keeps the frame the same height it has been since the first paint', async () => {
    const first = term.document.createElement('div');
    first.innerHTML = term.window.eval('PACELAB_BEAT_ONE');

    const { frame, finish, done } = await beatTwo();

    const viewBox = frame.querySelector('svg').getAttribute('viewBox');
    const captionLines = frame.querySelectorAll('.demo-caption > div').length;

    finish();
    await done;

    /* All three paints, not just the two on either side of the hand-off: the
       view has scrolled by the time any of them lands, so a frame that grows
       mid-run moves what the visitor is already looking at. */
    expect(first.querySelector('svg').getAttribute('viewBox')).toBe(viewBox);
    expect(term.frame().querySelector('svg').getAttribute('viewBox')).toBe(viewBox);
    expect(term.frame().querySelectorAll('.demo-caption > div')).toHaveLength(captionLines);
  });

  it('has the caption already at full opacity when the landing frame takes over', async () => {
    const beat = await paintedBeat();
    const caption = beat.querySelector('.demo-caption');
    const style = caption.getAttribute('style');

    /* Present since beat one at `opacity: 0`, so the height never moved; it
       fades in here, and finishing is part of what `settle()` waits for. */
    expect(style).toContain('plFade');
    expect(style).not.toContain('opacity:0');
    expect(beatLength(beat)).toBeGreaterThanOrEqual(
      Number(style.match(/([\d.]+)s/)[1]) + Number(style.match(/[\d.]+s\s+\w+\s+([\d.]+)s/)?.[1] ?? 0),
    );
  });
});

describe('the whole choreography', () => {
  const source = () => fs.readFileSync(path.join(ROOT, 'js', 'demos.js'), 'utf8');

  it('runs for about eight seconds, in two beats and one breath', async () => {
    const one = term.window.eval('PACELAB_BEAT_ONE');
    const holder = term.document.createElement('div');
    holder.innerHTML = one;

    const total = beatLength(holder) + 0.15 + beatLength(await paintedBeat());

    expect(total).toBeGreaterThan(7.5);
    expect(total).toBeLessThan(8.6);
  });

  it('holds on the animations, never on a duration written beside them', () => {
    const play = source().match(/async play\(frame\)\s*\{[\s\S]*?\n {2}\}/)[0];

    /* Two beats, two `settle()` holds. The one legitimate `sleep` left is the
       breath between them, which is not the length of any animation. */
    expect(play.match(/frame\.settle\(/g)).toHaveLength(2);
    expect(play.match(/frame\.sleep\(/g)).toHaveLength(1);
    expect(play).toContain('frame.sleep(150)');
  });
});

describe('stopping it mid-beat', () => {
  it('skips straight to the landing frame on Escape, with no dead air', async () => {
    const { done } = await beatTwo();
    const started = Date.now();

    term.press('Escape');
    await done;

    expect(Date.now() - started).toBeLessThan(1000);
    expect(term.frame().querySelector('#pl-fly')).toBeNull();
    expect(term.frame().textContent).toContain('SEASON');
  });

  it('leaves the partial beat alone on Ctrl+C and returns a bare prompt', async () => {
    const { paused, done } = await beatTwo();

    term.press('c', { ctrlKey: true });
    await done;

    expect(term.frame().querySelector('#pl-fly')).not.toBeNull();
    expect(paused).not.toHaveLength(0);
    expect(term.lines().at(-1)).toBe('^C');
    expect(term.inputValue()).toBe('');
    expect(term.busy()).toBe(false);
  });
});

describe('what the beat may not disturb', () => {
  it('renders identically under lang de — the beat has no words to translate', async () => {
    const inEnglish = (await paintedBeat()).querySelector('svg').outerHTML;

    const german = await mountTerminal();
    german.run('lang de');
    const inGerman = (await paintedBeat(german)).querySelector('svg').outerHTML;
    german.cleanup();

    expect(inGerman).toBe(inEnglish);
  });

  it('is skipped entirely under reduced motion', async () => {
    term.cleanup();
    term = await mountTerminal({ reducedMotion: true });

    await term.run('pacelab');

    expect(term.frame().querySelector('#pl-fly')).toBeNull();
    expect(term.frame().textContent).toContain('5:14 NP');
  });

  it('is skipped entirely below the width floor', async () => {
    const { Element, HTMLElement } = term.window;
    Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 300 });
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { width: (this.textContent.length || 1) * 10, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
    };

    await term.run('pacelab');

    expect(term.frame().querySelector('#pl-fly')).toBeNull();
    expect(term.frame().textContent).toContain('5:14 NP');
  });
});
