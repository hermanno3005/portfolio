/*
 * The mobile recruiter card's projects section.
 *
 * `#mobile-card` is what a recruiter on a phone reads — the desktop terminal is
 * hidden behind a `pointer: coarse` media query they never satisfy, and the
 * card is hidden behind one every desktop satisfies. So none of what the rest of
 * the suite exercises reaches this surface, and the card is filled by
 * `initMobileCard()` from `DATA` rather than written into `index.html`.
 *
 * These tests drive the real thing: the harness calls `initMobileCard()` on
 * every mount, against the real card markup from `index.html`. CSS is not
 * loaded in jsdom, so nothing here asks what the card *looks* like — only what
 * it says, in what order, and where it points.
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

/** The project rows, as a visitor taps them. */
const rows = t => [...t.card().querySelectorAll('.mc-proj')];

/** One row's parts: the name, the stack and the card line. */
const parts = row => ({
  name:  row.querySelector('.mc-proj-name').textContent,
  stack: row.querySelector('.mc-proj-stack').textContent,
  line:  row.querySelector('.mc-proj-line').textContent,
});

describe('which projects get a row', () => {
  it('lists PaceLab then Chalk, in DATA.projects order', () => {
    expect(rows(term).map(row => parts(row).name)).toEqual(['PaceLab', 'Chalk']);
  });

  it('gives the portfolio no row — nobody wants a link to the page they are on', () => {
    /* Not asserted against the whole card: the prompt at the top of it reads
       `hermann@portfolio:~$ whoami`, and always has. */
    expect(rows(term).map(row => row.getAttribute('href')))
      .not.toContain('https://github.com/hermanno3005/portfolio');
  });

  /* The whole point of the field: putting a project in front of a recruiter is
     a copy decision, not a side effect of it happening to have a demo today.
     Proven by making the two flags disagree, which is the only way to tell
     `cardLine` from `runnable` while the real list has them agreeing. */
  it('gates on cardLine rather than runnable', async () => {
    const t = await mountTerminal({
      projects: [
        { id: 'runs', name: 'Runs', description: 'x', stack: ['C'], url: 'https://example.com/runs', runnable: true },
        { id: 'quiet', name: 'Quiet', description: 'y', cardLine: 'a line of its own', stack: ['C'], url: 'https://example.com/quiet' },
      ],
    });
    try {
      expect(rows(t).map(row => parts(row).name)).toEqual(['Quiet']);
    } finally {
      t.cleanup();
    }
  });

  /* `cardLine` is the only gate, so a project carrying one always gets a row.
     Missing the URL is an authoring mistake, and the row says so by having
     nothing to tap rather than by disappearing. */
  it('still draws a row for a card line with no url, minus the affordance', async () => {
    const t = await mountTerminal({
      projects: [{ id: 'quiet', name: 'Quiet', description: 'y', cardLine: 'a line of its own', stack: ['C'] }],
    });
    try {
      expect(rows(t)).toHaveLength(1);
      expect(rows(t)[0].getAttribute('href')).toBeNull();
      expect(rows(t)[0].querySelector('.mc-proj-chev')).toBeNull();
      expect(t.warnings().join(' ')).toContain('cardLine but no url');
    } finally {
      t.cleanup();
    }
  });

  it('draws no section at all when nothing carries a card line', async () => {
    const t = await mountTerminal({
      projects: [{ id: 'runs', name: 'Runs', description: 'x', stack: ['C'], url: 'https://example.com/runs', runnable: true }],
    });
    try {
      expect(rows(t)).toHaveLength(0);
      expect(t.card().textContent).not.toContain('// projects');
    } finally {
      t.cleanup();
    }
  });
});

