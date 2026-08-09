/*
 * A command can hold the terminal.
 *
 * The mechanism, not the choreography: a demo takes over the prompt, owns one
 * frame in the scrollback, and hands the terminal back on every exit path —
 * finish, `Escape`, a click on the frame, `Ctrl+C`, a thrown error.
 *
 * Most tests here register their own demo rather than driving the real one.
 * The runner's contract is what is under test, and a demo written for the test
 * can hold still exactly as long as an assertion needs.
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

/**
 * Replace the `pacelab` demo with one that parks in `play()` until the test
 * releases it — a deterministic stand-in for a multi-second animation.
 *
 * Returns handles onto the moment the demo is mid-flight: `started` resolves
 * once `play()` is running, `release()` lets it finish normally, and `log`
 * records which contract calls the runner actually made.
 */
function stallingDemo(term, { height = 380, minCols = 0, onPlay } = {}) {
  const log = [];
  let release;
  let startedResolve;
  const started = new Promise(r => { startedResolve = r; });

  term.regDemo('pacelab', {
    height,
    minCols,
    renderFinal(frame) {
      log.push('renderFinal');
      frame.paint('<span class="dim">landing frame</span>');
    },
    async play(frame, signal) {
      log.push('play');
      frame.paint('<span class="dim">mid-flight</span>');
      startedResolve();
      if (onPlay) {
        await onPlay(frame, signal);
      } else {
        /* Parked until the test releases it — or until the visitor skips, which
           unwinds through the runner's own primitive, exactly as a real beat
           would. */
        await Promise.race([new Promise(r => { release = r; }), frame.sleep(60000)]);
      }
      log.push('play-finished');
    },
  });

  return { log, started, release: () => release && release() };
}

/** Start `pacelab` and wait until its `play()` is on screen. */
async function startDemo(term, opts) {
  const demo = stallingDemo(term, opts);
  const done = term.run('pacelab');
  await demo.started;
  return { ...demo, done };
}

describe('while a demo holds the terminal', () => {
  it('hides the prompt, prints the skip hint, and frames below the echoed command', async () => {
    const { release, done } = await startDemo(term);

    expect(term.busy()).toBe(true);
    expect(term.text()).toContain('press esc to skip');
    expect(term.frame()).not.toBeNull();

    const lines = term.lines();
    const echo = lines.findIndex(l => l.includes('$ pacelab'));
    const hint = lines.findIndex(l => l.includes('press esc to skip'));
    expect(echo).toBeGreaterThanOrEqual(0);
    expect(hint).toBe(echo + 1);
    expect(lines.at(-1)).toBe('mid-flight');

    release();
    await done;
  });

  it('keeps the input line laid out and the input focused', async () => {
    const { release, done } = await startDemo(term);

    /* Never `display: none` — the input is the site's only keyboard path, and a
       dropped layout box takes focus with it. Verified by the fact that the
       runner is still hearing keys at all, which the skip tests below prove. */
    const inputLine = term.document.getElementById('input-line');
    expect([...inputLine.classList]).not.toContain('hidden');
    expect(term.document.activeElement).toBe(term.document.getElementById('cmd-input'));

    release();
    await done;
  });

  it('does nothing when a second command is issued', async () => {
    const { release, done } = await startDemo(term);
    const before = term.lines();

    await term.run('help');

    expect(term.lines()).toEqual(before);

    release();
    await done;
  });

  it('leaves scrollback links inert', async () => {
    term.run('projects');
    const link = term.document.querySelector('#output [data-cmd="portfolio"]');

    const { release, done } = await startDemo(term);
    const before = term.lines();

    term.click(link);
    await term.flush();

    expect(term.lines()).toEqual(before);

    release();
    await done;
  });
});

describe('finishing normally', () => {
  it('paints the landing frame, restores the prompt and keeps the scrollback', async () => {
    const { log, release, done } = await startDemo(term);
    const scrollbackBefore = term.lines().length;

    release();
    await done;

    expect(log).toEqual(['play', 'play-finished', 'renderFinal']);
    expect(term.busy()).toBe(false);
    expect(term.frame().textContent).toBe('landing frame');
    expect(term.lines().length).toBe(scrollbackBefore);
    expect(term.prompt()).toContain('~$');
  });
});

