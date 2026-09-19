import { degreesLong, eciToGeodetic, json2satrec } from "satellite.js";

import { lonlat_to_unit_vector, SPHERE_FILL_RATIO, to_view_space, type Vec3 } from "./globe.js";
import {
  build_satellite_scene,
  dashed_ring,
  display_radius,
  eci_to_globe_axes,
  format_vitals,
  EARTH_RADIUS_KM,
  GEO_ALTITUDE_KM,
  geo_ring_segments,
  inertial_spin,
  is_geostationary,
  orbit_class,
  sample_orbit,
  satellite_vitals,
} from "./orbits.js";
import type { CatalogSatellite, GpElements } from "./satellite-catalog.js";

function magnitude(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

const LEO_ELEMENTS: GpElements = {
  OBJECT_NAME: "ISS (ZARYA)",
  OBJECT_ID: "1998-067A",
  EPOCH: "2026-09-18T12:00:00.000000",
  MEAN_MOTION: 15.5,
  ECCENTRICITY: 0.0005,
  INCLINATION: 51.64,
  RA_OF_ASC_NODE: 120,
  ARG_OF_PERICENTER: 45,
  MEAN_ANOMALY: 300,
  NORAD_CAT_ID: 25544,
  ELEMENT_SET_NO: 999,
  BSTAR: 0.0002,
  MEAN_MOTION_DOT: 0.0001,
  MEAN_MOTION_DDOT: 0,
};

const GEO_ELEMENTS: GpElements = {
  ...LEO_ELEMENTS,
  OBJECT_NAME: "ANIK G1",
  NORAD_CAT_ID: 39127,
  MEAN_MOTION: 1.0027,
  ECCENTRICITY: 0.0002,
  INCLINATION: 0.02,
  BSTAR: 0,
  MEAN_MOTION_DOT: 0,
};

const EPOCH_DATE = new Date("2026-09-18T12:00:00Z");

function satellite(overrides: Partial<CatalogSatellite>): CatalogSatellite {
  return { norad_id: 1, name: "SAT", canadian: true, flagship: null, elements: LEO_ELEMENTS, ...overrides };
}

describe("display_radius", () => {
  it("puts the surface on the unit sphere", () => {
    expect(display_radius(0)).toBe(1);
  });

  it("grows with altitude", () => {
    const altitudes = [0, 200, 420, 600, 800, 1000, 20_000, GEO_ALTITUDE_KM];
    const radii = altitudes.map(display_radius);
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeGreaterThan(radii[i - 1]);
    }
  });

  it("lifts the ISS well clear of the wireframe", () => {
    expect(display_radius(420)).toBeGreaterThan(1.12);
  });

  it("keeps sun-synchronous orbits inside the low band", () => {
    expect(display_radius(800)).toBeLessThan(1.22);
  });

  it("lands geostationary near the canvas edge, where the hero is allowed to crop it", () => {
    const geo = display_radius(GEO_ALTITUDE_KM);
    expect(geo).toBeGreaterThan(1.3);
    expect(geo).toBeLessThan(1.4);
    // In clip space the canvas edge is 1 / SPHERE_FILL_RATIO globe radii
    // out - the ring may overrun it a little, never by much.
    expect(geo * SPHERE_FILL_RATIO).toBeLessThan(1.05);
  });
});

describe("eci_to_globe_axes", () => {
  it("maps the inertial frame's polar axis (Z) onto the globe's polar axis (Y)", () => {
    const v = eci_to_globe_axes({ x: 0, y: 0, z: EARTH_RADIUS_KM + 500 });
    expect(v[0]).toBeCloseTo(0);
    expect(v[1]).toBeCloseTo(display_radius(500));
    expect(v[2]).toBeCloseTo(0);
  });

  it("maps the inertial X axis onto the globe's +Z (lon 0 before any spin) and Y onto +X", () => {
    const along_x = eci_to_globe_axes({ x: EARTH_RADIUS_KM + 500, y: 0, z: 0 });
    const along_y = eci_to_globe_axes({ x: 0, y: EARTH_RADIUS_KM + 500, z: 0 });
    expect(along_x[2]).toBeCloseTo(display_radius(500));
    expect(along_y[0]).toBeCloseTo(display_radius(500));
  });

  it("scales by display radius, not by true distance", () => {
    const v = eci_to_globe_axes({ x: 3000, y: 4000, z: EARTH_RADIUS_KM });
    const true_altitude = Math.sqrt(3000 ** 2 + 4000 ** 2 + EARTH_RADIUS_KM ** 2) - EARTH_RADIUS_KM;
    expect(magnitude(v)).toBeCloseTo(display_radius(true_altitude));
  });
});

