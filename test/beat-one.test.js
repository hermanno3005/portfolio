/*
 * Beat one — one number losing weight.
 *
 * The beat is a single `paint()` whose motion is declared as CSS `@keyframes`
 * inside the painted SVG, held by `settle()`. That shape is what most of these
 * tests are really about: the drawing is checked for the things a visitor is
 * meant to read without words — the number, the three chips, the two that fly
 * in against the one that does not — and the hold is checked for being governed
 * by the animations rather than by a duration constant sitting beside them.
 *
 * jsdom runs no animations, so `settle()` there falls back to its substitute
 * timer. `fakeAnimations()` below gives the frame something to settle on, which
 * is both the only way to exercise the real path and the reason this file runs
 * in milliseconds instead of in beats.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';
import { css, rule, keyframes } from './animation.js';

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
 */
function fakeAnimations(t) {
  let finish;
  const paused = [];
  const finished = new Promise(resolve => { finish = resolve; });
  const animation = { finished, pause: () => paused.push('paused') };
  t.window.Element.prototype.getAnimations = function () {
    return this.classList.contains('demo-frame') ? [animation] : [];
  };
  return { finish, paused };
}

/** Start `pacelab` and hand back the beat as painted, mid-flight. */
async function beatOne(t = term) {
  const done = t.run('pacelab');
  await t.flush();
  return { frame: t.frame(), done };
}

/**
 * The beat as painted, with the run already stopped.
 *
 * A snapshot rather than the live element: what most of these tests ask about
 * is what the beat *draws*, and taking a copy means none of them has to leave a
 * demo running behind it.
 */
async function paintedBeat(t = term) {
  const { frame, done } = await beatOne(t);
  const beat = frame.cloneNode(true);
  t.press('Escape');
  await done;
  return beat;
}

/** The chip group whose text mentions `label`. */
function chip(frame, label) {
  return [...frame.querySelectorAll('svg g')].find(g => g.textContent.includes(label));
}

describe('the number', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat();
  });

  it('opens on the pace as run and counts down to the normalized one', () => {
    const digits = [...beat.querySelectorAll('#pl-odo text')].map(t => t.textContent);

    expect(digits.at(0)).toBe('5:26');
    expect(digits.at(-1)).toBe('5:14');
    /* One step per second shed, so the count reads as arithmetic rather than as
       a dissolve between two states. */
    expect(digits).toHaveLength(13);
    expect(css(beat)).toContain(`steps(${digits.length - 1})`);
  });

  it('slides the drum by exactly one value per step', () => {
    const strip = [...beat.querySelectorAll('#pl-odo text')];
    const pitch = Number(strip[1].getAttribute('dy')) - Number(strip[0].getAttribute('dy'));
    const travel = Number(keyframes(beat, 'plOdo').match(/translateY\(-([\d.]+)px\)/)[1]);

    /* Off by one pitch and every value lands half a line out of its window. */
    expect(pitch).toBe(Number(strip[0].getAttribute('font-size')));
    expect(travel).toBe(pitch * (strip.length - 1));
  });

  it('is the only thing on screen at size — no chart in this beat', () => {
    const biggest = Math.max(...[...beat.querySelectorAll('svg text')]
      .map(t => Number(t.getAttribute('font-size') || 0)));

    expect(biggest).toBe(96);
    expect(beat.textContent).not.toContain('SEASON');
    expect(beat.textContent).not.toContain('5:26 ran');
  });

  it('turns green as it lands, rather than arriving green', () => {
    /* The colour is the verdict, so it has to happen *on* the count: same
       duration and same delay as the drum, from the body colour to green. */
    expect(keyframes(beat, 'plHue')).toMatch(/to \{ fill: var\(--green\) \}/);
    expect(css(beat)).toMatch(/#pl-odo text \{ animation: plHue 1\.5s linear 2\.2s/);
    expect(css(beat)).toMatch(/#pl-odo\s+\{ animation: plOdo 1\.5s steps\(\d+\) 2\.2s/);
  });
});

