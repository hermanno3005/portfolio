import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

/* The line a project's name is printed on, so the assertions below can talk
   about "what comes after PaceLab" rather than about output indices. */
function indexOf(lines, needle) {
  return lines.findIndex(l => l.trim() === needle);
}

describe('projects', () => {
  it('prints PaceLab first, then portfolio', () => {
    term.run('projects');
    const lines = term.lines();

    const pacelab = indexOf(lines, 'PaceLab');
    const portfolio = indexOf(lines, 'portfolio');

    expect(pacelab).toBeGreaterThan(-1);
    expect(portfolio).toBeGreaterThan(pacelab);
  });

  it("prints PaceLab's description, stack and URL", () => {
    term.run('projects');
    const text = term.text();

    expect(text).toContain('Python pipeline that strips weather and terrain out of my running data');
    expect(text).toContain('Stack: Python · SQLite · Docker');
    expect(text).toContain('https://github.com/hermanno3005/pacelab');
  });

  it('prints the German descriptions after lang de, and the English ones again after lang en', () => {
    term.run('lang de');
    term.run('projects');

    expect(term.text()).toContain('Python-Pipeline, die Wetter und Topografie aus meinen Laufdaten');
    expect(term.text()).toContain('Diese terminal-basierte Portfolio-Website');
    expect(term.text()).not.toContain('Python pipeline that strips weather');

    term.run('clear');
    term.run('lang en');
    term.run('projects');

    expect(term.text()).toContain('Python pipeline that strips weather');
    expect(term.text()).toContain('This terminal-style portfolio website');
    expect(term.text()).not.toContain('Python-Pipeline, die Wetter');
  });

  it('keeps both projects on their own descriptions across repeated switches', () => {
    for (const lang of ['de', 'en', 'de', 'en', 'de']) term.run(`lang ${lang}`);
    term.run('projects');
    const lines = term.lines();

    /* Each description sits directly under its project's name — that is what
       breaks first if the projects and projectDescriptions arrays drift apart. */
    const pacelab = indexOf(lines, 'PaceLab');
    const portfolio = indexOf(lines, 'portfolio');

    expect(lines[pacelab + 1]).toContain('Python-Pipeline');
    expect(lines[portfolio + 1]).toContain('Portfolio-Website');
  });

  it('shows no em-dash in any project string a visitor reads', () => {
    term.run('projects');
    expect(term.text()).not.toContain('—');

    term.run('clear');
    term.run('lang de');
    term.run('projects');
    expect(term.text()).not.toContain('—');
  });
});

describe('the projects directory', () => {
  it('lists pacelab.md before portfolio.md', () => {
    term.run('ls projects');
    const text = term.text();

    expect(text).toContain('pacelab.md');
    expect(text.indexOf('pacelab.md')).toBeLessThan(text.indexOf('portfolio.md'));
  });

  it('cats a generated page for PaceLab', () => {
    term.run('cat projects/pacelab.md');
    const text = term.text();

    expect(text).toContain('# PaceLab');
    expect(text).toContain('Python pipeline that strips weather');
    expect(text).toContain('Stack: Python · SQLite · Docker');
    expect(text).toContain('URL:   https://github.com/hermanno3005/pacelab');
  });
});
