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
import { fireEvent, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LandingGithub, LandingHero } from "$lib/types.js";

const { start_globe, load_globe_lines, load_satellite_payload } = vi.hoisted(() => ({
  start_globe: vi.fn(),
  load_globe_lines: vi.fn(),
  load_satellite_payload: vi.fn(),
}));

vi.mock("./globe.js", async (import_original) => {
  const actual = await import_original<typeof import("./globe.js")>();
  return {
    ...actual,
    load_globe_lines,
    start_globe,
  };
});

// Same reasoning as the globe.js mock above: the satellite payload is a
// runtime fetch of a generated file that doesn't exist under test, and what
// is under test is how Hero reacts to it being there or not.
vi.mock("./orbits.js", async (import_original) => {
  const actual = await import_original<typeof import("./orbits.js")>();
  return {
    ...actual,
    load_satellite_payload,
  };
});

import Hero from "./Hero.svelte";
import type { GpElements, SatellitePayload } from "./satellite-catalog.js";

const HERO: LandingHero = {
  name: "Test Person",
  role: "Engineer, Acme",
  location: "Somewhere, QC",
  tagline: "I build things.",
};

const GITHUB: LandingGithub = { user: "testuser" };

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
      github: GITHUB,
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
    load_satellite_payload.mockReset();
    load_satellite_payload.mockResolvedValue(null);
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

  // #196's staged name arrival: Hero.test.ts (SSR) pins the no-JS/reduced
  // motion case (plain contiguous text, no spans). This file is what
  // actually runs onMount, so it's the only place the opposite case -
  // motion welcome, JS active - can be proven: the name splits into one
  // span per word, in order, and nothing is dropped or reordered.
  it("splits the hero name into one staged-reveal span per word once motion is confirmed welcome", async () => {
    stub_matchmedia(false);
    start_globe.mockReturnValue({ stop: vi.fn() });
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(container.querySelectorAll(".hero-name-line-text").length).toBe(2);
    });

    const words = Array.from(container.querySelectorAll(".hero-name-line-text")).map((el) => el.textContent);
    expect(words).toEqual(["Test", "Person"]);

    // Each word's mask carries its own index as a CSS custom property, so
    // the CSS stagger delay (calc(140ms + var(--hero-line-index) * 95ms))
    // keys off the word's actual position rather than every word firing at
    // once.
    const indices = Array.from(container.querySelectorAll(".hero-name-line")).map((el) =>
      (el as HTMLElement).style.getPropertyValue("--hero-line-index").trim(),
    );
    expect(indices).toEqual(["0", "1"]);
  });

  // The mirror case: reduced motion means `staged_words` never populates
  // (see the script block), so the name must stay exactly as SSR rendered
  // it - one plain text node, not split - even after mount has had a
  // chance to run.
  it("keeps the hero name as plain text when prefers-reduced-motion matches, even after mount", async () => {
    stub_matchmedia(true);
    const { container } = render_hero();

    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelectorAll(".hero-name-line").length).toBe(0);
    expect(container.querySelector(".hero-name")?.textContent?.trim()).toBe("Test Person");
  });
});

const RCM_ELEMENTS: GpElements = {
  OBJECT_NAME: "RCM-1",
  OBJECT_ID: "2019-033A",
  EPOCH: "2026-09-18T12:00:00.000000",
  MEAN_MOTION: 15,
  ECCENTRICITY: 0.0001,
  INCLINATION: 97.7,
  RA_OF_ASC_NODE: 10,
  ARG_OF_PERICENTER: 90,
  MEAN_ANOMALY: 0,
  NORAD_CAT_ID: 44322,
  ELEMENT_SET_NO: 999,
  BSTAR: 0,
  MEAN_MOTION_DOT: 0,
  MEAN_MOTION_DDOT: 0,
};

