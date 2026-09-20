// A `*.dom.test.ts` file (see vite.config.ts): the reveal action needs a
// real element, a `matchMedia` to ask about motion, and an
// `IntersectionObserver` to construct. happy-dom supplies the first two and
// an observer that never computes intersection - it performs no layout - so
// the observer here is a stub this file fires by hand, the same way
// globe.dom.test.ts drives the globe's.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  REVEAL_OBSERVER,
  REVEAL_THRESHOLD,
  reveal,
  type RevealPhase,
} from "./pipeline-motion.js";

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnect_calls = 0;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  disconnect() {
    this.disconnect_calls++;
  }

  // Both fields, because the two disagree in exactly the case that
  // matters: the observer reports `isIntersecting: true` from the first
  // pixel of contact, long before the ratio reaches any threshold.
  fire(is_intersecting: boolean, ratio = is_intersecting ? 1 : 0) {
    this.callback(
      [{ isIntersecting: is_intersecting, intersectionRatio: ratio } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function stub_motion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
    })),
  );
}

function observed_element(): {
  node: HTMLElement;
  phases: RevealPhase[];
  handle: { destroy(): void };
} {
  const node = document.createElement("div");
  const phases: RevealPhase[] = [];
  const handle = reveal(node, (phase) => phases.push(phase));
  return { node, phases, handle };
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  stub_motion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reveal", () => {
  it("observes the element with the agreed options, and arms nothing yet", () => {
    const { node, phases } = observed_element();

    // Nothing at mount: arming here would blank an element that is already
    // on screen, between the server's paint and the observer's first
    // notification.
    expect(phases).toEqual([]);
    const observer = FakeIntersectionObserver.instances[0];
    expect(observer.observed).toEqual([node]);
    // The literal values, not `REVEAL_OBSERVER` - comparing the constant to
    // itself passes for anything the constant is ever changed to.
    expect(observer.options).toEqual({ threshold: 0.25, rootMargin: "0px 0px -10% 0px" });
    expect(REVEAL_OBSERVER.threshold).toBe(REVEAL_THRESHOLD);
  });

  it("arms an element that is below the fold on its first observation", () => {
    const { phases } = observed_element();

    FakeIntersectionObserver.instances[0].fire(false);

    expect(phases).toEqual(["armed"]);
  });

  it("reveals once an armed element crosses the threshold", () => {
    const { phases } = observed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(false);
    observer.fire(true);

    expect(phases).toEqual(["armed", "revealed"]);
  });

  // The element did not arrive - it was already there. Animating it would
  // mean blanking finished markup first, which is the one thing the phases
  // exist to avoid.
  it("leaves an element already on screen finished, and never animates it", () => {
    const { phases } = observed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(true);

    expect(phases).toEqual([]);
    expect(observer.disconnect_calls).toBe(1);
  });

  // The bug this guards: the observer reports `isIntersecting: true` from
  // the first pixel of contact, and queues that entry whether or not any
  // threshold was crossed. A callback that asks only `isIntersecting`
  // reveals there, and the threshold does nothing at all.
  it("does not reveal on contact alone, below the threshold", () => {
    const { phases } = observed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(false);
    observer.fire(true, REVEAL_THRESHOLD - 0.01);

    expect(phases).toEqual(["armed"]);
    expect(observer.disconnect_calls).toBe(0);
  });

  it("reveals exactly at the threshold", () => {
    const { phases } = observed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(false);
    observer.fire(true, REVEAL_THRESHOLD);

    expect(phases).toEqual(["armed", "revealed"]);
  });

  // An element in contact but under the threshold is not "already on
  // screen" either: it still has an arrival to play.
  it("arms an element touching the root but not yet a quarter in view", () => {
    const { phases } = observed_element();

    FakeIntersectionObserver.instances[0].fire(true, 0.05);

    expect(phases).toEqual(["armed"]);
  });

  it("arms only once, however many times it is told the element is out of view", () => {
    const { phases } = observed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(false);
    observer.fire(false);
    observer.fire(false);

    expect(phases).toEqual(["armed"]);
  });

  it("never rewinds, and stops watching once it has fired", () => {
    const { phases } = observed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(false);
    observer.fire(true);
    observer.fire(false);
    observer.fire(true);

    expect(phases).toEqual(["armed", "revealed"]);
    expect(observer.disconnect_calls).toBe(1);
  });

  it("leaves the element static and builds no observer under reduced motion", () => {
    stub_motion(true);

    const { phases } = observed_element();

    expect(phases).toEqual([]);
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it("leaves the element static where the browser has no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { phases } = observed_element();

    expect(phases).toEqual([]);
  });

  it("disconnects when the element goes away before it ever fired", () => {
    const { handle } = observed_element();

    handle.destroy();

    expect(FakeIntersectionObserver.instances[0].disconnect_calls).toBe(1);
  });

  it("does not disconnect twice when destroyed after revealing", () => {
    const { handle } = observed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(true);
    handle.destroy();

    expect(observer.disconnect_calls).toBe(1);
  });
});
