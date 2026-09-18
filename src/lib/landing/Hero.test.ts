// Pins the fallback wiring #178 leans on hardest (see SHOULD 4 in the
// review): that the SSR/no-JS output ships exactly one backdrop, the
// marker starts hidden, and the canvas renders with nothing drawn into it.
// Renders Hero directly through svelte/server - LandingSections.test.ts
// already does this for the whole page, but that file belongs to the base
// branch, not this lane, so Hero gets its own direct render here (the way
// Commits.test.ts renders Commits directly on the base branch).
import { render } from "svelte/server";

import type { LandingGithub, LandingHero } from "$lib/types.js";

import Hero from "./Hero.svelte";

const HERO: LandingHero = {
  name: "Test Person",
  role: "Engineer, Acme",
  location: "Somewhere, QC",
  tagline: "I build things.",
};

const GITHUB: LandingGithub = { user: "testuser" };

function html_for(hero: LandingHero = HERO): string {
  return render(Hero, {
    props: {
      hero,
      github: GITHUB,
      resume_link: "default",
      profile_name: "Resolved Profile",
      resume_title: "Resolved Variant Title",
    },
  }).body;
}

// Svelte's SSR output appends a scoped-style hash to every class attribute
// (e.g. `class="hero-backdrop svelte-2eqzcj"`), so assertions below match
// on the class name as a prefix/substring rather than an exact attribute
// value.
describe("Hero SSR/no-JS output", () => {
  it("renders exactly one .hero-backdrop", () => {
    const html = html_for();
    expect(html.match(/class="hero-backdrop\b/g)?.length).toBe(1);
  });

  it("renders the Montreal marker with hero-globe-marker-hidden, since canvas_animating starts false", () => {
    const html = html_for();
    // `hero-globe-marker-layer` (the wrapping div) also starts with
    // "hero-globe-marker", so the lookahead requires a space or the
    // closing quote right after it to land on the marker div itself.
    const marker_class = html.match(/<div class="(hero-globe-marker(?=[ "])[^"]*)"/)?.[1];
    expect(marker_class).toContain("hero-globe-marker-hidden");
  });

  it("renders the canvas empty - nothing can draw into it without JS", () => {
    const html = html_for();
    expect(html).toMatch(/<canvas[^>]*class="hero-globe-canvas[^"]*"[^>]*><\/canvas>/);
  });

  it("renders the still SVG visible (not hero-globe-still-hidden), the one visible backdrop for every non-animating path", () => {
    const html = html_for();
    const still_class = html.match(/<img class="(hero-globe-still[^"]*)"/)?.[1];
    expect(still_class).toBeDefined();
    expect(still_class).not.toContain("hero-globe-still-hidden");
  });

  it("does not render a hero-status line - the field was removed from LandingHero (#185)", () => {
    const html = html_for();
    expect(html).not.toContain("hero-status");
  });
});
