// A `*.dom.test.ts` file (see vite.config.ts): covers the reduced-motion
// branch in Hero.svelte's onMount (see SHOULD 2 in the round-2 review).
// Hero.test.ts renders through svelte/server, so it never runs onMount -
// three of the four fallback cases (reduced motion, no WebGL context,
// geometry fetch failure) are decided there and stayed completely
// untested. This file mounts the real component into happy-dom so onMount
// actually runs, and proves the branch is taken correctly in both
// directions.
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

  it("attempts to start the globe when reduced motion is not requested", async () => {
    stub_matchmedia(false);
    start_globe.mockReturnValue({ stop: vi.fn() });
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });

    expect(load_globe_lines).toHaveBeenCalledTimes(1);
    expect(marker_hidden(container)).toBe(false);
  });
});
