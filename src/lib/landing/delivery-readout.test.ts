import { describe, expect, it } from "vitest";

import {
  covers_delivery_fields,
  format_delivery_readout,
  parse_trace_fields,
  type DeliveryTiming,
} from "./delivery-readout.js";

// A real /cdn-cgi/trace body, field for field, with the reader's own
// address and user agent in it. Every test that touches privacy uses this
// one rather than a trimmed fixture: the point of the exercise is that the
// fields nobody asked for are present in the input and still cannot reach
// the output.
const FULL_TRACE = [
  "fl=123f456",
  "h=kaecyra.com",
  "ip=203.0.113.7",
  "ts=1758326400.123",
  "visit_scheme=https",
  "uag=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Snooper/1.0",
  "colo=YYZ",
  "sliver=none",
  "http=http/2",
  "loc=CA",
  "tls=TLSv1.3",
  "sni=plaintext",
  "warp=off",
  "gateway=off",
  "rbi=off",
  "kex=X25519",
].join("\n");

// The values in FULL_TRACE that are nobody's business. A leak is any one of
// them reaching anything the component can render.
const TRACE_SECRETS = [
  "203.0.113.7",
  "123f456",
  "kaecyra.com",
  "1758326400.123",
  "Mozilla/5.0",
  "Snooper/1.0",
  "TLSv1.3",
  "X25519",
  "plaintext",
  "http/2",
  "sliver",
  "warp",
  "gateway",
];

// A navigation entry that measures cleanly: 41ms to first byte, 47KB over
// the wire, HTTP/2 - the mockup's four sample values, so a passing format
// reproduces exactly what the approved drawing shows.
const TIMING: DeliveryTiming = {
  start_time: 0,
  response_start: 41.4,
  transfer_size: 48128,
  next_hop_protocol: "h2",
};

function format_with(
  timing: Partial<DeliveryTiming>,
  trace_body = FULL_TRACE,
): ReturnType<typeof format_delivery_readout> {
  return format_delivery_readout({ ...TIMING, ...timing }, parse_trace_fields(trace_body));
}

describe("parse_trace_fields", () => {
  it("keeps the airport code and the country and nothing else", () => {
    const fields = parse_trace_fields(FULL_TRACE);

    expect(fields).toEqual({ colo: "YYZ", country: "CA" });
    expect(Object.keys(fields).sort()).toEqual(["colo", "country"]);
  });

  it("matches the key exactly, so a lookalike key is not the airport code", () => {
    expect(parse_trace_fields("xcolo=AAA\ncolo_hint=BBB\nsni=YYZ")).toEqual({});
  });

  it("survives a response that is not key=value lines at all", () => {
    expect(parse_trace_fields("")).toEqual({});
    expect(parse_trace_fields("<!doctype html><title>404</title>")).toEqual({});
    expect(parse_trace_fields("colo")).toEqual({});
    expect(parse_trace_fields("=YYZ")).toEqual({});
  });

  it("rejects an airport code or country that is not the shape of one", () => {
    expect(parse_trace_fields("colo=TORONTO\nloc=CANADA")).toEqual({});
    expect(parse_trace_fields("colo=Y1Z\nloc=C@")).toEqual({});
    // Cloudflare says XX when it does not know the country.
    expect(parse_trace_fields("colo=yyz\nloc=XX")).toEqual({ colo: "YYZ" });
  });

  it("reads CRLF line endings and trims surrounding space", () => {
    expect(parse_trace_fields("ip=203.0.113.7\r\ncolo= yyz \r\nloc=ca\r\n")).toEqual({
      colo: "YYZ",
      country: "CA",
    });
  });

  it("takes the first valid occurrence, so a later duplicate cannot overwrite it", () => {
    expect(parse_trace_fields("colo=YYZ\ncolo=AAA")).toEqual({ colo: "YYZ" });
  });

  it("skips a malformed first occurrence and takes the next valid one", () => {
    expect(parse_trace_fields("colo=TORONTO\ncolo=AAA")).toEqual({ colo: "AAA" });
    expect(parse_trace_fields("loc=XX\nloc=NL")).toEqual({ country: "NL" });
  });

  it("stops reading after a sane number of lines rather than walking a flood", () => {
    const flood = [...Array(5000)].map((_unused, index) => `pad${index}=x`).join("\n");

    expect(parse_trace_fields(`${flood}\ncolo=YYZ`)).toEqual({});
    expect(parse_trace_fields(`colo=YYZ\n${flood}`)).toEqual({ colo: "YYZ" });
  });
});

