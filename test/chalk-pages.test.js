/*
 * Chalk's privacy policy and support page.
 *
 * The App Store listing prints https://hermann-aust.com/chalk/privacy and
 * /chalk/support, so these two documents are a promise to App Review rather
 * than part of the terminal: the harness never mounts them. Cloudflare serves
 * `chalk/privacy.html` at `/chalk/privacy`, so the paths below are the URLs.
 *
 * CSS is not loaded, so nothing here asks what the pages look like — only that
 * they stay plain documents, say what the policy promises, and point where the
 * listing expects.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADDRESS = 'chalk@hermann-aust.com';

/** One page, parsed as a visitor's browser would, scripts off. */
const page = name => new JSDOM(fs.readFileSync(path.join(ROOT, 'chalk', `${name}.html`), 'utf8')).window.document;

const hrefs = doc => [...doc.querySelectorAll('a')].map(a => a.getAttribute('href'));

describe.each(['privacy', 'support'])('the %s page', name => {
  const doc = page(name);

  it('is a plain document: no script, nothing from the terminal', () => {
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(doc.querySelector('#terminal, #mobile-card')).toBeNull();
  });

  it('loads only its own stylesheet, which exists', () => {
    const sheets = [...doc.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href'));
    expect(sheets).toEqual(['/chalk/chalk.css']);
    expect(fs.existsSync(path.join(ROOT, 'chalk', 'chalk.css'))).toBe(true);
  });

  it('gives the contact address as a mail link', () => {
    expect(hrefs(doc)).toContain(`mailto:${ADDRESS}`);
  });

  it('links home and to the other page', () => {
    const other = name === 'privacy' ? '/chalk/support' : '/chalk/privacy';
    expect(hrefs(doc)).toEqual(expect.arrayContaining(['/', other]));
  });
});

describe('the privacy policy', () => {
  const doc = page('privacy');

  it('covers what was settled, in order', () => {
    expect([...doc.querySelectorAll('h2')].map(h => h.textContent)).toEqual([
      'What Chalk stores',
      'What leaves your iPhone',
      "What Chalk doesn't have",
      'Siri, Spotlight and Shortcuts',
      "Your iPhone's backups",
      'Deleting your data',
      'Changes and contact',
    ]);
  });

  it('carries an effective date', () => {
    expect(doc.querySelector('.meta').textContent).toMatch(/^Effective \d{1,2} \w+ \d{4}$/);
  });
});

it('keeps chalk/ in the deployed assets', () => {
  const ignored = fs.readFileSync(path.join(ROOT, '.assetsignore'), 'utf8')
    .split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  expect(ignored.some(pattern => /^\/?chalk/.test(pattern))).toBe(false);
});
