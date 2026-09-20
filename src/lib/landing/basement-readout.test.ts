import { describe, expect, it } from "vitest";

import {
  BASEMENT_FIELD_IDS,
  BASEMENT_METRICS_URL,
  MAX_READING_AGE_MS,
  covers_basement_fields,
  format_basement_readout,
  is_fresh_reading,
  parse_basement_metrics,
} from "./basement-readout.js";

const NOW = Date.parse("2026-09-20T12:00:00.000Z");
const FRESH = new Date(NOW - 1000).toISOString();
const STALE = new Date(NOW - MAX_READING_AGE_MS - 1000).toISOString();
const AT_THE_BOUNDARY = new Date(NOW - MAX_READING_AGE_MS).toISOString();
const IN_THE_FUTURE = new Date(NOW + 1000).toISOString();
const FAR_IN_THE_FUTURE = new Date(NOW + 365 * 24 * 60 * 60 * 1000).toISOString();

describe("parse_basement_metrics", () => {
  it("reads temperature, humidity and updated_at out of a clean JSON body", () => {
    expect(
      parse_basement_metrics('{"temperature":21.5,"humidity":46,"updated_at":"2026-09-20T11:59:00.000Z"}'),
    ).toEqual({
      temperature: 21.5,
      humidity: 46,
      updated_at: "2026-09-20T11:59:00.000Z",
    });
  });

  it("drops any field that is not the type it claims to be", () => {
    expect(parse_basement_metrics('{"temperature":"warm","humidity":46,"updated_at":123}')).toEqual({
      humidity: 46,
    });
    expect(parse_basement_metrics('{"temperature":null,"humidity":46,"updated_at":null}')).toEqual({
      humidity: 46,
    });
  });

  it("survives a body that is not the JSON object it claims to be", () => {
    expect(parse_basement_metrics("")).toEqual({});
    expect(parse_basement_metrics("not json")).toEqual({});
    expect(parse_basement_metrics("[1,2,3]")).toEqual({});
    expect(parse_basement_metrics("null")).toEqual({});
    expect(parse_basement_metrics("<!doctype html><title>404</title>")).toEqual({});
  });

  it("ignores fields nobody asked for", () => {
    expect(
      parse_basement_metrics(
        '{"temperature":21.5,"humidity":46,"updated_at":"2026-09-20T11:59:00.000Z","radon":12,"battery":"low"}',
      ),
    ).toEqual({ temperature: 21.5, humidity: 46, updated_at: "2026-09-20T11:59:00.000Z" });
  });
});

describe("is_fresh_reading", () => {
  it("is fresh for a timestamp inside the window", () => {
    expect(is_fresh_reading(FRESH, NOW)).toBe(true);
  });

  it("is stale for a timestamp older than the window", () => {
    expect(is_fresh_reading(STALE, NOW)).toBe(false);
  });

  it("is stale exactly at the boundary - newer than, not as old as", () => {
    expect(is_fresh_reading(AT_THE_BOUNDARY, NOW)).toBe(false);
  });

  // A timestamp ahead of `now` gives a negative age, which is unboundedly
  // "less than" the window unless there is a lower bound too - clock skew
  // (or a corrupted value that happens to parse into the future) must not
  // read as fresh forever.
  it("is stale for a timestamp in the future, however far", () => {
    expect(is_fresh_reading(IN_THE_FUTURE, NOW)).toBe(false);
    expect(is_fresh_reading(FAR_IN_THE_FUTURE, NOW)).toBe(false);
  });

  it("is fresh at the instant now itself - zero age", () => {
    expect(is_fresh_reading(new Date(NOW).toISOString(), NOW)).toBe(true);
  });

  it("is stale for a missing or unparseable timestamp", () => {
    expect(is_fresh_reading(undefined, NOW)).toBe(false);
    expect(is_fresh_reading("", NOW)).toBe(false);
    expect(is_fresh_reading("not a date", NOW)).toBe(false);
  });
});

