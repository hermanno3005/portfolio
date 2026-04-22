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
  let sudoMode    = false;

  /* ── Prompt string ── */
  function promptStr() {
    const display = cwd.replace('/home/hermann', '~');
    return `<span class="green">${DATA.user}@${DATA.hostname}</span><span class="dim">:</span><span class="cyan">${display}</span><span class="dim">$</span> `;
  }

  function refreshPrompt() {
    promptDisplay.innerHTML = promptStr();
  }

  /* ── Output helpers ── */
  function print(html = '', classes = '') {
    const div = document.createElement('div');
    div.className = 'output-line' + (classes ? ' ' + classes : '');
    div.innerHTML = html;
    outputEl.appendChild(div);
    scrollBottom();
  }

  function printText(text, cls = '') {
    text.split('\n').forEach(line => print(escHtml(line), cls));
  }

  function printRaw(html, cls = '') {
    print(html, cls);
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
        print('');
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
          print('');
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

  /* ── Run a command string ── */
  function run(raw) {
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
        handler({ args, raw: trimmed, cwd, print, printText, printRaw, clear, escHtml, resolvePath, fsNode, setCwd, scrollBottom });
      } catch (err) {
        printRaw(`<span class="red">error: ${escHtml(String(err.message ?? err))}</span>`);
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

  /* ── Keyboard handling ── */
  function onKeydown(e) {
    if (sudoMode) return;

    /* Blink reset on any key */
    termEl.classList.add('typing');
    clearTimeout(termEl._blinkTimer);
    termEl._blinkTimer = setTimeout(() => termEl.classList.remove('typing'), 500);

    if (e.key === 'Enter') {
      const val = cmdInput.value;
      cmdInput.value = '';
      updateMirror();
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
  async function typewriter(el, text, delay = 28) {
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
  function init() {
    cmdInput.addEventListener('keydown', onKeydown);
    cmdInput.addEventListener('input', onInput);
    termEl.addEventListener('click', () => cmdInput.focus());
    boot();
  }

  return { init, print, printText, printRaw, clear, run, escHtml, resolvePath, fsNode, setCwd, scrollBottom, get cwd() { return cwd; }, get _history() { return history; } };
})();
