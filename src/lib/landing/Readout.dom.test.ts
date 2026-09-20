// A `*.dom.test.ts` file (see vite.config.ts): everything below happens in
// onMount, which svelte/server never runs, so Readout.test.ts cannot reach
// any of it. This file mounts the real component, hands it a real
// /cdn-cgi/trace body - the reader's IP address and user agent included -
// and a real navigation timing entry, and proves three things:
//
//   1. the four values swap to the measurement together,
//   2. nothing but the airport code survives the trace, in particular not
//      the address, and
//   3. every failure falls back to the values data/pipeline.yaml carries,
//      rather than to a blank or a half-measured readout.
import { render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";

import type { PipelineReadout } from "$lib/types.js";

import { MAX_READING_AGE_MS } from "./basement-readout.js";
import { HUD_PALETTE, PIPELINE_INK } from "./palette.js";
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
  live: "delivery",
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
    { id: "temperature", label: "In the basement", value: "-" },
    { id: "humidity", label: "Humidity", value: "-" },
  ],
};

const BASEMENT_LIVE: PipelineReadout = { ...BASEMENT, live: "basement" };

// A metrics file body, fresh as of `now` unless `ageMs` says otherwise.
// `now` is set from the fake clock in each test that needs one, so a
// reading's freshness is always exact rather than a race against real time.
function metrics_json(temperature: number, humidity: number, now: number, ageMs = 0): string {
  return JSON.stringify({
    temperature,
    humidity,
    updated_at: new Date(now - ageMs).toISOString(),
  });
}

function badge_text(container: HTMLElement): string | null {
  return container.querySelector(".live-badge")?.textContent?.trim() ?? null;
}

function dot_fill(container: HTMLElement): string | null {
  return container.querySelector("circle")?.getAttribute("fill") ?? null;
}

function is_pending(container: HTMLElement): boolean {
  return container.querySelector(".readout")?.classList.contains("readout-pending") ?? false;
}

// Advances vitest's fake timers and drains the microtask queue after, so a
// fetch mock's promise chain and Svelte's own flush have both settled by the
// time this returns. See settle_measurement's note below for why a single
// microtask flush is not enough on its own.
async function flush(ms = 0): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await tick();
}

function stub_metrics(bodies: readonly (string | Error)[]): ReturnType<typeof vi.fn> {
  let call = 0;
  const fetch_mock = vi.fn(async () => {
    const body = bodies[Math.min(call, bodies.length - 1)];
    call += 1;
    if (body instanceof Error) {
      throw body;
    }
    return new Response(body, { status: 200 });
  });
  vi.stubGlobal("fetch", fetch_mock);

  return fetch_mock;
}

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