describe('where the section sits', () => {
  /* #13's whole argument: the links are what a recruiter reaches for, so the
     work goes in front of them and is passed on the way to contacting him.
     Nothing else in the suite would catch this section moving. */
  it('sits between the CV block and the links block', () => {
    const labels = [...term.card().querySelectorAll('.mc-label')].map(el => el.textContent.trim());
    expect(labels).toEqual(['// download cv', '// projects', '// links']);
  });

  it('keeps the CV downloads and the links themselves', () => {
    const card = term.card();
    expect(card.querySelector('#mc-linkedin')).not.toBeNull();
    expect(card.querySelectorAll('.mc-primary')).toHaveLength(2);
  });
});

describe('a row', () => {
  let row;

  beforeEach(() => {
    row = rows(term)[1];   /* Chalk */
  });

  it('reads name, stack and one short line', () => {
    expect(parts(row)).toEqual({
      name: 'Chalk',
      stack: 'iOS',
      line: 'a rep-max out of every entry',
    });
  });

  it('joins a multi-part stack the way the terminal does', () => {
    expect(parts(rows(term)[0]).stack).toBe('Python · SQLite · Docker');
  });

  it('says it goes somewhere', () => {
    expect(row.querySelector('.mc-proj-chev').textContent).toBe('›');
  });

  it('is itself the project\'s GitHub link, opened in a new tab', () => {
    expect(row.tagName).toBe('A');
    expect(row.getAttribute('href')).toBe('https://github.com/hermanno3005/Chalk');
    expect(row.getAttribute('target')).toBe('_blank');
    expect(row.getAttribute('rel')).toBe('noopener');
  });

  /* Nothing on a touch device can run a demo, and the card's footer already
     sends the visitor to a desktop. A `*` or a `data-cmd` here would be an
     invitation to tap something that cannot answer. */
  it('offers nothing that looks runnable', () => {
    expect(term.card().textContent).not.toContain('*');
    expect(term.card().querySelector('[data-cmd]')).toBeNull();
  });
});

describe('the card is English, whatever the terminal is', () => {
  it('still reads English after `lang de`', async () => {
    await term.run('lang de');
    expect(parts(rows(term)[1]).line).toBe('a rep-max out of every entry');
    expect([...term.card().querySelectorAll('.mc-label')].map(el => el.textContent.trim()))
      .toContain('// projects');
  });
});

describe('the colours', () => {
  /* jsdom loads no stylesheet, so the rendered row has no colour to read. The
     claim is still testable at its source: these four rules are where #13's
     "name green, stack cyan, line dim" lives, and the failure worth catching is
     someone recolouring a row into the card's button idiom. */
  const styles = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

  const colourOf = selector => styles.match(new RegExp(`\\${selector}\\s*{[^}]*color:\\s*([^;]+);`))?.[1].trim();

  it('paints the name green, the stack cyan, and the line and chevron dim', () => {
    expect(colourOf('.mc-proj-name')).toBe('var(--green)');
    expect(colourOf('.mc-proj-stack')).toBe('var(--cyan)');
    expect(colourOf('.mc-proj-line')).toBe('var(--dim)');
    expect(colourOf('.mc-proj-chev')).toBe('var(--dim)');
  });
});

describe('the copy', () => {
  const cardLines = t => t.window.eval('DATA.projects').filter(p => p.cardLine).map(p => p.cardLine);

  /* The card is 390px wide on the phone it is written for, and the line is set
     at 12.5px — about 39 characters on one line. 42 is that with the slack a
     descender-light line buys. The failure this exists to catch is somebody
     pasting the terminal's 59-column sentence in, which wraps four times and
     turns a scannable row into a paragraph. */
  it('keeps every card line short enough for one line on a phone', () => {
    for (const line of cardLines(term)) {
      expect(line.length).toBeLessThanOrEqual(42);
    }
  });

  /* `js/data.js` uses plain hyphens throughout, so its strings render the same
     in a terminal, in a card and in a CV. Scoped to the rows: the two CV
     buttons are hand-written markup in `index.html` and have carried their
     em-dashes since long before this section existed. */
  it('has no em-dash in anything the rows print', () => {
    for (const row of rows(term)) {
      expect(row.textContent).not.toContain('—');
    }
    for (const line of cardLines(term)) {
      expect(line).not.toContain('—');
    }
  });
});
