/*
 * The demo registry.
 *
 * `js/demos/` is a registry file and one file per demo. This suite is about the
 * seam between them — the contract every demo goes through, and the shared
 * caption chrome the registry owns — rather than about any one demo. Asserted
 * once here, not once per demo, so a third demo needs no test edit.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountTerminal, SCRIPTS } from './harness.js';

let term;

beforeEach(async () => {
  term = await mountTerminal();
});

afterEach(() => {
  term.cleanup();
});

describe('the load order', () => {
  /* `SCRIPTS` is index.html's own `<script src>` list in document order — the
     one the harness boots — so this asks about the page rather than about a
     second scrape that could agree with itself while the page drifted.

     The registry declares `regDemo` and the shared caption helpers, and a demo
     file calls them as it is parsed. Getting this wrong is a `ReferenceError`
     several files away from the mistake, so it is asserted by name here. */
  it('puts the registry ahead of every other demo file', () => {
    const demos = SCRIPTS.filter(src => src.startsWith('js/demos/'));

    expect(demos[0]).toBe('js/demos/registry.js');
    /* …and there is something for it to be ahead of, so a demo file dropped
       from the page fails here rather than leaving the claim vacuously true. */
    expect(demos.slice(1).length).toBeGreaterThan(0);
  });

  it('is read at run time, so the demos block can sit anywhere on the page', async () => {
    /* The whole block moves as a unit, registry-first inside it — the group is
       order-free with respect to the rest of the site; the inside of it is not. */
    const reordered = await mountTerminal({
      scripts: ['js/data.js', 'js/demos/registry.js', 'js/demos/pacelab.js', 'js/terminal.js', 'js/commands.js'],
    });

    /* Skipped rather than sat through: what is under test is that the demo is
       reachable and runs clean, not how long its beats last. */
    const done = reordered.run('pacelab');
    reordered.press('Escape');
    await done;

    expect(reordered.frame()).not.toBeNull();
    expect(reordered.warnings()).toEqual([]);

    reordered.cleanup();
  });
});

describe('a runnable project is not a broken promise', () => {
  /* Stated in both directions and named after neither demo: every project that
     advertises a run has one, and nothing is registered that no project offers. */
  const ids = t => ({
    runnable: t.window.eval('DATA.projects').filter(p => p.runnable).map(p => p.id),
    registered: Object.keys(t.window.eval('DEMOS')),
  });

  it('registers a demo for every runnable project, and nothing else', () => {
    const { runnable, registered } = ids(term);

    expect(runnable.length).toBeGreaterThan(0);
    expect([...registered].sort()).toEqual([...runnable].sort());
  });

  it('runs each of them clean, to the frame', async () => {
    const { runnable } = ids(term);

    for (const id of runnable) {
      const done = term.run(id);
      term.press('Escape');
      await done;

      expect(term.frame(), id).not.toBeNull();
    }

    expect(term.warnings()).toEqual([]);
  });
});

describe('the shared caption chrome', () => {
  const caption = t => t.window.eval('demoCaption');
  const repoLine = t => t.window.eval('demoRepoLine');

  it('reads the repo URL out of the project data rather than agreeing with it', async () => {
    /* A URL nothing else on the site would produce — proof the helper looks the
       project up rather than repeating a string that happens to match today. */
    const injected = await mountTerminal({
      projects: [{ id: 'ghost', name: 'Ghost', description: 'd', stack: ['x'], runnable: true, url: 'https://example.invalid/elsewhere' }],
    });
    try {
      const html = repoLine(injected)('ghost');

      expect(html).toContain('data-url="https://example.invalid/elsewhere"');
      /* The scheme is stripped from what is shown, not from where it points. */
      expect(html).toContain('>example.invalid/elsewhere<');
    } finally {
      injected.cleanup();
    }
  });

  it('draws nothing when the project has no url', async () => {
    const bare = await mountTerminal({
      projects: [{ id: 'ghost', name: 'Ghost', description: 'd', stack: ['x'], runnable: true }],
    });
    try {
      /* A link to nowhere is worse than no link. */
      expect(repoLine(bare)('ghost')).toBe('');
      expect(caption(bare)('ghost', ['<div>a line</div>'])).not.toContain('class="link"');
    } finally {
      bare.cleanup();
    }
  });

  it('draws nothing for an id no project owns', () => {
    expect(repoLine(term)('nobody')).toBe('');
  });

  it('carries the demo\'s own lines verbatim, with the repo line under them', () => {
    const html = caption(term)('pacelab', ['<div>first</div>', '<div class="dim">second</div>']);

    expect(html).toContain('<div>first</div>');
    expect(html).toContain('<div class="dim">second</div>');
    expect(html.indexOf('first')).toBeLessThan(html.indexOf('second'));
    expect(html.indexOf('second')).toBeLessThan(html.indexOf('data-url'));
  });

  it('takes a style, so a beat can keep the caption present but invisible', () => {
    /* The invariant that bit PaceLab: the caption is in *every* paint, so the
       frame's height is fixed from the first one. Hiding it is a style, never
       an omission — introducing it at the end would grow the element mid-run. */
    const hidden = caption(term)('pacelab', ['<div>x</div>'], 'opacity:0');

    expect(hidden).toContain('style="opacity:0"');
    expect(hidden).toContain('<div>x</div>');
    expect(caption(term)('pacelab', ['<div>x</div>'])).not.toContain('style=');
  });
});
