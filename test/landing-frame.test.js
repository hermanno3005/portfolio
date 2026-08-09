/*
 * The landing frame.
 *
 * The payoff every route ends on: the season chart, and PaceLab's real
 * annotation block under it. Four separate paths deliver it — reduced motion,
 * `Escape`, a click on the frame, and the width floor — and for two of them it
 * is the only thing the visitor ever sees, so what is under test here is mostly
 * that all four land on the *same* frame and that the frame depends on nothing
 * that happened before it.
 *
 * These tests drive the real `pacelab` demo, not a stand-in: the drawing is the
 * deliverable.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

/** Give the realm a layout: `cols` characters wide, 10px per character. */
function widen(t, cols) {
  const { Element, HTMLElement } = t.window;
  Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => cols * 10 });
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { width: (this.textContent.length || 1) * 10, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
  };
}

/** Run the real demo to its landing frame the quick way, and hand it back. */
async function landing(t = term) {
  const done = t.run('pacelab');
  t.press('Escape');
  await done;
  return t.frame();
}

describe('reaching it', () => {
  it('paints instantly under reduced motion, with no animation to wait for', async () => {
    term.cleanup();
    term = await mountTerminal({ reducedMotion: true });

    await term.run('pacelab');

    expect(term.frame().querySelector('svg')).not.toBeNull();
    expect(term.frame().textContent).toContain('5:14 NP');
  });

  it('lands on the identical frame from escape, a click and the width floor', async () => {
    const byEscape = (await landing()).innerHTML;

    const clicked = await mountTerminal();
    const clickedDone = clicked.run('pacelab');
    clicked.click(clicked.frame());
    await clickedDone;
    const byClick = clicked.frame().innerHTML;
    clicked.cleanup();

    const narrow = await mountTerminal();
    widen(narrow, 30);
    await narrow.run('pacelab');
    const byWidthFloor = narrow.frame().innerHTML;
    narrow.cleanup();

    expect(byClick).toBe(byEscape);
    expect(byWidthFloor).toBe(byEscape);
  });

  it('is not painted by Ctrl+C, which leaves the partial frame alone', async () => {
    const done = term.run('pacelab');
    term.press('c', { ctrlKey: true });
    await done;

    expect(term.frame().querySelector('svg')).toBeNull();
    expect(term.lines().at(-1)).toBe('^C');
  });
});

describe('the chart', () => {
  let frame;

  beforeEach(async () => {
    frame = await landing();
  });

  it('draws both lines and the gap between them', () => {
    const svg = frame.querySelector('svg');
    /* Observed, normalized, and the filled gap that is the whole argument. */
    expect(svg.querySelectorAll('path[d^="M"]').length).toBeGreaterThanOrEqual(3);
    expect(svg.innerHTML).toContain('url(#pl-gap)');
    expect(svg.innerHTML).toContain('stroke="var(--green)"');
  });

  it('labels the months as numerals, which no language translates', () => {
    const text = frame.textContent;

    for (const month of ['04', '05', '06', '07', '08']) expect(text).toContain(month);
    for (const name of ['Apr', 'May', 'Mai', 'Aug']) expect(text).not.toContain(name);
  });

  it('carries the legend and both end labels', () => {
    const text = frame.textContent;

    expect(text).toContain('SEASON');
    expect(text).toContain('NORMALIZED PACE');
    expect(text).toContain('5:26 ran');
    expect(text).toContain('5:14 NP');
  });

  it('leaves the end labels a gutter to sit in, rather than clipping them', () => {
    const svg = frame.querySelector('svg');
    const [, , viewWidth] = svg.getAttribute('viewBox').split(' ').map(Number);
    const labelX = term.window.eval('PACELAB_LABEL_X');

    /* `5:26 ran` is 8 characters at 12px mono ≈ 58px. Whatever the plot's right
       edge is, the labels have to fit between it and the viewBox. */
    expect(labelX).toBeLessThan(viewWidth - 58);
  });

  it('places the end labels exactly where its exported constants say', () => {
    /* Ticket 09's flying number computes its landing transform from these, so a
       label that drifts from the constant is a beat that misses by ~78px. */
    const svg = frame.querySelector('svg');
    const labelX = String(term.window.eval('PACELAB_LABEL_X'));
    const npY = String(term.window.eval('PACELAB_LABEL_NP_Y'));
    const obsY = String(term.window.eval('PACELAB_LABEL_OBS_Y'));

    const at = (x, y) => [...svg.querySelectorAll('text')]
      .find(t => t.getAttribute('x') === x && t.getAttribute('y') === y);

    expect(at(labelX, npY)?.textContent).toBe('5:14 NP');
    expect(at(labelX, obsY)?.textContent).toBe('5:26 ran');
  });

  it('tells the same season the annotation does', () => {
    const observed = term.window.eval('PACELAB_OBSERVED');
    const normalized = term.window.eval('PACELAB_NORMALIZED');

    /* Observed climbs through the summer while normalized falls: the fitness
       the conditions were masking. */
    expect(observed[3] - observed[0]).toBe(20);
    expect(normalized[0] - normalized[4]).toBe(5);
    /* August is exactly the run the annotation block is about. */
    expect(observed.at(-1)).toBe(5 * 60 + 26);
    expect(normalized.at(-1)).toBe(5 * 60 + 14);
  });

  it('reads the same under lang de — it contains no localized strings', async () => {
    const german = await mountTerminal();
    german.run('lang de');
    const inGerman = (await landing(german)).querySelector('svg').outerHTML;
    german.cleanup();

    expect(inGerman).toBe(frame.querySelector('svg').outerHTML);
  });
});

