import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal } from './harness.js';

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

describe('the harness', () => {
  it('provides the DOM index.html provides', () => {
    for (const id of ['output', 'input-line', 'prompt-display', 'cmd-input', 'terminal']) {
      expect(term.document.getElementById(id), `#${id}`).not.toBeNull();
    }
  });

  it('hands over a terminal at the prompt, with the boot sequence not run', () => {
    expect(term.text()).toBe('');
    expect(term.prompt()).toBe('hermann@portfolio:~$');
  });

  it('echoes each command back at the prompt, as the real terminal does', () => {
    term.run('pwd');

    expect(term.lines()[0]).toBe('hermann@portfolio:~$ pwd');
  });

  it('gives every mount its own state', async () => {
    term.run('lang de');
    term.run('cd projects');
    term.run('help');

    const second = await mountTerminal();
    try {
      /* Language, cwd, output and history all start over. */
      expect(second.text()).toBe('');
      expect(second.prompt()).toBe('hermann@portfolio:~$');

      second.run('help');
      expect(second.text()).toContain('Available commands');

      /* Only what was typed into this terminal — newest first. */
      second.run('history');
      expect(second.lines().slice(-2).map(l => l.trim())).toEqual(['2  history', '1  help']);
    } finally {
      second.cleanup();
    }

    /* …and the first terminal is untouched by the second. */
    expect(term.prompt()).toBe('hermann@portfolio:~/projects$');
    expect(term.text()).toContain('Verfügbare Befehle');
  });
});

describe('smoke', () => {
  it('runs help and prints the English help block', () => {
    term.run('help');

    expect(term.text()).toContain('Available commands');
    expect(term.text()).toContain('neofetch');
    expect(term.text()).toContain('Use Tab to autocomplete');
  });

  it('runs lang de then help and prints the German help block', () => {
    term.run('lang de');
    term.run('help');

    expect(term.text()).toContain('Sprache auf Deutsch umgestellt.');
    expect(term.text()).toContain('Verfügbare Befehle');
    expect(term.text()).toContain('Verzeichnisinhalt anzeigen');
    expect(term.text()).not.toContain('Available commands');
  });
});
