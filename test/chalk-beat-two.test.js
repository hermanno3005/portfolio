/*
 * Beat two — two taps.
 *
 * The weight walks up the app's own 2.5 kg grid, from the rep-max it is about to
 * beat to the entry it will be saved as. The point of the beat is the sentence
 * under the number: it is computed against the standing rep-max and it changes
 * as the weight does, which is what tells a visitor it is a reading rather than
 * a caption. So what is asserted here is the walk — how many taps, which weights,
 * which sentences, in which order — and nothing about how any of it eases.
 *
 * The one mechanical rule that is also tested: an *out* animation fills
 * `forwards`, never `both`. With `both`, its backward fill overrides the *in*
 * animation listed before it and every weight is visible from the first frame,
 * stacked on top of each other. That is not a detail; it is the bug this beat
 * had in the prototype.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';
import { paintedBeat, animOf } from './chalk-demo.js';
import { delayOf } from './animation.js';

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

/** The giant numbers, in the order the beat paints them. */
const weights = frame => [...frame.querySelectorAll('svg text')]
  .filter(t => Number(t.getAttribute('font-size')) > 40)
  .map(t => t.textContent);

/** The verdict lines, in paint order. */
const verdicts = frame => [...frame.querySelectorAll('svg text')]
  .filter(t => /best/.test(t.textContent))
  .map(t => t.textContent);

describe('the walk', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat(term, 2);
  });

  it('takes exactly two taps', () => {
    expect([...beat.querySelectorAll('svg text')].filter(t => t.textContent === '+')).toHaveLength(2);
  });

  it('steps the weight 120 → 122.5 → 125, on the app\'s own grid', () => {
    expect(weights(beat)).toEqual(['120', '122.5', '125']);
  });

  it('answers each step with the spec\'s own sentence', () => {
    expect(verdicts(beat)).toEqual([
      'Matches your 5-rep best',
      'Beats your 5-rep best by 2.5 kg',
      'Beats your 5-rep best by 5 kg',
    ]);
  });

  /* Matching is not news; beating is. The line never leaves once it has arrived
     — the number above it changes and the sentence answers. */
  it('turns the verdict green the moment the entry beats the rep-max', () => {
    const fills = [...beat.querySelectorAll('svg text')]
      .filter(t => /best/.test(t.textContent))
      .map(t => t.getAttribute('fill'));

    expect(fills).toEqual(['var(--fg)', 'var(--green)', 'var(--green)']);
  });

  it('lands on the entry the demo is about to save', () => {
    const entry = term.window.eval('CHALK_ENTRY');

    expect(weights(beat).at(-1)).toBe(String(entry.weight));
    expect(verdicts(beat).at(-1)).toBe(term.window.eval('CHALK_VERDICT').text);
  });
});

describe('the order the swaps happen in', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat(term, 2);
  });

  it('brings each weight in as the one before it leaves', () => {
    const groups = [...beat.querySelectorAll('svg text')]
      .filter(t => Number(t.getAttribute('font-size')) > 40)
      .map(t => animOf(t.parentElement));

    /* The second arrives when the first departs, and so on down the walk. */
    expect(delayOf(groups[1], 'ckIn')).toBe(delayOf(groups[0], 'ckUp'));
    expect(delayOf(groups[2], 'ckIn')).toBe(delayOf(groups[1], 'ckUp'));
  });

  it('answers a tap rather than anticipating it', () => {
    const tap = [...beat.querySelectorAll('svg text')].filter(t => t.textContent === '+')[0];
    const second = [...beat.querySelectorAll('svg text')]
      .filter(t => Number(t.getAttribute('font-size')) > 40)[1];

    expect(delayOf(animOf(second.parentElement), 'ckIn'))
      .toBeGreaterThan(delayOf(animOf(tap), 'ckPop'));
  });

  /* The rule this beat exists to keep: an exit fills forwards, an entrance fills
     both. Written the other way round, every weight is on screen at once. */
  it('fills every exit forwards and every entrance both', () => {
    const styles = [...beat.querySelectorAll('svg g, svg text')]
      .map(animOf)
      .filter(Boolean);

    for (const style of styles) {
      for (const animation of style.split(/,(?![^(]*\))/)) {
        if (/\bckUp\b|\bckOut\b/.test(animation)) expect(animation.trim()).toMatch(/forwards$/);
        if (/\bckIn\b/.test(animation)) expect(animation.trim()).toMatch(/both$/);
      }
    }
  });
});

describe('the unit', () => {
  it('rides with the number rather than sitting at a fixed x', async () => {
    const beat = await paintedBeat(term, 2);
    const unitsAt = [...beat.querySelectorAll('svg text')]
      .filter(t => t.textContent === 'kg')
      .map(t => Number(t.getAttribute('x')));

    /* A wider number pushes its unit right; the same number puts it back. */
    expect(unitsAt[1]).toBeGreaterThan(unitsAt[0]);
    expect(unitsAt[2]).toBe(unitsAt[0]);
  });

  /* The claim the advance was written as a rule for: wherever the last beat
     leaves the unit is where the still frame draws it, so the closing paint
     does not shift it. Read off both drawings rather than against a literal. */
  it('leaves the unit where the still frame draws it', async () => {
    const beat = await paintedBeat(term, 2);
    const last = [...beat.querySelectorAll('svg text')].filter(t => t.textContent === 'kg').at(-1);

    const done = term.run('chalk');
    term.press('Escape');
    await done;
    const still = [...term.frame().querySelectorAll('svg text')].find(t => t.textContent === 'kg');

    expect(last.getAttribute('x')).toBe(still.getAttribute('x'));
  });
});

describe('in German', () => {
  /* Same assertion as PaceLab's beats, different reason: PaceLab's have no
     words, and this one is nothing but words — every sentence in it is Chalk's
     own output, English by decision. Only the runner's chrome is localised. */
  it('draws the identical beat', async () => {
    const english = await paintedBeat(term, 2);

    const german = await mountTerminal();
    await german.run('lang de');
    const inGerman = await paintedBeat(german, 2);
    german.cleanup();

    expect(inGerman.querySelector('svg').outerHTML).toBe(english.querySelector('svg').outerHTML);
  });
});
