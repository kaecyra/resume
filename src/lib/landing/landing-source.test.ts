import { readFileSync } from "node:fs";

// Two rules the pipeline section's components follow, checked once over all
// of them instead of restated at the bottom of each component's own test
// file. Both are source-level by necessity: Svelte extracts a scoped
// `<style>` to a separate stylesheet, so no rendered markup and no DOM
// assertion can see a colour or a font declaration.
//
// Scoped to #209's own components on purpose. Fifteen older landing
// components still carry hex literals, so a repository-wide version of the
// first rule would fail today - widening it is a cleanup of its own, not
// something to smuggle in here.
//
// This file replaces only the two rules. Where a component's own test file
// checked something stronger - Rack's allowlist over the rendered HTML,
// Terminal's bar inks - that test stays where it is.
const DIR = new URL("./", import.meta.url);

const COMPONENTS = [
  "CodeBlock.svelte",
  "Crossing.svelte",
  "Graph.svelte",
  "Pipeline.svelte",
  "Rack.svelte",
  "Readout.svelte",
  "RunwayDiagram.svelte",
  "Terminal.svelte",
  "VendorMarks.svelte",
];

// Every length CSS accepts, which is what the per-component rules matched
// before this file replaced them: #rgb, #rgba, #rrggbb, #rrggbbaa, and the
// lengths in between that are nobody's valid colour but are somebody's
// typo. Narrowing it to 3, 6 and 8 would let `#abcd` through.
const HEX_LITERAL = /#[0-9a-fA-F]{3,8}\b/;

// The one drop-shadow recipe in the section, written inline because a
// shadow is plain black at low alpha and a token for one shadow would be
// the only one of its kind - Terminal.svelte says so where it does it. The
// exemption is this exact string rather than every `box-shadow`, so a
// second shadow smuggling in a named colour still fails.
const ALLOWED_SHADOW = "0 18px 40px -24px #000";

function source_of(name: string): string {
  return readFileSync(new URL(name, DIR), "utf8");
}

// What neither rule should be reading: comments, in all three of the
// syntaxes these files use, and SVG fragment references.
//
// A comment naming the retired face is the opposite of using it - several
// of these carry one explaining why the system stack is there instead - and
// an issue number like `#209` is three hex digits as far as a regular
// expression cares. `url(#fade)` is a reference, not a colour, however
// hex-shaped the id happens to be.
function without_noise(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Not anchored to the line start: a trailing `// see #209` would
    // otherwise reach the hex rule, and this repo cites issue numbers
    // constantly.
    .replace(/\/\/[^\n]*$/gm, "")
    // Last, so an unterminated `url(#` inside a comment cannot run past the
    // comment and swallow a real literal on its way to the next `)`.
    .replace(/url\(#[^)]*\)/g, "");
}

describe("the pipeline section's components", () => {
  it("names every colour in palette.ts rather than writing a hex literal", () => {
    const offenders = COMPONENTS.filter((name) =>
      HEX_LITERAL.test(without_noise(source_of(name)).replaceAll(ALLOWED_SHADOW, "")),
    );

    expect(offenders).toEqual([]);
  });

  // The list is hand-maintained, and a ninth component added to the section
  // would escape both rules with the suite still green - the same silent
  // shrink this file was written to stop. Anchored to what the section
  // actually renders rather than to a directory glob, which would drag in
  // the fifteen older components the header excludes.
  //
  // Reachability from the root, not one file's import list: the root itself
  // is imported by nothing, and a component pulled in by a child rather
  // than by Pipeline.svelte would escape a one-level read.
  it("covers the section root and everything it reaches", () => {
    const reached = new Set<string>(["Pipeline.svelte"]);
    const queue = ["Pipeline.svelte"];

    while (queue.length > 0) {
      const name = queue.shift() as string;
      const imports = [
        ...source_of(name).matchAll(/from\s+["'][^"']*?\/(\w+\.svelte)["']/g),
      ].map(([, imported]) => imported);

      for (const imported of imports) {
        if (!reached.has(imported)) {
          reached.add(imported);
          queue.push(imported);
        }
      }
    }

    expect(reached.size).toBeGreaterThan(4);
    expect([...COMPONENTS].sort()).toEqual([...reached].sort());
  });

  it("keeps Share Tech Mono out, which #187 retired everywhere but the hero", () => {
    const offenders = COMPONENTS.filter((name) =>
      without_noise(source_of(name)).includes("Share Tech Mono"),
    );

    expect(offenders).toEqual([]);
  });
});
