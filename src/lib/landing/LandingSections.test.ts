import { render } from "svelte/server";

import type { LandingData } from "$lib/types.js";

import LandingSections from "./LandingSections.svelte";

const LANDING: LandingData = {
  hero: {
    name: "Test Person",
    role: "Engineer",
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
  contact: [{ label: "Email", url: "mailto:test@example.com" }],
  github: { user: "testuser" },
  sections: ["hero", "projects", "resume", "contact"],
};

function html_for(landing: LandingData): string {
  return render(LandingSections, { props: { landing } }).body;
}

describe("LandingSections", () => {
  it("renders every section named in landing.sections", () => {
    const html = html_for(LANDING);

    expect(html).toContain("Test Person");
    expect(html).toContain("Project A");
    expect(html).toContain("View the full resume");
    expect(html).toContain("mailto:test@example.com");
  });

  it("renders sections in the order given by landing.sections", () => {
    const html = html_for(LANDING);

    const hero_index = html.indexOf("Test Person");
    const projects_index = html.indexOf("Project A");
    const resume_index = html.indexOf("View the full resume");
    const contact_index = html.indexOf("mailto:test@example.com");

    expect(hero_index).toBeGreaterThanOrEqual(0);
    expect(hero_index).toBeLessThan(projects_index);
    expect(projects_index).toBeLessThan(resume_index);
    expect(resume_index).toBeLessThan(contact_index);
  });

  it("reverses the rendered order when landing.sections is reversed", () => {
    const reversed = { ...LANDING, sections: [...LANDING.sections].reverse() };
    const html = html_for(reversed);

    const hero_index = html.indexOf("Test Person");
    const contact_index = html.indexOf("mailto:test@example.com");

    expect(contact_index).toBeLessThan(hero_index);
  });

  it("omits a section entirely when it is removed from landing.sections", () => {
    const without_projects = { ...LANDING, sections: ["hero", "resume", "contact"] };
    const html = html_for(without_projects);

    expect(html).not.toContain("Project A");
  });

  it("wires the resume CTA's download link to the resume PDF with a filename built from hero", () => {
    const html = html_for(LANDING);

    expect(html).toContain('href="/default.pdf"');
    expect(html).toContain('download="Test Person - Resume - Engineer.pdf"');
  });

  it("renders exactly one h1", () => {
    const html = html_for(LANDING);

    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });
});
