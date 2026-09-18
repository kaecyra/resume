// A `*.dom.test.ts` file (see vite.config.ts): the landing page's `<meta
// name="theme-color">` is a static attribute in +page.svelte's
// svelte:head, so nothing about a swapped-source break-test applies to it
// (there is no data flow to sever). What can be pinned is that the
// rendered head actually carries HUD_PALETTE.background - a regression
// back to a literal hex (as happened once already: #1a2744, the
// pre-redesign HUD_PALETTE.background) would fail this. Renders +page.svelte
// directly with an inline PageData fixture, bypassing SvelteKit's
// load/router - see ENGINEERING.md rule 17 (inline fixtures, not
// filesystem dependencies).
import { render } from "@testing-library/svelte";

import { HUD_PALETTE } from "$lib/landing/palette.js";
import type { LandingData } from "$lib/types.js";

import Page from "./+page.svelte";

const LANDING: LandingData = {
  hero: {
    name: "Test Person",
    role: "Engineer",
    location: "Somewhere",
    tagline: "I build things.",
  },
  projects: [],
  appearances: [],
  resume_links: ["default"],
  contact: [{ label: "Email", url: "mailto:test@example.com" }],
  github: { user: "testuser" },
  sections: ["hero", "divider", "commits", "work", "contact"],
};

const PAGE_DATA = {
  umami_website_id: "",
  landing: LANDING,
  profile_name: "Test Person",
  resume_title: "Chief Technology Officer",
  contributions_grid: null,
  og: {
    title: "Test Person",
    description: "I build things.",
    image: "/og/default.png",
    url: "https://example.com",
  },
  jsonld: {
    person: {
      "@context": "https://schema.org" as const,
      "@type": "Person" as const,
      name: "Test Person",
      jobTitle: "Engineer",
    },
    webpage: {
      "@context": "https://schema.org" as const,
      "@type": "WebPage" as const,
      name: "Test Person",
      description: "I build things.",
    },
  },
};

describe("landing route page", () => {
  it("sets theme-color to the HUD palette's background, not a stale literal", () => {
    render(Page, { props: { data: PAGE_DATA } });

    const meta = document.querySelector('meta[name="theme-color"]');

    expect(meta).not.toBeNull();
    expect(meta?.getAttribute("content")).toBe(HUD_PALETTE.background);
  });

  it("publishes --hud-bg on :root from HUD_PALETTE.background, not a literal hex", () => {
    // :global(body)'s background-color reads var(--hud-bg) (see the
    // component <style> block), which only resolves to something if this
    // <style> tag actually reaches the rendered <head> carrying the live
    // palette value - a regression back to a hardcoded hex here (as the
    // theme-color meta tag above shipped once already, #1a2744) would
    // leave --hud-bg undefined instead of failing loudly, so this pins the
    // token going in rather than a computed colour coming out.
    render(Page, { props: { data: PAGE_DATA } });

    const style_tags = Array.from(document.head.querySelectorAll("style"));
    const root_style = style_tags.find((tag) => tag.textContent?.includes("--hud-bg"));

    expect(root_style).toBeDefined();
    expect(root_style?.textContent).toContain(`:root { --hud-bg: ${HUD_PALETTE.background}; }`);
  });
});
