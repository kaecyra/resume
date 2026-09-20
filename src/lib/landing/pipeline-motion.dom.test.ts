// A `*.dom.test.ts` file (see vite.config.ts): the reveal action needs a
// real element, a `matchMedia` to ask about motion, and an
// `IntersectionObserver` to construct. happy-dom supplies the first two and
// an observer that never computes intersection - it performs no layout - so
// the observer here is a stub this file fires by hand, the same way
// globe.dom.test.ts drives the globe's.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REVEAL_OBSERVER, reveal, type RevealPhase } from "./pipeline-motion.js";

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

  fire(is_intersecting: boolean) {
    this.callback(
      [{ isIntersecting: is_intersecting } as IntersectionObserverEntry],
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

function armed_element(): {
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
  it("arms the element and observes it with the agreed options", () => {
    const { node, phases } = armed_element();

    expect(phases).toEqual(["armed"]);
    const observer = FakeIntersectionObserver.instances[0];
    expect(observer.observed).toEqual([node]);
    expect(observer.options).toEqual(REVEAL_OBSERVER);
  });

  it("reveals on the first intersecting entry", () => {
    const { phases } = armed_element();

    FakeIntersectionObserver.instances[0].fire(true);

    expect(phases).toEqual(["armed", "revealed"]);
  });

  it("stays armed while the element has not crossed the threshold", () => {
    const { phases } = armed_element();

    FakeIntersectionObserver.instances[0].fire(false);

    expect(phases).toEqual(["armed"]);
  });

  it("never rewinds, and stops watching once it has fired", () => {
    const { phases } = armed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(true);
    observer.fire(false);
    observer.fire(true);

    expect(phases).toEqual(["armed", "revealed"]);
    expect(observer.disconnect_calls).toBe(1);
  });

  it("leaves the element static and builds no observer under reduced motion", () => {
    stub_motion(true);

    const { phases } = armed_element();

    expect(phases).toEqual([]);
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it("leaves the element static where the browser has no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { phases } = armed_element();

    expect(phases).toEqual([]);
  });

  it("disconnects when the element goes away before it ever fired", () => {
    const { handle } = armed_element();

    handle.destroy();

    expect(FakeIntersectionObserver.instances[0].disconnect_calls).toBe(1);
  });

  it("does not disconnect twice when destroyed after revealing", () => {
    const { handle } = armed_element();
    const observer = FakeIntersectionObserver.instances[0];

    observer.fire(true);
    handle.destroy();

    expect(observer.disconnect_calls).toBe(1);
  });
});
