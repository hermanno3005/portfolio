/*
 * Chalk's landing frame.
 *
 * The still frame the whole demo will eventually land on, shipped before any
 * motion exists — which is the point: four of the five routes through a demo
 * (`Escape`, a click, reduced motion, a terminal too narrow) see this frame and
 * nothing else, so it has to stand entirely on its own.
 *
 * Two things are under test that PaceLab's suite has no reason to ask. First,
 * the numbers: the twelve rep-maxes are *derived* from five entries by the
 * monotonic backfill rule at run time, so what is asserted here is the rule,
 * applied to the exported entries, not a staircase somebody typed out. Second,
 * the staircase has exactly one builder, because the visitor who sets reduced
 * motion and the visitor who watches the animation must see the same drawing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = () => fs.readFileSync(path.join(ROOT, 'js', 'demos', 'chalk.js'), 'utf8');

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
  const done = t.run('chalk');
  t.press('Escape');
  await done;
  return t.frame();
}

/** Text with the markup taken out — what a visitor actually reads. */
const plain = html => html.replace(/<[^>]*>/g, '');

describe('the entry in the project list', () => {
  it('sits second — after PaceLab, before the portfolio', () => {
    expect(term.window.eval('DATA.projects').map(p => p.id)).toEqual(['pacelab', 'chalk', 'portfolio']);
  });

  it('is described at the matching index of both locales, in plain hyphens', () => {
    for (const [lang, l] of Object.entries(term.locales())) {
      const description = l.projectDescriptions[1];

      expect(description, lang).toBeDefined();
      expect(description, lang).not.toContain('—');
    }
    /* The German mirrors the English clause for clause, and translates the
       domain word rather than borrowing it. */
    expect(term.locales().de.projectDescriptions[1]).toContain('Kraftkurve');
  });

  it('is listed with the warm marker, an iOS stack and the repo, in both locales', () => {
    for (const lang of ['en', 'de']) {
      term.run('clear');
      term.run(`lang ${lang}`);
      term.run('projects');
      const text = term.text();

      const name = [...term.document.querySelectorAll('#output [data-cmd]')]
        .find(el => el.textContent === 'Chalk');
      expect(name, `no clickable Chalk in ${lang}`).toBeDefined();
      expect(name.dataset.cmd).toBe('chalk');

      expect(term.lines().find(l => l.trim().startsWith('Chalk')).trim(), lang).toBe('Chalk*');
      /* One item that is true beats three that are inferred: an iOS app already
         says Swift. */
      expect(text, lang).toContain('iOS');
      expect(text, lang).toContain('https://github.com/hermanno3005/Chalk');
    }
  });
});

describe('the filesystem nodes', () => {
  it('lists an executable chalk before its document', () => {
    term.run('clear');
    term.run('ls projects/');

    const listing = term.lines().find(l => l.includes('chalk'));
    expect(listing.split(/\s+/).filter(Boolean)).toEqual(
      ['pacelab*', 'pacelab.md', 'chalk*', 'chalk.md', 'portfolio.md'],
    );
  });

  it('cats a document carrying the name, description, stack and URL', () => {
    term.run('cat projects/chalk.md');
    const text = term.text();

    expect(text).toContain('# Chalk');
    expect(text).toContain(term.window.eval('DATA.projects')[1].description);
    expect(text).toContain('Stack: iOS');
    expect(text).toContain('URL:   https://github.com/hermanno3005/Chalk');
  });

  it('runs the demo from `cat projects/chalk`, and from a click on it', async () => {
    term.run('cat projects/chalk');
    expect(term.lines().at(-1)).toBe('Binary file — chalk to run it.');

    const link = [...term.document.querySelectorAll('#output [data-cmd]')]
      .find(el => el.textContent === 'chalk');
    term.click(link);
    term.press('Escape');
    await term.flush();

    expect(term.frame()).not.toBeNull();
  });

  it('completes from `chal`', () => {
    /* A completed command carries the trailing space every other one does. */
    expect(term.complete('chal')).toBe('chalk ');
  });
});

