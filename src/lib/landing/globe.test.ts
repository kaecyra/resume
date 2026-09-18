import {
  build_color_buffer,
  build_ring_segments,
  densify_ring,
  globe_spin_at,
  hex_to_rgb01,
  line_alpha,
  line_segments,
  LINE_BACK_ALPHA,
  LINE_FRONT_ALPHA,
  lonlat_to_unit_vector,
  marker_alpha,
  MARKER_FADE_END_Z,
  MARKER_FADE_START_Z,
  MAX_SEGMENT_ANGLE_RAD,
  MONTREAL_LON,
  MONTREAL_START_SPIN_RAD,
  montreal_marker,
  parse_ring,
  project_to_screen,
  rotate_x,
  rotate_y,
  rotation_angle,
  ROTATION_MS_PER_TURN,
  slerp,
  subdivide_arc,
  tilt_radians,
  to_view_space,
  transform_segments,
  type Vec3,
} from "./globe.js";

const UNIT_SPHERE_TOLERANCE = 1e-6;

function magnitude(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function expect_on_unit_sphere(v: Vec3) {
  expect(Math.abs(magnitude(v) - 1)).toBeLessThan(UNIT_SPHERE_TOLERANCE);
}

describe("lonlat_to_unit_vector", () => {
  it("places every vertex on the unit sphere, across poles, equator and the seam", () => {
    const fixtures: [number, number][] = [
      [0, 0],
      [90, 0],
      [-90, 0],
      [180, 0],
      [-180, 0],
      [0, 90],
      [0, -90],
      [179.9, 45.5],
      [-179.9, -12.3],
      [-73.6, 45.5],
    ];
    for (const [lon, lat] of fixtures) {
      expect_on_unit_sphere(lonlat_to_unit_vector(lon, lat));
    }
  });

  it("maps the prime meridian/equator to the point facing the viewer", () => {
    const [x, y, z] = lonlat_to_unit_vector(0, 0);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(1, 10);
  });

  it("maps latitude 90 to the same north pole regardless of longitude", () => {
    const a = lonlat_to_unit_vector(0, 90);
    const b = lonlat_to_unit_vector(137, 90);
    expect(a[1]).toBeCloseTo(1, 10);
    expect(b[1]).toBeCloseTo(1, 10);
  });
});

describe("slerp", () => {
  const a = lonlat_to_unit_vector(0, 0);
  const b = lonlat_to_unit_vector(90, 0);

  it("stays on the unit sphere at every interpolation point", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect_on_unit_sphere(slerp(a, b, t));
    }
  });

  it("returns the start point at t=0 and the end point at t=1", () => {
    const start = slerp(a, b, 0);
    const end = slerp(a, b, 1);
    expect(start[0]).toBeCloseTo(a[0], 9);
    expect(start[2]).toBeCloseTo(a[2], 9);
    expect(end[0]).toBeCloseTo(b[0], 9);
    expect(end[2]).toBeCloseTo(b[2], 9);
  });
});

describe("subdivide_arc", () => {
  it("keeps every intermediate vertex on the unit sphere for a long, widely-spaced arc", () => {
    // Two points roughly 170 degrees apart - the kind of long chord a
    // Douglas-Peucker-simplified straight border can leave behind.
    const a = lonlat_to_unit_vector(-170, 5);
    const b = lonlat_to_unit_vector(10, -3);
    const points = subdivide_arc(a, b, Math.PI / 60);
    for (const point of points) {
      expect_on_unit_sphere(point);
    }
  });

  it("never leaves a gap wider than max_angle_rad between consecutive points", () => {
    const a = lonlat_to_unit_vector(-170, 5);
    const b = lonlat_to_unit_vector(10, -3);
    const max_angle_rad = Math.PI / 60;
    const points = subdivide_arc(a, b, max_angle_rad);
    for (let i = 1; i < points.length; i++) {
      const dot = points[i - 1][0] * points[i][0] + points[i - 1][1] * points[i][1] + points[i - 1][2] * points[i][2];
      const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
      expect(angle).toBeLessThanOrEqual(max_angle_rad + 1e-9);
    }
  });

  it("returns just the two endpoints when they are already close enough together", () => {
    const a = lonlat_to_unit_vector(0, 0);
    const b = lonlat_to_unit_vector(0.05, 0);
    expect(subdivide_arc(a, b, Math.PI / 60)).toHaveLength(2);
  });
});

