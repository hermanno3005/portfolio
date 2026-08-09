/*
 * Reading a beat's stylesheet.
 *
 * The demo declares its motion as CSS `@keyframes` inside the painted SVG and
 * lets the browser run it, so what a test can ask about a beat is mostly what
 * its `<style>` block says. jsdom parses no stylesheets worth querying, and
 * these helpers are how three test files ask anyway — by reading the source of
 * one rule at a time.
 */

/** Everything the painted SVG's own `<style>` block declares. */
export const css = frame => frame.querySelector('svg style').textContent;

/**
 * One rule of it, from its selector to its closing brace — nested braces and
 * all, so `@keyframes` comes back whole.
 */
export function rule(frame, selector) {
  const source = css(frame);
  const start = source.indexOf(selector);
  if (start < 0) throw new Error(`${selector} is not in the beat's stylesheet`);

  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${selector} is never closed`);
}

export const keyframes = (frame, name) => rule(frame, `@keyframes ${name}`);

/* An easing function's own commas would otherwise read as the separator between
   two animations in a shorthand. Nothing here asks about easing. */
export const flatten = source => source.replace(/cubic-bezier\([^)]*\)/g, 'easing');

/** The delay of the named animation in a rule, in seconds. */
export function delayOf(source, animation) {
  const match = flatten(source).match(new RegExp(`${animation}\\s+[\\d.]+s\\s+[^,;]*?([\\d.]+)s`));
  if (!match) throw new Error(`${animation} is not animated here`);
  return Number(match[1]);
}