describe('Escape', () => {
  it('paints the landing frame, restores the prompt and leaves the scrollback intact', async () => {
    const { log, done } = await startDemo(term);
    const scrollbackBefore = term.lines().length;

    term.press('Escape');
    await done;

    expect(log).toEqual(['play', 'renderFinal']);
    expect(term.frame().textContent).toBe('landing frame');
    expect(term.busy()).toBe(false);
    expect(term.lines().length).toBe(scrollbackBefore);
  });

  it('prints no error line — the abort is not a failure', async () => {
    const { done } = await startDemo(term);

    term.press('Escape');
    await done;

    expect(term.text()).not.toContain('error:');
    expect(term.document.querySelector('#output .red')).toBeNull();
  });
});

describe('Ctrl+C', () => {
  it('echoes ^C, keeps the partial frame, and never paints the landing frame', async () => {
    const { log, done } = await startDemo(term);

    term.press('c', { ctrlKey: true });
    await done;

    expect(log).toEqual(['play']);
    expect(term.frame().textContent).toBe('mid-flight');
    expect(term.lines().at(-1)).toBe('^C');
    expect(term.busy()).toBe(false);
    expect(term.prompt()).toContain('~$');
  });

  it('does not skip while text is selected — that Ctrl+C is a copy', async () => {
    const { release, done } = await startDemo(term);
    term.window.getSelection = () => ({ toString: () => 'ran 5:26/km' });

    term.press('c', { ctrlKey: true });
    await term.flush();

    expect(term.busy()).toBe(true);

    release();
    await done;
  });
});

describe('clicking the frame', () => {
  it('does exactly what Escape does', async () => {
    const { log, done } = await startDemo(term);

    term.click(term.frame());
    await done;

    expect(log).toEqual(['play', 'renderFinal']);
    expect(term.frame().textContent).toBe('landing frame');
    expect(term.busy()).toBe(false);
  });

  it('does not skip on the click that ends a drag-select', async () => {
    const { release, done } = await startDemo(term);
    term.window.getSelection = () => ({ toString: () => 'ran 5:26/km' });

    term.click(term.frame());
    await term.flush();

    expect(term.busy()).toBe(true);

    release();
    await done;
  });

  it('is wired without asking what kind of pointer it was', async () => {
    /* The tablet trap: full terminal, no physical keyboard. A coarse pointer
       must reach the same exit a keyboard does. */
    const { done } = await startDemo(term);

    term.frame().dispatchEvent(new term.window.PointerEvent('click', { bubbles: true, pointerType: 'touch' }));
    await done;

    expect(term.busy()).toBe(false);
  });
});

describe('keys that must not skip', () => {
  it('ignores modifier-only presses', async () => {
    const { release, done } = await startDemo(term);

    for (const key of ['Shift', 'Control', 'Alt', 'Meta']) {
      term.press(key);
      await term.flush();
      expect(term.busy(), `${key} skipped the demo`).toBe(true);
    }

    release();
    await done;
  });

  it('ignores Cmd combos, so selection-copy survives', async () => {
    const { release, done } = await startDemo(term);

    term.press('c', { metaKey: true });
    await term.flush();

    expect(term.busy()).toBe(true);

    release();
    await done;
  });
});

describe('keys that are discarded', () => {
  it('swallows ordinary typing and hands back an empty prompt', async () => {
    const { release, done } = await startDemo(term);

    for (const key of ['h', 'e', 'l', 'p']) {
      expect(term.press(key).defaultPrevented, `${key} reached the input`).toBe(true);
    }
    /* Belt and braces: even a keystroke that somehow lands in the input is
       cleared on resume, so the returning prompt is never pre-filled. */
    term.type('help');

    release();
    await done;

    expect(term.inputValue()).toBe('');
  });

  it('does not buffer Enter into a queued command', async () => {
    const { release, done } = await startDemo(term);
    const before = term.lines();

    term.press('Enter');
    await term.flush();

    expect(term.lines()).toEqual(before);

    release();
    await done;

    expect(term.lines().length).toBe(before.length);
  });
});

describe('the viewport', () => {
  it('scrolls once, when the frame is inserted, and not again while it plays', async () => {
    const termEl = term.document.getElementById('terminal');
    let scrolls = 0;
    Object.defineProperty(termEl, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: () => { scrolls++; },
    });

    const { release, done } = await startDemo(term, {
      onPlay: async (frame) => {
        for (let i = 0; i < 5; i++) {
          frame.paint(`<span>beat ${i}</span>`);
          await frame.sleep(1);
        }
        await frame.sleep(60000);
      },
    });
    const atInsert = scrolls;

    expect(atInsert).toBeGreaterThan(0);

    /* Five paints later, the viewport has not been touched again. */
    await new Promise(r => setTimeout(r, 30));
    expect(scrolls).toBe(atInsert);

    /* Handing the terminal back does scroll, once — that is `run()` bringing
       the returning prompt into view, exactly as it does for every command. */
    release();
    term.press('Escape');
    await done;
    expect(scrolls).toBe(atInsert + 1);
  });

  it('reserves the frame height up front, so nothing below it moves', async () => {
    const { release, done } = await startDemo(term, { height: 380 });

    expect(term.frame().style.minHeight).toBe('380px');

    release();
    await done;
  });
});

