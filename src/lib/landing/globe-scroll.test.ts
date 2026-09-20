import {
  compute_globe_scroll_progress,
  compute_globe_spin_boost,
  GLOBE_SCROLL_END_BUFFER_PX,
  GLOBE_SCROLL_START_FRACTION,
  GLOBE_SPIN_BOOST_MAX,
} from "./globe-scroll.js";

const HERO_HEIGHT = 800;
const DIVIDER_HEIGHT = 200;

describe("compute_globe_scroll_progress", () => {
  it("is 0 before the hero has scrolled at all", () => {
    expect(
      compute_globe_scroll_progress({ hero_top: 0, hero_height: HERO_HEIGHT, divider_height: DIVIDER_HEIGHT }),
    ).toBe(0);
  });

  it("is 0 right at the start threshold - no scroll at all", () => {
    const start_hero_top = -GLOBE_SCROLL_START_FRACTION * HERO_HEIGHT;
    expect(
      compute_globe_scroll_progress({
        hero_top: start_hero_top,
        hero_height: HERO_HEIGHT,
        divider_height: DIVIDER_HEIGHT,
      }),
    ).toBe(0);
  });

  it("rises above 0 the instant the hero has scrolled at all", () => {
    expect(
      compute_globe_scroll_progress({ hero_top: -1, hero_height: HERO_HEIGHT, divider_height: DIVIDER_HEIGHT }),
    ).toBeGreaterThan(0);
  });

  it("is 0.5 halfway between the start and end thresholds", () => {
    const start_hero_top = -GLOBE_SCROLL_START_FRACTION * HERO_HEIGHT;
    const end_hero_top = -(HERO_HEIGHT + DIVIDER_HEIGHT) + GLOBE_SCROLL_END_BUFFER_PX;
    const midpoint = (start_hero_top + end_hero_top) / 2;
    expect(
      compute_globe_scroll_progress({ hero_top: midpoint, hero_height: HERO_HEIGHT, divider_height: DIVIDER_HEIGHT }),
    ).toBeCloseTo(0.5);
  });

  it("is 1 once the divider is within the vanish buffer of clearing the viewport top", () => {
    const end_hero_top = -(HERO_HEIGHT + DIVIDER_HEIGHT) + GLOBE_SCROLL_END_BUFFER_PX;
    expect(
      compute_globe_scroll_progress({
        hero_top: end_hero_top,
        hero_height: HERO_HEIGHT,
        divider_height: DIVIDER_HEIGHT,
      }),
    ).toBe(1);
  });

  it("clamps to 1 rather than overshooting past the end threshold", () => {
    expect(
      compute_globe_scroll_progress({ hero_top: -5000, hero_height: HERO_HEIGHT, divider_height: DIVIDER_HEIGHT }),
    ).toBe(1);
  });

  it("clamps to 0 rather than going negative before any scroll", () => {
    expect(
      compute_globe_scroll_progress({ hero_top: 400, hero_height: HERO_HEIGHT, divider_height: DIVIDER_HEIGHT }),
    ).toBe(0);
  });

  it("is 0 when the hero has no height to measure a fraction of", () => {
    expect(compute_globe_scroll_progress({ hero_top: -100, hero_height: 0, divider_height: DIVIDER_HEIGHT })).toBe(
      0,
    );
  });
});

describe("compute_globe_spin_boost", () => {
  it("is 1 (normal rate) at progress 0", () => {
    expect(compute_globe_spin_boost(0)).toBe(1);
  });

  it("is GLOBE_SPIN_BOOST_MAX at progress 1", () => {
    expect(compute_globe_spin_boost(1)).toBe(GLOBE_SPIN_BOOST_MAX);
  });

  it("is halfway between 1 and GLOBE_SPIN_BOOST_MAX at progress 0.5", () => {
    expect(compute_globe_spin_boost(0.5)).toBeCloseTo((1 + GLOBE_SPIN_BOOST_MAX) / 2);
  });
});
