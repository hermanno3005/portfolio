/*
 * Beat three — Save, into the record.
 *
 * The sheet's header chip slides out and the readout line slides in over it, and
 * the number warms to amber: the log sheet has become the detail screen and
 * nothing left the column. That is the demo's argument — logging and knowing are
 * the same screen — and it is why the column is tested here for what replaces
 * what, at the same y.
 *
 * On the right the strength curve assembles, and then the two cells the entry
 * floored rise together. Together, not one alone: a `5 × 125` proves 125 kg at
 * five reps and at four, and a rise at 5 with 4 left behind would be a different
 * and wrong claim about what a rep-max is. The staircase is also checked for
 * stepping *before* the rep count — a step drawn mid-cell is a wrong chart, not
 * a wrong animation.
 *
 * Nothing here asserts a delay, an easing or a stagger.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mountTerminal } from './harness.js';
import { chalkBeat, paintedBeat, animOf } from './chalk-demo.js';
import { keyframes } from './animation.js';

let term;
let beat;

/* Painted once for the whole file. Reaching beat three means sitting out the
   real 650ms hold that closes beat two, and every test below asks about the
   same snapshot of the same drawing — `paintedBeat` hands back a copy, so
   there is nothing here for one test to leave behind for the next. */
beforeAll(async () => {
  term = await mountTerminal();
  beat = await paintedBeat(term, 3);
});

afterAll(() => {
  term.cleanup();
});

/** Everything drawn at the readout line's own y. */
const atReadoutLine = (frame, t) => [...frame.querySelectorAll('svg text')]
  .filter(el => Number(el.getAttribute('y')) === t.window.eval('CHALK_READ_Y'));

/** The staircase's paths — the pieces, not the ghost. */
const stairPieces = frame => [...frame.querySelectorAll('svg g[stroke="var(--green)"] path')];

describe('the sheet becomes the readout', () => {
  it('replaces the chip with the readout on the same line', () => {
    const lines = atReadoutLine(beat, term);

    expect(lines.map(el => el.textContent)).toEqual(['5 reps', 'best for 5 reps · 4 entries ›']);
    expect(animOf(lines[0])).toContain('ckUp');
    expect(animOf(lines[1])).toContain('ckIn');
  });

  it('counts the entry into the readout', () => {
    expect(beat.textContent).toContain(`${term.window.eval('CHALK_ENTRY_COUNT')} entries`);
  });

  it('warms the number to the frame\'s own amber without moving it', () => {
    const number = [...beat.querySelectorAll('svg text')]
      .find(el => Number(el.getAttribute('font-size')) > 40);

    expect(number.textContent).toBe('125');
    expect(animOf(number)).toContain('ckHeat');
    expect(keyframes(beat, 'ckHeat')).toContain('var(--heat)');
  });

  it('closes on the history line the still frame carries', () => {
    expect(beat.textContent).toContain('was 120 kg · entry 5 × 125 kg');
  });
});

describe('the curve', () => {
  it('paints the ghost dashed from its first frame, behind the staircase', () => {
    const ghost = beat.querySelector('svg path[stroke-dasharray]');

    expect(ghost.getAttribute('stroke')).toBe('var(--cyan)');
    /* It fades in and is never drawn along its path: a draw-in's own
       `stroke-dasharray` would override the dash, so the line would arrive solid
       and turn dashed at the seam. */
    expect(animOf(ghost)).toContain('ckFade');
    expect(animOf(ghost)).not.toContain('ckDraw');

    const paths = [...beat.querySelectorAll('svg path')];
    expect(paths.indexOf(ghost)).toBeLessThan(paths.indexOf(stairPieces(beat)[0]));
  });

  it('steps before the rep count — down on the 5, then over to the 6', () => {
    const x = term.window.eval('chalkX');
    const risers = stairPieces(beat)
      .map(p => p.getAttribute('d').match(/^M([\d.]+),[\d.]+ L([\d.]+),/))
      .filter(m => m && m[1] === m[2])
      .map(m => Number(m[1]));

    expect(risers).toEqual([1, 3, 5, 8].map(n => Number(x(n).toFixed(1))));
  });

  it('draws itself left to right on a pathLength clock', () => {
    for (const piece of stairPieces(beat)) {
      expect(piece.getAttribute('pathLength')).toBe('1');
      expect(animOf(piece)).toContain('ckDraw');
    }
  });

  it('opens on the staircase as it stood before the entry', () => {
    const y = term.window.eval('chalkY');
    /* The cells that will rise are drawn at their old value; the rise is what
       moves them, so a beat that opened on the new one would have nothing left
       to show. */
    const dots = [...beat.querySelectorAll('svg circle')].map(c => Number(c.getAttribute('cy')));

    expect(dots).toEqual(term.window.eval('CHALK_BEST_BEFORE').map(w => Number(y(w).toFixed(1))));
  });
});

