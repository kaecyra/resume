import { existsSync, readFileSync } from "node:fs";

// The bug the card work fixed - a font the CSS asks for never arriving -
// survived for a long time because a wrong font fails nothing: the render
// succeeds, the generator exits 0, and the card just looks like a different
// design. Nothing in the suite could see it, so these two rules are what
// stands between the fix and its silent re-introduction: rename a file in
// static/fonts, drop a @font-face block, or set a family the layout does not
// declare, and one of them goes red.
//
// Source-level by necessity, like landing-source.test.ts: Svelte extracts a
// scoped <style> to its own stylesheet, so no rendered markup and no DOM
// assertion can see a @font-face rule or a font-family declaration.
const LAYOUT_URL = new URL("./+layout.svelte", import.meta.url);
const LAYOUT = readFileSync(LAYOUT_URL, "utf8");

// Globbed rather than listed: a third card route added under src/routes/og/
// inherits this layout's @font-face block and body reset, which is the
// layout's stated reason for existing, and a hand-maintained list would let
// it do that unchecked. The floor below catches a glob that matches nothing.
const CARDS = Object.keys(
  import.meta.glob("./*/+page.svelte", { query: "?raw", eager: false }),
);

// Every `src: url("/fonts/…")` in the layout, as the path the browser would
// request. `static/` is the document root at build time, so that URL maps to
// static/<path> on disk.
function declared_font_urls(): string[] {
  return [...LAYOUT.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map(([, url]) => url);
}

function declared_families(source: string): string[] {
  return [...source.matchAll(/font-family:\s*"([^"]+)"/g)].map(([, family]) => family);
}

describe("the OG card routes' fonts", () => {
  // A tripwire on the count, deliberately exact: a fourth face is a real
  // change to what these routes ship and should be seen, not absorbed.
  it("declares the three faces the cards are set in, and no more", () => {
    expect(declared_font_urls().length).toBe(3);
  });

  it("covers every card route under src/routes/og", () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(2);
  });

  it("points every @font-face at a file that exists in static/fonts", () => {
    const missing = declared_font_urls().filter(
      (url) => !existsSync(new URL(`../../../static${url}`, LAYOUT_URL)),
    );

    expect(missing).toEqual([]);
  });

  // The other half: a file that exists is no use if the card asks for a
  // family nothing declares. `ui-monospace`/`monospace`/`sans-serif` and the
  // `Impact` fallback are unquoted in the stacks, so matching quoted names
  // picks out exactly the faces that have to be served.
  it.each(CARDS)("sets %s only in families the layout declares", (card) => {
    const source = readFileSync(new URL(card, LAYOUT_URL), "utf8");
    const layout_families = new Set(declared_families(LAYOUT));

    const undeclared = declared_families(source).filter(
      (family) => !layout_families.has(family),
    );

    expect(undeclared).toEqual([]);
  });
});