describe("format_delivery_readout", () => {
  it("reproduces the mockup's four values from a clean measurement", () => {
    expect(format_with({})).toEqual({
      edge: { value: "YYZ" },
      "first-byte": { value: "41", unit: "ms" },
      transferred: { value: "47", unit: "KB" },
      protocol: { value: "h2" },
    });
  });

  it("measures first byte from the navigation start, not from zero", () => {
    const values = format_with({ start_time: 12.2, response_start: 53.6 });

    expect(values?.["first-byte"]).toEqual({ value: "41", unit: "ms" });
  });

  describe("unit selection and rounding", () => {
    it("rounds milliseconds to a whole number", () => {
      expect(format_with({ response_start: 41.4 })?.["first-byte"]).toEqual({
        value: "41",
        unit: "ms",
      });
      expect(format_with({ response_start: 41.6 })?.["first-byte"]).toEqual({
        value: "42",
        unit: "ms",
      });
    });

    it("switches to seconds with one decimal at a second", () => {
      expect(format_with({ response_start: 999.4 })?.["first-byte"]).toEqual({
        value: "999",
        unit: "ms",
      });
      expect(format_with({ response_start: 999.6 })?.["first-byte"]).toEqual({
        value: "1.0",
        unit: "s",
      });
      expect(format_with({ response_start: 2480 })?.["first-byte"]).toEqual({
        value: "2.5",
        unit: "s",
      });
    });

    it("counts bytes under a kilobyte as bytes", () => {
      expect(format_with({ transfer_size: 812 })?.transferred).toEqual({
        value: "812",
        unit: "B",
      });
      expect(format_with({ transfer_size: 1023 })?.transferred).toEqual({
        value: "1023",
        unit: "B",
      });
    });

    it("rounds kilobytes to a whole number", () => {
      expect(format_with({ transfer_size: 1024 })?.transferred).toEqual({
        value: "1",
        unit: "KB",
      });
      expect(format_with({ transfer_size: 48128 })?.transferred).toEqual({
        value: "47",
        unit: "KB",
      });
      expect(format_with({ transfer_size: 48640 })?.transferred).toEqual({
        value: "48",
        unit: "KB",
      });
    });

    it("switches to megabytes with one decimal rather than showing 1024 KB", () => {
      expect(format_with({ transfer_size: 1024 * 1024 - 1 })?.transferred).toEqual({
        value: "1.0",
        unit: "MB",
      });
      expect(format_with({ transfer_size: 2621440 })?.transferred).toEqual({
        value: "2.5",
        unit: "MB",
      });
    });

    it("carries the protocol with no unit, lowercased", () => {
      expect(format_with({ next_hop_protocol: "H3" })?.protocol).toEqual({ value: "h3" });
      expect(format_with({ next_hop_protocol: "http/1.1" })?.protocol).toEqual({
        value: "http/1.1",
      });
    });

    it("carries the airport code with no unit, uppercased", () => {
      expect(format_with({}, "colo=ams\nloc=NL")?.edge).toEqual({ value: "AMS" });
      // The country is read but never rendered, so a trace missing `loc`
      // is still a complete measurement.
      expect(format_with({}, "colo=ams")?.edge).toEqual({ value: "AMS" });
    });
  });

  describe("an absent or nonsense value", () => {
    it("gives up entirely rather than mixing a measurement with a sample", () => {
      expect(format_with({ transfer_size: undefined })).toBeNull();
      expect(format_with({ response_start: undefined })).toBeNull();
      expect(format_with({ next_hop_protocol: undefined })).toBeNull();
      expect(format_with({}, "ip=203.0.113.7")).toBeNull();
    });

    it("treats a zeroed navigation entry as no measurement", () => {
      // A cached or cross-origin response reports 0 rather than a number.
      expect(format_with({ response_start: 0 })).toBeNull();
      expect(format_with({ transfer_size: 0 })).toBeNull();
      expect(format_with({ next_hop_protocol: "" })).toBeNull();
    });

    it("rejects impossible numbers instead of printing them", () => {
      expect(format_with({ response_start: Number.NaN })).toBeNull();
      expect(format_with({ response_start: Number.POSITIVE_INFINITY })).toBeNull();
      expect(format_with({ response_start: -5 })).toBeNull();
      expect(format_with({ start_time: 90, response_start: 40 })).toBeNull();
      expect(format_with({ transfer_size: -1 })).toBeNull();
      // A clock that says ten minutes to first byte is a broken clock.
      expect(format_with({ response_start: 600_000 })).toBeNull();
      // A document response the size of a disk image is a broken figure,
      // and an eleven-digit number under that display face is worse than
      // the sample it replaces.
      expect(format_with({ transfer_size: 5 * 1024 ** 3 })).toBeNull();
      expect(format_with({ transfer_size: Number.MAX_SAFE_INTEGER })).toBeNull();
      // Just under the ceiling still prints.
      expect(format_with({ transfer_size: 1024 ** 3 - 1 })?.transferred).toEqual({
        value: "1024.0",
        unit: "MB",
      });
      // Under half a millisecond rounds to a measured "0 ms", which reads
      // as a broken readout rather than a fast one.
      expect(format_with({ response_start: 0.4 })).toBeNull();
      expect(format_with({ start_time: 10, response_start: 10.49 })).toBeNull();
      // Half a millisecond up rounds to a number worth printing.
      expect(format_with({ response_start: 0.5 })?.["first-byte"]).toEqual({
        value: "1",
        unit: "ms",
      });
    });

    it("rejects a protocol token that is not one", () => {
      expect(format_with({ next_hop_protocol: "h2 <script>" })).toBeNull();
      expect(format_with({ next_hop_protocol: "x".repeat(40) })).toBeNull();
    });

    it("gives up when the trace response is malformed", () => {
      expect(format_with({}, "<!doctype html><title>404 not found</title>")).toBeNull();
      expect(format_with({}, "")).toBeNull();
      expect(format_with({}, "colo=NOT-AN-AIRPORT")).toBeNull();
    });
  });

  describe("privacy", () => {
    it("cannot put any trace field but the airport code into the output", () => {
      const values = format_with({});
      const rendered = JSON.stringify(values);

      expect(rendered).toContain("YYZ");
      for (const secret of TRACE_SECRETS) {
        expect(rendered).not.toContain(secret);
      }
    });

    it("cannot put the country into the output either - #211 draws the flag", () => {
      expect(JSON.stringify(format_with({}))).not.toContain("CA");
    });

    it("cannot be made to carry the address by dressing it up as an airport code", () => {
      // Three characters shaped like a colo in every field the trace
      // carries except the one the parser reads. None of them lands.
      const dressed = ["ip=YYZ", "loc=CA", "uag=YYZ", "sni=YYZ", "h=YYZ"].join("\n");

      expect(format_delivery_readout(TIMING, parse_trace_fields(dressed))).toBeNull();
    });
  });
});

describe("covers_delivery_fields", () => {
  it("recognises exactly the four ids the formatter fills", () => {
    expect(covers_delivery_fields(["edge", "first-byte", "transferred", "protocol"])).toBe(true);
    expect(covers_delivery_fields(["protocol", "transferred", "first-byte", "edge"])).toBe(true);
  });

  it("refuses a set the formatter cannot fill, so the data cannot drift into a lie", () => {
    expect(covers_delivery_fields(["edge", "first-byte", "transferred"])).toBe(false);
    expect(covers_delivery_fields(["edge", "first-byte", "transferred", "region"])).toBe(false);
    expect(covers_delivery_fields(["temperature", "humidity"])).toBe(false);
    expect(covers_delivery_fields([])).toBe(false);
  });
});
