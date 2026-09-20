import { describe, expect, it } from "vitest";

import {
  BASEMENT_FIELD_IDS,
  BASEMENT_METRICS_URL,
  covers_basement_fields,
  format_basement_readout,
  parse_basement_metrics,
} from "./basement-readout.js";

describe("parse_basement_metrics", () => {
  it("reads temperature and humidity out of a clean JSON body", () => {
    expect(parse_basement_metrics('{"temperature":21.5,"humidity":46}')).toEqual({
      temperature: 21.5,
      humidity: 46,
    });
  });

  it("drops any field that is not a number", () => {
    expect(parse_basement_metrics('{"temperature":"warm","humidity":46}')).toEqual({
      humidity: 46,
    });
    expect(parse_basement_metrics('{"temperature":null,"humidity":46}')).toEqual({
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
      parse_basement_metrics('{"temperature":21.5,"humidity":46,"radon":12,"battery":"low"}'),
    ).toEqual({ temperature: 21.5, humidity: 46 });
  });
});

describe("format_basement_readout", () => {
  it("formats a clean reading to one decimal for temperature and a whole number for humidity", () => {
    expect(format_basement_readout({ temperature: 21.5, humidity: 46 })).toEqual({
      temperature: { value: "21.5", unit: "°C" },
      humidity: { value: "46", unit: "%" },
    });
  });

  it("rounds humidity rather than truncating it", () => {
    expect(format_basement_readout({ temperature: 21.5, humidity: 45.6 })?.humidity).toEqual({
      value: "46",
      unit: "%",
    });
  });

  it("gives up entirely rather than mixing a measurement with a sample", () => {
    expect(format_basement_readout({ temperature: 21.5 })).toBeNull();
    expect(format_basement_readout({ humidity: 46 })).toBeNull();
    expect(format_basement_readout({})).toBeNull();
  });

  it("rejects a reading outside plausible bounds for a room sensor", () => {
    // A dead or disconnected sensor reports 0 or a wild swing more often
    // than it reports a genuinely arctic or scorching room.
    expect(format_basement_readout({ temperature: -50, humidity: 46 })).toBeNull();
    expect(format_basement_readout({ temperature: 200, humidity: 46 })).toBeNull();
    expect(format_basement_readout({ temperature: 21.5, humidity: -1 })).toBeNull();
    expect(format_basement_readout({ temperature: 21.5, humidity: 101 })).toBeNull();
  });

  it("rejects a non-finite reading instead of printing it", () => {
    expect(format_basement_readout({ temperature: Number.NaN, humidity: 46 })).toBeNull();
    expect(
      format_basement_readout({ temperature: Number.POSITIVE_INFINITY, humidity: 46 }),
    ).toBeNull();
  });

  it("accepts the boundary values themselves", () => {
    expect(format_basement_readout({ temperature: 21.5, humidity: 0 })?.humidity).toEqual({
      value: "0",
      unit: "%",
    });
    expect(format_basement_readout({ temperature: 21.5, humidity: 100 })?.humidity).toEqual({
      value: "100",
      unit: "%",
    });
    expect(format_basement_readout({ temperature: -20, humidity: 46 })?.temperature).toEqual({
      value: "-20.0",
      unit: "°C",
    });
    expect(format_basement_readout({ temperature: 60, humidity: 46 })?.temperature).toEqual({
      value: "60.0",
      unit: "°C",
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
});
