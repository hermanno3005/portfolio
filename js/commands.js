/* ── Command Registry ── */

const COMMANDS = {};

function reg(name, fn) { COMMANDS[name] = fn; }

/* ─── help ─── */
reg('help', ({ printRaw }) => {
  printRaw(DATA.locales[DATA.lang].help.trim());
});

/* ─── whoami / about ─── */
const aboutFn = ({ printText }) => printText(DATA.about);
reg('whoami', aboutFn);
reg('about',  aboutFn);

/* ─── pwd ─── */
reg('pwd', ({ cwd, printText }) => printText(cwd));

/* ─── ls ─── */
reg('ls', ({ args, cwd, printRaw, resolvePath, fsNode, escHtml }) => {
  const target = args[0] ? resolvePath(args[0]) : cwd;
  const node   = fsNode(target);

  if (!node) {
    printRaw(`<span class="red">ls: ${escHtml(args[0] || target)}: No such file or directory</span>`);
    return;
  }
  if (node.type === 'file') {
    printRaw(escHtml(target.split('/').pop()));
    return;
  }

  const items = node.children.map(name => {
    const childPath = target + '/' + name;
    const child     = fsNode(childPath);
    const isDir     = child && child.type === 'dir';
    return `<span class="${isDir ? 'cyan bold' : 'fg'}">${escHtml(name)}${isDir ? '/' : ''}</span>`;
  });

  printRaw(items.join('  ') || '<span class="dim">(empty)</span>');
});

/* ─── cd ─── */
reg('cd', ({ args, cwd, printRaw, resolvePath, fsNode, escHtml, setCwd }) => {
  const target = resolvePath(args[0] || '/home/hermann');
  const node   = fsNode(target);

  if (!node) {
    printRaw(`<span class="red">cd: ${escHtml(args[0] || target)}: No such file or directory</span>`);
    return;
  }
  if (node.type !== 'dir') {
    printRaw(`<span class="red">cd: not a directory: ${escHtml(args[0])}</span>`);
    return;
  }
  setCwd(target);
});

/* ─── cat ─── */
reg('cat', ({ args, cwd, printRaw, printText, resolvePath, fsNode, escHtml }) => {
  if (!args[0]) {
    printRaw('<span class="dim">Usage: cat &lt;file&gt;</span>');
    return;
  }

  const target = resolvePath(args[0]);
  const node   = fsNode(target);

  if (!node) {
    printRaw(`<span class="red">cat: ${escHtml(args[0])}: No such file or directory</span>`);
    return;
  }
  if (node.type === 'dir') {
    printRaw(`<span class="red">cat: ${escHtml(args[0])}: Is a directory</span>`);
    return;
  }
  if (node.content === '__CV__') {
    printRaw(`<span class="dim">Binary file — </span><span class="cyan">open cv.pdf</span><span class="dim"> to download.</span>`);
    return;
  }

  printText(node.content || '');
});

/* ─── open ─── */
reg('open', ({ args, printRaw }) => {
  const arg = (args[0] || '').toLowerCase();

  const urlMap = {
    github:   DATA.links.github,
    linkedin: DATA.links.linkedin,
    email:    DATA.links.email ? `mailto:${DATA.links.email}` : null,
    'cv.pdf': 'assets/cv.pdf',
    cv:       'assets/cv.pdf',
  };

  if (urlMap[arg] !== undefined) {
    const url = urlMap[arg];
    if (!url) {
      printRaw(`<span class="red">open: no URL configured for '${arg}'</span> Try github, linkedin or email`);
      return;
    }
    if (arg === 'cv.pdf' || arg === 'cv') {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Hermann_Aust_CV.pdf';
      a.click();
      printRaw(`<span class="dim">Downloading </span><span class="cyan">Hermann_Aust_CV.pdf</span><span class="dim">…</span>`);
    } else {
      window.open(url, '_blank', 'noopener');
      printRaw(`<span class="dim">Opening </span><span class="cyan">${url}</span><span class="dim"> in a new tab…</span>`);
    }
    return;
  }

  /* Generic URL */
  if (arg.startsWith('http://') || arg.startsWith('https://')) {
    window.open(args[0], '_blank', 'noopener');
    printRaw(`<span class="dim">Opening </span><span class="cyan">${args[0]}</span><span class="dim">…</span>`);
    return;
  }

  printRaw(`<span class="red">open: unknown target '${arg}'</span> — try: <span class="cyan">open github</span>, <span class="cyan">open cv.pdf</span>`);
});

