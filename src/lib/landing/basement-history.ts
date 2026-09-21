// The last 24 hours behind band 2's basement readout, as a sparkline under
// each value (#242). Pure, like basement-readout.ts beside it: nothing here
// touches the DOM, the network or the clock.
//
// The source is a second file docker-entrypoint.sh's poller writes each
// cycle, from Home Assistant's history API. That history is sparse by
// design - the sensor only reports when its reading changes, so a long gap
// between two points means "nothing moved", not "no data". Each series is
// therefore read as a step function, where a value holds until the next
// one replaces it.
//
// Drawn raw, that step function is mostly noise: the sensor flips across a
// single step of its resolution (24.6, 24.7, 24.6...) for hours at a time.
// Two things turn it into a line worth looking at. Resampling takes the
// time-weighted mean of each bucket, which for a step function is exact
// and turns a flip-flop into the value between. The curve through those
// means is monotone cubic, so it is smooth without ever bulging past a
// reading the room did not have.

import { BASEMENT_FIELD_IDS, format_basement_value, type BasementFieldId } from "./basement-readout.js";

// Same-origin, beside BASEMENT_METRICS_URL.
export const BASEMENT_HISTORY_URL = "/api/basement/history";

export const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

// Half-hour buckets. Enough to show the room's day, few enough that a
// single flip of the sensor never reads as a feature.
export const HISTORY_BUCKET_COUNT = 48;

// The sparkline's own coordinate space. The SVG scales it to the column,
// keeping its aspect ratio so the "now" dot stays round.
export const SPARKLINE_WIDTH = 120;
export const SPARKLINE_HEIGHT = 28;

// Room for the stroke and the end dot at the edges of the drawing.
const SPARKLINE_PAD = 3;

// The smallest change drawn at full height. Without it the scale fits
// whatever the day happened to do, and a room holding within a tenth of a
// degree draws the same cliff as one that swung ten. A day's worth of real
// readings from this sensor spans about half a degree and three points of
// humidity.
const MIN_SPAN: Record<BasementFieldId, number> = {
  temperature: 1,
  humidity: 4,
};

export interface HistoryPoint {
  // Epoch milliseconds.
  t: number;
  v: number;
}

export type BasementHistory = Partial<Record<BasementFieldId, HistoryPoint[]>>;

// One resampled value. `x` runs from 0 (the start of the window) to 1 (now).
export interface SparkSample {
  x: number;
  v: number;
}

export interface BasementSparkline {
  path: string;
  // The last point of the path: now, where the dot goes.
  end: { x: number; y: number };
  low: string;
  high: string;
  unit: string;
  // What the line shows, for a reader who cannot see it.
  summary: string;
}

// Reads `temperature` and `humidity` out of a history file body, each as a
// list of `{t, v}` points sorted oldest first. Defensive the same way
// parse_basement_metrics is: a body that is not the object it claims to be
// is no history, and a point with an unparseable time or a value no working
// sensor reports is dropped rather than drawn.
export function parse_basement_history(body: string): BasementHistory {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return {};
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }

  const history: BasementHistory = {};
  for (const field of BASEMENT_FIELD_IDS) {
    const series = (raw as Record<string, unknown>)[field];
    if (Array.isArray(series)) {
      history[field] = parse_series(field, series);
    }
  }

  return history;
}

function parse_series(field: BasementFieldId, series: unknown[]): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  for (const entry of series) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const { t, v } = entry as Record<string, unknown>;
    const time = typeof t === "string" ? Date.parse(t) : Number.NaN;
    if (Number.isNaN(time) || typeof v !== "number" || format_basement_value(field, v) === null) {
      continue;
    }

    points.push({ t: time, v });
  }

  return points.sort((a, b) => a.t - b.t);
}

// The time-weighted mean of each bucket in the window ending at `now`,
// followed by the value held at `now` itself at x = 1. A bucket from before
// the first reading is skipped rather than given a value nobody measured;
// one the first reading lands partway through is averaged over the part it
// covers, and placed at that part's middle. Readings stamped after `now`
// are ignored.
export function resample_history(
  points: readonly HistoryPoint[],
  now: number,
  window_ms: number = HISTORY_WINDOW_MS,
  bucket_count: number = HISTORY_BUCKET_COUNT,
): SparkSample[] {
  const known = points.filter((point) => point.t <= now).sort((a, b) => a.t - b.t);
  if (known.length === 0) {
    return [];
  }

  const start = now - window_ms;
  const bucket_ms = window_ms / bucket_count;
  const samples: SparkSample[] = [];

  for (let bucket = 0; bucket < bucket_count; bucket++) {
    const bucket_start = start + bucket * bucket_ms;
    const bucket_end = bucket_start + bucket_ms;
    let area = 0;
    let covered_from = bucket_end;

    known.forEach((point, index) => {
      const held_from = Math.max(point.t, bucket_start);
      const held_until = Math.min(known[index + 1]?.t ?? now, bucket_end);
      if (held_until > held_from) {
        area += point.v * (held_until - held_from);
        covered_from = Math.min(covered_from, held_from);
      }
    });

    if (covered_from < bucket_end) {
      samples.push({
        x: ((covered_from + bucket_end) / 2 - start) / window_ms,
        v: area / (bucket_end - covered_from),
      });
    }
  }

  samples.push({ x: 1, v: known[known.length - 1].v });

  return samples;
}

