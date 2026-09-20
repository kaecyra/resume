// The globe's spin ramps up as the hero scrolls past, reading as it
// building energy before Divider's phase-2 satellite fling (not
// implemented yet). This is pure scroll math, no DOM: Hero.svelte feeds it
// live getBoundingClientRect() numbers on every scroll event and turns the
// 0-1 result into a spin-rate multiplier via start_globe's controller, so
// the whole thing stays trivially unit-testable here instead of only
// provable by scrolling a real page.

// Hero.top (viewport-relative, negative once scrolled past) at which the
// spin-up starts: 0, so the ramp begins the instant the hero has scrolled
// at all, no dead zone before it.
export const GLOBE_SCROLL_START_FRACTION = 0;

// The spin-up reaches its full rate this many px before the divider's
// bottom edge would clear the top of the viewport - full speed a little
// ahead of the divider itself disappearing, not exactly as it does.
export const GLOBE_SCROLL_END_BUFFER_PX = 48;

// Spin rate multiplier at full scroll progress (progress = 1): the globe
// spins this many times its normal rate once the scroll range above is
// exhausted. 1 (normal rate) is always the floor, at progress = 0.
export const GLOBE_SPIN_BOOST_MAX = 20;

// 0 (untouched) to 1 (fully ramped), given the hero's own top/height and
// the divider's own measured top/height, all viewport-relative px from
// getBoundingClientRect(). Takes divider_top rather than assuming Divider
// sits flush under Hero (divider.top === hero.top + hero.height): that
// assumption breaks silently - no crash, just a visually wrong ramp - the
// moment another section lands between them, since `sections` in the
// landing data is a plain, unordered string[] with no adjacency
// constraint. hero_top and divider_top move by the same amount as the
// page scrolls regardless of the gap between them, so subtracting one
// from the other still gives the true, current gap on every call.
export function compute_globe_scroll_progress({
  hero_top,
  hero_height,
  divider_top,
  divider_height,
}: {
  hero_top: number;
  hero_height: number;
  divider_top: number;
  divider_height: number;
}): number {
  if (hero_height <= 0) {
    return 0;
  }

  const start = -GLOBE_SCROLL_START_FRACTION * hero_height;
  const end_divider_top = -divider_height + GLOBE_SCROLL_END_BUFFER_PX;
  const gap = divider_top - hero_top;
  const end = end_divider_top - gap;
  if (start <= end) {
    return hero_top <= start ? 1 : 0;
  }

  const raw = (start - hero_top) / (start - end);
  return Math.max(0, Math.min(1, raw));
}

// Turns scroll progress into the multiplier start_globe's set_spin_boost
// expects: 1x (normal rate) at progress 0, ramping linearly to
// GLOBE_SPIN_BOOST_MAX at progress 1.
export function compute_globe_spin_boost(progress: number): number {
  return 1 + progress * (GLOBE_SPIN_BOOST_MAX - 1);
}