// The three fallback tests have nothing to wait for: a measurement that
// must not happen leaves the DOM exactly as the server rendered it, so
// waiting on the DOM passes before the attempt has even started, and
// waiting on `fetch` having been called passes on its first poll - `fetch`
// is called synchronously inside measure_delivery while response.text(),
// the parse, the state write and Svelte's flush are all still pending.
//
// This drains the whole chain instead. A timer callback runs only once the
// microtask queue is exhausted, and with these stubs every step of the
// chain resolves on a microtask, so anything that was going to render has
// rendered by the time this returns. A change that measures when it must
// not therefore has its chance to land before the assertion reads the DOM.
async function settle_measurement(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await tick();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Readout, measuring the reader's own request", () => {
  it("replaces all four values at once", async () => {
    stub_timing([navigation_entry()]);
    const fetch_mock = stub_trace(TRACE_BODY);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await waitFor(() => {
      expect(values(container)).toEqual(["AMS", "94ms", "21KB", "h3"]);
    });

    // What was asked for, not just that something was. The privacy
    // argument rests on the trace being a relative, same-origin path: the
    // edge that answers it is the one that already has the reader's
    // address, so nothing new is disclosed and there is no preflight.
    // Pointed at a third-party geo-IP endpoint instead - the conventional
    // way to build this, and therefore the likely edit - the address
    // would ship to a stranger with every other test still green. The
    // literal, not the imported constant: importing it would only assert
    // that the constant equals itself.
    expect(fetch_mock).toHaveBeenCalledWith(
      "/cdn-cgi/trace",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("redraws the runway diagram for the measured PoP, not the sample one", async () => {
    // Sample value is YYZ (Toronto); the trace below measures AMS
    // (Amsterdam) - both have generated runway data, so this proves the
    // diagram tracks the live value rather than freezing at first render.
    stub_timing([navigation_entry()]);
    stub_trace(TRACE_BODY);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    expect(container.textContent).toContain("Toronto");

    await waitFor(() => {
      expect(values(container)).toEqual(["AMS", "94ms", "21KB", "h3"]);
    });
    expect(container.textContent).toContain("Amsterdam");
    expect(container.textContent).not.toContain("Toronto");
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

    await settle_measurement();

    expect(fetch_mock).toHaveBeenCalled();
    expect(values(container)).toEqual(["YYZ", "41ms", "47KB", "h2TLS 1.3"]);
  });

  it("keeps the sample values when the trace answers with something else", async () => {
    stub_timing([navigation_entry()]);
    const fetch_mock = stub_trace("<!doctype html><title>404</title>", 404);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await settle_measurement();

    expect(fetch_mock).toHaveBeenCalled();
    expect(values(container)).toEqual(["YYZ", "41ms", "47KB", "h2TLS 1.3"]);
  });

  it("keeps the sample values when the trace answers with an error status", async () => {
    // The body is a perfectly good trace; only the status is wrong. Without
    // the `!response.ok` guard this parses and the readout measures off an
    // error page's headers.
    stub_timing([navigation_entry()]);
    const fetch_mock = stub_trace(TRACE_BODY, 502);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await settle_measurement();

    expect(fetch_mock).toHaveBeenCalled();
    expect(values(container)).toEqual(["YYZ", "41ms", "47KB", "h2TLS 1.3"]);
  });

  it("keeps the sample values when the browser reports no timing entry", async () => {
    stub_timing([]);
    const fetch_mock = stub_trace(TRACE_BODY);

    const { container } = render(Readout, { props: { readout: DELIVERY } });

    await settle_measurement();

    expect(fetch_mock).toHaveBeenCalled();
    // A measured edge beside three sample numbers would be the lie. All
    // four stay static instead.
    expect(values(container)).toEqual(["YYZ", "41ms", "47KB", "h2TLS 1.3"]);
  });

  it("measures nothing for a readout the data does not mark live", async () => {
    stub_timing([navigation_entry()]);
    const fetch_mock = stub_trace(TRACE_BODY);

    const { container } = render(Readout, { props: { readout: BASEMENT } });

    await waitFor(() => {
      expect(values(container)).toEqual(["-", "-"]);
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

describe("Readout, polling the basement sensor", () => {
  let now: number;

  beforeEach(() => {
    vi.useFakeTimers();
    now = Date.now();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls the metrics endpoint once on mount and shows LIVE for a fresh reading", async () => {
    const fetch_mock = stub_metrics([metrics_json(19.2, 52, now)]);

    const { container } = render(Readout, { props: { readout: BASEMENT_LIVE } });
    await flush();

    expect(values(container)).toEqual(["19.2°C", "52%"]);
    expect(badge_text(container)).toBe("LIVE");
    expect(dot_fill(container)).toBe(PIPELINE_INK.live);
    expect(fetch_mock).toHaveBeenCalledWith(
      "/api/basement/metrics",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("stays hidden until the first poll resolves, then reveals the correct state directly", async () => {
    let resolve_fetch!: (response: Response) => void;
    const fetch_mock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolve_fetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch_mock);

    const { container } = render(Readout, { props: { readout: BASEMENT_LIVE } });
    await tick();

    // The fetch is in flight - the honest "-"/OFFLINE baseline is still what
    // is in the DOM, but it must not be visible yet: showing it only to
    // immediately replace it is the swap this mechanism exists to avoid.
    expect(is_pending(container)).toBe(true);
    expect(values(container)).toEqual(["-", "-"]);

    resolve_fetch(new Response(metrics_json(19.2, 52, now), { status: 200 }));
    await flush();

    expect(is_pending(container)).toBe(false);
    expect(values(container)).toEqual(["19.2°C", "52%"]);
    expect(badge_text(container)).toBe("LIVE");
  });

  it("polls again after the interval and shows the newer reading", async () => {
    const fetch_mock = stub_metrics([
      metrics_json(19.2, 52, now),
      metrics_json(19.4, 53, now + 30_000),
    ]);

    const { container } = render(Readout, { props: { readout: BASEMENT_LIVE } });
    await flush();
    expect(values(container)).toEqual(["19.2°C", "52%"]);

    await flush(30_000);

    expect(values(container)).toEqual(["19.4°C", "53%"]);
    expect(badge_text(container)).toBe("LIVE");
    expect(fetch_mock).toHaveBeenCalledTimes(2);
  });

  it("shows OFFLINE hyphens when the metrics endpoint cannot be fetched", async () => {
    const fetch_mock = stub_metrics([new Error("offline")]);

    const { container } = render(Readout, { props: { readout: BASEMENT_LIVE } });
    await flush();

    expect(fetch_mock).toHaveBeenCalled();
    expect(values(container)).toEqual(["-", "-"]);
    expect(badge_text(container)).toBe("OFFLINE");
    expect(dot_fill(container)).toBe(HUD_PALETTE.chip_text);
  });

  it("shows OFFLINE hyphens when the endpoint answers with an error status", async () => {
    const fetch_mock = vi.fn(async () => new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetch_mock);

    const { container } = render(Readout, { props: { readout: BASEMENT_LIVE } });
    await flush();

    expect(fetch_mock).toHaveBeenCalled();
    expect(values(container)).toEqual(["-", "-"]);
    expect(badge_text(container)).toBe("OFFLINE");
  });

  it("keeps showing LIVE through a single failed poll, as long as the cached reading is still fresh", async () => {
    const fetch_mock = stub_metrics([metrics_json(19.2, 52, now), new Error("offline")]);

    const { container } = render(Readout, { props: { readout: BASEMENT_LIVE } });
    await flush();
    expect(badge_text(container)).toBe("LIVE");

    await flush(30_000);

    expect(fetch_mock).toHaveBeenCalledTimes(2);
    expect(badge_text(container)).toBe("LIVE");
    expect(values(container)).toEqual(["19.2°C", "52%"]);
  });

  it("ages a reading out to OFFLINE once 30 minutes pass, even though every poll keeps succeeding", async () => {
    // The same body every time: a poller that has stopped getting fresh data
    // from Home Assistant but is still successfully re-serving its last
    // write looks exactly like this from the browser's side. Freshness has
    // to come from `updated_at` versus the wall clock, not from the fetch
    // merely succeeding.
    const body = metrics_json(19.2, 52, now);
    const fetch_mock = vi.fn(async () => new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", fetch_mock);

    const { container } = render(Readout, { props: { readout: BASEMENT_LIVE } });
    await flush();
    expect(badge_text(container)).toBe("LIVE");

    await flush(MAX_READING_AGE_MS);

    expect(fetch_mock).toHaveBeenCalled();
    expect(badge_text(container)).toBe("OFFLINE");
    expect(values(container)).toEqual(["-", "-"]);
  });

  it("measures nothing for a readout the data does not mark live", async () => {
    const fetch_mock = stub_metrics([metrics_json(19.2, 52, now)]);

    const { container } = render(Readout, { props: { readout: BASEMENT } });
    await flush();

    expect(values(container)).toEqual(["-", "-"]);
    expect(fetch_mock).not.toHaveBeenCalled();
  });

  it("measures nothing when the live readout's fields are not the two it can fill", async () => {
    const fetch_mock = stub_metrics([metrics_json(19.2, 52, now)]);

    const drifted: PipelineReadout = {
      ...BASEMENT_LIVE,
      entries: [...BASEMENT_LIVE.entries, { id: "radon", label: "Radon", value: "0.4" }],
    };

    const { container } = render(Readout, { props: { readout: drifted } });
    await flush();

    expect(values(container)).toEqual(["-", "-", "0.4"]);
    expect(fetch_mock).not.toHaveBeenCalled();
  });

  it("stops polling once the component unmounts", async () => {
    const fetch_mock = stub_metrics([metrics_json(19.2, 52, now)]);

    const { unmount } = render(Readout, { props: { readout: BASEMENT_LIVE } });
    await flush();
    expect(fetch_mock).toHaveBeenCalledTimes(1);

    unmount();
    await flush(60_000);

    expect(fetch_mock).toHaveBeenCalledTimes(1);
  });
});