describe('the annotation block', () => {
  let frame;

  beforeEach(async () => {
    frame = await landing();
  });

  it('is PaceLab\'s real output, verbatim', () => {
    const caption = frame.querySelector('.demo-caption').textContent;

    expect(caption).toContain('PaceLab · NP 5:14/km (ran 5:26/km)');
    expect(caption).toContain('grade +2 · 🌡️ heat +9 · 💨 wind +0 s/km (wind not in NP)');
  });

  it('does not decorate the pace with a leading ~', () => {
    /* In the tool a leading `~` marks a Provisional Analysis. Borrowing it to
       mean "approximately" would claim something that is not true of this run. */
    expect(frame.textContent).not.toContain('~5:14');
    expect(frame.textContent).not.toContain('~');
  });

  it('shows wind as reported but excluded, never as part of the correction', () => {
    /* Only grade and heat are coloured as terms of the correction; wind is
       there in words, in the same dim as the rest of the line. */
    const correction = [...frame.querySelectorAll('.demo-caption > div')]
      .find(el => el.textContent.includes('wind'));
    const applied = [...correction.querySelectorAll('.heat, .cyan')];

    expect(applied.map(el => el.textContent)).toEqual(['+2', '+9']);
    expect(correction.textContent).toContain('wind +0 s/km (wind not in NP)');
  });

  it('links the repo, and opens it in a new tab', async () => {
    const opened = [];
    term.window.open = (...args) => { opened.push(args); return null; };

    const link = frame.querySelector('[data-url]');
    expect(link.textContent).toContain('github.com/hermanno3005/pacelab');

    term.click(link);

    expect(opened).toEqual([['https://github.com/hermanno3005/pacelab', '_blank', 'noopener']]);
  });
});

describe('standing alone', () => {
  it('produces identical output called twice from a cold start', async () => {
    term.cleanup();
    term = await mountTerminal({ reducedMotion: true });

    await term.run('pacelab');
    await term.run('pacelab');

    const [first, second] = term.document.querySelectorAll('#output .demo-frame');
    expect(second.innerHTML).toBe(first.innerHTML);
  });

  it('is the same frame whether or not play() ever ran', async () => {
    const afterPlaying = await landing();
    const html = afterPlaying.innerHTML;

    const cold = await mountTerminal({ reducedMotion: true });
    await cold.run('pacelab');
    const withoutPlaying = cold.frame().innerHTML;
    cold.cleanup();

    expect(withoutPlaying).toBe(html);
  });

  it('reserves a height the drawing actually fits in', async () => {
    const frame = await landing();
    const reserved = parseInt(frame.style.minHeight, 10);
    const [, , viewWidth, viewHeight] = frame.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);

    /* The chart never scales *up*: the viewBox is the terminal's own content
       width at the 900px window cap, so its rendered height is at most the
       viewBox height. The rest of the reservation is the caption's three lines
       at the site's 14px × 1.5. */
    expect(viewWidth).toBe(868);
    const caption = 3 * Math.round(14 * 1.5);
    expect(reserved).toBeGreaterThanOrEqual(viewHeight + caption);
    /* And no more than a line's worth of slack — reserving air is a gap under
       the frame that never gets filled. */
    expect(reserved).toBeLessThan(viewHeight + caption + 21);
  });
});

describe('the heat token', () => {
  const source = () => fs.readFileSync(path.join(ROOT, 'js', 'demos.js'), 'utf8');

  it('comes from the site, and is not redeclared here', () => {
    expect(source()).toContain('var(--heat)');
    expect(source()).not.toContain('#ffb86c');
    expect(source()).not.toMatch(/--heat\s*:/);
  });
});