describe("parse_ring / densify_ring / line_segments / build_ring_segments", () => {
  it("parses a ring string into unit-sphere points", () => {
    const points = parse_ring("0.0,0.0 90.0,0.0 0.0,90.0");
    expect(points).toHaveLength(3);
    for (const point of points) {
      expect_on_unit_sphere(point);
    }
  });

  it("densifies a ring with one long chord into a run of unit-sphere points", () => {
    // A two-point ring spanning most of the globe - exactly what a
    // simplified straight border collapses to.
    const points = parse_ring("-170.0,5.0 10.0,-3.0");
    const dense = densify_ring(points, Math.PI / 60);
    expect(dense.length).toBeGreaterThan(2);
    for (const point of dense) {
      expect_on_unit_sphere(point);
    }
  });

  it("pairs a polyline into consecutive gl.LINES segments", () => {
    const points: Vec3[] = [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ];
    const segments = line_segments(points);
    expect(segments).toEqual([
      [points[0], points[1]],
      [points[1], points[2]],
    ]);
  });

  it("builds every vertex of a multi-ring, long-chord payload on the unit sphere, with no chord wider than the densification limit", () => {
    // Mimics build-geo.ts's output shape: several rings, including one
    // long chord that must be subdivided to hug the sphere. This is the
    // parse_ring -> densify_ring -> build_ring_segments pipeline end to
    // end, so the max-angle assertion below is load-bearing: deleting the
    // densify_ring call inside build_ring_segments leaves every vertex on
    // the unit sphere (parse_ring alone already guarantees that) but emits
    // one long chord straight through the sphere for the first ring - the
    // exact bug densification exists to prevent. Verified by hand: with
    // that call removed, this assertion fails with an angle around 3.1
    // radians (a near-antipodal chord) against a limit of pi/60.
    const rings = ["-170.0,5.0 10.0,-3.0 15.0,20.0", "45.5,-73.6 46.0,-74.0 44.5,-73.0 45.5,-73.6"];
    const segments = build_ring_segments(rings);
    expect(segments.length).toBeGreaterThan(0);
    for (const [a, b] of segments) {
      expect_on_unit_sphere(a);
      expect_on_unit_sphere(b);
      const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
      expect(angle).toBeLessThanOrEqual(MAX_SEGMENT_ANGLE_RAD + 1e-9);
    }
  });

  it("produces no segments for an empty ring list", () => {
    expect(build_ring_segments([])).toEqual([]);
  });
});

describe("rotate_y / rotate_x", () => {
  it("rotates a point on the equator a quarter turn around the polar axis", () => {
    const [x, y, z] = rotate_y([0, 0, 1], Math.PI / 2);
    expect(x).toBeCloseTo(1, 9);
    expect(y).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(0, 9);
  });

  it("leaves a point on the polar axis unmoved by rotate_y", () => {
    const [x, y, z] = rotate_y([0, 1, 0], 1.3);
    expect(x).toBeCloseTo(0, 9);
    expect(y).toBeCloseTo(1, 9);
    expect(z).toBeCloseTo(0, 9);
  });

  it("tilts the north pole toward the viewer (+z) for a positive angle", () => {
    const [, y, z] = rotate_x([0, 1, 0], Math.PI / 4);
    expect(y).toBeCloseTo(Math.SQRT1_2, 9);
    expect(z).toBeCloseTo(Math.SQRT1_2, 9);
  });

  it("preserves vector length (both are pure rotations)", () => {
    const point = lonlat_to_unit_vector(37, -21);
    expect_on_unit_sphere(rotate_y(point, 2.1));
    expect_on_unit_sphere(rotate_x(point, -0.7));
  });
});