describe('reduced motion', () => {
  it('paints the landing frame immediately, with no motion and no message', async () => {
    term.cleanup();
    term = await mountTerminal({ reducedMotion: true });

    const { log } = stallingDemo(term);
    await term.run('pacelab');

    expect(log).toEqual(['renderFinal']);
    expect(term.frame().textContent).toBe('landing frame');
    expect(term.text()).not.toContain('too narrow');
    expect(term.busy()).toBe(false);
  });

  it('offers no skip hint, since there is nothing to skip', async () => {
    term.cleanup();
    term = await mountTerminal({ reducedMotion: true });

    stallingDemo(term);
    await term.run('pacelab');

    expect(term.text()).not.toContain('press esc to skip');
  });
});

describe('below the width floor', () => {
  /** Give the realm a layout: `cols` characters wide, 10px per character. */
  function widen(term, cols) {
    const { Element, HTMLElement } = term.window;
    Object.defineProperty(Element.prototype, 'clientWidth', {
      configurable: true,
      get: () => cols * 10,
    });
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { width: (this.textContent.length || 1) * 10, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
    };
  }

  it('skips play, paints the landing frame, and says what to do about it', async () => {
    widen(term, 30);
    const { log } = stallingDemo(term, { minCols: 60 });

    await term.run('pacelab');

    expect(log).toEqual(['renderFinal']);
    expect(term.frame().textContent).toBe('landing frame');
    expect(term.text()).toContain('terminal too narrow');
    expect(term.text()).toContain('pacelab');
    /* One notice, not a notice and a hint for a skip that cannot happen. */
    expect(term.text()).not.toContain('press esc to skip');
  });

  it('says it in German under lang de', async () => {
    widen(term, 30);
    stallingDemo(term, { minCols: 60 });

    term.run('lang de');
    await term.run('pacelab');

    expect(term.text()).toContain('Terminal zu schmal');
  });

  it('plays as normal once the terminal is wide enough', async () => {
    widen(term, 120);
    const { log, release, done } = await startDemo(term, { minCols: 60 });

    expect(log).toContain('play');
    expect(term.text()).not.toContain('too narrow');

    release();
    await done;
  });

  it('assumes it fits when there is no layout to measure', async () => {
    /* jsdom reports zero for every box. Refusing to animate on a measurement we
       do not have is the worse guess. */
    const { log, release, done } = await startDemo(term, { minCols: 60 });

    expect(log).toContain('play');

    release();
    await done;
  });
});

describe('a demo that throws', () => {
  it('still prints an error line for anything that is not an abort', async () => {
    term.regDemo('pacelab', {
      height: 100,
      renderFinal(frame) { frame.paint('landing frame'); },
      async play() { throw new Error('beat two fell over'); },
    });

    await term.run('pacelab');

    expect(term.text()).toContain('error: beat two fell over');
    expect(term.busy()).toBe(false);
    expect(term.frame().textContent).toBe('landing frame');
  });
});