describe('the chips', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat();
  });

  it('arrives staggered, one per term of the correction', () => {
    const delays = ['grade', 'heat', 'wind']
      .map(name => rule(beat, `#${chip(beat, name).id}`))
      .map(source => Number(source.match(/plChipIn [\d.]+s [^\s]+ ([\d.]+)s/)[1]));

    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(3);
  });

  it('states the two applied costs in the colours they are charged in', () => {
    expect(chip(beat, 'grade').innerHTML).toContain('var(--cyan)');
    expect(chip(beat, 'grade').textContent).toContain('+2 s/km');
    expect(chip(beat, 'heat').innerHTML).toContain('var(--heat)');
    expect(chip(beat, 'heat').textContent).toContain('+9 s/km');
  });

  it('names heat by its glyph and never calls the model a temperature', () => {
    /* Heat is wet-bulb globe temperature, not the air temperature a visitor
       reads off a forecast — a thermometer is fine, `30 °C` would be a claim. */
    expect(chip(beat, 'heat').textContent).toContain('🌡');
    expect(beat.textContent).not.toContain('°C');
  });

  it('leaves wind visibly outside the correction, and never lets it in', () => {
    const wind = chip(beat, 'wind');

    expect(wind.querySelector('rect').getAttribute('stroke-dasharray')).toBeTruthy();
    expect(wind.querySelector('[text-decoration="line-through"]')).not.toBeNull();
    expect(wind.innerHTML).not.toContain('var(--cyan)');
    expect(wind.innerHTML).not.toContain('var(--heat)');

    /* The two that count fly into the number; wind has no exit at all. */
    const flies = id => rule(beat, `#${id}`).includes('plChipGo');
    expect(flies(chip(beat, 'grade').id)).toBe(true);
    expect(flies(chip(beat, 'heat').id)).toBe(true);
    expect(flies(wind.id)).toBe(false);
  });

  it('still reports the value it declined to charge', () => {
    /* Wind was measured and then left out — which only reads as a decision if
       the number it came to is on screen next to the two that were applied. */
    expect(chip(beat, 'wind').textContent).toContain('+0');
    expect(chip(beat, 'wind').textContent).toContain('not in NP');
  });
});

describe('the label, which is built rather than swapped', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat();
  });

  it('keeps PACE on screen and brings NORMALIZED in ahead of it', () => {
    const pace = beat.querySelector('#pl-pace');
    const normalized = beat.querySelector('#pl-normalized');

    /* Both are in the *first* paint: the word the visitor is already reading
       survives the correction, which is what the metric is. */
    expect(pace.textContent).toBe('PACE');
    expect(normalized.textContent).toBe('NORMALIZED');
    expect(pace.getAttribute('x')).toBe(normalized.getAttribute('x'));
  });

  it('slides PACE by exactly the width of the word arriving in front of it', () => {
    const arriving = beat.querySelector('#pl-normalized').textContent;
    const advance = term.window.eval('PACELAB_LABEL_ADVANCE');
    const shift = Number(keyframes(beat, 'plShift').match(/to \{ transform: translateX\(([\d.]+)px\)/)[1]);

    /* Read off the drawing rather than off the constant: the shift has to
       follow the word, so changing the word and not the shift is exactly the
       mistake worth catching — one space between the two, no more. */
    expect(shift).toBeCloseTo((arriving.length + 1) * advance, 5);
  });

  it('turns PACE green on the same beat, so the term lands as one colour', () => {
    const pace = rule(beat, '#pl-pace');

    expect(pace).toContain('plShift');
    expect(pace).toContain('plGreen');
    expect(keyframes(beat, 'plGreen')).toMatch(/to \{ fill: var\(--green\) \}/);
    expect(beat.querySelector('#pl-normalized').getAttribute('fill')).toBe('var(--green)');
  });
});