describe("rotation_angle", () => {
  it("starts at zero", () => {
    expect(rotation_angle(0, ROTATION_MS_PER_TURN)).toBeCloseTo(0, 9);
  });

  it("reaches half a turn at half the period", () => {
    expect(rotation_angle(ROTATION_MS_PER_TURN / 2, ROTATION_MS_PER_TURN)).toBeCloseTo(Math.PI, 9);
  });

  it("wraps back to zero at exactly one full period", () => {
    expect(rotation_angle(ROTATION_MS_PER_TURN, ROTATION_MS_PER_TURN)).toBeCloseTo(0, 9);
  });

  it("keeps wrapping past multiple periods", () => {
    expect(rotation_angle(ROTATION_MS_PER_TURN * 2.5, ROTATION_MS_PER_TURN)).toBeCloseTo(Math.PI, 9);
  });
});

describe("to_view_space", () => {
  it("is the identity when spin and tilt are both zero", () => {
    const point = lonlat_to_unit_vector(12, 34);
    const view = to_view_space(point, 0, 0);
    expect(view[0]).toBeCloseTo(point[0], 9);
    expect(view[1]).toBeCloseTo(point[1], 9);
    expect(view[2]).toBeCloseTo(point[2], 9);
  });

  it("stays on the unit sphere under combined spin and tilt", () => {
    const point = lonlat_to_unit_vector(-56, 8);
    expect_on_unit_sphere(to_view_space(point, 1.1, tilt_radians()));
  });
});

describe("line_alpha", () => {
  it("is at full strength on the nearest point of the sphere", () => {
    expect(line_alpha(1)).toBeCloseTo(LINE_FRONT_ALPHA, 9);
  });

  it("stays faintly visible on the farthest point of the sphere, never fully invisible", () => {
    expect(line_alpha(-1)).toBeCloseTo(LINE_BACK_ALPHA, 9);
    expect(line_alpha(-1)).toBeGreaterThan(0);
  });

  it("interpolates at the equator between front and back", () => {
    expect(line_alpha(0)).toBeCloseTo((LINE_FRONT_ALPHA + LINE_BACK_ALPHA) / 2, 9);
  });
});

