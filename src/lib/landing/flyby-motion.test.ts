import { describe, expect, it } from "vitest";

import { FLYBY_KINDS, FLYBY_TUMBLES } from "./flyby-shapes.js";
import {
  FLIGHT_ANGLE_DEG_MAX,
  FLIGHT_DURATION_MS,
  SPAWN_GAP_MS,
  flight_end_y_vh,
  next_spawn_delay_ms,
  random_flyby_plan,
} from "./flyby-motion.js";

// A fixed queue of "random" values, consumed in order - lets a test pin
// exactly which pick/range call gets which value instead of only being able
// to assert on the overall shape of the result.
function queue(values: number[]): () => number {
  let i = 0;
  return () => {
    const value = values[i];
    i += 1;
    return value ?? 0;
  };
}

describe("next_spawn_delay_ms", () => {
  it("returns the minimum gap when the random source returns 0", () => {
    expect(next_spawn_delay_ms(() => 0)).toBe(SPAWN_GAP_MS.min);
  });

  it("returns (just under) the maximum gap when the random source returns just under 1", () => {
    // 0.999999 rather than 1: Math.random() never actually returns 1, and
    // a caller that swapped SPAWN_GAP_MS.max for SPAWN_GAP_MS.min here
    // would still fail this the same way exceeding it would.
    const delay = next_spawn_delay_ms(() => 0.999999);
    expect(delay).toBeGreaterThan(SPAWN_GAP_MS.min);
    expect(delay).toBeLessThanOrEqual(SPAWN_GAP_MS.max);
  });

  it("derives the gap from SPAWN_GAP_MS rather than a hardcoded range", () => {
    const midpoint = SPAWN_GAP_MS.min + (SPAWN_GAP_MS.max - SPAWN_GAP_MS.min) / 2;
    expect(next_spawn_delay_ms(() => 0.5)).toBe(Math.round(midpoint));
  });
});

describe("random_flyby_plan", () => {
  it("consumes the random source exactly five times, in a fixed order", () => {
    let calls = 0;
    random_flyby_plan(() => {
      calls += 1;
      return 0;
    });
    expect(calls).toBe(5);
  });

  it("picks the first kind when every draw is 0", () => {
    const plan = random_flyby_plan(() => 0);
    expect(plan.kind).toBe(FLYBY_KINDS[0]);
  });

  it("picks the last kind just under the top of the range", () => {
    const plan = random_flyby_plan(() => 0.999999);
    expect(plan.kind).toBe(FLYBY_KINDS[FLYBY_KINDS.length - 1]);
  });

  it("flags mirrored (right-to-left) exactly at the 0.5 threshold", () => {
    // kind is the first draw, then mirrored is second. mirrored is
    // `random() < 0.5`, so a draw just under the threshold mirrors and one
    // at or above it does not.
    const below = random_flyby_plan(queue([0, 0.49, 0, 0, 0]));
    const at_or_above = random_flyby_plan(queue([0, 0.5, 0, 0, 0]));
    expect(below.mirrored).toBe(true);
    expect(at_or_above.mirrored).toBe(false);
  });

  it("keeps angle_deg within +-FLIGHT_ANGLE_DEG_MAX at both extremes", () => {
    const most_negative = random_flyby_plan(queue([0, 0, 0, 0, 0]));
    const most_positive = random_flyby_plan(queue([0, 0, 0.999999, 0, 0]));
    expect(most_negative.angle_deg).toBe(-FLIGHT_ANGLE_DEG_MAX);
    expect(most_positive.angle_deg).toBeGreaterThan(0);
    expect(most_positive.angle_deg).toBeLessThanOrEqual(FLIGHT_ANGLE_DEG_MAX);
  });

  it("derives duration_ms from FLIGHT_DURATION_MS, not a hardcoded range", () => {
    const plan = random_flyby_plan(queue([0, 0, 0, 0, 0]));
    expect(plan.duration_ms).toBe(FLIGHT_DURATION_MS.min);
  });

  it("sets tumbles from FLYBY_TUMBLES for the chosen kind, not a fixed value", () => {
    const rigid = random_flyby_plan(() => 0); // FLYBY_KINDS[0] is "iss", tumbles: false
    const tumbling = random_flyby_plan(() => 0.999999); // last kind is "wrench", tumbles: true
    expect(rigid.tumbles).toBe(FLYBY_TUMBLES[rigid.kind]);
    expect(tumbling.tumbles).toBe(FLYBY_TUMBLES[tumbling.kind]);
    expect(rigid.tumbles).toBe(false);
    expect(tumbling.tumbles).toBe(true);
  });
});

describe("flight_end_y_vh", () => {
  it("returns the start height unchanged when the angle is flat", () => {
    expect(flight_end_y_vh({ start_y_vh: 40, angle_deg: 0 })).toBe(40);
  });

  it("drifts downward for a positive angle and upward for a negative one", () => {
    const down = flight_end_y_vh({ start_y_vh: 40, angle_deg: 10 });
    const up = flight_end_y_vh({ start_y_vh: 40, angle_deg: -10 });
    expect(down).toBeGreaterThan(40);
    expect(up).toBeLessThan(40);
    // The two are symmetric about the start height for equal-magnitude
    // opposite angles - proves the drift is linear in angle_deg, not some
    // asymmetric curve.
    expect(down - 40).toBeCloseTo(40 - up, 10);
  });

  it("clamps a steep upward drift from a low start rather than going negative", () => {
    const end = flight_end_y_vh({ start_y_vh: 10, angle_deg: -FLIGHT_ANGLE_DEG_MAX });
    expect(end).toBeGreaterThanOrEqual(0);
    expect(end).toBeLessThan(10);
  });

  it("clamps a steep downward drift from a high start rather than exceeding 100", () => {
    const end = flight_end_y_vh({ start_y_vh: 90, angle_deg: FLIGHT_ANGLE_DEG_MAX });
    expect(end).toBeLessThanOrEqual(100);
    expect(end).toBeGreaterThan(90);
  });
});
