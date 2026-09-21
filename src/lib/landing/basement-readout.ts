// Band 2's basement readout, as a pure formatter, mirroring
// delivery-readout.ts's shape: nothing here touches the DOM, the network or
// the clock, so every rule about what gets printed is decided in a function
// a test can call directly.
//
// The one source is a small JSON file a background poller in
// docker-entrypoint.sh writes on the resume container itself, reading a
// temperature and a humidity sensor out of Home Assistant every five
// minutes. nginx serves the file at BASEMENT_METRICS_URL like any other
// static asset - same-origin, no proxy, no auth.
//
// Unlike the delivery readout, there is no static sample to fall back to:
// this formatter always produces a renderable result. `fresh` says whether
// that result is a real measurement or the honest "no current reading"
// hyphen pair - never a number that might be lying about how current it is.

import { covers_exact_fields } from "./readout-fields.js";

export type BasementFieldId = "temperature" | "humidity";

export const BASEMENT_FIELD_IDS: readonly BasementFieldId[] = ["temperature", "humidity"];

// Where the poller's reading lands. Same-origin, so the browser can poll it
// on an interval with no CORS preflight.
export const BASEMENT_METRICS_URL = "/api/basement/metrics";

// A reading older than this is shown as offline rather than as a number,
// regardless of how plausible the number itself is. Answers "are we still
// in contact with Home Assistant" - not "did the sensor's value change" -
// since this sensor only pushes a new value into HA when the reading
// actually moves, and a stable, perfectly healthy room can otherwise sit on
// the same HA-side timestamp for hours.
export const MAX_READING_AGE_MS = 30 * 60 * 1000;

// Everything this codebase is willing to know about a metrics file.
export interface BasementMetrics {
  temperature?: number;
  humidity?: number;
  // ISO 8601 - docker-entrypoint.sh's own clock at the moment it last
  // successfully talked to Home Assistant and got two usable readings back,
  // not anything HA itself reports about the entities.
  updated_at?: string;
}

// One rendered entry: the big value, and the smaller unit beside it. The
// unit is absent for a hyphen - there is nothing to unit-ify.
export interface BasementReadoutValue {
  value: string;
  unit?: string;
}

export type BasementReadoutValues = Record<BasementFieldId, BasementReadoutValue>;

export interface BasementReading {
  fresh: boolean;
  values: BasementReadoutValues;
}

const OFFLINE_VALUE: BasementReadoutValue = { value: "-" };
const OFFLINE_VALUES: BasementReadoutValues = {
  temperature: OFFLINE_VALUE,
  humidity: OFFLINE_VALUE,
};

// A room's temperature sensor failing reads as 0, a wild swing, or an
// unplugged-thermostat number far outside these bounds much more often than
// it reads as a genuinely arctic or scorching room - a mechanical room
// running hot from server exhaust is still nowhere near either edge.
const MIN_PLAUSIBLE_TEMPERATURE_C = -20;
const MAX_PLAUSIBLE_TEMPERATURE_C = 60;

// Reads `temperature`, `humidity` and `updated_at` out of a metrics file
// body and drops everything else. Defensive by construction: a body that is
// not JSON, not an object, or holds the wrong type for a key is no
// measurement rather than a fatal one.
export function parse_basement_metrics(body: string): BasementMetrics {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return {};
  }

  if (typeof raw !== "object" || raw === null) {
    return {};
  }

  const { temperature, humidity, updated_at } = raw as Record<string, unknown>;

  return {
    temperature: typeof temperature === "number" ? temperature : undefined,
    humidity: typeof humidity === "number" ? humidity : undefined,
    updated_at: typeof updated_at === "string" ? updated_at : undefined,
  };
}

// True when `updated_at` parses to a time within MAX_READING_AGE_MS of
// `now`, and not after it. A missing or unparseable timestamp is stale, not
// an error - the same "no measurement" treatment as a missing number. The
// lower bound matters as much as the upper one: without it, a timestamp
// ahead of the reader's clock - skew between HA's clock and theirs, or a
// corrupted value that happens to parse into the future - has a negative
// age, which is unboundedly "less than" the window and would read as fresh
// forever, however far in the future it is.
export function is_fresh_reading(updated_at: string | undefined, now: number): boolean {
  if (updated_at === undefined) {
    return false;
  }

  const timestamp = Date.parse(updated_at);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const age = now - timestamp;

  return age >= 0 && age < MAX_READING_AGE_MS;
}

// True when `ids` is exactly the set of fields this module fills. The
// component checks it before polling at all, same contract as
// covers_delivery_fields: if data/pipeline.yaml's basement entries ever
// drift from these two ids, the readout never claims to be live.
export function covers_basement_fields(ids: readonly string[]): boolean {
  return covers_exact_fields(ids, BASEMENT_FIELD_IDS);
}

// Always returns a renderable pair. `fresh` is true only when temperature,
// humidity and a recent `updated_at` are all present and in bounds -
// anything else, including a stale but otherwise valid reading, degrades to
// the hyphen pair rather than a number the reader has no way to know is old.
export function format_basement_readout(metrics: BasementMetrics, now: number): BasementReading {
  const temperature = format_temperature(metrics.temperature);
  const humidity = format_humidity(metrics.humidity);

  if (!temperature || !humidity || !is_fresh_reading(metrics.updated_at, now)) {
    return { fresh: false, values: OFFLINE_VALUES };
  }

  return { fresh: true, values: { temperature, humidity } };
}

// One field's value as the readout prints it, or null for a value no
// working sensor reports. basement-history.ts filters and labels its series
// through this too, so the sparkline and the number above it can never
// disagree about what counts as a real reading or how one is written.
export function format_basement_value(
  field: BasementFieldId,
  value: number | undefined,
): BasementReadoutValue | null {
  return field === "temperature" ? format_temperature(value) : format_humidity(value);
}

function format_temperature(value: number | undefined): BasementReadoutValue | null {
  if (
    !is_usable_number(value) ||
    value < MIN_PLAUSIBLE_TEMPERATURE_C ||
    value > MAX_PLAUSIBLE_TEMPERATURE_C
  ) {
    return null;
  }

  return { value: value.toFixed(1), unit: "°C" };
}

function format_humidity(value: number | undefined): BasementReadoutValue | null {
  if (!is_usable_number(value) || value < 0 || value > 100) {
    return null;
  }

  return { value: String(Math.round(value)), unit: "%" };
}

function is_usable_number(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
