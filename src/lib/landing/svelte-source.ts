import { readFileSync } from "node:fs";

// Test support for reading a landing component's scoped <style>. Svelte
// extracts scoped styles into their own stylesheet, so no rendered markup
// carries a width or a gutter, and a test that has to pin one reads the
// component's source instead. One reader here, so every test that does
// this parses CSS the same way.

export interface ContentMeasure {
  // The enclosing @media condition, or null for a rule at the top level.
  media: string | null;
  max_width: string | undefined;
  padding_inline: string | undefined;
}

/**
 * The `max-width` and `padding-inline` of every rule for `selector` in a
 * stylesheet, in source order, each with the media query it sits in.
 * Comparing two of these pins the width, the gutters and the breakpoints
 * that change them.
 *
 * Walks the braces rather than matching a regular expression, so a rule's
 * media query is known and `.wrap` never matches `.wrap-inner`.
 */
export function content_measure_of(source: string, selector: string): ContentMeasure[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const headers: string[] = [];
  const measures: ContentMeasure[] = [];
  let prelude = "";
  let body_start = -1;

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") {
      headers.push(prelude.trim());
      prelude = "";
      body_start = index + 1;
    } else if (char === "}") {
      const header = headers.pop() ?? "";
      if (header.split(",").some((part) => part.trim() === selector)) {
        const body = css.slice(body_start, index);
        const media = headers.findLast((open) => open.startsWith("@media"));
        measures.push({
          media: media ? media.slice("@media".length).trim() : null,
          max_width: body.match(/max-width:\s*([^;]+);/)?.[1].trim(),
          padding_inline: body.match(/padding-inline:\s*([^;]+);/)?.[1].trim(),
        });
      }
      prelude = "";
    } else if (char === ";") {
      prelude = "";
    } else {
      prelude += char;
    }
  }

  if (measures.length === 0) {
    throw new Error(`no rule for ${selector}`);
  }
  return measures;
}

/** content_measure_of, over a landing component's own source file. */
export function content_measure(component: string, selector: string): ContentMeasure[] {
  const source = readFileSync(new URL(component, import.meta.url), "utf8");
  const style = source.match(/<style>([\s\S]*)<\/style>/)?.[1] ?? "";
  try {
    return content_measure_of(style, selector);
  } catch (error) {
    throw new Error(`${component}: ${(error as Error).message}`);
  }
}