/* ─── projects ─── */
reg('projects', ({ printRaw, escHtml }) => {
  printRaw(`<span class="cyan bold">Projects</span>`);
  printRaw(`<span class="dim">───────────────────────────────────────────────────────────</span>`);
  DATA.projects.forEach(p => {
    printRaw(`  <span class="green bold">${escHtml(p.name)}</span>`);
    printRaw(`  <span class="dim">${escHtml(p.description)}</span>`);
    printRaw(`  Stack: <span class="cyan">${p.stack.map(escHtml).join(' · ')}</span>`);
    if (p.url) printRaw(`  URL:   <span class="link" data-url="${escHtml(p.url)}">${escHtml(p.url)}</span>`);
    printRaw('');
  });
  printRaw(`<span class="dim">  Tip: cat projects/&lt;name&gt;.md for details</span>`);
});

/* ─── skills ─── */
reg('skills', ({ printText }) => printText(DATA.skills));

/* ─── contact ─── */
reg('contact', ({ printText, printRaw }) => {
  printText(DATA.contact);
});

/* ─── clear ─── */
reg('clear', ({ clear }) => clear());

/* ─── echo ─── */
reg('echo', ({ args, printText }) => printText(args.join(' ')));

/* ─── history ─── */
reg('history', ({ printRaw }) => {
  /* Access via Term.run closure — history lives inside Term, so we proxy via a global */
  if (!window._termHistory) { printRaw('<span class="dim">(empty)</span>'); return; }
  window._termHistory.forEach((cmd, i) => {
    const n = String(window._termHistory.length - i).padStart(4, ' ');
    printRaw(`<span class="dim">${n}</span>  ${cmd}`);
  });
});

/* ─── uname ─── */
reg('uname', ({ args, printRaw }) => {
  const all = args.includes('-a');
  if (all) {
    printRaw('HermannOS 1.0.0 portfolio-kernel #1');
  } else {
    printRaw('HermannOS');
  }
});

/* ─── neofetch ─── */
reg('neofetch', ({ printRaw }) => {
  const art = [
    '                    ____----------- _____                    ',
    '    \~~~~~~~~~~/~_--~~~------~~~~~     \                     ',
    '  `---`\  _-~      |                   \                     ',
    '    _-~  <_         |                     \[]                ',
    '  / ___     ~~--[""] |      ________--------_                ',
    '  > /~` \    |-.   `\~~.~~~~~                _ ~ - _         ',
    '   ~|  ||\%  |       |    ~  ._                ~ _   ~ ._    ',
    '   `_//|_%  \      |          ~  .              ~-_   /\     ',
    '           `--__     |    _-____  /\               ~-_ \/.   ',
    '                 ~--_ /  ,/ -~-_ \ \/          _______---~/  ',
    '                     ~~-/._<   \ \`~~~~~~~~~~~~~     ##--~/  ',
    '                           \    ) |`------##---~~~~-~  ) )   ',
    '                            ~-_/_/                  ~~ ~~    ',

  ];

  const started = Date.now() - (window._bootTime || Date.now());
  const upSec   = Math.floor(started / 1000);
  const upStr   = upSec < 60 ? `${upSec}s` : `${Math.floor(upSec/60)}m ${upSec%60}s`;

  const info = [
    [`<span class="green bold">Hermann Aust</span>`, ''],
    ['', ''],
    ['OS',       'HermannOS 1.0 (Raspberry Pi)'],
    ['Role',     DATA.locales[DATA.lang].neofetchRole],
    ['Shell',    'zsh (portfolio edition)'],
    ['Uptime',   upStr],
  ];

  const maxArt = art.length;
  const lines  = Math.max(maxArt, info.length);

  let html = '<div class="neofetch-grid">';
  html += '<div class="neofetch-art">';
  art.forEach(l => { html += `${l}\n`; });
  html += '</div>';

  html += '<div class="neofetch-info">';
  info.forEach(([key, val]) => {
    if (!key && !val) { html += '<span></span>'; return; }
    if (!key) { html += `<span>${val}</span>`; return; }
    html += `<span><span class="key">${key}</span><span class="sep"> : </span><span class="value">${val}</span></span>`;
  });
  html += '</div></div>';

  printRaw(html);
});

