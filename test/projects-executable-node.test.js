/*
 * A runnable project has a second filesystem node — `projects/<id>`, no
 * extension — beside its `<id>.md` document. The shell then behaves the way a
 * terminal-literate visitor expects when they poke at it: `ls` marks it, `cat`
 * offers to run it, `cd` refuses it.
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

/** The single line `ls projects/` prints. */
function listing(term) {
  term.run('clear');
  term.run('ls projects/');
  return term.lines().find(l => l.includes('pacelab'));
}

describe('ls projects/', () => {
  it('lists the runnable project twice — the document and the executable', () => {
    expect(listing(term)).toBe('pacelab*  pacelab.md  portfolio.md');
  });

  it('hangs the marker off the name rather than spelling it into the name', () => {
    term.run('ls projects/');

    const named = [...term.document.querySelectorAll('#output span')]
      .find(el => el.textContent === 'pacelab');

    expect(named, 'the entry is not named `pacelab`').toBeDefined();
    expect([...named.classList]).not.toContain('heat');
  });

  it('marks it with the same warm token the projects list uses', () => {
    term.run('ls projects/');

    const marker = [...term.document.querySelectorAll('#output .heat')]
      .find(el => el.textContent === '*');

    expect(marker, 'no warm * in the listing').toBeDefined();
    expect([...marker.classList]).not.toContain('green');
  });

  it('leaves every other entry exactly as it was', () => {
    term.run('ls');

    const spans = [...term.document.querySelectorAll('#output span')];
    const byText = name => spans.find(el => el.textContent === name);

    expect([...byText('projects/').classList]).toEqual(['cyan', 'bold']);
    expect([...byText('about.txt').classList]).toEqual(['fg']);
    expect([...byText('cv.pdf').classList]).toEqual(['fg']);
    expect(term.document.querySelector('#output .heat')).toBeNull();
  });
});

describe('a project that does not claim to run', () => {
  it('gets its document and nothing else', () => {
    const line = listing(term);

    expect(line).toContain('portfolio.md');
    expect(line).not.toMatch(/portfolio\*/);
    expect(line.split(/\s+/)).not.toContain('portfolio');
  });
});

describe('cat projects/pacelab', () => {
  it('follows the cv precedent — a dim binary-file line naming the action', () => {
    term.run('cat projects/pacelab');

    const line = term.lines().at(-1);
    expect(line).toBe('Binary file — pacelab to run it.');
  });

  it('makes the name clickable, and the click runs the project', () => {
    term.run('cat projects/pacelab');

    const link = [...term.document.querySelectorAll('#output [data-cmd]')]
      .find(el => el.textContent === 'pacelab');
    expect(link, 'no clickable pacelab in the binary-file line').toBeDefined();

    /* Cyan underline goes somewhere, green underline runs something. This one
       runs — the cv line it borrows its shape from is cyan because a download
       goes somewhere. */
    expect([...link.classList]).toEqual(expect.arrayContaining(['green', 'run-link']));
    expect([...link.classList]).not.toContain('link');

    term.click(link);

    expect(term.lines().some(l => l.includes('$ pacelab'))).toBe(true);
  });

  it('leaves the cv line — which goes somewhere, not runs — cyan', () => {
    term.run('cat cv.pdf');

    const link = term.document.querySelector('#output [data-cmd="open cv"]');
    expect([...link.classList]).toEqual(['cyan', 'link']);
  });

  it('still prints the document when asked for the document', () => {
    term.run('cat projects/pacelab.md');

    expect(term.text()).toContain('# PaceLab');
    expect(term.text()).not.toContain('Binary file');
  });
});

describe('cd projects/pacelab', () => {
  it('says it is not a directory and stays put', () => {
    term.run('cd projects/pacelab');

    expect(term.lines().at(-1)).toBe('cd: not a directory: projects/pacelab');
    expect(term.prompt()).toContain('~$');
  });
});

describe('tab completion inside projects/', () => {
  it('offers both entries', () => {
    term.run('clear');
    term.complete('cat projects/pace');

    const offered = term.lines().find(l => l.includes('pacelab'));
    expect(offered.split(/\s+/).filter(Boolean)).toEqual(['pacelab', 'pacelab.md']);
  });

  it('completes outright once the visitor is past the ambiguity', () => {
    expect(term.complete('cat projects/pacelab.')).toBe('cat projects/pacelab.md');
  });
});

describe('the language switch', () => {
  it('rebuilds both nodes, in the same order', () => {
    const before = listing(term);

    term.run('lang de');
    const german = listing(term);

    term.run('lang en');
    const after = listing(term);

    expect(german).toBe(before);
    expect(after).toBe(before);
  });

  it('leaves the neighbouring document readable in German', () => {
    term.run('lang de');
    term.run('cat projects/pacelab.md');

    expect(term.text()).toContain('Python-Pipeline');
  });
});

describe('the node exists only for projects marked runnable', () => {
  it('gives a bare node to each runnable project and none to the others', async () => {
    const custom = await mountTerminal({
      projects: [
        { id: 'alpha', name: 'Alpha', description: 'a', stack: ['x'], runnable: true },
        { id: 'beta',  name: 'Beta',  description: 'b', stack: ['y'] },
        { id: 'gamma', name: 'Gamma', description: 'c', stack: ['z'], runnable: true },
      ],
    });

    custom.run('ls projects/');
    const line = custom.lines().at(-1);

    expect(line).toBe('alpha*  alpha.md  beta.md  gamma*  gamma.md');

    custom.cleanup();
  });
});
