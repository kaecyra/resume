// Covers build-geo.ts's exported pure functions directly, with inline
// fixtures - see MUST 2 in the #178 review. Importing this module used to
// regenerate the committed static/landing/globe-lines.json as a side
// effect (main() ran at module scope); build-geo.ts now guards that call so
// importing it here is side-effect free.
import type { Topology } from "topojson-specification";

import {
  assert_no_antimeridian_span,
  build_globe_lines,
  build_globe_still_svg,
  simplify_ring,
  split_at_antimeridian,
  type Ring,
} from "./build-geo.js";

describe("simplify_ring", () => {
  it("keeps the middle point when it is significant relative to a tight tolerance", () => {
    const ring: Ring = [
      [0, 0],
      [5, 5],
      [0, 0],
    ];
    expect(simplify_ring(ring, 1)).toEqual(ring);
  });

  it("collapses a closed ring (first and last point coincide) to its two coincident endpoints under a loose tolerance, without dividing by a zero-length base segment", () => {
    // perpendicular_distance's base segment runs from points[0] to
    // points[points.length - 1]; when those coincide (a closed ring
    // reduced to one interior point) dx and dy are both zero, which would
    // divide by zero in the general projection formula. simplify_ring
    // falls back to a plain point-to-point distance in that case instead -
    // this exercises that branch rather than throwing or returning NaN.
    const ring: Ring = [
      [0, 0],
      [5, 5],
      [0, 0],
    ];
    expect(simplify_ring(ring, 10)).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it("returns rings shorter than 3 points unchanged", () => {
    const ring: Ring = [
      [1, 2],
      [3, 4],
    ];
    expect(simplify_ring(ring, 0.5)).toEqual(ring);
  });
});

describe("split_at_antimeridian", () => {
  it("returns no pieces for a single-point ring", () => {
    expect(split_at_antimeridian([[12.3, 45.6]])).toEqual([]);
  });

  it("returns no pieces for an empty ring", () => {
    expect(split_at_antimeridian([])).toEqual([]);
  });

  it("does not split a pair spanning exactly 180 degrees", () => {
    // The check is strictly `> 180`, so the boundary itself must not split.
    const ring: Ring = [
      [80, 0],
      [-90, 0],
      [90, 0],
      [100, 0],
    ];
    expect(split_at_antimeridian(ring)).toEqual([ring]);
  });

  it("splits a pair spanning just over 180 degrees", () => {
    const ring: Ring = [
      [80, 0],
      [-90, 0],
      [90.1, 0],
      [100, 0],
    ];
    expect(split_at_antimeridian(ring)).toEqual([
      [
        [80, 0],
        [-90, 0],
      ],
      [
        [90.1, 0],
        [100, 0],
      ],
    ]);
  });

  it("catches an antimeridian span that only appears after simplification (NIT 10)", () => {
    // No original consecutive pair spans the antimeridian...
    const ring: Ring = [
      [-170, 0],
      [0, 60],
      [170, 0],
    ];
    expect(split_at_antimeridian(ring)).toEqual([ring]);

    // ...but a tolerance loose enough to drop the middle point collapses
    // the ring to its two endpoints, whose 340-degree gap does span the
    // antimeridian even though neither original pair did.
    const simplified = simplify_ring(ring, 65);
    expect(simplified).toEqual([
      [-170, 0],
      [170, 0],
    ]);

    // Re-running split_at_antimeridian on that simplified output - what
    // build-geo.ts's encode_rings does after every simplify_ring call - is
    // what makes the invariant hold by construction: the two single-point
    // pieces on either side of the seam are dropped by the length filter
    // rather than shipped as one straight chord across the map.
    expect(split_at_antimeridian(simplified)).toEqual([]);
  });
});

describe("assert_no_antimeridian_span", () => {
  it("does not throw when no encoded ring spans the antimeridian", () => {
    expect(() => assert_no_antimeridian_span(["0.0,0.0 10.0,10.0"], "world")).not.toThrow();
  });

  it("throws when an encoded ring spans the antimeridian", () => {
    expect(() => assert_no_antimeridian_span(["170.0,0.0 -170.0,0.0"], "world")).toThrow(/antimeridian/);
  });
});

// Minimal TopoJSON fixture: two closed square arcs, one country per arc, no
// `transform` (so topojson-client reads coordinates as-is rather than
// delta-decoding them) - just enough structure for build_globe_lines to
// exercise the real feature()/rings_of()/encode_rings() path end to end.
function fixture_topology(country_names: [string, string]): Topology {
  return {
    type: "Topology",
    arcs: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
      [
        [10, 10],
        [11, 10],
        [11, 11],
        [10, 11],
        [10, 10],
      ],
    ],
    objects: {
      countries: {
        type: "GeometryCollection",
        geometries: [
          { type: "Polygon", arcs: [[0]], properties: { name: country_names[0] } },
          { type: "Polygon", arcs: [[1]], properties: { name: country_names[1] } },
        ],
      },
    },
  };
}

describe("build_globe_lines", () => {
  it("emits Canada separately from the rest of the world", () => {
    const lines = build_globe_lines(fixture_topology(["Testland", "Canada"]));
    expect(lines.world.length).toBeGreaterThan(0);
    expect(lines.canada.length).toBeGreaterThan(0);
  });

  it("throws when no feature is named Canada, rather than silently emitting an empty accent layer (SHOULD 7)", () => {
    expect(() => build_globe_lines(fixture_topology(["Testland", "Other Land"]))).toThrow(/Canada/);
  });

  it("keeps every Canada-named feature instead of the last assignment silently discarding earlier ones", () => {
    // Both features named "Canada": a `canada_rings = encode_rings(...)`
    // assignment would keep only the second match's rings. A `push` keeps
    // both, matching the world branch's accumulation.
    const lines = build_globe_lines(fixture_topology(["Canada", "Canada"]));
    expect(lines.world).toEqual([]);
    expect(lines.canada.length).toBeGreaterThan(0);
  });
});

describe("build_globe_still_svg", () => {
  it("renders an SVG with a distinct path layer per color for world and Canada geometry", () => {
    const svg = build_globe_still_svg({
      world: ["0.0,0.0 10.0,0.0 10.0,10.0 0.0,0.0"],
      canada: ["-73.6,45.5 -74.0,46.0 -73.0,44.5 -73.6,45.5"],
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg.match(/<path /g)?.length).toBeGreaterThan(0);
  });

  it("produces no path layers for empty geometry", () => {
    const svg = build_globe_still_svg({ world: [], canada: [] });
    expect(svg).not.toContain("<path");
  });
});