describe('the hold', () => {
  it('lasts as long as the animations do, and is not timed beside them', async () => {
    const { finish } = fakeAnimations(term);
    const { frame, done } = await beatOne();
    const started = Date.now();

    expect(frame.querySelector('#pl-odo')).not.toBeNull();

    finish();
    await done;

    /* The beat is ~4.1s of keyframes. Ending the moment the animations do,
       rather than when a constant beside them says so, is the whole reason
       `settle()` exists. */
    expect(Date.now() - started).toBeLessThan(1000);
    expect(term.frame().textContent).toContain('5:14 NP');
  });

  it('hands the frame to the landing chart once the beat is over', async () => {
    const { finish } = fakeAnimations(term);
    const { done } = await beatOne();

    finish();
    await done;

    expect(term.frame().textContent).toContain('SEASON');
    expect(term.frame().querySelector('#pl-odo')).toBeNull();
    expect(term.busy()).toBe(false);
  });
});

describe('stopping it mid-beat', () => {
  it('skips straight to the landing frame on Escape, with no dead air', async () => {
    fakeAnimations(term);
    const { done } = await beatOne();
    const started = Date.now();

    term.press('Escape');
    await done;

    expect(Date.now() - started).toBeLessThan(1000);
    expect(term.frame().textContent).toContain('5:14 NP');
  });

  it('leaves the partial beat alone on Ctrl+C and returns a bare prompt', async () => {
    fakeAnimations(term);
    const { done } = await beatOne();

    term.press('c', { ctrlKey: true });
    await done;

    expect(term.frame().querySelector('#pl-odo')).not.toBeNull();
    expect(term.frame().textContent).not.toContain('SEASON');
    expect(term.lines().at(-1)).toBe('^C');
    expect(term.inputValue()).toBe('');
    expect(term.busy()).toBe(false);
  });

  it('stops the frame it keeps, so nothing moves above the returned prompt', async () => {
    const { paused } = fakeAnimations(term);
    const { done } = await beatOne();

    term.press('c', { ctrlKey: true });
    await done;

    /* Aborting unwinds the demo's JavaScript; the motion belongs to the browser
       and would otherwise play on under a prompt that says it stopped. */
    expect(paused).not.toHaveLength(0);
  });
});

describe('what the beat may not disturb', () => {
  it('carries the annotation caption, present but invisible', async () => {
    const beat = await paintedBeat();
    const caption = beat.querySelector('.demo-caption');

    /* Present from the first paint so the frame never changes height — an
       earlier cut introduced it at the end and grew the element mid-run. */
    expect(caption).not.toBeNull();
    expect(caption.textContent).toContain('PaceLab');
    expect(caption.getAttribute('style')).toContain('opacity:0');
  });

  it('draws the same box as the landing frame it hands over to', async () => {
    const { finish } = fakeAnimations(term);
    const { frame, done } = await beatOne();

    const beat = frame.querySelector('svg').getAttribute('viewBox');
    const captionLines = frame.querySelectorAll('.demo-caption > div').length;

    finish();
    await done;

    expect(term.frame().querySelector('svg').getAttribute('viewBox')).toBe(beat);
    expect(term.frame().querySelectorAll('.demo-caption > div')).toHaveLength(captionLines);
  });

  it('renders identically under lang de — the beat has no words to translate', async () => {
    const inEnglish = (await paintedBeat()).querySelector('svg').outerHTML;

    const german = await mountTerminal();
    german.run('lang de');
    const inGerman = (await paintedBeat(german)).querySelector('svg').outerHTML;
    german.cleanup();

    expect(inGerman).toBe(inEnglish);
  });
});

describe('the routes that never see it', () => {
  it('is skipped entirely under reduced motion', async () => {
    term.cleanup();
    term = await mountTerminal({ reducedMotion: true });

    await term.run('pacelab');

    expect(term.frame().querySelector('#pl-odo')).toBeNull();
    expect(term.frame().textContent).toContain('5:14 NP');
  });

  it('is skipped entirely below the width floor', async () => {
    const { Element, HTMLElement } = term.window;
    Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 300 });
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { width: (this.textContent.length || 1) * 10, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
    };

    await term.run('pacelab');

    expect(term.frame().querySelector('#pl-odo')).toBeNull();
    expect(term.frame().textContent).toContain('5:14 NP');
  });
});