/* ─── man ─── */
reg('man', ({ args, printRaw, escHtml }) => {
  const cmd = args[0];
  if (!cmd) { printRaw('<span class="red">man: what manual page do you want?</span>'); return; }

  const pages = {
    help:     'help — list all available commands and keyboard shortcuts',
    whoami:   'whoami — display information about Hermann Aust',
    about:    'about — alias for whoami',
    ls:       'ls [path] — list contents of a directory in the virtual filesystem',
    cd:       'cd [path] — change the current directory (supports ~, .., absolute paths)',
    cat:      'cat &lt;file&gt; — display the contents of a file',
    pwd:      'pwd — print the current working directory',
    open:     'open &lt;target&gt; — open a URL or download the CV. Targets: github, linkedin, cv.pdf',
    projects: 'projects — list all portfolio projects with descriptions and links',
    skills:   'skills — display the full skill set and tech stack',
    contact:  'contact — show contact information and social links',
    neofetch: 'neofetch — display system info and ASCII art, terminal style',
    uname:    'uname [-a] — print system information (harmlessly fake)',
    echo:     'echo &lt;text&gt; — print text to the terminal',
    history:  'history — show the session command history',
    clear:    'clear — clear all output from the terminal',
    man:      'man &lt;command&gt; — display this manual page for a given command',
  };

  if (pages[cmd]) {
    printRaw(`<span class="bold">NAME</span>`);
    printRaw(`    ${pages[cmd]}`);
  } else {
    printRaw(`<span class="red">man: no manual entry for '${escHtml(cmd)}'</span>`);
  }
});

/* ─── lang ─── */
reg('lang', ({ args, printRaw }) => {
  const target = (args[0] || '').toLowerCase();

  if (!target) {
    const current = DATA.lang === 'de' ? 'Deutsch 🇩🇪' : 'English 🇬🇧';
    printRaw(`Current language: <span class="cyan">${current}</span>  — try <span class="green">lang de</span> or <span class="green">lang en</span>`);
    return;
  }

  if (!DATA.locales[target]) {
    printRaw(`<span class="red">lang: unknown language '${target}'</span> — available: <span class="cyan">en</span>, <span class="cyan">de</span>`);
    return;
  }

  if (target === DATA.lang) {
    const already = DATA.lang === 'de' ? 'Sprache ist bereits Deutsch.' : 'Language is already English.';
    printRaw(`<span class="dim">${already}</span>`);
    return;
  }

  DATA.setLang(target);

  const confirmMsg = target === 'de'
    ? '<span class="green">Sprache auf Deutsch umgestellt.</span>'
    : '<span class="green">Language switched to English.</span>';
  printRaw(confirmMsg);
});

/* ─── sudo (Easter egg) ─── */
reg('sudo', ({ args, raw, printRaw, print, scrollBottom }) => {
  const isRmRf = raw.replace(/\s+/g, ' ').trim() === 'sudo rm -rf /' ||
                 raw.replace(/\s+/g, ' ').trim() === 'sudo rm -rf /*';

  if (!isRmRf) {
    printRaw(`<span class="red">sudo: command not found or permission denied</span>`);
    return;
  }

  /* === Easter egg — show DOM password prompt, hide normal input === */
  const sudoPromptEl = document.getElementById('sudo-prompt');
  const sudoInput    = document.getElementById('sudo-input');
  const inputLineEl  = document.getElementById('input-line');
  const cmdInputEl   = document.getElementById('cmd-input');

  inputLineEl.classList.add('hidden');
  sudoPromptEl.classList.remove('hidden');
  sudoInput.value = '';
  sudoInput.focus();

  function acceptPassword(e) {
    if (e.key !== 'Enter') return;
    sudoInput.removeEventListener('keydown', acceptPassword);
    sudoPromptEl.classList.add('hidden');
    inputLineEl.classList.remove('hidden');
    cmdInputEl.focus();

    runEasterEgg(printRaw, print, scrollBottom);
  }
  sudoInput.addEventListener('keydown', acceptPassword);
});

