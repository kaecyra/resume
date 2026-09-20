import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { PipelineCrossing } from "$lib/types.js";

import Crossing from "./Crossing.svelte";
import { HUD_PALETTE, PIPELINE_INK } from "./palette.js";

const TO_REGISTRY: PipelineCrossing = {
  id: "to-registry",
  after: "commit",
  label: "ghcr.io/kaecyra/resume:latest",
};

const TO_EDGE: PipelineCrossing = {
  id: "to-edge",
  after: "deploy",
  label: "nginx :80",
};

function html_for(crossing: PipelineCrossing, index: number): string {
  return render(Crossing, { props: { crossing, index } }).body;
}

const SOURCE = readFileSync(new URL("./Crossing.svelte", import.meta.url), "utf8");

// The source with its prose removed. Both source-reading guards below are
// about what the component *declares*, and a comment is free to name an
// issue (`#209` is a valid hex triplet) or to explain which font was
// retired without either being a declaration.
function without_comments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

const DECLARED = without_comments(SOURCE);

describe("Crossing", () => {
  describe("content", () => {
    it("renders the label verbatim from the data, not a derived or shortened string", () => {
      expect(html_for(TO_REGISTRY, 0)).toContain("ghcr.io/kaecyra/resume:latest");
      expect(html_for(TO_EDGE, 1)).toContain("nginx :80");
    });

    it("carries the crossing id, so a reader of the DOM can tell two crossings apart", () => {
      expect(html_for(TO_REGISTRY, 0)).toContain('data-crossing="to-registry"');
      expect(html_for(TO_EDGE, 1)).toContain('data-crossing="to-edge"');
    });
  });

  describe("direction", () => {
    // The direction has to come from the crossing's position in the list,
    // never from which band it follows: `data/pipeline.yaml` can grow a
    // fourth band and a third crossing without anyone editing a component,
    // and the connector still has to leave the spine the previous band's
    // graph actually sits on.
    it("alternates out, back, out with the index rather than keying off the band", () => {
      expect(html_for(TO_REGISTRY, 0)).toContain("crossing--out");
      expect(html_for(TO_REGISTRY, 1)).toContain("crossing--back");
      expect(html_for(TO_REGISTRY, 2)).toContain("crossing--out");
    });

    it("gives the same crossing the opposite direction at the next index, so nothing is hardcoded per band", () => {
      expect(html_for(TO_EDGE, 0)).toContain("crossing--out");
      expect(html_for(TO_EDGE, 1)).toContain("crossing--back");
    });
  });

  // happy-dom performs no layout and `svelte/server` emits no stylesheet, so
  // nothing here can assert that a connector's far end lands on the next
  // band's spine - that is verified by eye. What this does check is that the
  // endpoints are still derived from the named properties rather than from a
  // pixel position, which the source could plausibly violate. Asserting the
  // property values themselves was dropped: `tasks/` is gitignored, so there
  // is no shipped drawing for them to be "the same as", and swapping the
  // --out and --back rule bodies wholesale left all of them green. It reads
  // the component's own source because Svelte extracts scoped `<style>` to a
  // separate stylesheet, which never appears in the rendered HTML
  // (Commits.test.ts uses the same technique for the same reason).
  describe("geometry", () => {
    it("derives every endpoint from the named properties instead of hardcoding a pixel position", () => {
      // The only bare lengths left in the positioning rules are the arrow's
      // own half-width (--tip-half) and the label's vertical centring (11px),
      // both of which are properties of the glyph, not of the column.
      expect(SOURCE).toContain("left: var(--near);");
      expect(SOURCE).toContain("left: var(--far);");
      expect(SOURCE).toContain("right: calc(100% - var(--far));");
      expect(SOURCE).toContain("height: calc(100% - var(--turn) - var(--tip));");
      expect(SOURCE).toContain("left: calc((var(--near) + var(--far)) / 2);");
    });
  });

  // Below 860px `.band-grid` collapses to one column, so there is no second
  // spine to reach and the horizontal run would be a lie. The rules go; the
  // label stays and grows a short vertical rule of its own. Source-read
  // because a scoped media query never reaches the rendered markup.
  it("drops the connector and keeps the label in the one-column layout", () => {
    const narrow = SOURCE.slice(SOURCE.indexOf("@media (max-width: 860px)"));

    expect(SOURCE).toContain("@media (max-width: 860px)");
    expect(narrow).toMatch(/\.x-v,\s*\.x-h,\s*\.x-tip\s*\{\s*display: none;/);
    expect(narrow).toMatch(/\.x-label::before\s*\{/);
  });

  describe("palette", () => {
    it("paints the rules and the arrow from PIPELINE_INK, which is where those two tones are named", () => {
      const html = html_for(TO_REGISTRY, 0);

      expect(html).toContain(PIPELINE_INK.crossing_rule);
      expect(html).toContain(PIPELINE_INK.crossing_arrow);
      expect(html).toContain(HUD_PALETTE.chip_text);
    });
  });

  // The positive half of the rule landing-source.test.ts enforces negatively
  // over the whole section: this component has to be on the system stack,
  // not merely off the retired face.
  it("uses the plain system monospace stack", () => {
    expect(SOURCE).toContain("font-family: ui-monospace, SFMono-Regular, Menlo, monospace;");
  });
});
