// Pure maths for the lower-page ambient flyby effect: picking which craft
// crosses next, how fast, and along what path. Split from
// SatelliteFlybys.svelte (the timer loop, the DOM/matchMedia wiring, the
// active-instance list) the same way pipeline-motion.ts's timing helpers
// are split from its `reveal` action - a spawn decision is arithmetic worth
// testing directly, not something to only exercise indirectly through a
// mounted component.
//
// Every function here takes its randomness as a parameter (defaulting to
// `Math.random`), so tests can hand in a fixed sequence instead of mocking
// a global.

import { FLYBY_KINDS, FLYBY_TUMBLES, type FlybyKind } from "./flyby-shapes.js";

// Sparse and ambient (locked in the design conversation): long enough that
// two flybys are essentially never on screen together, short enough that a
// reader who lingers on the lower page will see one within a normal read.
export const SPAWN_GAP_MS = { min: 20_000, max: 60_000 } as const;

// How long one crossing takes, left edge to right edge (or the reverse).
export const FLIGHT_DURATION_MS = { min: 7_000, max: 14_000 } as const;

// Flight paths stay within this many degrees of horizontal. Every craft is
// drawn once, nose-right (flyby-shapes.ts), and only ever translated or
// mirrored - never rotated to face its own direction of travel - so a
// steep flight angle would read as the craft sliding sideways rather than
// flying that way. Staying close to horizontal keeps "translate, don't
// rotate" looking like a distant flyby instead of a slide.
export const FLIGHT_ANGLE_DEG_MAX = 25;

// Keeps the flight's vertical start clear of the very top/bottom of the
// viewport, so a steep-angle flight still has room to drift before
// clipping.
const START_Y_VH_MIN = 10;
const START_Y_VH_MAX = 80;

// Converts the flight angle into a vertical drift over the full crossing,
// in vh. Deliberately not real trigonometry - the crossing runs edge to
// edge in `vw` (viewport-relative) units regardless of the viewport's
// actual pixel width, which this module never has, so there is no
// consistent physical "run" to take a tangent of. This constant is tuned so
// the extreme +-FLIGHT_ANGLE_DEG_MAX band produces a visible but modest
// rise or fall (+-18vh) over one crossing, not a steep diagonal.
const DRIFT_VH_PER_DEGREE = 18 / FLIGHT_ANGLE_DEG_MAX;

// Clamps the drifted endpoint back onto screen - a shallow-start, steep-
// angle flight (e.g. start_y_vh near START_Y_VH_MIN with a strongly
// negative angle) would otherwise drift above 0vh or below 100vh.
const END_Y_VH_MIN = 5;
const END_Y_VH_MAX = 95;

export interface FlybyPlan {
  kind: FlybyKind;
  // True for a right-to-left crossing (SatelliteFlybys.svelte plays the
  // crossing animation in reverse for these, and mirrors the art
  // horizontally so the craft's nose still leads).
  mirrored: boolean;
  // Signed, within +-FLIGHT_ANGLE_DEG_MAX.
  angle_deg: number;
  // Vertical start position, as a percentage of the 100vh flight layer.
  start_y_vh: number;
  duration_ms: number;
  tumbles: boolean;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function range(min: number, max: number, random: () => number): number {
  return min + random() * (max - min);
}

export function next_spawn_delay_ms(random: () => number = Math.random): number {
  return Math.round(range(SPAWN_GAP_MS.min, SPAWN_GAP_MS.max, random));
}

// Draws one full flight plan. Consumes `random()` exactly five times, in a
// fixed order (kind, direction, angle, start height, duration) - callers
// that need a reproducible plan for a test can hand in a queue of five
// values and know exactly which is which.
export function random_flyby_plan(random: () => number = Math.random): FlybyPlan {
  const kind = pick(FLYBY_KINDS, random);
  const mirrored = random() < 0.5;
  const angle_deg = range(-FLIGHT_ANGLE_DEG_MAX, FLIGHT_ANGLE_DEG_MAX, random);
  const start_y_vh = range(START_Y_VH_MIN, START_Y_VH_MAX, random);
  const duration_ms = Math.round(range(FLIGHT_DURATION_MS.min, FLIGHT_DURATION_MS.max, random));

  return {
    kind,
    mirrored,
    angle_deg,
    start_y_vh,
    duration_ms,
    tumbles: FLYBY_TUMBLES[kind],
  };
}

// The vertical position a flight ends at, derived from its own start height
// and angle rather than drawn separately - a plan's drift is a function of
// the angle already chosen for it, not an independent random choice.
export function flight_end_y_vh(plan: Pick<FlybyPlan, "start_y_vh" | "angle_deg">): number {
  const raw = plan.start_y_vh + plan.angle_deg * DRIFT_VH_PER_DEGREE;
  return Math.min(END_Y_VH_MAX, Math.max(END_Y_VH_MIN, raw));
}
