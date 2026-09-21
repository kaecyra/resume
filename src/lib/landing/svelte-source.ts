import { readFileSync } from "node:fs";

// Test support for reading a landing component's scoped <style>. Svelte
// extracts scoped styles into their own stylesheet, so no rendered markup
// carries a width or a gutter, and a test that has to pin one reads the
// component's source instead. One reader here, so every test that does
// this parses CSS the same way.

export interface ContentMeasure {
  max_width: string | undefined;
  padding_inline: string | undefined;
}

function escape_regexp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The `max-width` and `padding-inline` of every rule for `selector` in a
 * landing component's source, in source order - the base rule first, then
 * any narrow-screen override inside a media query. Comparing two of these
 * pins both the width and the gutters, at every breakpoint that sets them.
 */
export function content_measure(component: string, selector: string): ContentMeasure[] {
  const source = readFileSync(new URL(component, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = new RegExp(`(?<![\\w-])${escape_regexp(selector)}\\s*\\{([^}]*)\\}`, "g");

  const measures = [...source.matchAll(rule)].map(([, body]) => ({
    max_width: body.match(/max-width:\s*([^;]+);/)?.[1].trim(),
    padding_inline: body.match(/padding-inline:\s*([^;]+);/)?.[1].trim(),
  }));

  if (measures.length === 0) {
    throw new Error(`${component} has no rule for ${selector}`);
  }
  return measures;
}
