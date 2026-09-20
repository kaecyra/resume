// A `*.dom.test.ts` file (see vite.config.ts): everything below happens in
// onMount, which svelte/server never runs, so Readout.test.ts cannot reach
// any of it. This file mounts the real component, hands it a real
// /cdn-cgi/trace body - the reader's IP address and user agent included -
// and a real navigation timing entry, and proves three things:
//
//   1. the four values swap to the measurement together, and the caption
//      that called them samples goes with them,
//   2. nothing but the airport code survives the trace, in particular not
//      the address, and
//   3. every failure falls back to the values data/pipeline.yaml carries,
//      rather than to a blank or a half-measured readout.
import { render, waitFor } from "@testing-library/svelte";

import type { PipelineReadout } from "$lib/types.js";

import Readout from "./Readout.svelte";

const READER_IP = "203.0.113.7";
const READER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Snooper/1.0";

const TRACE_BODY = [
  "fl=123f456",
  "h=kaecyra.com",
  `ip=${READER_IP}`,
  "ts=1758326400.123",
  "visit_scheme=https",
  `uag=${READER_AGENT}`,
  "colo=AMS",
  "http=http/2",
  "loc=NL",
  "tls=TLSv1.3",
  "sni=plaintext",
  "warp=off",
  "kex=X25519",
].join("\n");

const DELIVERY: PipelineReadout = {
  column: "aside",
  live: true,
  caption: "Sample values until the page measures your own request.",
  entries: [
    { id: "edge", label: "Edge that answered", value: "YYZ", tone: "accent" },
    { id: "first-byte", label: "First byte", value: "41", unit: "ms" },
    { id: "transferred", label: "Transferred", value: "47", unit: "KB" },
    { id: "protocol", label: "Protocol", value: "h2", unit: "TLS 1.3" },
  ],
};

const BASEMENT: PipelineReadout = {
  column: "graph",
  entries: [
    { id: "temperature", label: "In the basement right now", value: "21.5", unit: "°C" },
    { id: "humidity", label: "Humidity", value: "46", unit: "%" },
  ],
};

function navigation_entry(overrides: Partial<PerformanceNavigationTiming> = {}): PerformanceEntry {
  return {
    startTime: 0,
    responseStart: 93.6,
    transferSize: 21504,
    nextHopProtocol: "h3",
    ...overrides,
  } as unknown as PerformanceEntry;
}

function stub_timing(entries: PerformanceEntry[]): void {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue(entries);
}

function stub_trace(body: string, status = 200): ReturnType<typeof vi.fn> {
  const fetch_mock = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetch_mock);

  return fetch_mock;
}

function values(container: HTMLElement): string[] {
  return [...container.querySelectorAll("dd")].map((value) => value.textContent ?? "");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Readout, measuring the reader's own request", () => {
  it("replaces all four values at once and drops the sample caption", async () => {
    stub_timing([navigation_entry()]);
    stub_trace(TRACE_BODY);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await waitFor(() => {
      expect(values(container)).toEqual(["AMS", "94ms", "21KB", "h3"]);
    });
    expect(container.textContent).not.toContain("Sample values");
  });

  it("cannot put the reader's address, or anything else from the trace, on the page", async () => {
    stub_timing([navigation_entry()]);
    stub_trace(TRACE_BODY);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await waitFor(() => {
      expect(container.textContent).toContain("AMS");
    });

    // The whole rendered subtree, attributes included - not just its text.
    const rendered = container.innerHTML;
    for (const secret of [
      READER_IP,
      READER_AGENT,
      "Snooper",
      "123f456",
      "kaecyra.com",
      "1758326400",
      "TLSv1.3",
      "X25519",
      "plaintext",
      // The country is read out of the trace and deliberately never shown;
      // #211 is what will draw the flag.
      ">NL<",
    ]) {
      expect(rendered).not.toContain(secret);
    }
  });

  it("keeps the sample values when the trace cannot be fetched", async () => {
    stub_timing([navigation_entry()]);
    const fetch_mock = vi.fn(async () => {
      throw new Error("blocked");
    });
    vi.stubGlobal("fetch", fetch_mock);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await waitFor(() => {
      expect(fetch_mock).toHaveBeenCalled();
    });
    expect(values(container)).toEqual(["YYZ", "41ms", "47KB", "h2TLS 1.3"]);
    expect(container.textContent).toContain("Sample values");
  });

  it("keeps the sample values when the trace answers with something else", async () => {
    stub_timing([navigation_entry()]);
    const fetch_mock = stub_trace("<!doctype html><title>404</title>", 404);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await waitFor(() => {
      expect(fetch_mock).toHaveBeenCalled();
    });
    expect(values(container)).toEqual(["YYZ", "41ms", "47KB", "h2TLS 1.3"]);
  });

  it("keeps the sample values when the browser reports no timing entry", async () => {
    stub_timing([]);
    const fetch_mock = stub_trace(TRACE_BODY);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await waitFor(() => {
      expect(fetch_mock).toHaveBeenCalled();
    });
    // A measured edge beside three sample numbers would be the lie. All
    // four stay static instead.
    expect(values(container)).toEqual(["YYZ", "41ms", "47KB", "h2TLS 1.3"]);
    expect(container.textContent).toContain("Sample values");
  });

  it("measures nothing for a readout the data does not mark live", async () => {
    stub_timing([navigation_entry()]);
    const fetch_mock = stub_trace(TRACE_BODY);

    const { container } = render(Readout, { props: { readout: BASEMENT } });

    await waitFor(() => {
      expect(values(container)).toEqual(["21.5°C", "46%"]);
    });
    expect(fetch_mock).not.toHaveBeenCalled();
  });

  it("measures nothing when the live readout's fields are not the four it can fill", async () => {
    stub_timing([navigation_entry()]);
    const fetch_mock = stub_trace(TRACE_BODY);

    const drifted: PipelineReadout = {
      ...DELIVERY,
      entries: [...DELIVERY.entries, { id: "region", label: "Region", value: "eu" }],
    };

    const { container } = render(Readout, { props: { readout: drifted } });

    await waitFor(() => {
      expect(values(container)).toEqual(["YYZ", "41ms", "47KB", "h2TLS 1.3", "eu"]);
    });
    expect(fetch_mock).not.toHaveBeenCalled();
  });
});
