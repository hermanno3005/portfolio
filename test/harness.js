/*
 * Test harness — drives the real terminal through `Term.run()`.
 *
 * The site is a handful of globals loaded by plain <script> tags in a fixed
 * order, with `DATA.setLang('en')` firing while data.js is being parsed —
 * before terminal.js and commands.js exist. The harness reproduces that
 * faithfully by evaluating those files as real <script> elements, in order, in
 * a single fresh jsdom realm.
 *
 * Two things are worth knowing about how it does that:
 *
 *   1. The DOM comes from the real index.html, so the fixture can never drift
 *      from production. jsdom does not fetch external resources, so the
 *      <script src> tags in it are inert; the harness injects the sources
 *      itself — and reads the load order off those same tags, so a script
 *      added to the page is under test the moment it is added.
 *
 *   2. The scripts are injected *after* the document has finished loading. The
 *      DOMContentLoaded handler in commands.js — which calls `Term.init()` and
 *      kicks off the animated boot sequence — therefore never runs. Tests get a
 *      terminal with an empty `#output` and no pending timers, instead of one
 *      racing a ~1.5s typewriter animation.
 *
 *      The cost is that everything else in that handler is skipped too: the
 *      titlebar buttons. The three pieces tests do need — the delegated click
 *      handler for `data-url` / `data-cmd` links, the keydown listener on the
 *      input, and the mobile card — are each a named function the harness can
 *      call on its own, leaving the animation alone. The card is filled on
 *      every mount rather than on request: it has no timers and no animation,
 *      so the reason the harness skips the DOM-ready block does not reach it,
 *      and it composes with the `projects` injection seam for free.
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

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* Load order matters — see the note above — so it is scraped from index.html in
   document order rather than kept as a second, hand-written copy of it that can
   drift. Relative `src` only: anything hosted elsewhere is not ours to boot.
   Exported because the tests that ask about the load order should ask about the
   list the harness actually boots, not scrape a second copy of their own. */
export const SCRIPTS = [...indexHtml.matchAll(/<script\s+src="([^"]+)"/g)]
  .map(m => m[1])
  .filter(src => !/^[a-z]+:|^\/\//i.test(src));

/* The scrape recognises one tag form — `<script src="…">`. A tag written any
   other way (single quotes, an attribute before `src`, the `src` on its own
   line) would be skipped in silence, and a missing script surfaces much later
   as a baffling `ReferenceError` inside jsdom — precisely the failure the note
   above promises the harness prevents. So every `<script` on the page has to be
   accounted for; if one is not, say which file to fix rather than letting the
   suite fail somewhere else. */
const scriptTags = (indexHtml.match(/<script[\s>]/g) || []).length;
if (scriptTags !== SCRIPTS.length) {
  throw new Error(
    `harness: index.html has ${scriptTags} <script> tags but ${SCRIPTS.length} were scraped. ` +
    'Either a tag is written in a form the scraper does not recognise, or an inline ' +
    'script was added — teach the scraper in test/harness.js about it.'
  );
}

const sourceCache = new Map();
function sourceOf(rel) {
  if (!sourceCache.has(rel)) sourceCache.set(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  return sourceCache.get(rel);
}

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
 *
 * `reducedMotion` makes `prefers-reduced-motion: reduce` match, the way a
 * visitor's OS setting does. `scripts` replaces the load order, for the tests
 * that ask whether the order matters.
 */
export async function mountTerminal({ projects, reducedMotion = false, scripts = SCRIPTS } = {}) {
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
     Nothing matches by default — the same answer a browser gives with no preference set.
     A test that needs a media query to match should widen this, not stub it per-test. */
  window.matchMedia = query => ({
    media: query,
    matches: reducedMotion && query.includes('prefers-reduced-motion'),
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });

  for (const rel of scripts) {
    const el = window.document.createElement('script');
    el.textContent = sourceOf(rel);
    window.document.body.appendChild(el);

    /* jsdom swallows script exceptions — without this, a broken file would only
       show up later as a baffling "Term is not defined". */
    if (scriptErrors.length) {
      throw new Error(`${rel} threw while loading: ${scriptErrors[0].message}`);
    }

    /* Swap the project list in before anything derived from it is built. The
       rebuild goes through `_initFs()` rather than `setLang()`, which would
       re-apply the locale descriptions over the list the test just supplied. */
    if (projects && rel === 'js/data.js') {
      window.eval(`DATA.projects = ${JSON.stringify(projects)}; DATA._initFs();`);
    }
  }

  /* Global lexical bindings are not properties of `window`; a global eval reads them. */
  const Term = window.eval('Term');
  const outputEl = window.document.getElementById('output');

  /* Render the prompt the way the boot sequence would, without running it. */
  Term.setCwd(Term.cwd);

  /* The three pieces of the DOM-ready block tests need — see the note above.
     `Term.wireInput()` is the keyboard half of `Term.init()`, split out for the
     same reason `wireOutputClicks()` was: it lets a test have key handling
     without also starting the boot animation. */
  window.eval('wireOutputClicks()');
  window.eval('Term.wireInput()');
  window.eval('initMobileCard()');

  const cmdInput = window.document.getElementById('cmd-input');

  return {
    document: window.document,

    /**
     * Type a command, exactly as a visitor would.
     *
     * `Term.run()` is async since the foreground-process mechanism landed, so
     * this returns a promise. A synchronous command still finishes before the
     * call returns — only the prompt refresh after it is deferred a microtask —
     * so tests that drive nothing long-running need not await.
     */
    run(cmd) {
      return Term.run(cmd);
    },

    /** Press a key, exactly as a visitor would: on the real input, which holds focus. */
    press(key, init = {}) {
      const e = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
      cmdInput.dispatchEvent(e);
      return e;
    },

    /** Type into the input the way a keystroke would, mirror and all. */
    type(value) {
      cmdInput.value = value;
      cmdInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    },

    /** What the input currently holds — a returning prompt must never be pre-filled. */
    inputValue() {
      return cmdInput.value;
    },

    /** Register a demo, exactly as a file in `js/demos/` does. */
    regDemo(id, demo) {
      window.eval('regDemo')(id, demo);
    },

    /** The mobile recruiter card, filled from DATA the way the page fills it. */
    card() {
      return window.document.getElementById('mobile-card');
    },

    /** The element a running demo owns, or null when nothing is running. */
    frame() {
      return window.document.querySelector('#output .demo-frame');
    },

    /** True while a command is holding the terminal. */
    busy() {
      return window.document.getElementById('terminal').classList.contains('term-busy');
    },

    /** Let queued microtasks and zero-delay timers run. */
    flush() {
      return new Promise(resolve => window.setTimeout(resolve, 0));
    },

    /** The realm's own window — for tests that must reach past the terminal. */
    window,

    /** Click something in the output, exactly as a visitor would. */
    click(el) {
      if (!el) throw new Error('click: no element given');
      el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    },

    /** Press Tab on a half-typed line; returns the line as it is left behind. */
    complete(value) {
      return Term.tabComplete(value);
    },

    /**
     * Every locale, for the strings a test cannot reach through the terminal —
     * the ones the animated boot sequence types out.
     */
    locales() {
      return window.eval('DATA.locales');
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
