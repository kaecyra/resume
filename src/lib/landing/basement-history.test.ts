import { describe, expect, it } from "vitest";

import {
  BASEMENT_HISTORY_URL,
  HISTORY_WINDOW_MS,
  SPARKLINE_DOT_RADIUS,
  SPARKLINE_HEIGHT,
  SPARKLINE_STROKE_WIDTH,
  SPARKLINE_WIDTH,
  format_basement_sparkline,
  parse_basement_history,
  resample_history,
  type HistoryPoint,
} from "./basement-history.js";

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-09-21T20:00:00.000Z");
const WINDOW_START = NOW - HISTORY_WINDOW_MS;

function at(offset_ms: number): string {
  return new Date(WINDOW_START + offset_ms).toISOString();
}

// Every coordinate pair in a path, in order. The on-curve points are the
// M point and every third pair of the C segments after it; the rest are
// Bezier control points.
function coordinates(path: string): { x: number; y: number }[] {
  return [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));
}

function on_curve(path: string): { x: number; y: number }[] {
  return coordinates(path).filter((_, index) => index % 3 === 0);
}

// Sensor history the way the sensor actually reports it: one point per
// change, flipping across a single step of its resolution for hours.
const FLAPPING_TEMPERATURE: HistoryPoint[] = Array.from({ length: 48 }, (_, index) => ({
  t: WINDOW_START + index * 30 * 60 * 1000,
  v: index % 2 === 0 ? 24.6 : 24.7,
}));

const STEP_UP: HistoryPoint[] = [
  { t: WINDOW_START, v: 20 },
  { t: WINDOW_START + 12 * HOUR, v: 30 },
];

describe("BASEMENT_HISTORY_URL", () => {
  it("sits beside the metrics endpoint", () => {
    expect(BASEMENT_HISTORY_URL).toBe("/api/basement/history");
  });
});

describe("parse_basement_history", () => {
  it("reads both series into epoch-millisecond points, oldest first", () => {
    const body = JSON.stringify({
      temperature: [
        { t: at(2 * HOUR), v: 24.7 },
        { t: at(0), v: 24.6 },
      ],
      humidity: [{ t: at(0), v: 39 }],
    });

    expect(parse_basement_history(body)).toEqual({
      temperature: [
        { t: WINDOW_START, v: 24.6 },
        { t: WINDOW_START + 2 * HOUR, v: 24.7 },
      ],
      humidity: [{ t: WINDOW_START, v: 39 }],
    });
  });

  it("drops points with an unparseable time, a non-numeric value, or a value no working sensor reports", () => {
    const body = JSON.stringify({
      temperature: [
        { t: "yesterday", v: 24.6 },
        { t: at(0), v: "unavailable" },
        { t: at(0), v: 85 },
        { t: at(0), v: null },
        "24.6",
        { t: at(HOUR), v: 24.7 },
      ],
      humidity: [
        { t: at(0), v: 120 },
        { t: at(0), v: -1 },
        { t: at(HOUR), v: 40 },
      ],
    });

    expect(parse_basement_history(body)).toEqual({
      temperature: [{ t: WINDOW_START + HOUR, v: 24.7 }],
      humidity: [{ t: WINDOW_START + HOUR, v: 40 }],
    });
  });

  it("leaves out a series that is not a list", () => {
    expect(parse_basement_history('{"temperature":"24.6","humidity":[]}')).toEqual({ humidity: [] });
  });

  it("survives a body that is not the JSON object it claims to be", () => {
    expect(parse_basement_history("")).toEqual({});
    expect(parse_basement_history("[1,2,3]")).toEqual({});
    expect(parse_basement_history("null")).toEqual({});
    expect(parse_basement_history("<!doctype html><title>404</title>")).toEqual({});
  });
});

describe("resample_history", () => {
  // A four-hour window in four buckets keeps the expected means readable.
  const SHORT_WINDOW = 4 * HOUR;
  const SHORT_START = NOW - SHORT_WINDOW;

  function resample(points: HistoryPoint[]): { x: number; v: number }[] {
    return resample_history(points, NOW, SHORT_WINDOW, 4);
  }

  it("holds a value from before the window across every bucket, and ends on it at now", () => {
    expect(resample([{ t: SHORT_START - 10 * HOUR, v: 21 }])).toEqual([
      { x: 0.125, v: 21 },
      { x: 0.375, v: 21 },
      { x: 0.625, v: 21 },
      { x: 0.875, v: 21 },
      { x: 1, v: 21 },
    ]);
  });

  it("weights each bucket by how long each value held inside it", () => {
    const samples = resample([
      { t: SHORT_START, v: 20 },
      { t: SHORT_START + 1.5 * HOUR, v: 22 },
    ]);

    expect(samples.map((sample) => sample.v)).toEqual([20, 21, 22, 22, 22]);
  });

  it("smooths a sensor flapping across one step of its resolution into the value between", () => {
    const samples = resample(
      Array.from({ length: 8 }, (_, index) => ({
        t: SHORT_START + index * 0.5 * HOUR,
        v: index % 2 === 0 ? 24.6 : 24.7,
      })),
    );

    for (const sample of samples.slice(0, 4)) {
      expect(sample.v).toBeCloseTo(24.65, 6);
    }
  });

  it("skips buckets from before the first reading rather than inventing a value for them", () => {
    const samples = resample([{ t: SHORT_START + 2.5 * HOUR, v: 19 }]);

    expect(samples).toEqual([
      { x: 0.6875, v: 19 },
      { x: 0.875, v: 19 },
      { x: 1, v: 19 },
    ]);
  });

  it("ignores readings stamped after now", () => {
    const samples = resample([
      { t: SHORT_START, v: 20 },
      { t: NOW + HOUR, v: 50 },
    ]);

    expect(samples.every((sample) => sample.v === 20)).toBe(true);
  });

  it("has nothing to draw with no reading at or before now", () => {
    expect(resample([])).toEqual([]);
    expect(resample([{ t: NOW + HOUR, v: 20 }])).toEqual([]);
  });
});

