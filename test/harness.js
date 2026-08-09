/*
 * Test harness — drives the real terminal through `Term.run()`.
 *
 * The site is three IIFE globals loaded by plain <script> tags in a fixed order,
 * with `DATA.setLang('en')` firing while data.js is being parsed — before
 * terminal.js and commands.js exist. The harness reproduces that faithfully by
 * evaluating the three files as real <script> elements, in order, in a single
 * fresh jsdom realm.
 *
 * Two things are worth knowing about how it does that:
 *
 *   1. The DOM comes from the real index.html, so the fixture can never drift
 *      from production. jsdom does not fetch external resources, so the three
 *      <script src> tags in it are inert; the harness injects the sources itself.
 *
 *   2. The scripts are injected *after* the document has finished loading. The
 *      DOMContentLoaded handler in commands.js — which calls `Term.init()` and
 *      kicks off the animated boot sequence — therefore never runs. Tests get a
 *      terminal with an empty `#output` and no pending timers, instead of one
 *      racing a ~1.5s typewriter animation.
 *
 *      The cost is that everything else in that handler is skipped too: keyboard
 *      handling, the titlebar buttons, the mobile card, and the delegated click
 *      handler for `data-url` / `data-cmd` links in the output. Tests drive
 *      `Term.run()` directly, so none of it is needed yet. A test that needs a
 *      clicked link to run a command should teach this harness to wire that up,
 *      not reach around it.
 *
 * Scripts must be <script> elements rather than `window.eval()`: the modules are
 * declared with top-level `const`, which lands in the realm's global lexical
 * scope from a script (visible to every later script) but is thrown away at the
 * end of an eval.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Load order matters — see the note above. */
const SCRIPTS = ['js/data.js', 'js/terminal.js', 'js/commands.js'];

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sources = SCRIPTS.map(rel => fs.readFileSync(path.join(ROOT, rel), 'utf8'));

/**
 * Boot a fresh terminal in its own jsdom realm.
 *
 * Every call gets a brand new realm, so `DATA.lang`, `cwd`, the command history
 * and `#output` all start clean and nothing leaks between tests.
 *
 * `projects` replaces `DATA.projects` after data.js has run and before the rest
 * of the site sees it — the seam a test needs to ask what an *authoring* mistake
 * does, since the real list is hand-edited and correct. The replacement list is
 * used verbatim: the locale descriptions are applied by index at boot and would
 * overwrite it, so a mounted test list keeps the descriptions it was given until
 * something runs `lang`.
 */
export async function mountTerminal({ projects } = {}) {
  const scriptErrors = [];
  const warnings = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', err => scriptErrors.push(err));
  virtualConsole.on('warn', (...args) => warnings.push(args.join(' ')));

  const dom = new JSDOM(indexHtml, {
    url: 'https://hermann-aust.com/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;

  await new Promise(resolve => {
    if (window.document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, { once: true });
  });

  /* jsdom has no matchMedia; every browser does, and terminal.js reads it at parse time.
     Nothing matches — the same answer a browser gives with no preference set. A test
     that needs a media query to match should widen this, not stub it per-test. */
  window.matchMedia = query => ({
    media: query,
    matches: false,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });

  for (const [i, source] of sources.entries()) {
    const el = window.document.createElement('script');
    el.textContent = source;
    window.document.body.appendChild(el);

    /* jsdom swallows script exceptions — without this, a broken file would only
       show up later as a baffling "Term is not defined". */
    if (scriptErrors.length) {
      throw new Error(`${SCRIPTS[i]} threw while loading: ${scriptErrors[0].message}`);
    }

    /* Swap the project list in before anything derived from it is built. The
       rebuild goes through `_initFs()` rather than `setLang()`, which would
       re-apply the locale descriptions over the list the test just supplied. */
    if (projects && SCRIPTS[i] === 'js/data.js') {
      window.eval(`DATA.projects = ${JSON.stringify(projects)}; DATA._initFs();`);
    }
  }

  /* Global lexical bindings are not properties of `window`; a global eval reads them. */
  const Term = window.eval('Term');
  const outputEl = window.document.getElementById('output');

  /* Render the prompt the way the boot sequence would, without running it. */
  Term.setCwd(Term.cwd);

  return {
    document: window.document,

    /** Type a command, exactly as a visitor would. */
    run(cmd) {
      Term.run(cmd);
    },

    /** Press Tab on a half-typed line; returns the line as it is left behind. */
    complete(value) {
      return Term.tabComplete(value);
    },

    /** Everything the page has warned about since it booted. */
    warnings() {
      return [...warnings];
    },

    /** The output lines, as a visitor reads them. */
    lines() {
      return [...outputEl.children].map(el => el.textContent);
    },

    /** Everything a visitor can read in the terminal, newline-separated. */
    text() {
      return this.lines().join('\n');
    },

    /** The prompt as currently rendered, e.g. `hermann@portfolio:~$`. */
    prompt() {
      return window.document.getElementById('prompt-display').textContent.trim();
    },

    cleanup() {
      window.close();
    },
  };
}
