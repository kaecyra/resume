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
// The formatter is all-or-nothing on purpose, the same reasoning as the
// delivery readout: a measured number beside a sample one, with nothing to
// tell them apart, is the one thing this readout must never show.

export type BasementFieldId = "temperature" | "humidity";

export const BASEMENT_FIELD_IDS: readonly BasementFieldId[] = ["temperature", "humidity"];

// Where the poller's reading lands. Same-origin, so the browser can poll it
// on an interval with no CORS preflight.
export const BASEMENT_METRICS_URL = "/api/basement/metrics";

// Everything this codebase is willing to know about a metrics file.
export interface BasementMetrics {
  temperature?: number;
  humidity?: number;
}

// One rendered entry: the big value, and the smaller unit beside it.
export interface BasementReadoutValue {
  value: string;
  unit?: string;
}

export type BasementReadoutValues = Record<BasementFieldId, BasementReadoutValue>;

// A room's temperature sensor failing reads as 0, a wild swing, or an
// unplugged-thermostat number far outside these bounds much more often than
// it reads as a genuinely arctic or scorching room - a mechanical room
// running hot from server exhaust is still nowhere near either edge.
const MIN_PLAUSIBLE_TEMPERATURE_C = -20;
const MAX_PLAUSIBLE_TEMPERATURE_C = 60;

// Reads `temperature` and `humidity` out of a metrics file body and drops
// everything else. Defensive by construction: a body that is not JSON, not
// an object, or holds something other than a number for either key is no
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

  const { temperature, humidity } = raw as Record<string, unknown>;

  return {
    temperature: typeof temperature === "number" ? temperature : undefined,
    humidity: typeof humidity === "number" ? humidity : undefined,
  };
}

// True when `ids` is exactly the set of fields this module fills. The
// component checks it before swapping anything live, same contract as
// covers_delivery_fields: if data/pipeline.yaml's basement entries ever
// drift from these two ids, the whole readout stays static rather than
// going half true.
export function covers_basement_fields(ids: readonly string[]): boolean {
  if (ids.length !== BASEMENT_FIELD_IDS.length) {
    return false;
  }

  const present = new Set(ids);

  return BASEMENT_FIELD_IDS.every((id) => present.has(id));
}

// The two values, or null if either one could not be measured.
export function format_basement_readout(metrics: BasementMetrics): BasementReadoutValues | null {
  const temperature = format_temperature(metrics.temperature);
  const humidity = format_humidity(metrics.humidity);

  if (!temperature || !humidity) {
    return null;
  }

  return { temperature, humidity };
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
