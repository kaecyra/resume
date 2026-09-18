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

  // Pins the exact rendered string (#188) - not just "contains some
  // coordinates" - so a wrong derivation (dropped decimal place, wrong
  // sign, stale hardcoded literal) is caught rather than passing on a loose
  // substring match. 45.47/73.75 are MONTREAL_LAT/MONTREAL_LON (YUL) to two
  // decimal places, longitude with its sign dropped per the "W" convention.
  it("renders the topbar coordinates derived from globe.ts's MONTREAL_LAT/MONTREAL_LON (YUL)", () => {
    const html = html_for();
    expect(html).toContain("45.47°N 73.75°W");
  });

  // #196's marker second line reuses montreal_coords (the same value the
  // topbar test above pins) rather than re-deriving it - if that reuse ever
  // regressed into a fresh, drifted computation, this would catch it too.
  it("renders the marker's second line with the YUL code and the shared montreal_coords", () => {
    const html = html_for();
    expect(html).toMatch(/class="hero-globe-marker-coords[^"]*">YUL · 45\.47°N 73\.75°W</);
  });

  // #196: the staged-arrival word split only ever happens client-side (see
  // Hero.dom.test.ts) - SSR keeps the name as one plain, contiguous text
  // node. This is load-bearing for LandingSections.test.ts, which asserts
  // the rendered page contains the literal name string as a substring; a
  // per-word split would break that string up with markup and fail it
  // silently in a file this lane doesn't own.
  it("renders the hero name as plain contiguous text, not pre-split into staged-reveal spans", () => {
    const html = html_for();
    // Svelte's SSR output wraps {#if} branches in HTML comment markers
    // (`<!--[!-->...<!--]-->`), so the match tolerates those rather than
    // requiring the name immediately after the opening tag.
    expect(html).toMatch(/<h1 class="hero-name[^"]*">(?:<!--.*?-->)?Test Person(?:<!--.*?-->)?<\/h1>/);
    expect(html).not.toContain("hero-name-line");
  });

  // #196: decorative additions that should render regardless of JS/motion -
  // exactly one of each, and aria-hidden since neither carries information
  // a reader depends on.
  it("renders exactly one hero-glow layer, aria-hidden", () => {
    const html = html_for();
    const matches = html.match(/<div class="hero-glow\b[^"]*" aria-hidden="true">/g);
    expect(matches?.length).toBe(1);
  });
});
