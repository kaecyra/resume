// Band 3's delivery readout, as a pure formatter (#209, step e). Nothing
// here touches the DOM, the network or the clock: Readout.svelte gathers
// the two raw sources in the browser and hands them over, so every rule
// about what a reader is shown - and about what they are never shown - is
// decided in a function a test can call directly.
//
// Two sources feed it. The navigation timing entry gives time to first
// byte, bytes over the wire and the negotiated protocol; Cloudflare's
// /cdn-cgi/trace gives the edge that answered.
//
// **The trace response carries the reader's own IP address**, along with
// their user agent, the TLS parameters they negotiated and more. This
// module reads two keys out of it - `colo` and `loc` - and drops every
// other line on the floor before anything else in the codebase sees it.
// `parse_trace_fields` is the only door the response comes through, it
// returns a two-field object rather than a map, and the formatter is typed
// against that object, so there is no path by which a field nobody asked
// for reaches a rendered value. Keep it that way: if some future entry
// needs another trace field, widen `DeliveryTraceFields` deliberately and
// argue about it, do not loosen the parser.
//
// The formatter is all-or-nothing on purpose. A partial result would put a
// measured number beside a sample one with nothing to tell them apart,
// which is exactly the lie the section must not tell. Either all four
// values measured, or the reader keeps the static set from
// data/pipeline.yaml and the caption that says so.

import { covers_exact_fields } from "./readout-fields.js";

// The four entries of band 3's readout, by the ids data/pipeline.yaml
// gives them.
export type DeliveryFieldId = "edge" | "first-byte" | "transferred" | "protocol";

export const DELIVERY_FIELD_IDS: readonly DeliveryFieldId[] = [
  "edge",
  "first-byte",
  "transferred",
  "protocol",
];

// Where the edge comes from. Same-origin, so it costs no preflight and
// leaves the reader's address on Cloudflare's side of the wire where it
// already was.
export const DELIVERY_TRACE_URL = "/cdn-cgi/trace";

// Everything this codebase is willing to know about a trace response.
export interface DeliveryTraceFields {
  // The answering edge's IATA airport code, upper case.
  colo?: string;
  // ISO 3166-1 alpha-2, upper case. Read because the issue says to read it;
  // never rendered - the flag that would use it is #211.
  country?: string;
}

// The fields Readout.svelte reads off the PerformanceNavigationTiming
// entry, already pulled out of it so this module stays free of DOM types.
// Milliseconds on the performance timeline, bytes over the wire.
export interface DeliveryTiming {
  start_time?: number;
  response_start?: number;
  transfer_size?: number;
  next_hop_protocol?: string;
}

// One rendered entry: the big value, and the smaller unit beside it. The
// unit is absent where the value carries none - the airport code and the
// protocol token are not quantities.
export interface DeliveryReadoutValue {
  value: string;
  unit?: string;
}

export type DeliveryReadoutValues = Record<DeliveryFieldId, DeliveryReadoutValue>;

// A trace response is a dozen or so lines. Anything past this is not a
// trace response, and walking it would be work done on an attacker's say-so.
const TRACE_LINE_LIMIT = 64;

const AIRPORT_CODE_PATTERN = /^[a-z]{3}$/i;
const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/i;
// What Cloudflare returns when it cannot place the request.
const UNKNOWN_COUNTRY = "XX";

// ALPN tokens: h2, h3, http/1.1, and the drafts that look like h3-29.
const PROTOCOL_PATTERN = /^[a-z0-9][a-z0-9/.+-]*$/;
const PROTOCOL_MAX_LENGTH = 12;

// Above this, the number says more about a broken clock or a suspended tab
// than about the delivery, and printing it would be worse than printing the
// sample.
const MAX_PLAUSIBLE_TTFB_MS = 120_000;

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

// Same reasoning as the TTFB cap: a document response of a gigabyte is a
// broken figure, and an eleven-digit number under this display face is
// worse than the sample it replaces.
const MAX_PLAUSIBLE_TRANSFER_BYTES = BYTES_PER_MB * 1024;

