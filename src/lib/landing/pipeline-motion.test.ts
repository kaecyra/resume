import { describe, expect, it } from "vitest";

import type { PipelineTerminalTurn } from "$lib/types.js";

import { REVEAL_TIMING, node_delays, terminal_replay_delays } from "./pipeline-motion.js";

describe("node_delays", () => {
  it("returns nothing for a band with no nodes", () => {
    expect(node_delays(0)).toEqual([]);
  });

  it("steps one stagger apart, starting at zero", () => {
    expect(node_delays(4)).toEqual([0, 120, 240, 360]);
  });

  it("derives the step from REVEAL_TIMING rather than a literal", () => {
    const [, second] = node_delays(2);
    expect(second).toBe(REVEAL_TIMING.node_stagger_ms);
  });
});

describe("terminal_replay_delays", () => {
  function turn(bars: number[] | undefined, cursor?: true): PipelineTerminalTurn {
    return { speaker: "agent", bars, cursor };
  }

  it("returns nothing for an empty transcript", () => {
    expect(terminal_replay_delays([])).toEqual([]);
  });

  it("steps each bar in a turn one bar step apart", () => {
    expect(terminal_replay_delays([turn([80, 60, 40])])).toEqual([
      { bars: [0, 60, 120], cursor: null },
    ]);
  });

  it("pauses between turns, on top of the last bar's own step", () => {
    // Turn 1's three bars run 0, 60, 120; the clock leaves that turn at 180,
    // one step past the last bar, and the 400ms pause lands turn 2 at 580.
    expect(terminal_replay_delays([turn([80, 60, 40]), turn([50, 30])])).toEqual([
      { bars: [0, 60, 120], cursor: null },
      { bars: [580, 640], cursor: null },
    ]);
  });

  it("puts a turn's cursor one step after its last bar", () => {
    expect(terminal_replay_delays([turn([80, 60], true)])).toEqual([
      { bars: [0, 60], cursor: 120 },
    ]);
  });

  it("gives a bare cursor turn the clock it arrives with", () => {
    expect(terminal_replay_delays([turn([80]), turn(undefined, true)])).toEqual([
      { bars: [0], cursor: null },
      { bars: [], cursor: 460 },
    ]);
  });

  it("holds the clock still across a turn that draws nothing but the pause", () => {
    // A turn with neither bars nor a cursor costs the pause and nothing
    // else, so the turn after it is not pushed twice.
    expect(terminal_replay_delays([turn([80]), turn(undefined), turn([40])])).toEqual([
      { bars: [0], cursor: null },
      { bars: [], cursor: null },
      { bars: [860], cursor: null },
    ]);
  });

  it("never returns a delay that runs backwards", () => {
    const delays = terminal_replay_delays([
      turn([80, 60]),
      turn(undefined, true),
      turn([40, 30, 20], true),
    ]);
    const flat = delays.flatMap((entry) => [
      ...entry.bars,
      ...(entry.cursor === null ? [] : [entry.cursor]),
    ]);
    expect(flat).toEqual([...flat].sort((a, b) => a - b));
  });
});
