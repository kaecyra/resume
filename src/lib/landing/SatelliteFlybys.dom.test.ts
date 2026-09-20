// A `*.dom.test.ts` file (see vite.config.ts): SatelliteFlybys.svelte's
// spawn timer, matchMedia check and visibilitychange pause only run in
// onMount, which svelte/server rendering never executes. What's under test
// here is the component's *wiring* - does it spawn under normal motion,
// does it stay silent under reduced motion, does hiding the tab pause it -
// not the spawn maths itself, which flyby-motion.test.ts already covers
// directly. Fake timers stand in for the real clock; happy-dom never
// actually runs CSS animations, so a flyby's removal (normally driven by
// its own `animationend`) is triggered by hand below, the same way
// pipeline-motion.dom.test.ts's FakeIntersectionObserver fires its
// callback by hand instead of computing real intersection.
import { fireEvent, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FLIGHT_DURATION_MS, SPAWN_GAP_MS } from "./flyby-motion.js";
import SatelliteFlybys from "./SatelliteFlybys.svelte";

function stub_matchmedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

function set_visibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

function flybys(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(".flyby"));
}

beforeEach(() => {
  vi.useFakeTimers();
  set_visibility("visible");
  // Pins every gap SatelliteFlybys.svelte draws (via flyby-motion.ts's
  // next_spawn_delay_ms/random_flyby_plan, both defaulting to Math.random)
  // to the midpoint of their range. Without this, two spawns can land
  // within one SPAWN_GAP_MS.max window - the first draw and the immediately
  // rescheduled second draw can each land low enough in [20000, 60000] that
  // their sum is still <= 60000ms - which made the "spawns exactly one"
  // assertions below flaky (~1/8 of runs). flyby-motion.test.ts already
  // covers the actual random distribution; this file only needs a fixed one.
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SatelliteFlybys under reduced motion", () => {
  it("never spawns a flyby, however long the clock runs", async () => {
    stub_matchmedia(true);
    const { container } = render(SatelliteFlybys);

    // SPAWN_GAP_MS.max is the longest any single gap can be - running the
    // clock well past three of those with nothing appearing is what proves
    // this is a hard "never", not a spawn that merely hasn't landed yet.
    await vi.advanceTimersByTimeAsync(SPAWN_GAP_MS.max * 3);

    expect(flybys(container)).toHaveLength(0);
  });
});

describe("SatelliteFlybys under normal motion", () => {
  beforeEach(() => {
    stub_matchmedia(false);
  });

  it("spawns exactly one flyby within the longest possible gap", async () => {
    const { container } = render(SatelliteFlybys);

    // The gap before the first spawn is random within
    // [SPAWN_GAP_MS.min, SPAWN_GAP_MS.max] - advancing by the max guarantees
    // it has fired, whatever it actually drew.
    await vi.advanceTimersByTimeAsync(SPAWN_GAP_MS.max);

    expect(flybys(container)).toHaveLength(1);
  });

  it("gives the spawned flyby a duration within FLIGHT_DURATION_MS", async () => {
    const { container } = render(SatelliteFlybys);

    await vi.advanceTimersByTimeAsync(SPAWN_GAP_MS.max);

    const [flyby] = flybys(container);
    const duration_ms = Number.parseInt(flyby.style.getPropertyValue("--flyby-duration"), 10);

    expect(duration_ms).toBeGreaterThanOrEqual(FLIGHT_DURATION_MS.min);
    expect(duration_ms).toBeLessThanOrEqual(FLIGHT_DURATION_MS.max);
  });

  it("removes a flyby once its own crossing animation ends, and not before", async () => {
    const { container } = render(SatelliteFlybys);
    await vi.advanceTimersByTimeAsync(SPAWN_GAP_MS.max);
    const [flyby] = flybys(container);
    expect(flyby).toBeDefined();

    await fireEvent(flyby, new Event("animationend", { bubbles: false }));

    expect(flybys(container)).toHaveLength(0);
  });

  it("marks the whole layer decorative and inert", () => {
    const { container } = render(SatelliteFlybys);

    const scope = container.querySelector(".flyby-scope");
    expect(scope?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("SatelliteFlybys and tab visibility", () => {
  it("does not spawn while the tab starts hidden", async () => {
    stub_matchmedia(false);
    set_visibility("hidden");
    const { container } = render(SatelliteFlybys);

    await vi.advanceTimersByTimeAsync(SPAWN_GAP_MS.max * 2);

    expect(flybys(container)).toHaveLength(0);
  });

  it("resumes spawning once the tab becomes visible again", async () => {
    stub_matchmedia(false);
    set_visibility("hidden");
    const { container } = render(SatelliteFlybys);

    await vi.advanceTimersByTimeAsync(SPAWN_GAP_MS.max * 2);
    expect(flybys(container)).toHaveLength(0);

    set_visibility("visible");
    await fireEvent(document, new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(SPAWN_GAP_MS.max);

    expect(flybys(container)).toHaveLength(1);
  });

  it("stops scheduling once the tab goes hidden mid-session", async () => {
    stub_matchmedia(false);
    const { container } = render(SatelliteFlybys);

    // Hide immediately, before the first gap has had any chance to elapse -
    // the pending timeout from mount must be cleared, not just ignored,
    // otherwise it would still fire on its own original schedule.
    set_visibility("hidden");
    await fireEvent(document, new Event("visibilitychange"));

    await vi.advanceTimersByTimeAsync(SPAWN_GAP_MS.max * 2);

    expect(flybys(container)).toHaveLength(0);
  });
});
