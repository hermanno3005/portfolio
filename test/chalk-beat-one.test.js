/*
 * Beat one — reps, then weight.
 *
 * Chalk's log has two stages, and this beat is both of them: a giant rep count
 * seeded from the most recent entry, then `Next`, then the weight. The rep count
 * is not discarded — it flies up into the stage-two header chip, which is what
 * carries the stage change, since the drawing has no words to spend on one.
 *
 * What is actually under test is the honesty of the verdict line. The app cannot
 * say anything about an entry that has no weight yet, so the line must not be on
 * screen during the reps stage; and when it does arrive it says one of SPEC
 * §6.5's five sentences, verbatim. The choreography around that — how long the
 * flight takes, how it eases — is left to the eye.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';
import { paintedBeat, animOf, texts } from './chalk-demo.js';
import { keyframes, delayOf } from './animation.js';

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

/** The line at the verdict's own y — present in the paint from the first frame. */
const verdictLine = frame => [...frame.querySelectorAll('svg text')]
  .find(t => t.textContent.includes('5-rep best'));

/** The giant number reading `value`, and the group that carries it. */
const bigNumber = (frame, value) => texts(frame, value)
  .find(t => Number(t.getAttribute('font-size')) > 40);

describe('the sheet opens on the rep count', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat(term, 1);
  });

  it('seeds the sheet from the most recent entry, in reps', () => {
    const reps = bigNumber(beat, String(term.window.eval('CHALK_ENTRIES')[0].reps));

    expect(reps).toBeDefined();
    expect(beat.textContent).toContain('reps');
  });

  it('names the exercise', () => {
    expect(beat.textContent).toContain('BACK SQUAT');
  });

  /* The app has nothing to say about an entry with no weight on it. A verdict
     drawn here would be a caption pretending to be a reading. */
  it('holds the verdict back until there is a weight to judge', () => {
    const weight = bigNumber(beat, '120');

    expect(delayOf(animOf(verdictLine(beat)), 'ckFade'))
      .toBeGreaterThan(delayOf(animOf(weight.parentElement), 'ckIn'));
  });

  it('has no verdict line for the reps stage to show at all', () => {
    /* One line, arriving once — not two crossfading, which would mean the app
       had judged the rep count on its own. */
    expect([...beat.querySelectorAll('svg text')].filter(t => /best/.test(t.textContent)))
      .toHaveLength(1);
  });
});

describe('Next', () => {
  let beat;

  beforeEach(async () => {
    beat = await paintedBeat(term, 1);
  });

  it('flies the rep count into the stage-two chip rather than announcing a stage', () => {
    const reps = bigNumber(beat, '5').parentElement;

    expect(animOf(reps)).toContain('ckFlyReps');
    expect(beat.textContent).toContain('5 reps');
  });

  it('lands the flight on the readout line, at the readout\'s own size', () => {
    const flight = keyframes(beat, 'ckFlyReps');
    const dy = term.window.eval('CHALK_READ_Y - CHALK_NUM_Y');
    const scale = term.window.eval('CHALK_READ_SIZE / CHALK_NUM_SIZE');

    expect(flight).toContain(`${dy.toFixed(1)}px`);
    expect(flight).toContain(`scale(${scale.toFixed(3)})`);
  });

  it('opens the weight stage on the rep-max the entry is about to beat', () => {
    const before = term.window.eval('CHALK_BEST_BEFORE')[term.window.eval('CHALK_SEL') - 1];

    expect(bigNumber(beat, String(before))).toBeDefined();
  });

  it('brings the weight in with its unit beside it', () => {
    expect(beat.textContent).toContain('kg');
  });
});

describe('the verdict', () => {
  it('is SPEC §6.5\'s own sentence, verbatim', async () => {
    const beat = await paintedBeat(term, 1);

    /* The weight opens equal to the standing rep-max, so of the five states this
       is `matches` — and it is drawn in `--fg`, because matching is not news. */
    expect(verdictLine(beat).textContent).toBe('Matches your 5-rep best');
    expect(verdictLine(beat).getAttribute('fill')).toBe('var(--fg)');
  });
});

describe('in German', () => {
  /* The same assertion PaceLab's beats carry, for a different reason. PaceLab's
     beats have no words in them; Chalk's are full of them, and they are English
     by decision — every one is Chalk's own output, and the runner's chrome
     around the drawing is what speaks the visitor's language. */
  it('draws the identical beat', async () => {
    const english = await paintedBeat(term, 1);

    const german = await mountTerminal();
    await german.run('lang de');
    const inGerman = await paintedBeat(german, 1);
    german.cleanup();

    expect(inGerman.querySelector('svg').outerHTML).toBe(english.querySelector('svg').outerHTML);
  });
});
