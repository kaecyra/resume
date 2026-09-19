// A `*.dom.test.ts` file (see vite.config.ts): pins start_globe's
// controller lifecycle - when it schedules a frame, when it cancels one,
// and what it releases on stop() - in the `dom` project, where a real
// <canvas> element exists. See SHOULD 3 in the #178 round-3 review: round
// 2's GPU-teardown fix and the pending-frame-cancellation behaviour both
// landed correct but nothing asserted either one, so six mutations survived
// the full suite untouched.
//
// happy-dom still has no real WebGL context (see #175), so `gl` here is a
// hand-built stub that records every call rather than drawing anything -
// good enough to prove *that* setup/teardown/scheduling happen and in what
// order, not to prove pixels come out right. `requestAnimationFrame`,
// `cancelAnimationFrame` and `IntersectionObserver` are stubbed too, so the
// scheduling decisions are driven directly by this file instead of by
// real frame timing or real layout intersection (which happy-dom doesn't
// compute anyway).
//
// What stays unpinned here, and why: the inside of `draw()` - transform_segments
// / build_color_buffer being fed the right buffers, the actual
// ctx.bufferData/drawArrays calls, and the marker element's transform/opacity
// writes. Exercising that needs `frame()` to actually run, which means
// asserting against this stub's recorded call arguments rather than
// anything resembling a rendered frame; the meaningful version of that
// coverage already exists as plain-function tests in globe.test.ts
// (transform_segments, build_color_buffer, montreal_marker) against the
// same geometry this controller feeds them. Re-deriving it here through a
// fake gl would just be a slower, less direct copy of those tests.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { start_globe, type GlobeLines } from "./globe.js";
import { build_satellite_scene } from "./orbits.js";
import type { CatalogSatellite, GpElements } from "./satellite-catalog.js";

const EMPTY_LINES: GlobeLines = { world: [], canada: [] };

interface GlCalls {
  delete_buffer: unknown[];
  delete_program: unknown[];
  lose_context_calls: number;
}

function create_gl_stub(options: { link_success?: boolean } = {}) {
  const { link_success = true } = options;
  const calls: GlCalls = { delete_buffer: [], delete_program: [], lose_context_calls: 0 };
  const lose_context_extension = {
    loseContext: vi.fn(() => {
      calls.lose_context_calls++;
    }),
  };

  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    DYNAMIC_DRAW: 6,
    FLOAT: 7,
    LINES: 8,
    POINTS: 13,
    COLOR_BUFFER_BIT: 9,
    BLEND: 10,
    SRC_ALPHA: 11,
    ONE_MINUS_SRC_ALPHA: 12,

    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    deleteShader: vi.fn(),

    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => link_success),
    detachShader: vi.fn(),
    deleteProgram: vi.fn((program: unknown) => calls.delete_program.push(program)),

    createBuffer: vi.fn(() => ({})),
    deleteBuffer: vi.fn((buffer: unknown) => calls.delete_buffer.push(buffer)),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    uniform1f: vi.fn(),

    enable: vi.fn(),
    blendFunc: vi.fn(),
    clearColor: vi.fn(),
    viewport: vi.fn(),
    clear: vi.fn(),
    useProgram: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawArrays: vi.fn(),

    getExtension: vi.fn((name: string) => (name === "WEBGL_lose_context" ? lose_context_extension : null)),
  };

  return { gl: gl as unknown as WebGLRenderingContext, calls };
}

function make_canvas(gl: WebGLRenderingContext | null): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.getContext = vi.fn(() => gl) as unknown as HTMLCanvasElement["getContext"];
  return canvas;
}

