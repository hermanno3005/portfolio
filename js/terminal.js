/* ── Terminal Engine ── */

const Term = (() => {
  const outputEl      = document.getElementById('output');
  const inputLineEl   = document.getElementById('input-line');
  const promptDisplay = document.getElementById('prompt-display');
  const inputBefore   = document.getElementById('input-before');
  const inputAfter    = document.getElementById('input-after');
  const cmdInput      = document.getElementById('cmd-input');
  const cursorEl      = document.getElementById('cursor');
  const termEl        = document.getElementById('terminal');

  let cwd         = '/home/hermann';
  let history     = [];
  let historyIdx  = -1;
  let savedInput  = '';

  /* The foreground process, or null. A command that holds the terminal is the
     one piece of global state on this page, and this is it: the re-entry guard,
     the keyboard mode switch and the abort handle all read from here. */
  let running = null;

  /* ── Prompt string ── */
  function promptStr() {
    const display = cwd.replace('/home/hermann', '~');
    return `<span class="green">${DATA.user}@${DATA.hostname}</span><span class="dim">:</span><span class="cyan">${display}</span><span class="dim">$</span> `;
  }

  function refreshPrompt() {
    promptDisplay.innerHTML = promptStr();
  }

  /* ── Output helpers ── */
  function printRaw(html = '', classes = '') {
    const div = document.createElement('div');
    div.className = 'output-line' + (classes ? ' ' + classes : '');
    div.innerHTML = html;
    outputEl.appendChild(div);
    scrollBottom();
  }

  function printText(text, cls = '') {
    text.split('\n').forEach(line => printRaw(escHtml(line), cls));
  }

  function clear() {
    outputEl.innerHTML = '';
  }

  function scrollBottom() {
    termEl.scrollTop = termEl.scrollHeight;
  }

  function escHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ── Virtual filesystem helpers ── */
  function resolvePath(p) {
    if (!p || p === '~') return '/home/hermann';
    if (p.startsWith('~/')) p = '/home/hermann/' + p.slice(2);
    if (!p.startsWith('/')) {
      p = cwd + '/' + p;
    }
    /* Normalize: collapse . and .. */
    const parts = p.split('/').filter(Boolean);
    const resolved = [];
    for (const part of parts) {
      if (part === '.')  continue;
      if (part === '..') { resolved.pop(); continue; }
      resolved.push(part);
    }
    return '/' + resolved.join('/');
  }

  function fsNode(p) {
    return DATA.fs[p] || null;
  }

  /* ── Tab completion ── */
  function tabComplete(value) {
    const tokens = value.split(' ');
    const last   = tokens[tokens.length - 1];

    if (tokens.length === 1) {
      /* Complete command names */
      const cmds = Object.keys(COMMANDS);
      const matches = cmds.filter(c => c.startsWith(last));
      if (matches.length === 1) {
        return matches[0] + ' ';
      } else if (matches.length > 1) {
        printRaw('');
        printRaw(matches.map(m => `<span class="cyan">${escHtml(m)}</span>`).join('  '));
        return value;
      }
    } else {
      /* Complete filesystem paths */
      const dir  = last.includes('/') ? resolvePath(last.slice(0, last.lastIndexOf('/') + 1)) : cwd;
      const stem = last.includes('/') ? last.slice(last.lastIndexOf('/') + 1) : last;
      const node = fsNode(dir);
      if (node && node.type === 'dir') {
        const matches = node.children.filter(c => c.startsWith(stem));
        if (matches.length === 1) {
          const completed = (last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : '') + matches[0];
          tokens[tokens.length - 1] = completed;
          return tokens.join(' ');
        } else if (matches.length > 1) {
          printRaw('');
          printRaw(matches.map(m => {
            const childPath = dir + '/' + m;
            const isDir = fsNode(childPath) && fsNode(childPath).type === 'dir';
            return `<span class="${isDir ? 'cyan' : 'fg'}">${escHtml(m)}</span>`;
          }).join('  '));
          return value;
        }
      }
    }
    return value;
  }

  /* ── Echo a command back into output ── */
  function echoCommand(raw) {
    const div = document.createElement('div');
    div.className = 'output-line prompt-echo';
    div.innerHTML = promptStr() + `<span>${escHtml(raw)}</span>`;
    outputEl.appendChild(div);
  }

  /* ── Run a command string ──
     Async because a handler may hold the terminal for several seconds; a
     synchronous handler resolves immediately and is unaffected. The prompt
     refresh and the final scroll therefore happen after the await, and the
     `try/catch` — which keeps working across `await`, unlike a done-callback —
     still wraps every exit path a handler can take. */
  async function run(raw) {
    /* A foreground process owns the terminal: a second command, whether typed
       or clicked out of the scrollback, does nothing at all. Not even an echo —
       a shell that answers while it is busy is worse than one that ignores you. */
    if (running) return;

    const trimmed = raw.trim();
    echoCommand(raw);

    if (!trimmed) { scrollBottom(); return; }

    history.unshift(trimmed);
    historyIdx = -1;
    savedInput = '';

    const [cmd, ...args] = trimmed.split(/\s+/);
    const handler = COMMANDS[cmd.toLowerCase()];

    if (handler) {
      try {
        await handler({ args, raw: trimmed, cwd, printText, printRaw, clear, escHtml, resolvePath, fsNode, setCwd, scrollBottom });
      } catch (err) {
        /* A skip is not a failure. Without this, every `Escape` would leave a
           red line behind explaining that the visitor did something. */
        if (!isAbort(err)) {
          printRaw(`<span class="red">error: ${escHtml(String(err.message ?? err))}</span>`);
        }
      }
    } else {
      printRaw(`<span class="red">command not found: ${escHtml(cmd)}</span> — type <span class="cyan">help</span> for a list of commands`);
    }

    refreshPrompt();
    scrollBottom();
  }

  function setCwd(p) {
    cwd = p;
    refreshPrompt();
  }

  /* ── Foreground processes ──
     A demo is an object — `{ height, minCols, renderFinal(frame), play(frame,
     signal) }` — and everything a demo would otherwise have to remember lives
     here instead: the skip hint, click-to-skip, the width floor, the
     unconditional landing frame, and cancellation. `play()` never draws the
     ending, so the ending cannot depend on animation state. */

  function isAbort(err) {
    return !!err && err.name === 'AbortError';
  }

  /* One rule, three places: a click or a `Ctrl+C` that lands on a live selection
     is a copy, and copying must never cost the visitor what they are copying. */
  function hasSelection() {
    return !!window.getSelection()?.toString();
  }

  function abortError() {
    return new DOMException('the visitor skipped', 'AbortError');
  }

  /* Rejects as soon as the signal fires, and never resolves. Raced against real
     work so a skip unwinds the demo through its own `await`s. */
  function rejectOnAbort(signal) {
    return new Promise((_, reject) => {
      if (signal.aborted) { reject(abortError()); return; }
      signal.addEventListener('abort', () => reject(abortError()), { once: true });
    });
  }

  /* An explicit hold that is not the length of an animation. */
  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(abortError()); return; }
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(abortError()); }, { once: true });
    });
  }

  /* Everything animating inside the frame, or nothing where the API is absent —
     the one place that question is asked, since three callers need the same
     answer and jsdom answers none of them. */
  function animationsOf(el) {
    return typeof el.getAnimations === 'function' ? el.getAnimations({ subtree: true }) : [];
  }

  /* Wait for the painted element's own animations to finish, so a beat's length
     is declared once — in the CSS — instead of once in the keyframes and again
     in a hand-matched sleep constant that can silently drift. Retrieving
     animations flushes style first, so calling this straight after a paint does
     see the animations that paint just created.

     `fallbackMs` is a substitute, never a race: it is consulted only when there
     is nothing to wait on. Raced, it would win on a frozen tab and cut the beat
     mid-flight — the exact defect this exists to remove. */
  async function settle(el, fallbackMs, signal) {
    const anims = animationsOf(el);

    if (!anims.length) return sleep(fallbackMs, signal);

    /* A cancelled animation rejects `finished`; the signal is what reports a
       skip, so swallow it rather than dressing a repaint up as an error. */
    await Promise.race([
      Promise.all(anims.map(a => a.finished.catch(() => {}))),
      rejectOnAbort(signal),
    ]);
  }

  /* Stop a frame where it stands. Aborting unwinds the demo's JavaScript, but a
     beat's motion belongs to the browser and outlives it — and the one exit that
     keeps its frame is `Ctrl+C`, so without this the visitor gets their prompt
     back while the interrupted animation plays on above it, which reads as an
     interrupt that did not work.

     Paused rather than cancelled: cancelling reverts the frame to its
     unanimated state and throws away the very thing being kept. */
  function freeze(el) {
    for (const anim of animationsOf(el)) anim.pause();
  }

  /* Hold a beat where the visitor left it when they leave the tab.

     A hidden tab stops ticking animations but its document timeline runs on
     underneath, so the first rendering update on return re-syncs every
     animation to real elapsed time. Measured in Safari 18: `currentTime` pinned
     for 11s hidden, then a 16.1s jump the moment the tab came back — a beat one
     second in arrives already finished, and the visitor returns to the landing
     frame having seen none of it. Not a skip they asked for, and the one exit
     nobody chose.

     Pausing is what fixes it rather than any amount of re-timing: a paused
     animation's `currentTime` is held against the timeline, so there is nothing
     left to re-sync. `settle()` is still waiting on `finished`, which a paused
     animation does not resolve, so the demo waits for the visitor rather than
     running on without them.

     What it paused is what it resumes, and nothing else — tracked rather than
     re-derived. Two reasons, and each is a bug on its own: `play()` on an
     animation that finished while paused rewinds it to the start, and `Ctrl+C`
     freezes the frame on purpose, so a blanket resume would undo an interrupt
     the moment the visitor changed tabs. */
  function suspendWhileHidden(el) {
    const held = new Set();

    function resume() {
      for (const anim of held) if (anim.playState === 'paused') anim.play();
      held.clear();
    }

    function apply() {
      if (!document.hidden) { resume(); return; }
      for (const anim of animationsOf(el)) {
        if (anim.playState === 'running') { anim.pause(); held.add(anim); }
      }
    }

    document.addEventListener('visibilitychange', apply);

    /* Letting go resumes whatever is still held: nothing may be left paused with
       no listener remaining to revive it. Today's demo cannot reach that —
       `settle()` blocks while a beat is paused, so a run cannot end mid-hold —
       but this runner is the contract every future long-running command is
       written against, and one that ends on `sleep()` rather than `settle()`
       finishes on its own clock and would leave a frame frozen for good. */
    return {
      apply,
      release() {
        document.removeEventListener('visibilitychange', apply);
        resume();
      },
    };
  }

  /* Real character width, measured at run time. Not a viewport breakpoint: the
     font size drops from 14px to 12px under 600px, so a breakpoint would lie
     about how many columns the visitor actually has.

     Measured against the scrollback rather than the frame, because the answer
     has to be known before anything is printed — and it is the same answer: the
     frame is a full-width block child of exactly this box. */
  function measureCols(el) {
    const probe = document.createElement('span');
    probe.textContent = '0'.repeat(10);
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    el.appendChild(probe);
    const chWidth = probe.getBoundingClientRect().width / 10;
    probe.remove();

    /* No layout to measure. Refusing to animate on a measurement we do not have
       is the worse guess, so assume it fits. */
    if (!chWidth || !el.clientWidth) return Infinity;
    return Math.floor(el.clientWidth / chWidth);
  }

  /* Hand the terminal to a demo until it finishes or the visitor stops it.
     Rejects with an `AbortError` when the visitor skips or interrupts — `run()`
     swallows exactly that, and prints anything else as an error line. */
  async function runDemo(demo, cmd) {
    const ctl   = new AbortController();
    const state = { ctl, interrupted: false };
    running = state;
    termEl.classList.add('term-busy');

    const frameEl = document.createElement('div');
    frameEl.className = 'output-line demo-frame';
    /* Reserve the height up front, so inserting the frame is the only thing
       that ever moves the viewport. */
    if (demo.height) frameEl.style.minHeight = `${demo.height}px`;
    /* Click/tap to skip. Deliberately not gated on pointer type: a tablet gets
       the full terminal and no physical keyboard, so this is its only exit.
       Gated on selection for the same reason `Ctrl+C` is — the click that ends
       a drag-select is not a request to skip. A tap collapses any selection
       before its click, so the coarse-pointer exit stays open. */
    frameEl.addEventListener('click', () => {
      if (hasSelection()) return;
      ctl.abort();
    });

    const visibility = suspendWhileHidden(frameEl);

    const frame = {
      el: frameEl,
      /* Synced after every paint, not only on `visibilitychange`: a visitor who
         leaves during beat one is already gone when beat two paints, so there is
         no event left to hear and the new beat would start into a hidden tab. */
      paint(html) { frameEl.innerHTML = html; visibility.apply(); },
      sleep(ms)   { return sleep(ms, ctl.signal); },
      settle(fallbackMs) { return settle(frameEl, fallbackMs, ctl.signal); },
    };

    try {
      const l = DATA.locales[DATA.lang];

      /* Reduced motion is a deliberate setting, so it skips silently — telling
         that visitor what they are missing reads as nagging, and the width
         advice would be a lie besides, since widening changes nothing for them.
         Too narrow is the one fallback that announces itself, because it is the
         only one the visitor can fix in two seconds. */
      const plays = !REDUCED_MOTION;
      const narrow = plays && measureCols(outputEl) < (demo.minCols ?? 0);

      if (narrow) {
        const notice = l.demoTooNarrow.replace('{cmd}', `<span class="green">${escHtml(cmd)}</span>`);
        printRaw(`<span class="dim">${notice}</span>`);
      } else if (plays) {
        printRaw(`<span class="dim">${l.demoSkipHint}</span>`);
      }

      outputEl.appendChild(frameEl);
      scrollBottom();   /* the one and only scroll: the frame is in view, and stays */

      let failure = null;
      if (plays && !narrow) {
        try {
          await demo.play(frame, ctl.signal);
        } catch (err) {
          failure = err;
        }
      }

      /* `Ctrl+C` is the one exit that does not land: the partial frame stays,
         `^C` prints below it, and the prompt returns. Every other path — done,
         skipped, tapped, too narrow, reduced motion, even a demo that threw —
         gets the landing frame. */
      /* Let go of the tab watcher *before* freezing, never after: `release()`
         resumes whatever it is still holding, and the `finally` below runs once
         this branch is done — the other order would hand the visitor a frame
         that starts moving again one line under their own `^C`. */
      if (state.interrupted) { visibility.release(); freeze(frameEl); printRaw('^C'); }
      else demo.renderFinal(frame);

      if (failure) throw failure;
    } finally {
      visibility.release();
      running = null;
      termEl.classList.remove('term-busy');
      /* Keystrokes during a demo are discarded, not buffered: a prompt that
         comes back pre-filled reads as a glitch to anyone not in on the joke. */
      cmdInput.value = '';
      updateMirror();
    }
  }

  /* Keys while a demo holds the terminal. This runs on the same listener as the
     normal prompt — the input keeps focus throughout, so there is no second
     keyboard path to tear down on finish, skip, abort *and* error, and no leak
     there to eat keystrokes once the prompt is back. */
  function onBusyKeydown(e) {
    /* Modifier-only presses and Cmd combos never skip, so selection-copy
       survives a demo the visitor wants to quote. */
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
    if (e.metaKey) return;

    if (e.ctrlKey) {
      /* With a selection, this Ctrl+C is a copy — that is what it means in a
         real terminal too. */
      if (e.key.toLowerCase() === 'c' && !hasSelection()) {
        e.preventDefault();
        running.interrupted = true;
        running.ctl.abort();
      }
      return;
    }
    /* Every other Ctrl combo falls through unprevented, on purpose: `Ctrl+R`,
       `Ctrl+T` and friends belong to the browser, and a demo is not a reason to
       take them. It reaches no terminal binding either — `Ctrl+L` would have
       cleared the scrollback out from under the frame. */

    /* Everything else is prevented and discarded. */
    e.preventDefault();
    if (e.key === 'Escape') running.ctl.abort();
  }

  /* ── Keyboard handling ── */
  function onKeydown(e) {
    if (running) { onBusyKeydown(e); return; }

    /* Blink reset on any key */
    termEl.classList.add('typing');
    clearTimeout(termEl._blinkTimer);
    termEl._blinkTimer = setTimeout(() => termEl.classList.remove('typing'), 500);

    if (e.key === 'Enter') {
      const val = cmdInput.value;
      cmdInput.value = '';
      updateMirror();
      /* Fire and forget: a command may hold the terminal for seconds, and this
         listener cannot wait. Deliberately not `.catch()`-ed — `run()` already
         prints what a visitor should see, so anything left is a bug that
         belongs in the console. */
      run(val);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const completed = tabComplete(cmdInput.value);
      cmdInput.value = completed;
      updateMirror();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIdx === -1) savedInput = cmdInput.value;
      if (historyIdx < history.length - 1) historyIdx++;
      const val = history[historyIdx] ?? savedInput;
      cmdInput.value = val;
      updateMirror();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) { historyIdx = -1; cmdInput.value = savedInput; updateMirror(); return; }
      historyIdx--;
      const val = history[historyIdx];
      cmdInput.value = val;
      updateMirror();
      return;
    }

    /* For left/right/Home/End: let the browser move the caret, then sync mirror */
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      setTimeout(updateMirror, 0);
      return;
    }

    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clear();
      return;
    }

    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      echoCommand(cmdInput.value + '^C');
      cmdInput.value = '';
      updateMirror();
      refreshPrompt();
      return;
    }
  }

  function updateMirror() {
    const val = cmdInput.value;
    const pos = cmdInput.selectionStart ?? val.length;
    inputBefore.textContent  = val.slice(0, pos);
    cursorEl.textContent     = (val[pos] ?? ' ').replace(/ /g, '\u00A0');
    inputAfter.textContent   = val.slice(pos + 1);
  }

  function onInput() {
    updateMirror();
  }

  /* ── Boot sequence ── */
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function typewriter(el, text, delay = 28) {
    if (REDUCED_MOTION) { el.textContent += text; return; }
    for (const ch of text) {
      el.textContent += ch;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  async function boot() {
    inputLineEl.classList.add('hidden');

    const now = new Date();
    const dateStr = now.toDateString() + ' ' + now.toTimeString().slice(0, 8);
    const bootLines = [
      `Last login: ${dateStr} on ttys001`,
      '',
    ];

    for (const line of bootLines) {
      const div = document.createElement('div');
      div.className = 'output-line dim';
      outputEl.appendChild(div);
      await typewriter(div, line, 18);
    }

    const banner = document.createElement('div');
    banner.className = 'output-line green bold';
    outputEl.appendChild(banner);
    await typewriter(banner, DATA.locales[DATA.lang].welcome, 22);

    await new Promise(r => setTimeout(r, 120));

    const hint = document.createElement('div');
    hint.className = 'output-line dim';
    outputEl.appendChild(hint);
    await typewriter(hint, DATA.locales[DATA.lang].helpHint, 18);

    const blank = document.createElement('div');
    blank.className = 'output-line';
    outputEl.appendChild(blank);

    inputLineEl.classList.remove('hidden');
    refreshPrompt();
    updateMirror();
    cmdInput.focus();
    scrollBottom();
  }

  /* ── Init ── */
  /* The keyboard half, separate from `boot()` so a test can have key handling
     without also starting the typewriter animation. */
  function wireInput() {
    cmdInput.addEventListener('keydown', onKeydown);
    cmdInput.addEventListener('input', onInput);
    termEl.addEventListener('click', () => {
      /* Don't steal focus while the user is selecting text to copy */
      if (hasSelection()) return;
      cmdInput.focus();
    });
    cmdInput.focus();
  }

  function init() {
    wireInput();
    boot();
  }

  return { init, wireInput, printText, printRaw, clear, run, runDemo, tabComplete, escHtml, resolvePath, fsNode, setCwd, scrollBottom, get cwd() { return cwd; }, get _history() { return history; } };
})();