const PAYLOAD: SatellitePayload = {
  generated_at: "2026-09-19T06:00:00Z",
  satellites: [
    { norad_id: 44322, name: "RCM-1", canadian: true, flagship: "rcm", elements: RCM_ELEMENTS },
    { norad_id: 25544, name: "ISS (ZARYA)", canadian: false, flagship: "iss", elements: { ...RCM_ELEMENTS, NORAD_CAT_ID: 25544 } },
    { norad_id: 39089, name: "NEOSSAT", canadian: true, flagship: null, elements: { ...RCM_ELEMENTS, NORAD_CAT_ID: 39089 } },
  ],
};

describe("Hero satellites (client)", () => {
  beforeEach(() => {
    start_globe.mockReset();
    start_globe.mockReturnValue({ stop: vi.fn() });
    load_globe_lines.mockReset();
    load_globe_lines.mockResolvedValue({ world: [], canada: [] });
    load_satellite_payload.mockReset();
    stub_matchmedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("still starts the globe, without satellites, when the satellite payload is absent", async () => {
    load_satellite_payload.mockResolvedValue(null);
    render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });
    expect(start_globe.mock.calls[0][0].satellites).toBeNull();
  });

  it("still starts the globe when the satellite fetch itself throws", async () => {
    load_satellite_payload.mockRejectedValue(new Error("offline"));
    render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });
    expect(start_globe.mock.calls[0][0].satellites).toBeNull();
  });

  it("renders one icon per flagship, none for plain dots, and hands each to start_globe", async () => {
    load_satellite_payload.mockResolvedValue(PAYLOAD);
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });

    expect(container.querySelectorAll(".hero-satellite")).toHaveLength(2);
    const icon_els = start_globe.mock.calls[0][0].satellite_icon_els as Map<number, HTMLElement>;
    expect([...icon_els.keys()].sort((a, b) => a - b)).toEqual([25544, 44322]);
    expect(icon_els.get(44322)?.isConnected).toBe(true);
  });

  it("labels nothing until hovered, not even the ISS", async () => {
    load_satellite_payload.mockResolvedValue(PAYLOAD);
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });

    expect(container.querySelectorAll(".hero-satellite-vitals")).toHaveLength(0);
    const icons = Array.from(container.querySelectorAll(".hero-satellite"));
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.map((el) => el.textContent?.trim()).join("")).toBe("");
  });

  it("colours Canadian flagships apart from the rest", async () => {
    load_satellite_payload.mockResolvedValue(PAYLOAD);
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });

    const canadian = Array.from(container.querySelectorAll(".hero-satellite-canadian"));
    expect(canadian).toHaveLength(1);
  });

  it("shows a flagship's vitals while hovered, and hides them on leave", async () => {
    load_satellite_payload.mockResolvedValue(PAYLOAD);
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });
    const rcm = container.querySelector(".hero-satellite-canadian") as HTMLElement;
    expect(container.querySelector(".hero-satellite-vitals")).toBeNull();

    await fireEvent.pointerEnter(rcm);
    const vitals = container.querySelector(".hero-satellite-vitals");
    expect(vitals?.textContent).toContain("RCM-1");
    expect(vitals?.textContent).toContain("km");

    await fireEvent.pointerLeave(rcm);
    expect(container.querySelector(".hero-satellite-vitals")).toBeNull();
  });

  // A still cursor gets no pointerleave when the icon under it turns
  // behind the globe, so the readout has to notice for itself.
  it("drops the readout once the hovered icon turns hidden, even with no pointerleave", async () => {
    load_satellite_payload.mockResolvedValue(PAYLOAD);
    const { container } = render_hero();

    await vi.waitFor(() => {
      expect(start_globe).toHaveBeenCalledTimes(1);
    });
    vi.useFakeTimers();
    try {
      const rcm = container.querySelector(".hero-satellite-canadian") as HTMLElement;
      await fireEvent.pointerEnter(rcm);
      expect(container.querySelector(".hero-satellite-vitals")).not.toBeNull();

      // What start_globe does to an icon faded out behind the globe.
      rcm.style.pointerEvents = "none";
      await vi.advanceTimersByTimeAsync(1000);

      expect(container.querySelector(".hero-satellite-vitals")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
