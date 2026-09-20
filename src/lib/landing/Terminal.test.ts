import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { PipelineTerminal } from "$lib/types.js";

import { HUD_PALETTE, PIPELINE_INK } from "./palette.js";
import Terminal from "./Terminal.svelte";

// Deliberately not the widths the real data carries. Every number here is
// absent from data/pipeline.yaml and from the mockup, so a component that
// drew its own bars instead of the ones it was handed would fail rather
// than coincidentally agree.
const TERMINAL: PipelineTerminal = {
  path: "~/tmp/scratch",
  turns: [
    { speaker: "you", bars: [37, 12] },
    { speaker: "agent", bars: [63, 58, 9] },
    { speaker: "tool", bars: [21] },
    { speaker: "you", cursor: true },
  ],
};

function html_for(terminal: PipelineTerminal): string {
  return render(Terminal, { props: { terminal } }).body;
}

function source(): string {
  return readFileSync(new URL("./Terminal.svelte", import.meta.url), "utf8");
}

// A colour written by hand, anywhere in the component. The scan covers the
// whole file rather than the `<style>` block alone, because the palette
// values reach the page through `style="..."` in the markup, which is above
// that block. Comments come out first: an issue reference like (#209) is
// three hex digits to a regex. The trailing boundary in HEX_COLOUR is what
// keeps Svelte's own `{#each` out of it.
const HEX_COLOUR = /#[0-9a-fA-F]{3,8}\b/;

function source_without_comments(): string {
  return source().replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|^[ \t]*\/\/[^\n]*$/gm, "");
}

describe("Terminal", () => {
  it("draws one bar per width the data gives it, at that width", () => {
    const html = html_for(TERMINAL);

    for (const width of [37, 12, 63, 58, 9, 21]) {
      expect(html).toContain(`width: ${width}%`);
    }

    expect([...html.matchAll(/class="ln[ "]/g)]).toHaveLength(6);
  });

  // Reads the component's own source: the widths are the whole content of
  // this drawing, and a component carrying the mockup's six turns inline
  // would render identically against the real data while ignoring any edit
  // to it. There is no rendered-output assertion that can tell the two
  // apart, so this pins the absence of hardcoded widths directly.
  it("takes every width from the data rather than carrying the mockup's own", () => {
    expect(source()).not.toMatch(/width:\s*(?!100%)[\d.]+%/);
  });

  it("gives each speaker its own glyph", () => {
    const html = html_for(TERMINAL);
    const glyphs = [...html.matchAll(/<span class="glyph[^"]*">([^<]*)</g)].map((m) => m[1]);

    // `>` for the reader at their own prompt, a bullet for the agent's
    // reply, a tick for a tool that came back clean.
    expect(glyphs).toEqual([">", "\u2022", "\u2713", ">"]);
  });

  it("renders the cursor only on the turn the data marks with one, and no bars there", () => {
    const html = html_for(TERMINAL);

    expect([...html.matchAll(/class="cursor[ "]/g)]).toHaveLength(1);

    const last_turn = html.slice(html.lastIndexOf("<div class=\"turn"));
    expect(last_turn).toContain("cursor");
    expect(last_turn).not.toMatch(/class="ln[ "]/);
  });

  it("shows the working directory the data names", () => {
    expect(html_for(TERMINAL)).toContain("~/tmp/scratch");
  });

  it("is hidden from assistive technology, because it says nothing a reader could read", () => {
    // Resolution 1 of the plan: decorative drawing is `aria-hidden`. The
    // bars carry no text on purpose, so announcing a bare shell path and
    // then silence would be worse than announcing nothing. The note beside
    // the terminal is what carries the meaning.
    expect(html_for(TERMINAL)).toMatch(/<div class="terminal[^"]*" aria-hidden="true"/);
  });

  it("stops the cursor blinking under prefers-reduced-motion", () => {
    const style = source();
    const query = style.slice(style.indexOf("@media (prefers-reduced-motion: reduce)"));

    // Both halves matter: without the first, deleting the animation
    // outright leaves this test green and takes @keyframes blink with it.
    expect(style).toMatch(/\.cursor\s*\{[^}]*animation: blink/);
    expect(query).toContain("@media (prefers-reduced-motion: reduce)");
    expect(query).toMatch(/\.cursor\s*\{\s*animation: none;/);
  });

});
