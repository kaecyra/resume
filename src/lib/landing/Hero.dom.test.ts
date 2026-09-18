// A `*.dom.test.ts` file (see vite.config.ts): covers the reduced-motion
// and no-WebGL branches in Hero.svelte's onMount (see SHOULD 2 in the
// round-2 review and SHOULD 1 in the round-3 review). Hero.test.ts renders
// through svelte/server, so it never runs onMount - three of the four
// fallback cases (reduced motion, no WebGL context, geometry fetch
// failure) are decided there and stayed completely untested. This file
// mounts the real component into happy-dom so onMount actually runs, and
// proves both branches are taken correctly: `canvas_animating` only ever
// flips to true when `start_globe` hands back a real controller (never
// unconditionally), and the still/marker visibility follows it exactly -
// so exactly one of the still and the canvas is ever the visible backdrop,
// never both and never neither.
//
// `globe.js`'s `start_globe` and `load_globe_lines` are mocked rather than
// exercised for real: happy-dom has no WebGL context (see #175), so a real
// `start_globe` call would always return null regardless of which branch
// ran, making the two cases indistinguishable. Mocking them means the
// assertion is purely about whether Hero *attempts* to start the globe -
// the decision under test - not about the drawing itself.
import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LandingHero } from "$lib/types.js";

const { start_globe, load_globe_lines } = vi.hoisted(() => ({
  start_globe: vi.fn(),
  load_globe_lines: vi.fn(),
}));

vi.mock("./globe.js", async (import_original) => {
  const actual = await import_original<typeof import("./globe.js")>();
  return {
    ...actual,
    load_globe_lines,
    start_globe,
  };
});

import Hero from "./Hero.svelte";

const HERO: LandingHero = {
  name: "Test Person",
  role: "Engineer, Acme",
  location: "Somewhere, QC",
  tagline: "I build things.",
  status: "Somewhere, doing stuff.",
};

function stub_matchmedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

function render_hero() {
  return render(Hero, {
    props: {
      hero: HERO,
      resume_link: "default",
      profile_name: "Resolved Profile",
      resume_title: "Resolved Variant Title",
    },
  });
}

function marker_hidden(container: HTMLElement): boolean {
  const marker = container.querySelector(".hero-globe-marker");
  return marker?.className.includes("hero-globe-marker-hidden") ?? true;
}

function still_hidden(container: HTMLElement): boolean {
  const still = container.querySelector(".hero-globe-still");
  return still?.className.includes("hero-globe-still-hidden") ?? false;
}

describe("Hero reduced-motion fallback (client)", () => {
  beforeEach(() => {
    start_globe.mockReset();
    load_globe_lines.mockReset();
    load_globe_lines.mockResolvedValue({ world: [], canada: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never attempts to start the globe when prefers-reduced-motion matches", async () => {
    stub_matchmedia(true);
    const { container } = render_hero();

    // Flush the microtask queue so any (wrongly) in-flight fetch/start
    // would have had a chance to run before we assert nothing happened.
    await Promise.resolve();
    await Promise.resolve();

    expect(load_globe_lines).not.toHaveBeenCalled();
    expect(start_globe).not.toHaveBeenCalled();
    expect(marker_hidden(container)).toBe(true);
  });

  it("attempts to start the globe when reduced motion is not requested, and hides the still once it does", async () => {
    stub_matchmedia(false);
    start_globe.mockReturnValue({ stop: vi.fn() });
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });

    expect(load_globe_lines).toHaveBeenCalledTimes(1);
    expect(marker_hidden(container)).toBe(false);
    // canvas_animating only flips because start_globe returned a real
    // controller (see the null case below) - once it does, the still is
    // the one thing that goes away, not the other way around.
    expect(still_hidden(container)).toBe(true);
  });

  // SHOULD 1 in the round-3 review: round 2 only pinned the reduced-motion
  // half of "reduced-motion and no-WebGL"; start_globe returning null (no
  // WebGL context, or WebGL setup failing) is the other half, and nothing
  // stopped `canvas_animating` from being set unconditionally instead of
  // from the controller's return value. If that regressed, this is what
  // would ship: an empty canvas with no still behind it - exactly what
  // #178 forbids.
  it("keeps the still visible and never flips canvas_animating when start_globe returns null (no WebGL context)", async () => {
    stub_matchmedia(false);
    start_globe.mockReturnValue(null);
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });

    // Flush the microtask queue so a wrongly-unconditional
    // `canvas_animating = true` assignment has had a chance to run and be
    // observed before we assert it never did.
    await Promise.resolve();
    await Promise.resolve();

    expect(still_hidden(container)).toBe(false);
    expect(marker_hidden(container)).toBe(true);
  });
});