// The sparkline for one field, or null when there is less than two
// buckets' worth of history to draw - a line from one point to "now" says
// nothing. The low and high labels come from the real readings in the
// window, including the one held in from before it starts, not from the
// smoothed line: they are the numbers the room actually reported.
export function format_basement_sparkline(
  field: BasementFieldId,
  points: readonly HistoryPoint[],
  now: number,
): BasementSparkline | null {
  const samples = resample_history(points, now);
  const range = reading_range(points, now);
  if (samples.length < 3 || !range) {
    return null;
  }

  const low = format_basement_value(field, range.low);
  const high = format_basement_value(field, range.high);
  if (!low || !high) {
    return null;
  }

  const drawn = to_drawing(samples, MIN_SPAN[field]);
  const unit = low.unit ?? "";

  return {
    path: monotone_path(drawn),
    end: drawn[drawn.length - 1],
    low: low.value,
    high: high.value,
    unit,
    summary: `Last 24 hours: low ${low.value} ${unit}, high ${high.value} ${unit}`,
  };
}

function reading_range(
  points: readonly HistoryPoint[],
  now: number,
): { low: number; high: number } | null {
  const start = now - HISTORY_WINDOW_MS;
  const known = points.filter((point) => point.t <= now).sort((a, b) => a.t - b.t);
  const held_in = known.filter((point) => point.t <= start).at(-1);
  const values = [
    ...(held_in ? [held_in.v] : []),
    ...known.filter((point) => point.t > start).map((point) => point.v),
  ];
  if (values.length === 0) {
    return null;
  }

  return { low: Math.min(...values), high: Math.max(...values) };
}

// Samples into the sparkline's coordinate space, y growing downward. The
// vertical scale is centred on the data and never tighter than `min_span`,
// so a flat series sits on the middle line.
function to_drawing(samples: readonly SparkSample[], min_span: number): { x: number; y: number }[] {
  const values = samples.map((sample) => sample.v);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, min_span);
  const middle = (low + high) / 2;
  const drawable_width = SPARKLINE_WIDTH - 2 * SPARKLINE_PAD;
  const drawable_height = SPARKLINE_HEIGHT - 2 * SPARKLINE_PAD;

  return samples.map((sample) => ({
    x: round(SPARKLINE_PAD + sample.x * drawable_width),
    y: round(SPARKLINE_HEIGHT / 2 - ((sample.v - middle) / span) * drawable_height),
  }));
}

// A monotone cubic through `points` (Steffen's method, the one d3's
// curveMonotoneX uses): each tangent is capped so no segment's control
// points leave the band between its two ends, which is what keeps the curve
// from overshooting a step.
function monotone_path(points: readonly { x: number; y: number }[]): string {
  const widths = points.slice(1).map((point, index) => point.x - points[index].x);
  const slopes = points.slice(1).map((point, index) => (point.y - points[index].y) / widths[index]);

  const tangents = points.map((_, index) => {
    if (index === 0) {
      return slopes[0];
    }
    if (index === points.length - 1) {
      return slopes[index - 1];
    }

    const before = slopes[index - 1];
    const after = slopes[index];
    if (before * after <= 0) {
      return 0;
    }

    const blended =
      (before * widths[index] + after * widths[index - 1]) / (widths[index - 1] + widths[index]);

    return Math.sign(before) * 2 * Math.min(Math.abs(before), Math.abs(after), Math.abs(blended) / 2);
  });

  const segments = points.slice(1).map((point, index) => {
    const from = points[index];
    const third = widths[index] / 3;
    const first = `${round(from.x + third)},${round(from.y + tangents[index] * third)}`;
    const second = `${round(point.x - third)},${round(point.y - tangents[index + 1] * third)}`;

    return `C${first} ${second} ${point.x},${point.y}`;
  });

  return `M${points[0].x},${points[0].y} ${segments.join(" ")}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