function runEasterEgg(printRaw, print, scrollBottom) {
  const eggLog = document.getElementById('egglog');
  eggLog.classList.add('active');
  eggLog.innerHTML = '';

  const fakePaths = [
    '/proc/self/mem', '/etc/passwd', '/etc/shadow', '/usr/bin/bash',
    '/lib/systemd/systemd', '/var/log/syslog', '/home/hermann/.bashrc',
    '/boot/vmlinuz', '/dev/sda', '/sys/kernel/mm', '/usr/lib/libssl.so',
    '/etc/hosts', '/var/lib/dpkg/info', '/usr/share/applications',
    '/home/hermann/projects', '/root/.ssh/id_rsa', '/etc/crontab',
    '/lib/x86_64-linux-gnu/libc.so.6', '/usr/bin/python3', '/etc/fstab',
  ];

  let lineCount = 0;
  const maxLines = 60;

  const interval = setInterval(() => {
    const path = fakePaths[Math.floor(Math.random() * fakePaths.length)];
    const line = document.createElement('div');
    line.textContent = `removed '${path}'`;
    eggLog.appendChild(line);
    eggLog.scrollTop = eggLog.scrollHeight;
    lineCount++;

    if (lineCount >= maxLines) {
      clearInterval(interval);
      showDestroyed();
    }
  }, 40);

  function showDestroyed() {
    setTimeout(() => {
      eggLog.classList.remove('active');
      const overlay = document.getElementById('eggoverlay');
      overlay.classList.add('active');

      const art = `
██████╗ ███████╗███████╗████████╗██████╗  ██████╗ ██╗   ██╗███████╗██████╗
██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗╚██╗ ██╔╝██╔════╝██╔══██╗
██║  ██║█████╗  ███████╗   ██║   ██████╔╝██║   ██║ ╚████╔╝ █████╗  ██║  ██║
██║  ██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║  ╚██╔╝  ██╔══╝  ██║  ██║
██████╔╝███████╗███████║   ██║   ██║  ██║╚██████╔╝   ██║   ███████╗██████╔╝
╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚══════╝╚═════╝ `;

      overlay.innerHTML = `<pre>${art}</pre><div class="msg">Restarting...</div>`;

      setTimeout(() => { location.reload(); }, 3000);
    }, 400);
  }
}

/* ─── Wire up after DOM ready ─── */
window._bootTime = Date.now();

/* ─── Start terminal ─── */
document.addEventListener('DOMContentLoaded', () => {
  /* Build easter egg overlay elements if not in HTML */
  if (!document.getElementById('eggoverlay')) {
    const ov = document.createElement('div');
    ov.id = 'eggoverlay';
    document.body.appendChild(ov);
  }
  if (!document.getElementById('egglog')) {
    const el = document.createElement('div');
    el.id = 'egglog';
    document.body.appendChild(el);
  }

  /* Delegated handler for data-url links in terminal output */
  document.getElementById('output').addEventListener('click', (e) => {
    const url = e.target.dataset.url;
    if (!url) return;
    /* Only allow http/https URLs — reject javascript: and other schemes */
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
  });

  Term.init();

  /* Proxy history into window for the history command */
  Object.defineProperty(window, '_termHistory', {
    get() { return Term._history; },
  });

  /* ── Titlebar buttons ── */
  const win         = document.getElementById('window');
  const titlebar    = document.getElementById('titlebar');
  const closedScreen = document.getElementById('closed-screen');

  /* Red — close: show disconnected screen, click anywhere to restore */
  document.getElementById('btn-close').addEventListener('click', () => {
    closedScreen.classList.add('active');
  });
  function dismissClosedScreen() {
    closedScreen.classList.remove('active');
    document.getElementById('cmd-input').focus();
  }
  closedScreen.addEventListener('click', dismissClosedScreen);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && closedScreen.classList.contains('active')) dismissClosedScreen();
  });

  /* Yellow — minimize: collapse terminal body, click title bar to restore */
  document.getElementById('btn-minimize').addEventListener('click', () => {
    win.classList.toggle('minimized');
  });
  titlebar.addEventListener('click', (e) => {
    if (win.classList.contains('minimized') && !e.target.closest('.dot')) {
      win.classList.remove('minimized');
      document.getElementById('cmd-input').focus();
    }
  });

  /* Green — fullscreen: toggle browser fullscreen */
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        /* Fallback: toggle CSS fullscreen if API unavailable */
        win.classList.toggle('fullscreen');
      });
    } else {
      document.exitFullscreen();
    }
  });

  /* Keep CSS class in sync with fullscreen state for styling hooks */
  document.addEventListener('fullscreenchange', () => {
    win.classList.toggle('fullscreen', !!document.fullscreenElement);
    if (!document.fullscreenElement) {
      document.getElementById('cmd-input').focus();
    }
  });
});