describe('the numbers, derived rather than typed', () => {
  const evalIn = expr => term.window.eval(expr);

  it('backfills the twelve rep-maxes from the five entries', () => {
    /* `5 × 120` is most recent, so it seeds the sheet; every entry floors every
       rep count at or below its own. */
    expect(evalIn('CHALK_ENTRIES')).toEqual([
      { reps: 5, weight: 120 },
      { reps: 1, weight: 145 },
      { reps: 3, weight: 135 },
      { reps: 8, weight: 105 },
      { reps: 12, weight: 90 },
    ]);

    expect(evalIn('chalkBackfill(CHALK_ENTRIES)')).toEqual(
      [145, 135, 135, 120, 120, 105, 105, 105, 90, 90, 90, 90],
    );
  });

  it('raises cells 4 and 5 together when `5 × 125` lands, and no other cell', () => {
    expect(evalIn('CHALK_BEST')).toEqual([145, 135, 135, 125, 125, 105, 105, 105, 90, 90, 90, 90]);
    expect(evalIn('CHALK_RAISED')).toEqual([4, 5]);
  });

  it('estimates 149.83 from the single, and leaves the ghost where it was', () => {
    expect(evalIn('CHALK_E1RM')).toBeCloseTo(149.83, 2);
    /* From `1 × 145` — the new entry's own estimate is lower, so the ghost does
       not move when it lands. */
    expect(evalIn('chalkE1rm({ reps: 1, weight: 145 })')).toBeCloseTo(evalIn('CHALK_E1RM'), 10);
    expect(evalIn('Math.max(...CHALK_ENTRIES.map(chalkE1rm))')).toBeCloseTo(evalIn('CHALK_E1RM'), 10);

    const ghost = evalIn('CHALK_GHOST');
    expect(ghost[0]).toBeCloseTo(145.0, 1);
    expect(ghost[11]).toBeCloseTo(107.0, 1);
  });

  it('writes no staircase out as literals', () => {
    /* Twelve literals would make a later refactor's silent mistake invisible. */
    expect(source()).toContain('chalkBackfill(');
    expect(source()).not.toMatch(/135,\s*135/);
    expect(source()).not.toMatch(/105,\s*105/);
    expect(source()).not.toMatch(/90,\s*90/);
  });
});

