import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

describe('a project name typed as a command', () => {
  it('prints that project\'s block for portfolio', () => {
    term.run('portfolio');
    const text = term.text();

    expect(text).toContain('portfolio');
    expect(text).toContain('This terminal-style portfolio website');
    expect(text).toContain('Stack: HTML · CSS · JavaScript');
    expect(text).toContain('https://github.com/hermanno3005/portfolio');
  });

  it('gives the URL the same clickable markup the projects list gives it', () => {
    term.run('portfolio');

    const link = term.document.querySelector('#output [data-url]');
    expect(link).not.toBeNull();
    expect(link.dataset.url).toBe('https://github.com/hermanno3005/portfolio');
  });

  it('prints only the project asked for', () => {
    term.run('portfolio');

    expect(term.text()).not.toContain('PaceLab');
  });

  it('runs the demo instead, for a project that has one', () => {
    /* PaceLab is runnable and ships a demo, so its name is not a way to read
       about it — it is a way to watch it. */
    term.run('pacelab');

    expect(term.document.querySelector('#output .demo-frame')).not.toBeNull();
    expect(term.text()).not.toContain('Stack: Python · SQLite · Docker');
  });

  it('says nothing about runnability for a project that does not claim it', () => {
    term.run('portfolio');

    expect(term.warnings()).toEqual([]);
  });

  /* Asked of a project that prints rather than runs: a demo holds the terminal,
     so three runs in a row would be one run and two no-ops — a test that passes
     by comparing nothing to nothing. */
  it('treats Portfolio and PORTFOLIO exactly as portfolio', () => {
    term.run('portfolio');
    const lower = term.text();

    term.run('clear');
    term.run('Portfolio');
    const title = term.text();

    term.run('clear');
    term.run('PORTFOLIO');
    const upper = term.text();

    /* Only the echoed command line differs — drop it and compare the output. */
    const body = text => text.split('\n').slice(1).join('\n');
    expect(body(title)).toBe(body(lower));
    expect(body(upper)).toBe(body(lower));
  });

  it('still prints command not found for something that is not a project', () => {
    term.run('paclab');

    expect(term.text()).toContain('command not found: paclab');
  });
});

describe('a project that claims to run and cannot', () => {
  let broken;

  beforeEach(async () => {
    broken = await mountTerminal({
      projects: [{
        id: 'ghost',
        name: 'Ghost',
        description: 'marked runnable, with no demo registered',
        stack: ['Regret'],
        url: 'https://example.com/ghost',
        runnable: true,
      }],
    });
  });

  afterEach(() => {
    broken.cleanup();
  });

  it('shows the visitor the project rather than nothing', () => {
    broken.run('ghost');
    const text = broken.text();

    expect(text).toContain('Ghost');
    expect(text).toContain('marked runnable, with no demo registered');
    expect(text).toContain('Stack: Regret');
    expect(text).toContain('https://example.com/ghost');
  });

  it('warns, naming the offending id', () => {
    broken.run('ghost');

    expect(broken.warnings().join('\n')).toContain('ghost');
    expect(broken.warnings().join('\n')).toMatch(/runnable/i);
  });
});

describe('tab completion', () => {
  it('completes a project id the way it completes a built-in', () => {
    expect(term.complete('pacel')).toBe('pacelab ');
    expect(term.complete('neof')).toBe('neofetch ');
  });

  it('offers project ids alongside built-in commands', () => {
    term.complete('p');
    const text = term.text();

    expect(text).toContain('pacelab');
    expect(text).toContain('portfolio');
    expect(text).toContain('projects');
    expect(text).toContain('pwd');
  });
});

describe('a project id that collides with a command name', () => {
  let colliding;

  beforeEach(async () => {
    colliding = await mountTerminal({
      projects: [
        {
          id: 'help',
          name: 'Help Project',
          description: 'a project whose id was typed carelessly',
          stack: ['Regret'],
          url: 'https://example.com/help',
        },
        {
          id: 'pacelab',
          name: 'PaceLab',
          description: 'normalized pace from grade, heat and wind',
          stack: ['Python'],
          url: 'https://github.com/hermanno3005/pacelab',
        },
      ],
    });
  });

  afterEach(() => {
    colliding.cleanup();
  });

  it('leaves the built-in handler in place', () => {
    colliding.run('help');
    const text = colliding.text();

    expect(text).toContain('Available commands');
    expect(text).not.toContain('Help Project');
  });

  it('warns, naming the offending id', () => {
    expect(colliding.warnings().join('\n')).toContain('help');
  });

  it('registers the projects that do not collide', () => {
    colliding.run('pacelab');

    expect(colliding.text()).toContain('PaceLab');
  });
});

describe('a project id colliding with any command, wherever it is defined', () => {
  /* Every built-in, not just the ones that happen to be defined early: a guard
     that runs mid-file would wave these through and let the later definition
     overwrite them — the silent shadowing the loud check exists to prevent. */
  const BUILT_INS = [
    'help', 'whoami', 'about', 'pwd', 'ls', 'cd', 'cat', 'open', 'projects',
    'skills', 'contact', 'clear', 'echo', 'history', 'uname', 'neofetch',
    'lang', 'sudo',
  ];

  it.each(BUILT_INS)('warns about the id %s', async (id) => {
    const colliding = await mountTerminal({
      projects: [{ id, name: `${id} project`, description: 'shadowing', stack: ['Regret'] }],
    });

    try {
      expect(colliding.warnings().join('\n')).toContain(`'${id}'`);
    } finally {
      colliding.cleanup();
    }
  });

  /* `help` above covers a built-in defined before the projects; `clear` is
     defined after them, and wipes the screen so it is unmistakable which
     handler ran. */
  it('keeps a built-in that is defined after the projects are registered', async () => {
    const colliding = await mountTerminal({
      projects: [{ id: 'clear', name: 'clear project', description: 'shadowing', stack: ['Regret'] }],
    });

    try {
      colliding.run('whoami');
      expect(colliding.text()).toContain('Hermann Aust');

      colliding.run('clear');
      expect(colliding.text()).toBe('');
    } finally {
      colliding.cleanup();
    }
  });
});

describe('registration across a language switch', () => {
  it('still resolves the project ids, with the descriptions of the active language', () => {
    term.run('lang de');
    term.run('portfolio');

    expect(term.text()).toContain('Diese terminal-basierte Portfolio-Website');

    term.run('clear');
    term.run('lang en');
    term.run('portfolio');

    expect(term.text()).toContain('This terminal-style portfolio website');
  });

  it('registers each id exactly once, however often the language changes', () => {
    for (const lang of ['de', 'en', 'de', 'en']) term.run(`lang ${lang}`);

    term.run('clear');
    term.complete('p');
    const offered = term.text().split(/\s+/).filter(w => w === 'pacelab');

    expect(offered).toHaveLength(1);
  });

  it('leaves the built-in commands alone', () => {
    for (const lang of ['de', 'en']) term.run(`lang ${lang}`);

    term.run('clear');
    term.run('help');

    expect(term.text()).toContain('Available commands');
  });
});
