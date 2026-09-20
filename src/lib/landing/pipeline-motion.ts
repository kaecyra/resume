import type { PipelineTerminalTurn } from "$lib/types.js";

// The scroll-driven motion for the pipeline section (#209), step (f). The
// approved mockup contains no JavaScript at all - only the LED keyframes
// and the cursor blink - so the values below are the ones resolution 4 of
// the plan set rather than anything measured off a drawing.
//
// What lives here is what a delay has to be *computed* for: the node
// stagger and the terminal replay both need a number per element, and a
// number per element is arithmetic worth testing. Durations and easings
// that only ever appear in a `@keyframes` stay in the component's own
// stylesheet, where they are read next to the thing they move.

export const REVEAL_TIMING = {
  // Each node in a graph lights one step after the one before it.
  node_stagger_ms: 120,
  // Each bar in the terminal wipes in one step after the one before it.
  bar_step_ms: 60,
  // The beat between two speakers' turns, on top of the last bar's step.
  turn_pause_ms: 400,
} as const;

// Resolution 4: a quarter of the band in view, with the bottom tenth of
// the viewport discounted so a band does not arrive the instant its top
// edge appears.
export const REVEAL_OBSERVER = {
  threshold: 0.25,
  rootMargin: "0px 0px -10% 0px",
} as const satisfies IntersectionObserverInit;

// `static` is the finished state and the only one the server renders: with
// no JavaScript, or with motion turned down, the section is simply there.
// `armed` is the empty state the action puts an element into once it knows
// motion is welcome, and `revealed` is what plays it. Nothing goes back.
export type RevealPhase = "static" | "armed" | "revealed";

export interface TerminalTurnDelays {
  bars: number[];
  // Null on every turn that does not end in one.
  cursor: number | null;
}

export function node_delays(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index * REVEAL_TIMING.node_stagger_ms);
}

// One running clock walked across the whole transcript, rather than a
// per-turn offset summed afterwards: the cursor has to sit on the same
// clock as the bars, and a bare cursor turn has no bars to sum.
export function terminal_replay_delays(turns: PipelineTerminalTurn[]): TerminalTurnDelays[] {
  let clock = 0;

  return turns.map((turn, index) => {
    if (index > 0) {
      clock += REVEAL_TIMING.turn_pause_ms;
    }

    const bars = (turn.bars ?? []).map((_, bar) => clock + bar * REVEAL_TIMING.bar_step_ms);
    clock += bars.length * REVEAL_TIMING.bar_step_ms;

    if (!turn.cursor) {
      return { bars, cursor: null };
    }

    const cursor = clock;
    clock += REVEAL_TIMING.bar_step_ms;
    return { bars, cursor };
  });
}

// A Svelte action. `on_phase` is never called at all where motion is not
// welcome, which leaves the element in `static` - the finished state - and
// is the whole of resolution 4's reduced-motion branch: no observer is
// constructed, so nothing waits on a scroll position that may never come.
//
// Nothing is armed at mount, either. Arming there would blank an element
// that is already on screen when hydration runs: the server's finished
// markup paints, the action empties it, and only then does the observer's
// first notification arrive to play it back - the initial observation is
// delivered on its own queued task, after the rendering update that
// `observe()` was called in, so that blank frame is real. The first
// observation decides instead. Already on screen means the element did not
// arrive, so it is left finished and never animates; below the fold, it
// arms before any reader could see it do so.
export function reveal(
  node: Element,
  on_phase: (phase: RevealPhase) => void,
): { destroy(): void } {
  const motion_query = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion_query.matches || typeof IntersectionObserver === "undefined") {
    return { destroy() {} };
  }

  // `fired` is guarded by its own flag rather than by `observer` being
  // null: an observer that has been disconnected can still deliver entries
  // already queued against it, and a second delivery would replay the band.
  let fired = false;
  let armed = false;

  let observer: IntersectionObserver | null = new IntersectionObserver((entries) => {
    if (fired) {
      return;
    }

    if (!entries.some((entry) => entry.isIntersecting)) {
      if (!armed) {
        armed = true;
        on_phase("armed");
      }
      return;
    }

    // Fires once and never rewinds: the element has arrived, and a reader
    // scrolling back past it is not watching it arrive again.
    fired = true;
    observer?.disconnect();
    observer = null;
    if (armed) {
      on_phase("revealed");
    }
  }, REVEAL_OBSERVER);

  observer.observe(node);

  return {
    destroy() {
      observer?.disconnect();
      observer = null;
    },
  };
}