describe('the drawing', () => {
  let frame;

  beforeEach(async () => {
    frame = await landing();
  });

  it('reads out the exercise, the selection, the number, the verdict and where it came from', () => {
    const text = frame.textContent;

    expect(text).toContain('BACK SQUAT');
    expect(text).toContain('best for 5 reps · 4 entries ›');
    expect(text).toContain('125');
    expect(text).toContain('Beats your 5-rep best by 5 kg');
    expect(text).toContain('was 120 kg · entry 5 × 125 kg');
  });

  it('paints the headline number in the warm token, beside its unit', () => {
    const big = [...frame.querySelectorAll('svg text')].find(t => t.textContent === '125');

    expect(big.getAttribute('fill')).toBe('var(--heat)');
    expect(Number(big.getAttribute('font-size'))).toBeGreaterThan(40);
    expect(frame.textContent).toContain('kg');
  });

  it('shares PaceLab\'s viewBox, so the two demos scale identically', () => {
    expect(frame.querySelector('svg').getAttribute('viewBox')).toBe('0 0 868 300');
  });

  it('frames the plot 85–150, to the data and never at zero', () => {
    /* Real strength curves are shallow; a zero axis flattens them into the top
       third of the plot. */
    expect(term.window.eval('CHALK_PLOT_TOP')).toBe(150);
    expect(term.window.eval('CHALK_PLOT_BOT')).toBe(85);
  });

  it('runs a fixed 1–12 rep axis, identical for every exercise', () => {
    const x = term.window.eval('chalkX');
    const plot = term.window.eval('CHALK_PLOT');

    expect(x(1)).toBe(plot.x0);
    expect(x(12)).toBe(plot.x1);
    /* The cells are evenly spaced, so a shape is comparable across exercises. */
    expect(x(2) - x(1)).toBeCloseTo(x(12) - x(11), 6);
  });

  it('marks every cell, and highlights the two the entry floored', () => {
    const dots = [...frame.querySelectorAll('svg circle')];
    const x = term.window.eval('chalkX');
    const hot = dots.filter(d => d.getAttribute('fill') === 'var(--heat)');

    expect(dots).toHaveLength(12);
    expect(hot.map(d => Number(d.getAttribute('cx')))).toEqual([x(4), x(5)].map(v => Number(v.toFixed(1))));
  });

  it('steps before the rep count — down on the 5, then over to the 6', () => {
    const x = term.window.eval('chalkX');
    /* A riser is the vertical piece of the staircase; where they stand is the
       whole "step-before" claim, and at 5.5 it would be the wrong drawing. */
    const risers = [...frame.querySelectorAll('svg path')]
      .map(p => p.getAttribute('d').match(/^M([\d.]+),[\d.]+ L([\d.]+),/))
      .filter(m => m && m[1] === m[2])
      .map(m => Number(m[1]));

    expect(risers).toEqual([1, 3, 5, 8].map(n => Number(x(n).toFixed(1))));
  });

  it('separates the ghost from the curve by kind, not by dash alone', () => {
    const ghost = frame.querySelector('svg path[stroke-dasharray]');

    expect(ghost.getAttribute('stroke')).toBe('var(--cyan)');
    expect(Number(ghost.getAttribute('stroke-opacity'))).toBeLessThan(1);
    /* The two pinch at n = 1 — the entry the estimate came from is the single —
       so dashed *and* translucent *and* smooth all have work to do there. */
    expect(ghost.getAttribute('d')).not.toMatch(/[HV]/);

    /* And it is painted behind: the staircase comes after it in document order. */
    const paths = [...frame.querySelectorAll('svg path')];
    const green = paths.find(p => p.closest('[stroke="var(--green)"]') || p.getAttribute('stroke') === 'var(--green)');
    expect(paths.indexOf(ghost)).toBeLessThan(paths.indexOf(green));
  });

  it('has exactly one staircase builder, called here with no animation', () => {
    const builders = source().match(/^function chalk\w*[Ss]tair\w*\(/gm) || [];

    expect(builders).toHaveLength(1);
    expect(frame.querySelector('svg').innerHTML).not.toContain('animation');
    expect(frame.querySelector('svg').innerHTML).not.toContain('@keyframes');
  });

  it('is hidden from the reader, who gets the caption instead', () => {
    expect(frame.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('reads the same under lang de — it carries no localized strings', async () => {
    const german = await mountTerminal();
    german.run('lang de');
    const inGerman = (await landing(german)).querySelector('svg').outerHTML;
    german.cleanup();

    expect(inGerman).toBe(frame.querySelector('svg').outerHTML);
  });
});

describe('the caption', () => {
  let frame;

  beforeEach(async () => {
    frame = await landing();
  });

  it('is three lines of Chalk\'s own output, the repo line included', () => {
    const lines = [...frame.querySelectorAll('.demo-caption > div')];

    expect(lines).toHaveLength(3);
    expect(lines[0].textContent).toBe('🏋️ Chalk · best for 5 reps 125 kg (was 120 kg)');
    expect(lines[1].textContent).toBe('Back Squat · entry 5 × 125 kg · Beats your 5-rep best by 5 kg');
    expect(lines[2].textContent).toContain('github.com/hermanno3005/Chalk');
  });

  it('lands its number in the warm token, where the drawing lands it', () => {
    const heat = [...frame.querySelectorAll('.demo-caption .heat')];

    expect(heat.map(el => el.textContent)).toEqual(['125 kg']);
  });

  it('spends its one cyan span on the entry, a callback to the chip', () => {
    const cyan = [...frame.querySelectorAll('.demo-caption .cyan')];

    expect(cyan.map(el => el.textContent)).toEqual(['5 × 125 kg']);
  });

  it('comes through the shared helper rather than building its own chrome', () => {
    expect(source()).toContain("demoCaption('chalk'");
    expect(source()).not.toContain('demo-caption');
  });

  it('says nothing the vocabulary forbids', () => {
    /* Entry, rep-max, strength curve, ghost curve — never PR, personal record,
       set, session, workout or chart. */
    const text = frame.textContent.toLowerCase();

    for (const word of ['pr', 'personal record', 'set', 'session', 'workout', 'chart']) {
      expect(text.split(/[^a-z]+/), word).not.toContain(word);
    }
  });

  it('links the repo, and opens it in a new tab', () => {
    const opened = [];
    term.window.open = (...args) => { opened.push(args); return null; };

    term.click(frame.querySelector('[data-url]'));

    expect(opened).toEqual([['https://github.com/hermanno3005/Chalk', '_blank', 'noopener']]);
  });
});

describe('every route lands on the same frame', () => {
  it('is identical from escape, a click, reduced motion and the width floor', async () => {
    const byEscape = (await landing()).innerHTML;

    const clicked = await mountTerminal();
    const clickedDone = clicked.run('chalk');
    clicked.click(clicked.frame());
    await clickedDone;
    const byClick = clicked.frame().innerHTML;
    clicked.cleanup();

    const still = await mountTerminal({ reducedMotion: true });
    await still.run('chalk');
    const byReducedMotion = still.frame().innerHTML;
    still.cleanup();

    const narrow = await mountTerminal();
    widen(narrow, 30);
    await narrow.run('chalk');
    const byWidthFloor = narrow.frame().innerHTML;
    narrow.cleanup();

    expect(byClick).toBe(byEscape);
    expect(byReducedMotion).toBe(byEscape);
    expect(byWidthFloor).toBe(byEscape);
  });

  it('returns the prompt, unfilled', async () => {
    await term.run('chalk');

    expect(term.busy()).toBe(false);
    expect(term.inputValue()).toBe('');
    expect(term.warnings()).toEqual([]);
  });

  it('says so in the visitor\'s own language when the terminal is too narrow', async () => {
    for (const lang of ['en', 'de']) {
      const narrow = await mountTerminal();
      widen(narrow, 30);
      narrow.run(`lang ${lang}`);
      await narrow.run('chalk');

      /* The runner's own string, in both locales — this demo adds none. */
      const expected = narrow.locales()[lang].demoTooNarrow.replace('{cmd}', 'chalk');
      expect(narrow.text(), lang).toContain(expected);
      narrow.cleanup();
    }
  });
});

describe('what the frame reserves', () => {
  it('reserves the drawing plus the caption\'s three lines, and no more', async () => {
    const frame = await landing();
    const reserved = parseInt(frame.style.minHeight, 10);
    const [, , , viewHeight] = frame.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);

    /* The drawing never scales *up* — the viewBox is the terminal's own content
       width at the 900px cap — so the rest is the caption at 14px × 1.5. */
    const caption = 3 * Math.round(14 * 1.5);
    expect(reserved).toBeGreaterThanOrEqual(viewHeight + caption);
    expect(reserved).toBeLessThan(viewHeight + caption + 21);
  });

  it('refuses to animate only where the longest caption line would not fit', () => {
    const lines = term.window.eval('CHALK_CAPTION').map(line => [...plain(line)].length);

    expect(term.window.eval('DEMOS.chalk.minCols')).toBeGreaterThanOrEqual(Math.max(...lines));
  });
});

describe('the file itself', () => {
  it('prefixes every top-level symbol with the demo id', () => {
    const declared = [...source().matchAll(/^(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/gm)]
      .map(m => m[1]);

    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) expect(name, name).toMatch(/^(CHALK_|chalk)/);
  });

  it('spends the site\'s palette tokens rather than redeclaring their values', () => {
    const text = source();

    expect(text).toContain('var(--heat)');
    expect(text).toContain('var(--green)');
    expect(text).toContain('var(--cyan)');
    expect(text).not.toContain('#ffb86c');
    expect(text).not.toMatch(/--(heat|green|cyan)\s*:/);
  });
});