describe("inertial_spin", () => {
  // The whole point of the conversion: with no globe spin, an inertial
  // position rotated by inertial_spin must land over the same longitude the
  // library's own ECI-to-geodetic conversion reports for it. Equatorial
  // points only, so geodetic and geocentric latitude agree exactly.
  it.each([0, 0.7, 2.5, 4.1, 6])("puts an inertial point over its true longitude at gmst %s", (gmst) => {
    const eci = { x: 5000, y: 5000, z: 0 };
    const view = to_view_space(eci_to_globe_axes(eci), inertial_spin(0, gmst), 0);
    const longitude = degreesLong(eciToGeodetic(eci, gmst).longitude);
    const expected = lonlat_to_unit_vector(longitude, 0);
    const scale = magnitude(view);
    expect(view[0] / scale).toBeCloseTo(expected[0]);
    expect(view[2] / scale).toBeCloseTo(expected[2]);
  });

  it("keeps the globe's own spin on top of sidereal rotation", () => {
    expect(inertial_spin(1.5, 0.5)).toBeCloseTo(1);
  });
});

describe("sample_orbit", () => {
  const satrec = json2satrec(LEO_ELEMENTS);

  it("closes on itself over one period", () => {
    const points = sample_orbit(satrec, EPOCH_DATE, 96);
    const first = points[0];
    const last = points[points.length - 1];
    const gap = magnitude([first[0] - last[0], first[1] - last[1], first[2] - last[2]]);
    expect(gap).toBeLessThan(0.01);
  });

  it("returns one more point than samples, so the ring's last chord reaches the start", () => {
    expect(sample_orbit(satrec, EPOCH_DATE, 96)).toHaveLength(97);
  });

  it("keeps every point off the globe's surface", () => {
    for (const point of sample_orbit(satrec, EPOCH_DATE, 96)) {
      expect(magnitude(point)).toBeGreaterThan(1.1);
    }
  });
});

