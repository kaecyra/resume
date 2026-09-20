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

// A 360px viewport less the 20px .wrap carries on each side.
const NARROW_CONTENT_WIDTH = 320;

function html_for(marks: PipelineMarkEntry[]): string {
  return render(VendorMarks, { props: { marks } }).body;
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

  // The row wraps or it does not, and happy-dom performs no layout, so the
  // arithmetic that decides it is checked against the component's own
  // source instead. At the narrowest phone this section is built for - a
  // 360px viewport, which .wrap pads to 320px of content - five boxes and
  // the four gaps between them have to fit, or Cloudflare drops to a row of
  // its own the way it did before the narrow block existed.
  it("keeps all five marks on one row at 360px", () => {
    const source = readFileSync(new URL("./VendorMarks.svelte", import.meta.url), "utf8");
    const narrow = source.match(/@media \(max-width: 480px\) \{(.*)\n  \}/s);
    expect(narrow, "the narrow-width block").not.toBeNull();

    const gap = narrow![1].match(/gap: \d+px (\d+)px/);
    const width = narrow![1].match(/width: (\d+)px/);
    expect(gap, "a column gap under 480px").not.toBeNull();
    expect(width, "a mark width under 480px").not.toBeNull();

    const row = MARKS.length * Number(width![1]) + (MARKS.length - 1) * Number(gap![1]);

    expect(row).toBeLessThanOrEqual(NARROW_CONTENT_WIDTH);
  });
});