describe('the rise', () => {
  it('moves cells 4 and 5 together, and no other cell at all', () => {
    const moving = [...beat.querySelectorAll('svg circle')]
      .map((c, i) => (animOf(c).includes('ckHot') ? i + 1 : 0))
      .filter(Boolean);

    expect(moving).toEqual(term.window.eval('CHALK_RAISED'));
    expect(moving).toEqual([4, 5]);
  });

  it('travels exactly the 5 kg the entry floored', () => {
    const y = term.window.eval('chalkY');
    const dy = y(125) - y(120);

    expect(keyframes(beat, 'ckRise')).toContain(`translateY(${dy.toFixed(1)}px)`);
  });

  it('moves the plateau between them, and scales the riser on either side', () => {
    const moves = stairPieces(beat).map(animOf).filter(a => /ckRise|ckRiser/.test(a));

    expect(moves).toHaveLength(3);
    expect(moves.filter(a => a.includes('ckRiserAbove'))).toHaveLength(1);
    expect(moves.filter(a => a.includes('ckRiserBelow'))).toHaveLength(1);
  });

  /* The risers scale about the end that stays put — the top one about its top,
     the bottom one about its bottom — which is what keeps the staircase joined
     while the plateau between them travels. */
  it('pins each riser to the end that does not move', () => {
    const x = term.window.eval('chalkX');
    const y = term.window.eval('chalkY');
    const origins = Object.fromEntries(stairPieces(beat)
      .map(piece => [piece, animOf(piece)])
      .filter(([, animation]) => /ckRiser/.test(animation))
      .map(([piece, animation]) => [/Above/.test(animation) ? 'above' : 'below', piece.getAttribute('style')]));

    expect(origins.above).toContain(`${x(3).toFixed(1)}px ${y(135).toFixed(1)}px`);
    expect(origins.below).toContain(`${x(5).toFixed(1)}px ${y(105).toFixed(1)}px`);
  });

  it('rides a +5 kg label up with the plateau', () => {
    const label = [...beat.querySelectorAll('svg text')].find(el => el.textContent === '+5 kg');

    expect(label).toBeDefined();
    expect(animOf(label)).toContain('ckRise');
    /* And leaves again: the still frame does not carry it. */
    expect(animOf(label)).toContain('ckOut');
  });

  it('settles the hot dots at the radius the still frame draws them', () => {
    /* 3px base × 1.5 is the still frame's own 4.5, so the beat lands on the
       frame rather than near it. */
    expect(keyframes(beat, 'ckHot')).toContain('scale(1.5)');
  });
});

describe('Ctrl+C', () => {
  /* The one exit that does not land on the still frame: the partial beat stays
     exactly where the visitor stopped it, `^C` prints under it, and the prompt
     comes back. Nothing here says anything about the mid-rise, where cells 4 and
     5 can be caught in flight at a rep-max that never happened — that is an
     accepted wart, argued in `js/demos/chalk.js`, and pinning it in a test would
     promote it to a requirement. */
  it('leaves the partial beat alone and returns a bare prompt', async () => {
    const interrupted = await mountTerminal();
    const { frame, paused, done } = await chalkBeat(interrupted, 3);

    interrupted.press('c', { ctrlKey: true });
    await done;

    expect(frame.textContent).toContain('+5 kg');
    expect(paused).not.toHaveLength(0);
    expect(interrupted.lines().at(-1)).toBe('^C');
    expect(interrupted.inputValue()).toBe('');
    interrupted.cleanup();
  });
});

describe('in German', () => {
  /* Same assertion as PaceLab's beats, different reason — see beat one. */
  it('draws the identical beat', async () => {
    const german = await mountTerminal();
    await german.run('lang de');
    const inGerman = await paintedBeat(german, 3);
    german.cleanup();

    expect(inGerman.querySelector('svg').outerHTML).toBe(beat.querySelector('svg').outerHTML);
  });
});