describe("marker_alpha", () => {
  it("is fully hidden well past the horizon", () => {
    expect(marker_alpha(MARKER_FADE_START_Z - 0.1)).toBe(0);
    expect(marker_alpha(-1)).toBe(0);
  });

  it("is fully visible well before the horizon", () => {
    expect(marker_alpha(MARKER_FADE_END_Z + 0.1)).toBe(1);
    expect(marker_alpha(1)).toBe(1);
  });

  it("fades smoothly through the horizon band", () => {
    const mid = marker_alpha((MARKER_FADE_START_Z + MARKER_FADE_END_Z) / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe("project_to_screen", () => {
  it("centers a point at the sphere's origin on the given screen center", () => {
    const screen = project_to_screen([0, 0, 1], 100, 200, 150);
    expect(screen.x).toBeCloseTo(200, 9);
    expect(screen.y).toBeCloseTo(150, 9);
  });

  it("inverts the y axis, since screen space grows downward", () => {
    const screen = project_to_screen([0, 1, 0], 100, 0, 0);
    expect(screen.y).toBeCloseTo(-100, 9);
  });

  it("scales x by the given radius", () => {
    const screen = project_to_screen([1, 0, 0], 50, 0, 0);
    expect(screen.x).toBeCloseTo(50, 9);
  });
});

describe("MONTREAL_START_SPIN_RAD", () => {
  it("is the negative of MONTREAL_LON, in radians - derived from the constant, not a hand-tuned number", () => {
    expect(MONTREAL_START_SPIN_RAD).toBeCloseTo(-(MONTREAL_LON * Math.PI) / 180, 12);
  });
});

describe("globe_spin_at", () => {
  it("starts at MONTREAL_START_SPIN_RAD when elapsed is zero - the globe's actual first frame", () => {
    expect(globe_spin_at(0, ROTATION_MS_PER_TURN)).toBeCloseTo(MONTREAL_START_SPIN_RAD, 9);
  });

  it("still advances by rotation_angle's own amount as elapsed grows - speed/direction untouched by the offset", () => {
    const elapsed = ROTATION_MS_PER_TURN / 4;
    const before = globe_spin_at(0, ROTATION_MS_PER_TURN);
    const after = globe_spin_at(elapsed, ROTATION_MS_PER_TURN);
    expect(after - before).toBeCloseTo(rotation_angle(elapsed, ROTATION_MS_PER_TURN), 9);
  });
});

describe("montreal_marker", () => {
  it("is fully visible when Montreal's longitude faces the viewer", () => {
    // MONTREAL_START_SPIN_RAD is exactly this relationship (-lon in
    // radians): spinning by it brings Montreal's meridian to lon=0, which
    // faces the viewer at tilt=0.
    const marker = montreal_marker(MONTREAL_START_SPIN_RAD, 0, 100, 0, 0);
    expect(marker.opacity).toBe(1);
  });

  it("is fully hidden when Montreal has rotated to the far side", () => {
    const spin_rad = MONTREAL_START_SPIN_RAD + Math.PI;
    const marker = montreal_marker(spin_rad, 0, 100, 0, 0);
    expect(marker.opacity).toBe(0);
  });

  it("lands on the horizontal centre of the canvas at the globe's starting spin and its usual viewing tilt (#188)", () => {
    // This is the first-paint behaviour #188 asks for: at MONTREAL_START_SPIN_RAD
    // (what start_globe's very first frame uses) and the fixed TILT_DEG
    // viewing tilt, the marker's x lands on the given screen center - proof
    // by projection, not by eyeballing a screenshot.
    const center_x = 250;
    const center_y = 250;
    const marker = montreal_marker(MONTREAL_START_SPIN_RAD, tilt_radians(), 200, center_x, center_y);
    expect(marker.x).toBeCloseTo(center_x, 9);
    expect(marker.opacity).toBe(1);
  });
});

describe("transform_segments", () => {
  const segments: [Vec3, Vec3][] = [
    [
      [0, 0, 1],
      [1, 0, 0],
    ],
  ];

  it("passes positions through unchanged at zero rotation and unit aspect", () => {
    const { positions, depths } = transform_segments(segments, 0, 0, 1, 1);
    expect(Array.from(positions)).toEqual([0, 0, 1, 0]);
    expect(Array.from(depths)).toEqual([1, 0]);
  });

  it("scales x and y independently by the given aspect factors", () => {
    const { positions } = transform_segments(segments, 0, 0, 2, 3);
    expect(positions[0]).toBeCloseTo(0, 9);
    expect(positions[1]).toBeCloseTo(0, 9);
    expect(positions[2]).toBeCloseTo(2, 9);
    expect(positions[3]).toBeCloseTo(0, 9);
  });

  it("produces two vertices' worth of output per segment", () => {
    const { positions, depths } = transform_segments(segments, 0.4, 0.2, 1, 1);
    expect(positions).toHaveLength(segments.length * 2 * 2);
    expect(depths).toHaveLength(segments.length * 2);
  });

  it("writes results into the caller's out buffers themselves, not just the returned object", () => {
    // Reads `out.positions`/`out.depths` directly rather than the returned
    // object - start_globe's draw() loop only ever looks at the buffers it
    // already holds a reference to, so a version that allocates fresh
    // arrays instead of writing into `out` (still returning correct values)
    // would pass a return-value-only assertion while leaving the real
    // per-frame buffers untouched.
    const out = { positions: new Float32Array(4).fill(-999), depths: new Float32Array(2).fill(-999) };
    transform_segments(segments, 0, 0, 1, 1, out);
    expect(Array.from(out.positions)).toEqual([0, 0, 1, 0]);
    expect(Array.from(out.depths)).toEqual([1, 0]);
  });

  it("overwrites the front of a reused out buffer on a later call with fewer segments, leaving no stale tail data from the first", () => {
    const larger: [Vec3, Vec3][] = [
      [
        [0, 0, 1],
        [1, 0, 0],
      ],
      [
        [0, 1, 0],
        [-1, 0, 0],
      ],
    ];
    const smaller: [Vec3, Vec3][] = [
      [
        [0, 0, 1],
        [1, 0, 0],
      ],
    ];
    const out = { positions: new Float32Array(8), depths: new Float32Array(4) };

    // First call: rotated, fills the whole (larger) buffer.
    transform_segments(larger, 0.7, 0.3, 1, 1, out);
    // Second call: fewer segments, zero rotation - only the front two
    // vertices should be touched.
    transform_segments(smaller, 0, 0, 1, 1, out);

    // Zero rotation on [0,0,1] projects straight through: depth 1, x=0, y=0.
    // If the second call left out untouched (e.g. by allocating its own
    // fresh, correctly-sized arrays instead of writing into `out`), these
    // front entries would still carry the first call's rotated, non-zero
    // values instead.
    expect(Array.from(out.positions.slice(0, 4))).toEqual([0, 0, 1, 0]);
    expect(Array.from(out.depths.slice(0, 2))).toEqual([1, 0]);
  });
});

describe("build_color_buffer", () => {
  it("colors vertices before the boundary with world_rgb and the rest with canada_rgb", () => {
    const depths = new Float32Array([1, 1, -1, -1]);
    const colors = build_color_buffer(depths, 2, [1, 0, 0], [0, 1, 0]);
    // Colors round-trip through a Float32Array, so compare against the
    // same float32-rounded expectation rather than a full-precision double.
    const front = Math.fround(line_alpha(1));
    const back = Math.fround(line_alpha(-1));
    expect(Array.from(colors.slice(0, 4))).toEqual([1, 0, 0, front]);
    expect(Array.from(colors.slice(4, 8))).toEqual([1, 0, 0, front]);
    expect(Array.from(colors.slice(8, 12))).toEqual([0, 1, 0, back]);
    expect(Array.from(colors.slice(12, 16))).toEqual([0, 1, 0, back]);
  });

  it("writes results into the caller's out buffer itself, not just the returned array", () => {
    // Same rationale as transform_segments's equivalent test: draw() only
    // ever reads the buffer it already holds a reference to, so a version
    // that allocates a fresh array instead of writing into `out` (while
    // still returning correct values) needs a direct read of `out` to be
    // caught.
    const depths = new Float32Array([1, 1, -1, -1]);
    const out = new Float32Array(16).fill(-999);
    build_color_buffer(depths, 2, [1, 0, 0], [0, 1, 0], out);
    const front = Math.fround(line_alpha(1));
    expect(Array.from(out.slice(0, 4))).toEqual([1, 0, 0, front]);
  });

  it("overwrites the front of a reused out buffer on a later call with fewer vertices, leaving no stale tail data from the first", () => {
    const larger_depths = new Float32Array([1, 1, -1, -1]);
    const smaller_depths = new Float32Array([-1, -1]);
    const out = new Float32Array(16);

    // First call: front two vertices are world_rgb at front alpha.
    build_color_buffer(larger_depths, 2, [1, 0, 0], [0, 1, 0], out);
    // Second call: fewer vertices, all past the (zero) world/canada
    // boundary - the front vertex should flip to canada_rgb at back alpha.
    build_color_buffer(smaller_depths, 0, [1, 0, 0], [0, 1, 0], out);

    const back = Math.fround(line_alpha(-1));
    // If the second call left `out` untouched, this would still read the
    // first call's stale world_rgb + front alpha instead.
    expect(Array.from(out.slice(0, 4))).toEqual([0, 1, 0, back]);
  });
});

describe("hex_to_rgb01", () => {
  it("parses a hex color into 0-1 floats", () => {
    expect(hex_to_rgb01("#e87a2e")).toEqual([0xe8 / 255, 0x7a / 255, 0x2e / 255]);
  });

  it("accepts a hex color without the leading #", () => {
    expect(hex_to_rgb01("ffffff")).toEqual([1, 1, 1]);
  });

  it("parses black as all zeros", () => {
    expect(hex_to_rgb01("#000000")).toEqual([0, 0, 0]);
  });
});