describe('the frame surface', () => {
  it('is exactly paint, el, sleep and settle — no handler ctx', async () => {
    let seen;
    let ctxArgs;
    term.regDemo('pacelab', {
      height: 100,
      renderFinal(frame) { frame.paint('landing frame'); },
      async play(...args) {
        seen = Object.keys(args[0]).sort();
        ctxArgs = args.length;
      },
    });

    await term.run('pacelab');

    expect(seen).toEqual(['el', 'paint', 'settle', 'sleep']);
    /* The frame and the abort signal, and nothing else — every member of a
       command's `ctx` is forbidden, harmful or irrelevant here. */
    expect(ctxArgs).toBe(2);
  });

  it('paints wholesale into the element it owns', async () => {
    const { done } = await startDemo(term, {
      onPlay: async (frame) => {
        frame.paint('<span class="cyan">first</span>');
        expect(frame.el.textContent).toBe('first');
        frame.paint('<span class="cyan">second</span>');
        expect(frame.el.children.length).toBe(1);
        await frame.sleep(60000);
      },
    });

    expect(term.frame().textContent).toBe('second');

    term.press('Escape');
    await done;
  });

  it('rejects sleep with an AbortError the moment the visitor skips', async () => {
    let rejection;
    const { done } = await startDemo(term, {
      onPlay: async (frame) => {
        try {
          await frame.sleep(60000);
        } catch (err) {
          rejection = err;
          throw err;
        }
      },
    });

    term.press('Escape');
    await done;

    expect(rejection.name).toBe('AbortError');
    expect(term.text()).not.toContain('error:');
  });

  it('holds for the full sleep when nobody skips', async () => {
    let slept = false;
    await term.run('nonexistent-warmup');

    const { done } = await startDemo(term, {
      onPlay: async (frame) => { await frame.sleep(5); slept = true; },
    });
    await done;

    expect(slept).toBe(true);
  });

  it('settle falls back to the timer only when there is nothing to wait on', async () => {
    let settled = false;
    const { done } = await startDemo(term, {
      onPlay: async (frame) => {
        /* jsdom has no Web Animations API, and an empty list means the same
           thing: nothing to await, so the substitute runs. */
        await frame.settle(5);
        settled = true;
      },
    });
    await done;

    expect(settled).toBe(true);
  });

  it('settle waits on the element\'s own animations rather than the fallback', async () => {
    let order = [];
    const { done } = await startDemo(term, {
      onPlay: async (frame) => {
        let finish;
        const finished = new Promise(r => { finish = r; });
        /* A frozen tab must not cut the beat short: the fallback is a
           substitute, never a race. */
        frame.el.getAnimations = () => [{ finished }];
        const settling = frame.settle(1).then(() => order.push('settled'));
        await new Promise(r => setTimeout(r, 20));
        order.push('animation-finished');
        finish();
        await settling;
      },
    });
    await done;

    expect(order).toEqual(['animation-finished', 'settled']);
  });
});

describe('after any exit path', () => {
  it.each([
    ['finishing', async (t, d) => { d.release(); }],
    ['escaping',  async (t) => { t.press('Escape'); }],
    ['ctrl+c',    async (t) => { t.press('c', { ctrlKey: true }); }],
  ])('leaves the terminal usable and ↑ recalling pacelab — %s', async (_name, exit) => {
    const demo = await startDemo(term);
    await exit(term, demo);
    await demo.done;

    term.press('ArrowUp');
    expect(term.inputValue()).toBe('pacelab');

    await term.run('help');
    expect(term.text()).toContain('Available commands');
  });
});

describe('the demo registry', () => {
  it('is read at run time, so the script order does not matter', async () => {
    const reordered = await mountTerminal({ scripts: ['js/data.js', 'js/demos.js', 'js/terminal.js', 'js/commands.js'] });

    await reordered.run('pacelab');

    expect(reordered.frame()).not.toBeNull();
    expect(reordered.warnings()).toEqual([]);

    reordered.cleanup();
  });

  it('ships a pacelab demo, so the runnable project is not a broken promise', async () => {
    /* Skipped rather than sat through: what is under test is that the real demo
       is registered and runs clean, not how long its beats last. */
    const done = term.run('pacelab');
    term.press('Escape');
    await done;

    expect(term.warnings()).toEqual([]);
    expect(term.frame()).not.toBeNull();
  });
});

describe('the busy stylesheet', () => {
  /* jsdom applies no stylesheet, so the rules themselves are what a test can
     ask about — and the way the prompt is hidden is load-bearing, not cosmetic. */
  const busyRules = () => fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8')
    .split('\n')
    .filter(l => l.includes('.term-busy'));

  it('hides the prompt and caret without taking their layout box', () => {
    const rules = busyRules().join('\n');

    expect(rules).toMatch(/#prompt-display\s*{\s*visibility:\s*hidden/);
    expect(rules).toMatch(/#cursor\s*{\s*opacity:\s*0/);
    /* `display: none` would drop the box and blur the input with it, which is
       the site's only keyboard path — and so the runner's only one. */
    expect(rules).not.toMatch(/display:\s*none/);
  });

  it('deadens the scrollback but not the frame a visitor has to be able to tap', () => {
    const rules = busyRules();

    expect(rules.find(l => l.includes('#output'))).toMatch(/pointer-events:\s*none/);
    expect(rules.find(l => l.includes('.demo-frame'))).toMatch(/pointer-events:\s*auto/);
  });
});

describe('the commands that were here first', () => {
  it('still work through the now-async run()', () => {
    term.run('whoami');
    expect(term.text()).toContain('Hermann Aust');

    term.run('cd projects');
    expect(term.prompt()).toContain('~/projects$');

    term.run('clear');
    expect(term.lines()).toEqual([]);

    term.run('echo hello');
    expect(term.lines().at(-1)).toBe('hello');

    term.run('nope');
    expect(term.lines().at(-1)).toContain('command not found: nope');
  });
});