describe("dashed_ring", () => {
  it("pairs alternate chords of a polyline, starting with the first", () => {
    const points: Vec3[] = [0, 1, 2, 3, 4, 5].map((i) => [i, 0, 0] as Vec3);
    expect(dashed_ring(points).map(([a, b]) => [a[0], b[0]])).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it("drops a trailing point with no partner", () => {
    const points: Vec3[] = [0, 1, 2].map((i) => [i, 0, 0] as Vec3);
    expect(dashed_ring(points)).toHaveLength(1);
  });
});

describe("geo_ring_segments", () => {
  it("draws an equatorial ring at geostationary display radius", () => {
    const segments = geo_ring_segments(64);
    for (const [a] of segments) {
      expect(a[1]).toBeCloseTo(0);
      expect(magnitude(a)).toBeCloseTo(display_radius(GEO_ALTITUDE_KM));
    }
  });

  it("is dashed - half the chords of a full ring", () => {
    expect(geo_ring_segments(64)).toHaveLength(32);
  });
});

describe("is_geostationary", () => {
  it("accepts a one-revolution-per-day, near-circular orbit", () => {
    expect(is_geostationary(GEO_ELEMENTS)).toBe(true);
  });

  it("rejects low orbits", () => {
    expect(is_geostationary(LEO_ELEMENTS)).toBe(false);
  });

  it("rejects a highly eccentric orbit even with a one-day period", () => {
    expect(is_geostationary({ ...GEO_ELEMENTS, ECCENTRICITY: 0.7 })).toBe(false);
  });
});

describe("build_satellite_scene", () => {
  it("draws one ring per flagship kind, not one per satellite", () => {
    const scene = build_satellite_scene(
      [
        satellite({ norad_id: 1, flagship: "rcm" }),
        satellite({ norad_id: 2, flagship: "rcm" }),
        satellite({ norad_id: 3, flagship: "iss", canadian: false }),
      ],
      EPOCH_DATE,
    );
    expect(scene.rings).toHaveLength(2);
  });

  it("gives flagships icons instead of dots", () => {
    const scene = build_satellite_scene(
      [satellite({ norad_id: 1, flagship: "rcm" }), satellite({ norad_id: 2 })],
      EPOCH_DATE,
    );
    expect(scene.flagships.map((f) => f.norad_id)).toEqual([1]);
    expect(scene.dots.map((d) => d.norad_id)).toEqual([2]);
  });

  it("carries each dot's Canadian flag through for its colour", () => {
    const scene = build_satellite_scene(
      [satellite({ norad_id: 1, canadian: true }), satellite({ norad_id: 2, canadian: false })],
      EPOCH_DATE,
    );
    expect(scene.dots.map((d) => d.canadian)).toEqual([true, false]);
  });

  it("adds the shared geostationary ring only when a geostationary satellite is present", () => {
    const without = build_satellite_scene([satellite({})], EPOCH_DATE);
    const with_geo = build_satellite_scene([satellite({ norad_id: 2, elements: GEO_ELEMENTS })], EPOCH_DATE);
    expect(without.geo_ring).toEqual([]);
    expect(with_geo.geo_ring.length).toBeGreaterThan(0);
  });

  it("gives no geostationary satellite a ring of its own, even a flagship", () => {
    const scene = build_satellite_scene(
      [satellite({ flagship: "radarsat-2", elements: GEO_ELEMENTS })],
      EPOCH_DATE,
    );
    expect(scene.rings).toEqual([]);
  });

  it("skips a satellite whose elements cannot be propagated, rather than failing the scene", () => {
    const decayed = { ...LEO_ELEMENTS, MEAN_MOTION: 0 };
    const scene = build_satellite_scene([satellite({ elements: decayed }), satellite({ norad_id: 2 })], EPOCH_DATE);
    expect(scene.dots.map((d) => d.norad_id)).toEqual([2]);
  });
});

describe("orbit_class", () => {
  it("classes a one-day, near-circular orbit as geostationary", () => {
    expect(orbit_class(GEO_ELEMENTS)).toBe("geo");
  });

  it("classes a retrograde near-polar low orbit as sun-synchronous", () => {
    expect(orbit_class({ ...LEO_ELEMENTS, INCLINATION: 97.7 })).toBe("sso");
  });

  it("classes an inclined low orbit like the ISS's as low Earth orbit", () => {
    expect(orbit_class(LEO_ELEMENTS)).toBe("leo");
  });

  it("does not call a true polar orbit sun-synchronous", () => {
    expect(orbit_class({ ...LEO_ELEMENTS, INCLINATION: 90 })).toBe("leo");
  });
});

describe("build_satellite_scene ring classes", () => {
  it("tags each ring with its orbit class, so it can be coloured by it", () => {
    const scene = build_satellite_scene(
      [
        satellite({ norad_id: 1, flagship: "iss" }),
        satellite({ norad_id: 2, flagship: "rcm", elements: { ...LEO_ELEMENTS, INCLINATION: 97.7 } }),
      ],
      EPOCH_DATE,
    );
    expect(scene.rings.map((r) => r.orbit_class)).toEqual(["leo", "sso"]);
  });

  it("tags each flagship with its orbit class too", () => {
    const scene = build_satellite_scene([satellite({ flagship: "radarsat-2", elements: GEO_ELEMENTS })], EPOCH_DATE);
    expect(scene.flagships[0].orbit_class).toBe("geo");
  });
});

describe("satellite_vitals", () => {
  const satrec = json2satrec(LEO_ELEMENTS);
  const vitals = satellite_vitals(satrec, EPOCH_DATE);

  it("reports the orbital period in minutes", () => {
    expect(vitals?.period_min).toBeCloseTo(1440 / 15.5, 0);
  });

  it("reports inclination in degrees, not radians", () => {
    expect(vitals?.inclination_deg).toBeCloseTo(51.64, 1);
  });

  it("reports altitude above the surface, not distance from the centre", () => {
    expect(vitals?.altitude_km).toBeGreaterThan(200);
    expect(vitals?.altitude_km).toBeLessThan(600);
  });

  it("reports orbital speed in km/s", () => {
    expect(vitals?.speed_km_s).toBeGreaterThan(7);
    expect(vitals?.speed_km_s).toBeLessThan(8.5);
  });

  it("reports latitude within the orbit's inclination and longitude in [-180, 180]", () => {
    expect(Math.abs(vitals?.latitude_deg ?? 99)).toBeLessThanOrEqual(52);
    expect(Math.abs(vitals?.longitude_deg ?? 999)).toBeLessThanOrEqual(180);
  });
});

describe("format_vitals", () => {
  const VITALS = {
    altitude_km: 417.6,
    speed_km_s: 7.6612,
    latitude_deg: -12.345,
    longitude_deg: 73.9,
    period_min: 92.88,
    inclination_deg: 51.64,
  };

  it("rounds altitude to whole km and speed to two decimals", () => {
    expect(format_vitals(VITALS).motion).toBe("418 km · 7.66 km/s");
  });

  it("writes hemispheres as letters instead of signs", () => {
    expect(format_vitals(VITALS).position).toBe("12.35°S 73.90°E");
    expect(format_vitals({ ...VITALS, latitude_deg: 45.5, longitude_deg: -73.75 }).position).toBe("45.50°N 73.75°W");
  });

  it("gives period in minutes and inclination in degrees", () => {
    expect(format_vitals(VITALS).orbit).toBe("92.9 min · 51.6° incl");
  });

  it("switches a long period to hours so geostationary doesn't read as 1436 min", () => {
    expect(format_vitals({ ...VITALS, period_min: 1436.1 }).orbit).toBe("23.9 h · 51.6° incl");
  });
});
