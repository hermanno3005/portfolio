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

  it('prints PaceLab\'s block for pacelab', () => {
    term.run('pacelab');
    const text = term.text();

    expect(text).toContain('PaceLab');
    expect(text).toContain('Python pipeline that strips weather and terrain out of my running data');
    expect(text).toContain('Stack: Python · SQLite · Docker');
    expect(text).toContain('https://github.com/hermanno3005/pacelab');
  });

  it('warns that PaceLab is runnable with no demo registered', () => {
    term.run('pacelab');

    expect(term.warnings().join('\n')).toContain('pacelab');
    expect(term.warnings().join('\n')).toMatch(/runnable/i);
  });

  it('says nothing about runnability for a project that does not claim it', () => {
    term.run('portfolio');

    expect(term.warnings()).toEqual([]);
  });

  it('treats PaceLab and PACELAB exactly as pacelab', () => {
    term.run('pacelab');
    const lower = term.text();

    term.run('clear');
    term.run('PaceLab');
    const title = term.text();

    term.run('clear');
    term.run('PACELAB');
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

describe('registration across a language switch', () => {
  it('still resolves the project ids, with the descriptions of the active language', () => {
    term.run('lang de');
    term.run('pacelab');

    expect(term.text()).toContain('Python-Pipeline, die Wetter und Topografie');

    term.run('clear');
    term.run('lang en');
    term.run('pacelab');

    expect(term.text()).toContain('Python pipeline that strips weather');
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
