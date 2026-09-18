import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { LandingAppearance } from "$lib/types.js";

import Appearances from "./Appearances.svelte";

// Inline fixture, not a read of data/landing.yaml (ENGINEERING.md #21) - two
// entries so a bug that only shows up on the second row (e.g. mixing up
// which id a panel belongs to) has something to catch it against.
const APPEARANCES: LandingAppearance[] = [
  {
    id: "gtc-2026",
    event: "NVIDIA GTC 2026",
    what: "LiveVision talk",
    date: "March 2026",
    blurb: "Talked at NVIDIA GTC 2026 about the architecture behind LiveVision.",
  },
  {
    id: "ces-2026",
    event: "CES 2026",
    what: "LiveVision demo",
    date: "January 2026",
    blurb: "Built and ran a live, on-prem computer vision pipeline at CES 2026.",
  },
];

function html_for(appearances: LandingAppearance[]): string {
  return render(Appearances, { props: { appearances } }).body;
}

describe("Appearances", () => {
  it("renders each appearance's event, what and date", () => {
    const html = html_for(APPEARANCES);

    expect(html).toContain("NVIDIA GTC 2026");
    expect(html).toContain("LiveVision talk");
    expect(html).toContain("March 2026");
    expect(html).toContain("CES 2026");
    expect(html).toContain("LiveVision demo");
    expect(html).toContain("January 2026");
  });

  // The bug #198 exists to fix: landing.yaml has carried `blurb` on both
  // appearance entries since #196, and the component rendered event/what/date
  // while silently dropping it. This is the assertion that would have caught
  // that regression.
  it("renders each appearance's blurb, which the pre-#198 markup dropped entirely", () => {
    const html = html_for(APPEARANCES);

    expect(html).toContain("Talked at NVIDIA GTC 2026 about the architecture behind LiveVision.");
    expect(html).toContain("Built and ran a live, on-prem computer vision pipeline at CES 2026.");
  });

  it("renders each row's disclosure as a real button, collapsed by default", () => {
    const html = html_for(APPEARANCES);

    const buttons = [...html.matchAll(/<button[^>]*class="appearances-toggle[^>]*>/g)];
    expect(buttons).toHaveLength(APPEARANCES.length);
    for (const button of buttons) {
      expect(button[0]).toContain('aria-expanded="false"');
    }
  });

  it("wires each button's aria-controls to the id of its own panel, not a shared or mismatched one", () => {
    const html = html_for(APPEARANCES);

    for (const appearance of APPEARANCES) {
      const expected_id = `appearances-panel-${appearance.id}`;
      const button_match = html.match(new RegExp(`<button[^>]*aria-controls="([^"]+)"[^>]*>\\s*<span class="appearances-event[^>]*>${appearance.event}`));
      expect(button_match?.[1]).toBe(expected_id);
      expect(html).toContain(`id="${expected_id}"`);
    }
  });

  it("hides each collapsed panel from assistive tech, since the height animation keeps it in the DOM either way", () => {
    const html = html_for(APPEARANCES);

    const panels = [...html.matchAll(/<div id="appearances-panel-[^"]+"[^>]*>/g)];
    expect(panels).toHaveLength(APPEARANCES.length);
    for (const panel of panels) {
      expect(panel[0]).toContain('aria-hidden="true"');
    }
  });

  it("keeps the heading smaller than Work's, since Appearances is the quiet beat between two loud ones (#198)", () => {
    const own_source = readFileSync(new URL("./Appearances.svelte", import.meta.url), "utf8");
    const work_source = readFileSync(new URL("./Work.svelte", import.meta.url), "utf8");

    const own_ceiling = Number(
      own_source.match(/\.appearances-heading\s*\{[\s\S]*?font-size:\s*clamp\([^,]+,[^,]+,\s*([\d.]+)rem\)/)?.[1],
    );
    const work_ceiling = Number(
      work_source.match(/\.work-heading\s*\{[\s\S]*?font-size:\s*clamp\([^,]+,[^,]+,\s*([\d.]+)rem\)/)?.[1],
    );

    expect(own_ceiling).toBeGreaterThan(0);
    expect(work_ceiling).toBeGreaterThan(0);
    expect(own_ceiling).toBeLessThan(work_ceiling);
  });

  // Reads the component's own source rather than its output: Svelte extracts
  // scoped <style> to a separate stylesheet, so a font-family declaration
  // never appears in the rendered HTML and no amount of DOM assertion can
  // see it. #187 retired Share Tech Mono everywhere outside the hero, #194
  // reintroduced it on Commits' readout, and .memory/no-default-ai-styling.md
  // records both. This is the check that would catch the same slip here.
  it("keeps Share Tech Mono out of this component, which #187 retired outside the hero", () => {
    const source = readFileSync(new URL("./Appearances.svelte", import.meta.url), "utf8");

    expect(source).not.toContain("Share Tech Mono");
  });
});