// Captures the IntersectionObserver this module constructs so tests can
// fire it manually - happy-dom's own IntersectionObserver never computes
// real layout intersection, so a real one would never call back anyway.
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  trigger(is_intersecting: boolean) {
    this.callback(
      [{ isIntersecting: is_intersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

let next_raf_id = 1;
let raf: ReturnType<typeof vi.fn>;
let caf: ReturnType<typeof vi.fn>;

beforeEach(() => {
  next_raf_id = 1;
  raf = vi.fn(() => next_raf_id++);
  caf = vi.fn();
  vi.stubGlobal("requestAnimationFrame", raf);
  vi.stubGlobal("cancelAnimationFrame", caf);
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("start_globe controller lifecycle", () => {
  it("schedules exactly one pending frame on start", () => {
    const { gl } = create_gl_stub();
    const controller = start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES });

    expect(controller).not.toBeNull();
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it("stop() releases every GPU handle acquired at setup", () => {
    const { gl, calls } = create_gl_stub();
    const controller = start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES });

    controller?.stop();

    // Two buffers (position, color) - both released, not just one.
    expect(calls.delete_buffer).toHaveLength(2);
    expect(calls.delete_program).toHaveLength(1);
    expect(calls.lose_context_calls).toBe(1);
  });

  it("stop() cancels a still-pending frame", () => {
    const { gl } = create_gl_stub();
    const controller = start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES });
    const pending_id = raf.mock.results[0]?.value as number;

    controller?.stop();

    expect(caf).toHaveBeenCalledWith(pending_id);
  });

  it("losing hero visibility cancels the pending frame, rather than only skipping the next draw", () => {
    const { gl } = create_gl_stub();
    start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES });
    const pending_id = raf.mock.results[0]?.value as number;
    const observer = FakeIntersectionObserver.instances[0];

    observer.trigger(false);

    expect(caf).toHaveBeenCalledWith(pending_id);
  });

  it("does not keep requesting a new frame while paused, even if the stale frame callback still runs", () => {
    const { gl } = create_gl_stub();
    start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES });
    const frame_callback = raf.mock.calls[0]?.[0] as FrameRequestCallback;
    const observer = FakeIntersectionObserver.instances[0];

    observer.trigger(false);
    raf.mockClear();

    // Simulate the browser firing the already-scheduled frame anyway (the
    // race stop_frame's cancelAnimationFrame call is meant to close) -
    // frame()'s own guard must still refuse to draw or re-arm itself.
    frame_callback(0);

    expect(raf).not.toHaveBeenCalled();
  });

  it("regaining hero visibility resumes scheduling", () => {
    const { gl } = create_gl_stub();
    start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES });
    const observer = FakeIntersectionObserver.instances[0];

    observer.trigger(false);
    raf.mockClear();
    observer.trigger(true);

    expect(raf).toHaveBeenCalledTimes(1);
  });

  it("returns null and releases the context when the program fails to link", () => {
    const { gl, calls } = create_gl_stub({ link_success: false });

    const controller = start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES });

    expect(controller).toBeNull();
    expect(calls.lose_context_calls).toBe(1);
  });

  it("returns null and requests nothing when no WebGL context is available", () => {
    const controller = start_globe({ canvas: make_canvas(null), lines: EMPTY_LINES });

    expect(controller).toBeNull();
    expect(raf).not.toHaveBeenCalled();
  });
});

const LEO_ELEMENTS: GpElements = {
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

function satellite(overrides: Partial<CatalogSatellite>): CatalogSatellite {
  return { norad_id: 1, name: "SAT", canadian: true, flagship: null, elements: LEO_ELEMENTS, ...overrides };
}

// The frame callback start_globe handed requestAnimationFrame, run once.
function run_first_frame() {
  const frame_callback = raf.mock.calls[0]?.[0] as FrameRequestCallback;
  frame_callback(16);
}

function draw_modes(gl: WebGLRenderingContext): number[] {
  return (gl.drawArrays as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0] as number);
}

describe("start_globe satellites", () => {
  const now = new Date("2026-09-18T12:00:00Z");

  it("draws satellite dots in a points pass after the line pass", () => {
    const { gl } = create_gl_stub();
    const satellites = build_satellite_scene([satellite({})], now);
    start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES, satellites });

    run_first_frame();

    expect(draw_modes(gl)).toEqual([gl.LINES, gl.POINTS]);
  });

  it("draws no points pass when there is no satellite scene", () => {
    const { gl } = create_gl_stub();
    start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES });

    run_first_frame();

    expect(draw_modes(gl)).toEqual([gl.LINES]);
  });

  it("places and fades each flagship's icon element on every frame", () => {
    const { gl } = create_gl_stub();
    const satellites = build_satellite_scene([satellite({ norad_id: 44322, flagship: "rcm" })], now);
    const icon = document.createElement("div");
    start_globe({
      canvas: make_canvas(gl),
      lines: EMPTY_LINES,
      satellites,
      satellite_icon_els: new Map([[44322, icon]]),
    });

    run_first_frame();

    expect(icon.style.transform).toMatch(/^translate\(/);
    expect(icon.style.opacity).not.toBe("");
    // Hover follows visibility: on only while the icon can be seen.
    expect(icon.style.pointerEvents).toBe(Number(icon.style.opacity) > 0.5 ? "auto" : "none");
  });

  it("skips the points pass when every satellite is a flagship icon", () => {
    const { gl } = create_gl_stub();
    const satellites = build_satellite_scene([satellite({ flagship: "rcm" })], now);
    start_globe({ canvas: make_canvas(gl), lines: EMPTY_LINES, satellites });

    run_first_frame();

    expect(draw_modes(gl)).toEqual([gl.LINES]);
  });
});
