/*
 * The help list is curated — see the note above `echo` in js/commands.js for
 * why these two are absent from it.
 *
 * The second half of this file carries as much weight as the first: once the
 * names are gone from `help`, the commands look unreferenced, and the natural
 * next cleanup is to delete them.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

/* The help block prints as a single output element, so read the scrollback as
   the visitor sees it: one line per line. */
function screen() {
  return term.text().split('\n');
}

/* A row is `  name  · description` — one word, then the separator. That rules
   out the closing hint line, which also carries a `·`. Matching the row rather
   than the whole screen is what keeps 'ls' from being found inside 'skills'. */
function helpRows() {
  return screen().filter(l => /^ {2}\S+ +· /.test(l));
}

describe('the help list', () => {
  it('does not advertise echo or uname, in either language', () => {
    for (const [lang, heading] of [['en', 'Available commands'], ['de', 'Verfügbare Befehle']]) {
      term.run('clear');
      term.run(`lang ${lang}`);
      term.run('help');

      /* Without this the test would also pass on a `help` that printed nothing. */
      expect(term.text(), lang).toContain(heading);

      for (const name of ['echo', 'uname']) {
        expect(helpRows().map(l => l.trim().split(' ')[0]), `${lang} ${name}`).not.toContain(name);
      }
    }
  });

  it('keeps its rows lined up after the edit, in either language', () => {
    for (const lang of ['en', 'de']) {
      term.run('clear');
      term.run(`lang ${lang}`);
      term.run('help');

      /* The rules bounding the list are fixed-width and independent of row
         count, and every row's separator sits in one column. */
      const rules = screen().filter(l => /^─+$/.test(l.trim()));
      expect(new Set(rules.map(l => l.trim().length)).size, `${lang} rules`).toBe(1);

      const columns = new Set(helpRows().map(l => l.indexOf('·')));
      expect(columns.size, `${lang} rows`).toBe(1);
    }
  });
});

describe('the unadvertised commands', () => {
  it('runs echo and prints back what it was given', () => {
    term.run('echo hello');

    expect(term.lines().at(-1)).toBe('hello');
  });

  it('runs uname and prints HermannOS', () => {
    term.run('uname');

    expect(term.lines().at(-1)).toBe('HermannOS');
  });

  it('runs uname -a and prints the longer kernel string', () => {
    term.run('uname -a');

    expect(term.lines().at(-1)).toBe('HermannOS 1.0.0 portfolio-kernel #1');
  });

  it('completes both from a prefix, so muscle memory still works', () => {
    expect(term.complete('ech')).toBe('echo ');
    expect(term.complete('una')).toBe('uname ');
  });
});
