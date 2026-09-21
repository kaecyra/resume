import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { LandingProject } from "$lib/types.js";

import { ELEVATION, HUD_PALETTE } from "./palette.js";
import { content_measure } from "./svelte-source.js";
import Work from "./Work.svelte";

function project(overrides: Partial<LandingProject>): LandingProject {
  return {
    id: "proj-a",
    name: "Project A",
    blurb: "Does a thing.",
    stack: ["TypeScript"],
    status: "Active",
    ...overrides,
  };
}

// Featured (index 0) plus two secondary projects - enough to exercise both
// the raised and recessed treatments, and to prove the split follows array
// order rather than some other field.
const PROJECTS: LandingProject[] = [
  project({ id: "proj-a", name: "Project A", status: "Active" }),
  project({ id: "proj-b", name: "Project B", status: "In development" }),
  project({ id: "proj-c", name: "Project C", status: "Not yet public" }),
];

function html_for(projects: LandingProject[]): string {
  return render(Work, { props: { projects } }).body;
}

describe("Work", () => {
  it("marks only the first project as featured, and every other one as secondary", () => {
    const html = html_for(PROJECTS);

    const cards = [...html.matchAll(/<article class="([^"]+)"/g)].map((match) => match[1]);

    expect(cards).toHaveLength(3);
    expect(cards[0]).toContain("work-card-featured");
    expect(cards[0]).not.toContain("work-card-secondary");
    expect(cards[1]).toContain("work-card-secondary");
    expect(cards[1]).not.toContain("work-card-featured");
    expect(cards[2]).toContain("work-card-secondary");
    expect(cards[2]).not.toContain("work-card-featured");
  });

  it("colours the featured project's status in the page accent, and every other status in secondary", () => {
    const html = html_for(PROJECTS);

    const statuses = [...html.matchAll(/<span class="work-status[^"]*" style="color: ([^;]+);">/g)].map(
      (match) => match[1],
    );

    expect(statuses).toEqual([HUD_PALETTE.accent, HUD_PALETTE.secondary, HUD_PALETTE.secondary]);
  });

  it("exposes the elevation tokens the raised/recessed treatment reads from, on the section itself", () => {
    const html = html_for(PROJECTS);

    const section = html.match(/<section[^>]*>/)?.[0];

    expect(section).toBeDefined();
    expect(section).toContain(`--hud-panel: ${HUD_PALETTE.panel};`);
    expect(section).toContain(`--hud-void: ${ELEVATION.void};`);
    expect(section).toContain(`--hud-hair: ${ELEVATION.hair};`);
    expect(section).toContain(`--hud-hair-bright: ${ELEVATION.hair_bright};`);
  });

  it("keeps the pre-#197 inline border-left-color on the featured card, so the amber rail survives without a new CSS var", () => {
    const html = html_for(PROJECTS);

    expect(html).toContain(`border-left-color: ${HUD_PALETTE.accent};`);
  });

  it("renders every project name and blurb, so the elevation markup change never drops content", () => {
    const html = html_for(PROJECTS);

    for (const proj of PROJECTS) {
      expect(html).toContain(proj.name);
      expect(html).toContain(proj.blurb);
    }
  });

  // Reads the component's own source rather than its output: Svelte extracts
  // scoped <style> to a separate stylesheet, so a font-family or box-shadow
  // declaration never appears in the rendered HTML and no amount of DOM
  // assertion can see it. #187 retired Share Tech Mono everywhere outside
  // the hero, and #194 re-leaked it into a sibling landing component
  // without any test failing - this is the check that would catch the same
  // mistake here.
  it("keeps Share Tech Mono out of this component, which #187 retired outside the hero", () => {
    const source = readFileSync(new URL("./Work.svelte", import.meta.url), "utf8");

    expect(source).not.toContain("Share Tech Mono");
  });

  it("never writes a raw hex colour literal into the component's styles - every colour comes from HUD_PALETTE or ELEVATION", () => {
    const source = readFileSync(new URL("./Work.svelte", import.meta.url), "utf8");
    const style_block = source.match(/<style>([\s\S]*)<\/style>/)?.[1] ?? "";

    // Strip CSS comments first: this file's WHY-comments reference GitHub
    // issue numbers like "(#197)", and "197"/"187" both happen to be valid
    // 3-digit hex sequences - without stripping comments, the issue
    // references themselves would false-positive as colour literals.
    const declarations = style_block.replace(/\/\*[\s\S]*?\*\//g, "");

    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("shares the Pipelines section's content width and gutters", () => {
    expect(content_measure("Work.svelte", ".work-wrap")).toEqual(content_measure("Pipeline.svelte", ".wrap"));
  });
});
