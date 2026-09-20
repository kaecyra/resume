import { render } from "svelte/server";

import { HUD_PALETTE } from "./palette.js";
import RunwayDiagram from "./RunwayDiagram.svelte";
import type { PopAirport } from "./runway-catalog.js";

const YUL: PopAirport = {
  id: "yul",
  iata: "YUL",
  icao: "CYUL",
  city: "Montréal",
  country: "CA",
  runways: [
    {
      designator: "06L/24R",
      low_end: { ident: "06L", lat: 45.461063385009766, lon: -73.7650146484375 },
      high_end: { ident: "24R", lat: 45.4832763671875, lon: -73.73592376708984 },
      length_ft: 11000,
      width_ft: 200,
      closed: false,
    },
    {
      designator: "06R/24L",
      low_end: { ident: "06R", lat: 45.45766067504883, lon: -73.74138641357422 },
      high_end: { ident: "24L", lat: 45.477020263671875, lon: -73.71601104736328 },
      length_ft: 9600,
      width_ft: 200,
      closed: false,
    },
    {
      designator: "10/28",
      low_end: { ident: "10", lat: 45.462502, lon: -73.764999 },
      high_end: { ident: "28", lat: 45.463299, lon: -73.738297 },
      length_ft: 7000,
      width_ft: 200,
      closed: true,
    },
  ],
};

function html_for(pop: PopAirport): string {
  return render(RunwayDiagram, { props: { pop } }).body;
}

describe("RunwayDiagram", () => {
  it("is decorative: aria-hidden", () => {
    expect(html_for(YUL)).toContain('aria-hidden="true"');
  });

  it("draws one pavement polygon per runway", () => {
    const html = html_for(YUL);
    expect([...html.matchAll(/class="runway-pavement"/g)]).toHaveLength(3);
  });

  it("draws a dashed centerline and both rotated numbers for each active runway, each number stacked digits-over-letter", () => {
    const html = html_for(YUL);
    expect([...html.matchAll(/class="runway-centerline"/g)]).toHaveLength(2);
    expect([...html.matchAll(/class="runway-number\b/g)]).toHaveLength(4);
    // Not ">06L<" - the ident is split into two stacked tspans.
    expect(html).not.toContain(">06L<");
    for (const line of ["06", "L", "24", "R", "06", "R", "24", "L"]) {
      expect(html).toContain(`>${line}<`);
    }
    expect([...html.matchAll(/<tspan[^>]*>/g)]).toHaveLength(8);
  });

  it("draws threshold stripes and aiming points only for active runways, two aiming-point boxes per end", () => {
    const html = html_for(YUL);
    expect([...html.matchAll(/class="runway-stripe"/g)].length).toBeGreaterThan(0);
    // 2 active runways x 2 ends x 2 lane boxes.
    expect([...html.matchAll(/class="runway-aiming-point"/g)]).toHaveLength(8);
  });

  it("draws the closed runway dim, unmarked, and with a corner-to-corner X instead of numbers", () => {
    const html = html_for(YUL);
    expect([...html.matchAll(/class="runway-closed-cross"/g)]).toHaveLength(2);
    expect(html).not.toContain(">10<");
    expect(html).not.toContain(">28<");

    const pavements = [...html.matchAll(/<polygon class="runway-pavement"[^>]*fill="([^"]+)"[^>]*>/g)];
    expect(pavements).toHaveLength(3);
    expect(pavements[0][1]).toBe(HUD_PALETTE.chip_text);
    expect(pavements[1][1]).not.toBe(HUD_PALETTE.chip_text);
    expect(pavements[2][1]).not.toBe(HUD_PALETTE.chip_text);
  });

  it("draws the closed runway's pavement before any active one, so active pavement is painted over it", () => {
    const html = html_for(YUL);
    const kinds = [...html.matchAll(/<polygon class="runway-pavement"[^>]*fill-opacity="([^"]+)"[^>]*>/g)].map(
      (m) => m[1],
    );
    expect(kinds).toEqual(["0.12", "1", "1"]);
  });

  it("gives active pavement full opacity so it fully occludes anything underneath", () => {
    const html = html_for(YUL);
    const active_pavements = [...html.matchAll(/<polygon class="runway-pavement"[^>]*fill-opacity="1"/g)];
    expect(active_pavements).toHaveLength(2);
  });

  it("renders an empty svg for a PoP with no runway data yet", () => {
    const html = html_for({ id: "yyz", iata: "YYZ", icao: "CYYZ", city: "Toronto", country: "CA" });
    expect(html).not.toContain("runway-pavement");
  });
});