// Reads `colo` and `loc` out of a /cdn-cgi/trace body and discards
// everything else, including the reader's IP address. Defensive by
// construction: the body is treated as an untrusted pile of lines, an
// unparseable one is skipped rather than fatal, a value that is not shaped
// like the code it claims to be is dropped, and the first valid occurrence
// of a key wins so a later duplicate cannot overwrite it.
export function parse_trace_fields(body: string): DeliveryTraceFields {
  const fields: DeliveryTraceFields = {};
  const lines = body.split(/\r?\n/, TRACE_LINE_LIMIT);

  for (const line of lines) {
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (key === "colo" && fields.colo === undefined && AIRPORT_CODE_PATTERN.test(value)) {
      fields.colo = value.toUpperCase();
      continue;
    }

    if (key === "loc" && fields.country === undefined && COUNTRY_CODE_PATTERN.test(value)) {
      const country = value.toUpperCase();
      if (country !== UNKNOWN_COUNTRY) {
        fields.country = country;
      }
    }
  }

  return fields;
}

// True when `ids` is exactly the set of fields this module fills. The
// component checks it before swapping anything live: an entry the formatter
// cannot measure would keep its sample value and sit beside three measured
// ones, so if data/pipeline.yaml ever drifts, the whole readout stays
// static rather than going half true.
export function covers_delivery_fields(ids: readonly string[]): boolean {
  return covers_exact_fields(ids, DELIVERY_FIELD_IDS);
}

// The four values, or null if any one of them could not be measured.
export function format_delivery_readout(
  timing: DeliveryTiming,
  trace: DeliveryTraceFields,
): DeliveryReadoutValues | null {
  const edge = format_airport_code(trace.colo);
  const first_byte = format_first_byte(timing.start_time, timing.response_start);
  const transferred = format_bytes(timing.transfer_size);
  const protocol = format_protocol(timing.next_hop_protocol);

  if (!edge || !first_byte || !transferred || !protocol) {
    return null;
  }

  return { edge, "first-byte": first_byte, transferred, protocol };
}

function format_airport_code(colo: string | undefined): DeliveryReadoutValue | null {
  if (colo === undefined || !AIRPORT_CODE_PATTERN.test(colo)) {
    return null;
  }

  return { value: colo.toUpperCase() };
}

function format_first_byte(
  start_time: number | undefined,
  response_start: number | undefined,
): DeliveryReadoutValue | null {
  if (!is_usable_number(start_time) || !is_usable_number(response_start)) {
    return null;
  }

  const elapsed = response_start - start_time;
  if (elapsed <= 0 || elapsed > MAX_PLAUSIBLE_TTFB_MS) {
    return null;
  }

  const whole_ms = Math.round(elapsed);
  // Under half a millisecond rounds to zero, and a measured "0 ms" beneath
  // a label that means "this is your request" reads as a broken readout
  // rather than a fast one. No measurement is the honest answer.
  if (whole_ms < 1) {
    return null;
  }

  if (whole_ms < 1000) {
    return { value: String(whole_ms), unit: "ms" };
  }

  return { value: (elapsed / 1000).toFixed(1), unit: "s" };
}

function format_bytes(bytes: number | undefined): DeliveryReadoutValue | null {
  // `transferSize` is 0 for a response served from cache and for one the
  // timing API will not size, which is no measurement rather than a small
  // one.
  if (!is_usable_number(bytes) || bytes <= 0 || bytes >= MAX_PLAUSIBLE_TRANSFER_BYTES) {
    return null;
  }

  if (bytes < BYTES_PER_KB) {
    return { value: String(Math.round(bytes)), unit: "B" };
  }

  if (bytes < BYTES_PER_MB) {
    const kilobytes = Math.round(bytes / BYTES_PER_KB);
    // 1048575 bytes rounds to 1024 KB, which no one writes. Fall through.
    if (kilobytes < BYTES_PER_KB) {
      return { value: String(kilobytes), unit: "KB" };
    }
  }

  return { value: (bytes / BYTES_PER_MB).toFixed(1), unit: "MB" };
}

function format_protocol(next_hop_protocol: string | undefined): DeliveryReadoutValue | null {
  if (next_hop_protocol === undefined) {
    return null;
  }

  // Empty where the browser will not report it - a cross-origin response,
  // or a cache hit.
  const token = next_hop_protocol.trim().toLowerCase();
  if (token.length === 0 || token.length > PROTOCOL_MAX_LENGTH || !PROTOCOL_PATTERN.test(token)) {
    return null;
  }

  // No unit. The mockup's sample pairs `h2` with `TLS 1.3`, but nothing the
  // browser exposes measures the TLS version, and the trace line that does
  // is one of the fields this module refuses to read. An unmeasurable
  // suffix carried over from the sample would be exactly the stale value
  // this readout must not present as live.
  return { value: token };
}

function is_usable_number(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
