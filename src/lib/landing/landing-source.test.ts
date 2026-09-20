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
const DIR = new URL("./", import.meta.url);

const COMPONENTS = [
  "CodeBlock.svelte",
  "Crossing.svelte",
  "Graph.svelte",
  "Pipeline.svelte",
  "Rack.svelte",
  "Readout.svelte",
  "Terminal.svelte",
  "VendorMarks.svelte",
];

function source_of(name: string): string {
  return readFileSync(new URL(name, DIR), "utf8");
}

// Shadow recipes are exempt and stripped with the comments: a drop shadow
// is plain black at low alpha, written inline the way every shadow on this
// page is, and a token for one shadow would be the only one of its kind
// (Terminal.svelte says so where it does it). The rule is about colours
// that name something, not about alpha.
//
// Comments are stripped before either rule runs. A comment naming the
// retired face is the opposite of using it - several of these carry one
// explaining why the system stack is there instead - and an issue number
// like #209 is three hex digits as far as a regular expression cares.
function without_comments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function without_shadows(source: string): string {
  return source.replace(/box-shadow:[^;]*;/g, "");
}

describe("the pipeline section's components", () => {
  it("names every colour in palette.ts rather than writing a hex literal", () => {
    const offenders = COMPONENTS.filter((name) =>
      /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.test(
        without_shadows(without_comments(source_of(name))),
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("keeps Share Tech Mono out, which #187 retired everywhere but the hero", () => {
    const offenders = COMPONENTS.filter((name) =>
      without_comments(source_of(name)).includes("Share Tech Mono"),
    );

    expect(offenders).toEqual([]);
  });
});
