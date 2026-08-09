/*
 * The `projects` list is the only surface that advertises runnability: names are
 * visibly clickable, runnable ones carry a warm marker, and one tip line says
 * what the marker means. `help`, the boot banner and replay say nothing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

/** The clickable name span for a project, as printed by `projects`. */
function nameEl(term, name) {
  return [...term.document.querySelectorAll('#output [data-cmd]')]
    .find(el => el.textContent === name);
}

/** The output line a project's name sits on, marker included. */
function nameLine(term, name) {
  return term.lines().find(l => l.trim().startsWith(name));
}

describe('project names in the projects list', () => {
  it('are green, bold and underlined', () => {
    term.run('projects');

    for (const name of ['PaceLab', 'portfolio']) {
      const el = nameEl(term, name);
      expect(el, `no clickable name for ${name}`).toBeDefined();
      expect([...el.classList]).toEqual(expect.arrayContaining(['green', 'bold', 'run-link']));
    }
  });

  it('stay green, bold and underlined in German', () => {
    term.run('lang de');
    term.run('projects');

    for (const name of ['PaceLab', 'portfolio']) {
      const el = nameEl(term, name);
      expect(el, `no clickable name for ${name}`).toBeDefined();
      expect([...el.classList]).toEqual(expect.arrayContaining(['green', 'bold', 'run-link']));
    }
  });

  it('carry the project id as the command they run', () => {
    term.run('projects');

    expect(nameEl(term, 'PaceLab').dataset.cmd).toBe('pacelab');
    expect(nameEl(term, 'portfolio').dataset.cmd).toBe('portfolio');
  });

  it('are not dressed as URL links', () => {
    term.run('projects');

    expect(nameEl(term, 'PaceLab').dataset.url).toBeUndefined();
    expect([...nameEl(term, 'PaceLab').classList]).not.toContain('link');
  });
});

describe('the runnable marker', () => {
  it('hangs off PaceLab with no space between', () => {
    term.run('projects');

    expect(nameLine(term, 'PaceLab').trim()).toBe('PaceLab*');
  });

  it('is warm, not green, so the eye can find it', () => {
    term.run('projects');

    const marker = [...term.document.querySelectorAll('#output .heat')]
      .find(el => el.textContent === '*');

    expect(marker, 'no warm * in the output').toBeDefined();
    expect([...marker.classList]).not.toContain('green');
  });

  it('is part of the same tap target as the name', () => {
    /* The tip sends the visitor hunting for the `*`, so on a tablet the `*` is
       what they will tap. */
    term.run('projects');
    const marker = [...term.document.querySelectorAll('#output .heat')]
      .find(el => el.textContent === '*');

    term.click(marker);

    expect(term.lines().some(l => l.includes('$ pacelab'))).toBe(true);
  });

  it('is absent from a project that does not claim to run', () => {
    term.run('projects');

    expect(nameLine(term, 'portfolio').trim()).toBe('portfolio');
  });
});

describe('clicking a project name', () => {
  it('runs that project and echoes the command into scrollback', () => {
    term.run('projects');
    term.run('clear');
    term.run('projects');

    term.click(nameEl(term, 'portfolio'));
    const lines = term.lines();

    /* The echo carries the prompt, so it is unmistakably a command that ran. */
    const echo = lines.findIndex(l => l.includes('$ portfolio'));
    expect(echo).toBeGreaterThan(-1);
    expect(lines.slice(echo).join('\n')).toContain('This terminal-style portfolio website');
  });
});

describe('the tip line', () => {
  it('names the file trick and the runnable trick, in English', () => {
    term.run('projects');
    const tip = term.lines().find(l => l.startsWith('Tip:'));

    expect(tip).toBe('Tip:  cat projects/<name>.md · run * projects by name');
  });

  it('names both tricks in German', () => {
    term.run('lang de');
    term.run('projects');
    const tip = term.lines().find(l => l.startsWith('Tipp:'));

    expect(tip).toBe('Tipp: cat projects/<name>.md · * Projekte per Namen starten');
  });

  it('never names a specific project', () => {
    for (const lang of ['en', 'de']) {
      term.run('clear');
      term.run(`lang ${lang}`);
      term.run('projects');
      const tip = term.lines().find(l => /^Tipp?:/.test(l));

      expect(tip.toLowerCase()).not.toContain('pacelab');
    }
  });

  it('lines up with the rule above it', () => {
    term.run('lang de');
    term.run('projects');
    const lines = term.lines();

    const rule = lines.find(l => l.startsWith('─'));
    const tip = lines.find(l => l.startsWith('Tipp:'));

    /* German is the long one; it may fill the rule but must not overrun it. */
    expect([...tip].length).toBeLessThanOrEqual([...rule].length);
  });

  it('comes from the locales, not from the command', () => {
    expect(read('js/data.js')).toContain('projectsTip');
    expect(read('js/commands.js')).not.toMatch(/Tipp?:/);
  });
});

describe('runnability is advertised nowhere else', () => {
  it('is not advertised by a project printing its own block', () => {
    /* The tip only prints under the list, so a marker anywhere else is a glyph
       with nothing to explain it — the exact failure the tip exists to prevent. */
    term.run('pacelab');

    expect(nameLine(term, 'PaceLab').trim()).toBe('PaceLab');
    expect(term.document.querySelector('#output .heat')).toBeNull();
    expect(term.document.querySelector('#output .run-link')).toBeNull();
  });

  it('is not mentioned by help, in either language', () => {
    for (const lang of ['en', 'de']) {
      term.run('clear');
      term.run(`lang ${lang}`);
      term.run('help');

      expect(term.text()).not.toContain('*');
    }
  });

  it('is not mentioned in the boot banner or its hint', () => {
    /* The boot sequence is animated and the harness skips it, so ask the strings
       it types out — the banner is the one surface nobody can opt out of. */
    for (const [lang, l] of Object.entries(term.locales())) {
      expect(l.welcome, lang).not.toContain('*');
      expect(l.helpHint, lang).not.toContain('*');
    }
  });
});

/* jsdom never applies the stylesheet, so these read the source. That is also the
   honest way to check a checklist item about what must *not* be in a file. */
describe('the palette', () => {
  it('declares --heat with a comment saying what it is really for', () => {
    const css = read('style.css');
    const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));

    expect(root).toMatch(/--heat:\s*#ffb86c;/);
    expect(root).toMatch(/--heat:[^\n]*\/\*[^\n]*\*\//);
  });

  it('has a .heat utility beside the other colour classes', () => {
    expect(read('style.css')).toMatch(/\.heat\s*\{[^}]*var\(--heat\)/);
  });

  it('introduced no hover state in the output', () => {
    const css = read('style.css');
    const hovers = css.match(/^[^\n]*:hover[^\n]*$/gm) || [];

    /* Every hover on this site belongs to the title bar chrome. */
    for (const rule of hovers) {
      expect(rule, `unexpected hover state: ${rule}`).toMatch(/\.dot|#traffic-lights/);
    }
  });
});
