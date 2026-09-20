import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { PipelineMarkEntry } from "$lib/types.js";

import { HUD_PALETTE } from "./palette.js";
import VendorMarks from "./VendorMarks.svelte";
import { VENDOR_MARK_PATHS } from "./vendor-marks.js";

const MARKS: PipelineMarkEntry[] = [
  { id: "proxmox", label: "Proxmox" },
  { id: "ubuntu", label: "Ubuntu" },
  { id: "docker", label: "Docker", lit: true },
  { id: "nginx", label: "nginx" },
  { id: "cloudflare", label: "Cloudflare" },
];

function html_for(marks: PipelineMarkEntry[]): string {
  return render(VendorMarks, { props: { marks } }).body;
}

function source(): string {
  return readFileSync(new URL("./VendorMarks.svelte", import.meta.url), "utf8");
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

describe("VendorMarks", () => {
  it("names every vendor, in the order the data lists them", () => {
    const html = html_for(MARKS);
    const labels = [...html.matchAll(/<span class="mark-label[^"]*">([^<]+)</g)].map((m) => m[1]);

    expect(labels).toEqual(["Proxmox", "Ubuntu", "Docker", "nginx", "Cloudflare"]);
  });

  it("draws each vendor's own mark", () => {
    const html = html_for(MARKS);

    for (const mark of MARKS) {
      expect(html, mark.id).toContain(VENDOR_MARK_PATHS[mark.id]);
    }
  });

  it("lights only the mark the data marks as lit, and lights it amber", () => {
    const html = html_for(MARKS);
    const lit = [...html.matchAll(/<li class="mark is-lit[^"]*">.*?<span class="mark-label[^"]*">([^<]+)</gs)];

    expect(lit.map((m) => m[1])).toEqual(["Docker"]);
    expect(html).toContain(`--mark-lit: ${HUD_PALETTE.accent}`);
    expect(html).toContain(`--mark-ink: ${HUD_PALETTE.chip_text}`);
  });

  it("hides the drawings from assistive technology and leaves the names readable", () => {
    const html = html_for(MARKS);

    // Five decorative SVGs, five real labels: a screen reader gets the
    // vendor names as a list and none of the geometry.
    expect([...html.matchAll(/<svg[^>]*aria-hidden="true"/g)]).toHaveLength(5);
    expect([...html.matchAll(/<svg[^>]*role="img"/g)]).toHaveLength(0);
  });

  it("recolours with currentColor rather than baking a fill into each path", () => {
    expect(html_for(MARKS)).not.toMatch(/<svg[^>]*fill="(?!currentColor)/);
  });

  // The list itself carries a 38px top margin, so leaving an empty <ul>
  // behind would give a band with no marks that much empty space under its
  // rack rather than nothing.
  it("renders nothing at all when a band lists no marks", () => {
    expect(html_for([])).not.toMatch(/<[a-z]/i);
  });

  it("takes its colours from the palette rather than a literal hex", () => {
    expect(source_without_comments()).not.toMatch(HEX_COLOUR);
  });

  it("keeps Share Tech Mono out of this component, which #187 retired outside the hero", () => {
    expect(source()).not.toContain("Share Tech Mono");
  });
});