describe("format_basement_readout", () => {
  it("formats a fresh, clean reading to one decimal for temperature and a whole number for humidity", () => {
    expect(
      format_basement_readout({ temperature: 21.5, humidity: 46, updated_at: FRESH }, NOW),
    ).toEqual({
      fresh: true,
      values: {
        temperature: { value: "21.5", unit: "°C" },
        humidity: { value: "46", unit: "%" },
      },
    });
  });

  it("rounds humidity rather than truncating it", () => {
    const result = format_basement_readout(
      { temperature: 21.5, humidity: 45.6, updated_at: FRESH },
      NOW,
    );
    expect(result.values.humidity).toEqual({ value: "46", unit: "%" });
  });

  it("falls back to a hyphen pair, not null, when a field is missing", () => {
    expect(format_basement_readout({ temperature: 21.5, updated_at: FRESH }, NOW)).toEqual({
      fresh: false,
      values: { temperature: { value: "-" }, humidity: { value: "-" } },
    });
    expect(format_basement_readout({ humidity: 46, updated_at: FRESH }, NOW)).toEqual({
      fresh: false,
      values: { temperature: { value: "-" }, humidity: { value: "-" } },
    });
    expect(format_basement_readout({}, NOW)).toEqual({
      fresh: false,
      values: { temperature: { value: "-" }, humidity: { value: "-" } },
    });
  });

  it("falls back to a hyphen pair when the reading is stale, even though the numbers are fine", () => {
    expect(
      format_basement_readout({ temperature: 21.5, humidity: 46, updated_at: STALE }, NOW),
    ).toEqual({
      fresh: false,
      values: { temperature: { value: "-" }, humidity: { value: "-" } },
    });
  });

  it("falls back to a hyphen pair when updated_at is missing, even though the numbers are fine", () => {
    expect(format_basement_readout({ temperature: 21.5, humidity: 46 }, NOW)).toEqual({
      fresh: false,
      values: { temperature: { value: "-" }, humidity: { value: "-" } },
    });
  });

  it("rejects a reading outside plausible bounds for a room sensor, even when fresh", () => {
    expect(
      format_basement_readout({ temperature: -50, humidity: 46, updated_at: FRESH }, NOW).fresh,
    ).toBe(false);
    expect(
      format_basement_readout({ temperature: 200, humidity: 46, updated_at: FRESH }, NOW).fresh,
    ).toBe(false);
    expect(
      format_basement_readout({ temperature: 21.5, humidity: -1, updated_at: FRESH }, NOW).fresh,
    ).toBe(false);
    expect(
      format_basement_readout({ temperature: 21.5, humidity: 101, updated_at: FRESH }, NOW).fresh,
    ).toBe(false);
  });

  it("rejects a non-finite reading instead of printing it", () => {
    expect(
      format_basement_readout({ temperature: Number.NaN, humidity: 46, updated_at: FRESH }, NOW)
        .fresh,
    ).toBe(false);
    expect(
      format_basement_readout(
        { temperature: Number.POSITIVE_INFINITY, humidity: 46, updated_at: FRESH },
        NOW,
      ).fresh,
    ).toBe(false);
  });

  it("accepts the boundary values themselves, fresh", () => {
    expect(
      format_basement_readout({ temperature: -20, humidity: 0, updated_at: FRESH }, NOW),
    ).toEqual({
      fresh: true,
      values: {
        temperature: { value: "-20.0", unit: "°C" },
        humidity: { value: "0", unit: "%" },
      },
    });
    expect(
      format_basement_readout({ temperature: 60, humidity: 100, updated_at: FRESH }, NOW),
    ).toEqual({
      fresh: true,
      values: {
        temperature: { value: "60.0", unit: "°C" },
        humidity: { value: "100", unit: "%" },
      },
    });
  });
});

describe("covers_basement_fields", () => {
  it("recognises exactly the two ids the formatter fills", () => {
    expect(covers_basement_fields(["temperature", "humidity"])).toBe(true);
    expect(covers_basement_fields(["humidity", "temperature"])).toBe(true);
  });

  it("refuses a set the formatter cannot fill, so the data cannot drift into a lie", () => {
    expect(covers_basement_fields(["temperature"])).toBe(false);
    expect(covers_basement_fields(["temperature", "humidity", "radon"])).toBe(false);
    expect(covers_basement_fields(["edge", "first-byte", "transferred", "protocol"])).toBe(false);
    expect(covers_basement_fields([])).toBe(false);
  });
});

describe("constants", () => {
  it("names the two fields this module fills", () => {
    expect(BASEMENT_FIELD_IDS).toEqual(["temperature", "humidity"]);
  });

  it("points at the same-origin metrics endpoint nginx serves", () => {
    expect(BASEMENT_METRICS_URL).toBe("/api/basement/metrics");
  });

  it("treats a reading older than 30 minutes as stale", () => {
    expect(MAX_READING_AGE_MS).toBe(30 * 60 * 1000);
  });
});
