import { CLOUDFLARE_POPS, type Runway } from "./runway-catalog.js";
import { layout_runway_diagram, VIEW_SIZE, type Point } from "./runway-diagram-layout.js";

function every_point(geometry: ReturnType<typeof layout_runway_diagram>): Point[] {
  return geometry.runways.flatMap((r) => [
    ...r.pavement,
    ...(r.centerline ?? []),
    ...r.threshold_stripes.flat(),
    ...r.aiming_points.flat(),
    ...r.numbers.map((n) => ({ x: n.x, y: n.y })),
    ...r.closed_cross.flat(),
  ]);
}

// Two runways ~500m apart at Montréal's own latitude (real degree-per-metre
// scale matters here), running the same direction but offset - like YUL's
// own 06L/24R and 06R/24L - plus a third, shorter one at a different
// position and heading that shares no point with the first two, like YUL's
// closed 10/28. Coordinates are synthetic but at a real Montréal latitude,
// not lifted from the catalog, so this test doesn't just re-assert the
// catalog's own numbers.
const LAT0 = 45.46;

function runway(overrides: Partial<Runway>): Runway {
  return {
    designator: "01/19",
    low_end: { ident: "01", lat: LAT0, lon: -73.75 },
    high_end: { ident: "19", lat: LAT0 + 0.02, lon: -73.75 },
    length_ft: 8000,
    width_ft: 200,
    closed: false,
    ...overrides,
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

describe("layout_runway_diagram", () => {
  it("returns no runways for a PoP with no runway data", () => {
    expect(layout_runway_diagram(undefined)).toEqual({ view_size: VIEW_SIZE, runways: [] });
    expect(layout_runway_diagram([])).toEqual({ view_size: VIEW_SIZE, runways: [] });
  });

  it("draws two parallel, laterally-offset runways as two distinct, non-coincident lines - not through a shared center", () => {
    const { runways } = layout_runway_diagram([
      runway({
        designator: "a",
        low_end: { ident: "01", lat: LAT0, lon: -73.75 },
        high_end: { ident: "19", lat: LAT0 + 0.02, lon: -73.75 },
      }),
      runway({
        designator: "b",
        low_end: { ident: "01", lat: LAT0, lon: -73.744 },
        high_end: { ident: "19", lat: LAT0 + 0.02, lon: -73.744 },
      }),
    ]);
    const [a, b] = runways;

    const mid_a = midpoint(a.pavement[0], a.pavement[1]);
    const mid_b = midpoint(b.pavement[0], b.pavement[1]);
    // Real offset, so their drawn centers must differ by a visible amount,
    // not land on the same point the old heading-only model produced.
    expect(dist(mid_a, mid_b)).toBeGreaterThan(5);
  });

  it("keeps a runway that shares no real point with the others fully clear of them in the drawing", () => {
    const { runways } = layout_runway_diagram([
      runway({
        designator: "long-a",
        low_end: { ident: "06", lat: LAT0, lon: -73.75 },
        high_end: { ident: "24", lat: LAT0 + 0.02, lon: -73.73 },
      }),
      runway({
        designator: "long-b",
        low_end: { ident: "06", lat: LAT0 - 0.002, lon: -73.748 },
        high_end: { ident: "24", lat: LAT0 + 0.018, lon: -73.728 },
      }),
      runway({
        designator: "crosswind",
        low_end: { ident: "10", lat: LAT0 - 0.015, lon: -73.752 },
        high_end: { ident: "28", lat: LAT0 - 0.014, lon: -73.735 },
        closed: true,
      }),
    ]);
    const crosswind = runways.find((r) => r.designator === "crosswind")!;
    const long_a = runways.find((r) => r.designator === "long-a")!;

    const cross_mid = midpoint(crosswind.pavement[0], crosswind.pavement[2]);
    const long_a_mid = midpoint(long_a.pavement[0], long_a.pavement[2]);
    expect(dist(cross_mid, long_a_mid)).toBeGreaterThan(20);
  });

  it("scales a runway roughly twice the real length of another to roughly twice the drawn length", () => {
    const { runways } = layout_runway_diagram([
      runway({
        designator: "long",
        low_end: { ident: "01", lat: LAT0, lon: -73.75 },
        high_end: { ident: "19", lat: LAT0 + 0.02, lon: -73.75 },
      }),
      runway({
        designator: "short",
        low_end: { ident: "01", lat: LAT0, lon: -73.7 },
        high_end: { ident: "19", lat: LAT0 + 0.01, lon: -73.7 },
      }),
    ]);
    const long = runways.find((r) => r.designator === "long")!;
    const short = runways.find((r) => r.designator === "short")!;

    const long_len = dist(midpoint(long.pavement[0], long.pavement[3]), midpoint(long.pavement[1], long.pavement[2]));
    const short_len = dist(
      midpoint(short.pavement[0], short.pavement[3]),
      midpoint(short.pavement[1], short.pavement[2]),
    );
    expect(short_len).toBeCloseTo(long_len / 2, 0);
  });

  it("gives two runways of equal physical width the same drawn width", () => {
    const { runways } = layout_runway_diagram([
      runway({ designator: "a", width_ft: 200 }),
      runway({
        designator: "b",
        low_end: { ident: "01", lat: LAT0, lon: -73.7 },
        high_end: { ident: "19", lat: LAT0 + 0.01, lon: -73.7 },
        width_ft: 200,
      }),
    ]);
    const [a, b] = runways;
    const width_a = dist(a.pavement[0], a.pavement[3]);
    const width_b = dist(b.pavement[0], b.pavement[3]);
    expect(width_a).toBeCloseTo(width_b, 5);
  });

  it("gives an active runway a centerline, threshold stripes, four aiming-point boxes (two lanes per end), and each end's number split into a digits line and a letter line", () => {
    const { runways } = layout_runway_diagram([
      runway({
        designator: "06L/24R",
        low_end: { ident: "06L", lat: LAT0, lon: -73.75 },
        high_end: { ident: "24R", lat: LAT0 + 0.02, lon: -73.73 },
      }),
    ]);
    const r = runways[0];

    expect(r.centerline).not.toBeNull();
    expect(r.threshold_stripes.length).toBeGreaterThan(0);
    expect(r.aiming_points).toHaveLength(4);
    expect(r.aiming_points[0]).toHaveLength(4);
    expect(r.numbers.map((n) => n.lines)).toEqual([
      ["06", "L"],
      ["24", "R"],
    ]);
    expect(r.closed_cross).toEqual([]);
  });

  it("draws each end's aiming point as two boxes flanking the centerline, not one block spanning it or touching it", () => {
    const { runways } = layout_runway_diagram([
      runway({
        designator: "06L/24R",
        low_end: { ident: "06L", lat: LAT0, lon: -73.75 },
        high_end: { ident: "24R", lat: LAT0 + 0.02, lon: -73.73 },
      }),
    ]);
    const r = runways[0];
    const centerline_line = r.centerline!;

    // Signed perpendicular distance from a point to the (infinite) line
    // through the centerline, so "which side" and "how far" both fall out.
    const side = (p: { x: number; y: number }) => {
      const dx = centerline_line[1].x - centerline_line[0].x;
      const dy = centerline_line[1].y - centerline_line[0].y;
      return dx * (p.y - centerline_line[0].y) - dy * (p.x - centerline_line[0].x);
    };

    const [near_end_boxes, far_end_boxes] = [r.aiming_points.slice(0, 2), r.aiming_points.slice(2, 4)];
    for (const [left, right] of [near_end_boxes, far_end_boxes]) {
      const left_side = left.map(side);
      const right_side = right.map(side);
      // Every corner of one box is strictly on one side, every corner of
      // the other strictly on the opposite side - so neither box crosses
      // or touches the centerline, and they don't coincide as one block.
      expect(left_side.every((s) => s < -0.01)).toBe(true);
      expect(right_side.every((s) => s > 0.01)).toBe(true);
    }
  });

  it("stops the centerline short of both numbers instead of running behind them", () => {
    const { runways } = layout_runway_diagram([
      runway({
        designator: "06L/24R",
        low_end: { ident: "06L", lat: LAT0, lon: -73.75 },
        high_end: { ident: "24R", lat: LAT0 + 0.02, lon: -73.73 },
      }),
    ]);
    const r = runways[0];
    const [low_number, high_number] = r.numbers;
    const [centerline_start, centerline_end] = r.centerline!;
    const low_threshold = midpoint(r.pavement[0], r.pavement[3]);
    const high_threshold = midpoint(r.pavement[1], r.pavement[2]);

    // The centerline's near end must sit further from each threshold than
    // that end's number does (i.e. past it, toward the runway's middle) -
    // otherwise the dashes would run behind the digits.
    expect(dist(centerline_start, low_threshold)).toBeGreaterThan(dist(low_number, low_threshold));
    expect(dist(centerline_end, high_threshold)).toBeGreaterThan(dist(high_number, high_threshold));
  });

  it("keeps a runway number to one line when its real ident carries no parallel-runway letter", () => {
    const { runways } = layout_runway_diagram([
      runway({ designator: "10/28", low_end: { ident: "10", lat: LAT0, lon: -73.75 }, high_end: { ident: "28", lat: LAT0 + 0.02, lon: -73.73 } }),
    ]);
    expect(runways[0].numbers.map((n) => n.lines)).toEqual([["10"], ["28"]]);
  });

  it("sizes each number to fit inside its own runway's drawn width, never touching the pavement edges - a two-line lettered number smaller than a one-line one at the same width", () => {
    const { runways } = layout_runway_diagram([
      runway({
        designator: "lettered",
        low_end: { ident: "06L", lat: LAT0, lon: -73.75 },
        high_end: { ident: "24R", lat: LAT0 + 0.02, lon: -73.73 },
        width_ft: 200,
      }),
      runway({
        designator: "unlettered",
        low_end: { ident: "06", lat: LAT0, lon: -73.7 },
        high_end: { ident: "24", lat: LAT0 + 0.02, lon: -73.68 },
        width_ft: 200,
      }),
      runway({
        designator: "very-narrow",
        low_end: { ident: "01", lat: LAT0, lon: -73.6 },
        high_end: { ident: "19", lat: LAT0 + 0.0005, lon: -73.6 },
        width_ft: 60,
      }),
    ]);
    for (const r of runways) {
      const drawn_width = dist(r.pavement[0], r.pavement[3]);
      for (const n of r.numbers) {
        expect(n.font_size).toBeGreaterThan(0);
        // Two lines stacked, plus the gap between them, must clear the
        // pavement edges just as a single line does.
        const block_height = n.font_size * (n.lines.length === 2 ? 2.2 : 1);
        expect(block_height).toBeLessThan(drawn_width);
      }
    }

    const lettered = runways.find((r) => r.designator === "lettered")!;
    const unlettered = runways.find((r) => r.designator === "unlettered")!;
    expect(lettered.numbers[0].font_size).toBeLessThan(unlettered.numbers[0].font_size);
  });

  it("returns closed runways before active ones, regardless of input order, so paint order draws active pavement over them", () => {
    const { runways } = layout_runway_diagram([
      runway({ designator: "active", closed: false }),
      runway({
        designator: "closed",
        low_end: { ident: "01", lat: LAT0, lon: -73.7 },
        high_end: { ident: "19", lat: LAT0 + 0.01, lon: -73.7 },
        closed: true,
      }),
    ]);
    expect(runways.map((r) => r.designator)).toEqual(["closed", "active"]);
  });

  it("keeps a PoP whose runways straddle the antimeridian to real scale, instead of treating raw longitude degrees as nearly a full globe apart", () => {
    const SEAM_LAT = -17.75; // an airport that happens to sit on the antimeridian
    const { runways } = layout_runway_diagram([
      // Crosses the seam: low_end's raw longitude is 179.99, high_end's is
      // -179.99 - 359.98 degrees apart as plain numbers, 0.02 apart in the
      // world.
      runway({
        designator: "seam",
        low_end: { ident: "01", lat: SEAM_LAT, lon: 179.99 },
        high_end: { ident: "19", lat: SEAM_LAT, lon: -179.99 },
      }),
      // A second, shorter runway at the same real airport, entirely on
      // one side of the seam (no wraparound needed for this one alone) -
      // real-world neighbour of the one above, ~1km away. If the seam
      // runway's own span is (wrongly) computed as ~360 degrees instead
      // of 0.02, the shared frame scales to fit that, and this one
      // collapses to a speck.
      runway({
        designator: "neighbour",
        low_end: { ident: "01", lat: SEAM_LAT + 0.005, lon: 179.985 },
        high_end: { ident: "19", lat: SEAM_LAT + 0.005, lon: 179.995 },
      }),
    ]);
    const seam = runways.find((r) => r.designator === "seam")!;
    const neighbour = runways.find((r) => r.designator === "neighbour")!;
    const length_of = (r: (typeof runways)[number]) =>
      dist(midpoint(r.pavement[0], r.pavement[3]), midpoint(r.pavement[1], r.pavement[2]));

    expect(length_of(neighbour)).toBeGreaterThan(VIEW_SIZE * 0.05);
    // Same real airport, comparable real spans - drawn lengths should be
    // the same order of magnitude, not the seam runway swallowing the
    // whole frame.
    expect(length_of(seam) / length_of(neighbour)).toBeLessThan(5);
  });

  it("lays out every real Cloudflare PoP's generated runway data without producing NaN/Infinity geometry", () => {
    for (const pop of CLOUDFLARE_POPS) {
      const geometry = layout_runway_diagram(pop.runways);
      for (const point of every_point(geometry)) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    }
  });

  it("skips a runway whose ends project to the same point instead of producing NaN geometry", () => {
    const degenerate = runway({
      designator: "XX/26A",
      low_end: { ident: "XX", lat: LAT0, lon: -73.75 },
      high_end: { ident: "26A", lat: LAT0, lon: -73.75 },
    });
    const healthy = runway({ designator: "01/19" });

    const { runways } = layout_runway_diagram([degenerate, healthy]);

    expect(runways).toHaveLength(1);
    expect(runways[0].designator).toBe("01/19");
  });

  it("gives a closed runway no centerline, stripes, aiming points or numbers, but a corner-to-corner X", () => {
    const { runways } = layout_runway_diagram([runway({ designator: "10/28", closed: true })]);
    const r = runways[0];

    expect(r.centerline).toBeNull();
    expect(r.threshold_stripes).toEqual([]);
    expect(r.aiming_points).toEqual([]);
    expect(r.numbers).toEqual([]);
    expect(r.closed_cross).toHaveLength(2);
    expect(dist(r.closed_cross[0][0], r.closed_cross[0][1])).toBeCloseTo(dist(r.pavement[0], r.pavement[2]), 5);
  });
});
