import { render } from "svelte/server";

import type { LandingData } from "$lib/types.js";

import LandingSections from "./LandingSections.svelte";

const LANDING: LandingData = {
  hero: {
    name: "Test Person",
    role: "Engineer, Acme",
    location: "Somewhere, QC",
    tagline: "I build things.",
    status: "Somewhere, doing stuff.",
  },
  projects: [
    {
      id: "proj-a",
      name: "Project A",
      blurb: "Does a thing.",
      stack: ["TypeScript"],
      status: "Active",
    },
  ],
  resume_links: ["default"],
  contact: [
    { label: "Email", url: "mailto:test@example.com" },
    { label: "LinkedIn", url: "https://linkedin.com/in/test" },
    { label: "GitHub", url: "https://github.com/testuser" },
  ],
  github: { user: "testuser" },
  sections: ["hero", "divider", "commits", "work", "contact"],
};

// Deliberately different from hero.name/hero.role, to prove the download
// filename comes from these props (resume.yaml's profile name and the
// linked variant's title) rather than from landing.hero.
const PROFILE_NAME = "Resolved Profile";
const RESUME_TITLE = "Resolved Variant Title";

function html_for(landing: LandingData): string {
  return render(LandingSections, {
    props: {
      landing,
      profile_name: PROFILE_NAME,
      resume_title: RESUME_TITLE,
      contributions_grid: null,
    },
  }).body;
}

describe("LandingSections", () => {
  it("renders every section named in landing.sections", () => {
    const html = html_for(LANDING);

    expect(html).toContain("Test Person");
    expect(html).toContain("Somewhere, QC");
    expect(html).toContain("Project A");
    expect(html).toContain("https://linkedin.com/in/test");
    expect(html).toContain("mailto:test@example.com");
  });

  it("renders sections in the order given by landing.sections", () => {
    const html = html_for(LANDING);

    const hero_index = html.indexOf("Test Person");
    const divider_index = html.indexOf("Somewhere, QC");
    // Anchored on the offline-state copy Commits.svelte renders (this
    // fixture's contributions_grid is null), not "testuser" - that string
    // also appears in Divider's GitHub link (from the contact fixture),
    // which renders earlier in the document and would mask a Commits
    // section that never rendered at all.
    const commits_index = html.indexOf("Commit history is offline for this build.");
    const work_index = html.indexOf("Project A");
    const contact_index = html.indexOf("mailto:test@example.com");

    expect(hero_index).toBeGreaterThanOrEqual(0);
    expect(hero_index).toBeLessThan(divider_index);
    expect(divider_index).toBeLessThan(commits_index);
    expect(commits_index).toBeLessThan(work_index);
    expect(work_index).toBeLessThan(contact_index);

    // Divider filters out mailto: links (Contact renders them instead).
    // Asserted directly here, not just inferred from ordering - dropping
    // that filter wouldn't move any of the indexes above, so it would pass
    // silently without this check.
    const divider_band = html.slice(divider_index, commits_index);
    expect(divider_band).not.toContain("mailto:");
  });

  it("reverses the rendered order when landing.sections is reversed", () => {
    const reversed = { ...LANDING, sections: [...LANDING.sections].reverse() };
    const html = html_for(reversed);

    const hero_index = html.indexOf("Test Person");
    const contact_index = html.indexOf("mailto:test@example.com");

    expect(contact_index).toBeLessThan(hero_index);
  });

  it("omits a section entirely when it is removed from landing.sections", () => {
    const without_work = { ...LANDING, sections: ["hero", "commits", "contact"] };
    const html = html_for(without_work);

    expect(html).not.toContain("Project A");
  });

  it("wires the resume CTA's download link to the resume PDF with a filename built from profile_name/resume_title", () => {
    const html = html_for(LANDING);

    expect(html).toContain('href="/default.pdf"');
    expect(html).toContain('download="Resolved Profile - Resume - Resolved Variant Title.pdf"');
  });

  it("gives the icon-only download link an accessible name and hides its SVG from assistive tech", () => {
    const html = html_for(LANDING);

    expect(html).toContain('aria-label="Download resume PDF"');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("renders exactly one h1", () => {
    const html = html_for(LANDING);

    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });

  it("renders no slash-separated slogan anywhere on the page", () => {
    const html = html_for(LANDING);

    expect(html).not.toMatch(/\s\/\s/);
  });
});