describe("format_basement_sparkline", () => {
  it("labels the real low and high readings, not the smoothed line's", () => {
    const sparkline = format_basement_sparkline("temperature", FLAPPING_TEMPERATURE, NOW);

    expect(sparkline).toMatchObject({ low: "24.6", high: "24.7", unit: "°C" });
  });

  it("formats humidity the way the readout does", () => {
    const sparkline = format_basement_sparkline(
      "humidity",
      [
        { t: WINDOW_START, v: 38.4 },
        { t: WINDOW_START + 6 * HOUR, v: 41.2 },
      ],
      NOW,
    );

    expect(sparkline).toMatchObject({ low: "38", high: "41", unit: "%" });
  });

  it("counts the value held into the window, but not one it had already replaced", () => {
    const sparkline = format_basement_sparkline(
      "temperature",
      [
        { t: WINDOW_START - 6 * HOUR, v: 30 },
        { t: WINDOW_START - 1 * HOUR, v: 22 },
        { t: WINDOW_START + 6 * HOUR, v: 23 },
      ],
      NOW,
    );

    expect(sparkline).toMatchObject({ low: "22.0", high: "23.0" });
  });

  it("says what the line shows, for anyone not looking at it", () => {
    const sparkline = format_basement_sparkline("temperature", FLAPPING_TEMPERATURE, NOW);

    expect(sparkline?.summary).toBe("Last 24 hours: low 24.6 °C, high 24.7 °C");
  });

  it("draws nothing from less than two buckets of history", () => {
    expect(format_basement_sparkline("temperature", [], NOW)).toBeNull();
    expect(format_basement_sparkline("temperature", [{ t: NOW - 60_000, v: 24.6 }], NOW)).toBeNull();
  });

  it("never swings past the readings it is drawn through, even across a sharp step", () => {
    const sparkline = format_basement_sparkline("temperature", STEP_UP, NOW);
    const path = sparkline?.path ?? "";
    const through = on_curve(path).map((point) => point.y);
    const top = Math.min(...through);
    const bottom = Math.max(...through);

    for (const point of coordinates(path)) {
      expect(point.y).toBeGreaterThanOrEqual(top - 1e-9);
      expect(point.y).toBeLessThanOrEqual(bottom + 1e-9);
    }
  });

  it("runs left to right", () => {
    const xs = on_curve(format_basement_sparkline("temperature", STEP_UP, NOW)?.path ?? "").map(
      (point) => point.x,
    );

    expect(xs.length).toBeGreaterThan(2);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("ends on the dot marking now", () => {
    const sparkline = format_basement_sparkline("temperature", STEP_UP, NOW);
    const points = on_curve(sparkline?.path ?? "");

    expect(sparkline?.end).toEqual(points[points.length - 1]);
  });

  it("leaves room for the whole dot inside the drawing, even at the top of the range", () => {
    const sparkline = format_basement_sparkline(
      "temperature",
      [
        { t: WINDOW_START, v: 20 },
        { t: NOW - 60_000, v: 30 },
      ],
      NOW,
    );
    const reach = SPARKLINE_DOT_RADIUS + SPARKLINE_STROKE_WIDTH / 2;

    expect(sparkline?.end.x).toBeLessThanOrEqual(SPARKLINE_WIDTH - reach);
    expect(sparkline?.end.y).toBeGreaterThanOrEqual(reach);
  });

  it("draws a flat series as a flat line through the middle", () => {
    const sparkline = format_basement_sparkline("temperature", [{ t: WINDOW_START, v: 22 }], NOW);

    for (const point of coordinates(sparkline?.path ?? "")) {
      expect(point.y).toBeCloseTo(SPARKLINE_HEIGHT / 2, 6);
    }
  });

  it("keeps a change of one sensor step small instead of stretching it to full height", () => {
    const sparkline = format_basement_sparkline(
      "temperature",
      [
        { t: WINDOW_START, v: 24.6 },
        { t: WINDOW_START + 12 * HOUR, v: 24.7 },
      ],
      NOW,
    );
    const ys = on_curve(sparkline?.path ?? "").map((point) => point.y);

    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(SPARKLINE_HEIGHT / 4);
  });

  it("uses the full height for a change bigger than the minimum span", () => {
    const ys = on_curve(format_basement_sparkline("temperature", STEP_UP, NOW)?.path ?? "").map(
      (point) => point.y,
    );

    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(SPARKLINE_HEIGHT / 2);
  });
});
