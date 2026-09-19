// Orbit maths for the hero globe's satellites (#203): SGP4 propagation via
// satellite.js, the frame change from the inertial frame SGP4 works in onto
// the globe's own axes, the altitude compression that keeps geostationary
// on the canvas, and ring sampling. Like globe.ts's own maths, everything
// here is plain functions over plain data, tested in orbits.test.ts.
//
// Frames. SGP4 returns positions in an Earth-centred inertial frame: Z is
// the polar axis, X points at the vernal equinox, and the Earth turns
// underneath at one revolution per sidereal day. The globe's axes (see
// globe.ts's `lonlat_to_unit_vector`) put the polar axis on Y and longitude
// 0 on +Z. `eci_to_globe_axes` relabels inertial axes onto the globe's -
// X onto +Z, Y onto +X, Z onto +Y - without turning anything, so the result
// is still inertial. Turning it into the Earth frame is a rotation about the
// polar axis by Greenwich sidereal time, which in the globe's axes is just
// `rotate_y` by -gmst. That folds straight into the spin the globe already
// applies, so an inertial point is drawn with `inertial_spin(spin, gmst)`
// in place of `spin` and needs no other conversion. Rings are sampled once
// in the inertial frame, where an orbit is (near enough) fixed, and pick up
// sidereal rotation for free every frame the same way the dots do.
//
// Deliberately imports nothing from globe.ts at runtime: globe.ts's
// start_globe draws what this module builds, so the dependency runs one
// way only.

import { degreesLat, degreesLong, eciToGeodetic, gstime, json2satrec, propagate, type SatRec } from "satellite.js";

import type { Segment, Vec3 } from "./globe.js";
import {
  parse_satellite_payload,
  type CatalogSatellite,
  type FlagshipKind,
  type GpElements,
  type SatellitePayload,
} from "./satellite-catalog.js";

// WGS 72 equatorial radius - the one SGP4 itself uses.
export const EARTH_RADIUS_KM = 6378.137;
export const GEO_ALTITUDE_KM = 35_786;

// Log compression: display radius = 1 + gain * ln(1 + altitude / knee).
// The knee sets where the curve bends: well below it altitude reads almost
// linearly, well above it each doubling adds the same step. At 20 km, low
// orbits (300-1000 km) sit well out from the wireframe while geostationary
// lands at about 1.36 - right at the canvas edge once SPHERE_FILL_RATIO
// leaves room for it, where the hero's own crop is allowed to take it.
export const ALTITUDE_KNEE_KM = 20;

// The gain is pinned by one reference point rather than typed in: the ISS
// sits this far out, visibly clear of the wireframe rather than pasted to
// it. A starting value - the final one is a call for the dev server, since
// nothing here can judge it by eye.
const ISS_ALTITUDE_KM = 420;
const ISS_DISPLAY_RADIUS = 1.15;
const ALTITUDE_GAIN = (ISS_DISPLAY_RADIUS - 1) / Math.log(1 + ISS_ALTITUDE_KM / ALTITUDE_KNEE_KM);

// Mean motion, in revolutions per day, of a geostationary orbit (one turn
// per sidereal day), and how far off it still counts. Wide enough for the
// drifting and inclined end-of-life birds in the Canadian fleet, narrow
// enough that nothing in a 12-hour orbit qualifies.
const GEO_MEAN_MOTION = 1.0027;
const GEO_MEAN_MOTION_TOLERANCE = 0.1;
const GEO_MAX_ECCENTRICITY = 0.05;

// Sun-synchronous orbits are retrograde and near-polar, about 96-104
// degrees depending on altitude. True polar (90) is not.
const SSO_MIN_INCLINATION_DEG = 95;
const SSO_MAX_INCLINATION_DEG = 105;

// Points sampled around each flagship ring and the geostationary ring.
// Even, so dashing splits them into whole dash/gap pairs.
export const RING_SAMPLES = 180;
export const GEO_RING_SAMPLES = 240;

const MS_PER_MINUTE = 60_000;

export const SATELLITES_URL = "/landing/satellites.json";

interface EciPosition {
  x: number;
  y: number;
  z: number;
}

export function display_radius(altitude_km: number): number {
  return 1 + ALTITUDE_GAIN * Math.log(1 + Math.max(0, altitude_km) / ALTITUDE_KNEE_KM);
}

// Relabels an inertial position onto the globe's axes (see the header
// comment) and scales it to its compressed display radius.
export function eci_to_globe_axes(eci: EciPosition): Vec3 {
  const distance = Math.sqrt(eci.x * eci.x + eci.y * eci.y + eci.z * eci.z);
  const scale = display_radius(distance - EARTH_RADIUS_KM) / distance;
  return [eci.y * scale, eci.z * scale, eci.x * scale];
}

// The spin an inertial point is drawn with: the globe's own spin, less the
// Earth's sidereal rotation at the current real time (see the header).
export function inertial_spin(spin_rad: number, gmst_rad: number): number {
  return spin_rad - gmst_rad;
}

// Greenwich mean sidereal time, in radians. Wrapped so globe.ts reaches
// satellite.js only through this module.
export function sidereal_time(date: Date): number {
  return gstime(date);
}

// Where a satellite is at `date`, on the globe's inertial axes, or null
// when SGP4 can't place it (decayed, or elements too stale to trust).
export function propagate_to_globe(satrec: SatRec, date: Date): Vec3 | null {
  const state = propagate(satrec, date);
  const position = state?.position;
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) {
    return null;
  }
  return eci_to_globe_axes(position);
}

// One full revolution from `start`, as `samples + 1` points so the last
// chord closes back on the first. Empty if SGP4 fails anywhere along it.
export function sample_orbit(satrec: SatRec, start: Date, samples: number): Vec3[] {
  // satrec.no is mean motion in radians per minute.
  const period_ms = ((2 * Math.PI) / satrec.no) * MS_PER_MINUTE;
  const points: Vec3[] = [];
  for (let i = 0; i <= samples; i++) {
    const point = propagate_to_globe(satrec, new Date(start.getTime() + (period_ms * i) / samples));
    if (!point) {
      return [];
    }
    points.push(point);
  }
  return points;
}

// Pairs alternate chords of a polyline into gl.LINES segments - chord 0-1
// drawn, 1-2 skipped, 2-3 drawn - which is what dashes a ring. Dashing is
// what tells an orbit apart from the solid wireframe without spending a new
// colour on it.
export function dashed_ring(points: readonly Vec3[]): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    segments.push([points[i], points[i + 1]]);
  }
  return segments;
}

// The one ring every geostationary satellite shares: equatorial, at
// geostationary display radius. Symmetric about the polar axis, so it is
// the same in the inertial and Earth frames and needs no sidereal spin.
export function geo_ring_segments(samples: number): Segment[] {
  const radius = display_radius(GEO_ALTITUDE_KM);
  const points: Vec3[] = [];
  for (let i = 0; i <= samples; i++) {
    const angle = (2 * Math.PI * i) / samples;
    points.push([Math.sin(angle) * radius, 0, Math.cos(angle) * radius]);
  }
  return dashed_ring(points);
}

export function is_geostationary(elements: GpElements): boolean {
  return (
    Math.abs(Number(elements.MEAN_MOTION) - GEO_MEAN_MOTION) < GEO_MEAN_MOTION_TOLERANCE &&
    Number(elements.ECCENTRICITY) < GEO_MAX_ECCENTRICITY
  );
}

// The orbit regimes tracks are coloured by: low Earth orbit (the ISS,
// Hubble), sun-synchronous Earth observation (Sentinel, RCM, RADARSAT,
// GHGSat, EarthCARE), and geostationary. Everything in the selected set
// falls in one of the three; a medium orbit would land in "leo".
export type OrbitClass = "leo" | "sso" | "geo";

export const ORBIT_CLASS_LABELS: Record<OrbitClass, string> = {
  leo: "Low Earth orbit",
  sso: "Sun-synchronous",
  geo: "Geostationary",
};

export function orbit_class(elements: GpElements): OrbitClass {
  if (is_geostationary(elements)) {
    return "geo";
  }
  const inclination = Number(elements.INCLINATION);
  if (inclination >= SSO_MIN_INCLINATION_DEG && inclination <= SSO_MAX_INCLINATION_DEG) {
    return "sso";
  }
  return "leo";
}

export interface SatelliteVitals {
  altitude_km: number;
  speed_km_s: number;
  latitude_deg: number;
  longitude_deg: number;
  period_min: number;
  inclination_deg: number;
}

// What the hover readout shows for a satellite at `date`, or null when SGP4
// can't place it. Altitude is distance above the equatorial radius, the
// same measure `display_radius` compresses.
export function satellite_vitals(satrec: SatRec, date: Date): SatelliteVitals | null {
  const state = propagate(satrec, date);
  const position = state?.position;
  const velocity = state?.velocity;
  if (!position || !velocity) {
    return null;
  }
  const distance = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
  const geodetic = eciToGeodetic(position, gstime(date));
  return {
    altitude_km: distance - EARTH_RADIUS_KM,
    speed_km_s: Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2),
    latitude_deg: degreesLat(geodetic.latitude),
    longitude_deg: degreesLong(geodetic.longitude),
    // satrec.no is radians per minute; satrec.inclo is radians.
    period_min: (2 * Math.PI) / satrec.no,
    inclination_deg: (satrec.inclo * 180) / Math.PI,
  };
}

export interface FormattedVitals {
  motion: string;
  position: string;
  orbit: string;
}

// Periods longer than this read in hours - a geostationary 1436 min means
// nothing at a glance, 23.9 h does.
const PERIOD_HOURS_THRESHOLD_MIN = 180;

function hemisphere(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(2)}°${value < 0 ? negative : positive}`;
}

// The hover readout's three lines, formatted for display.
export function format_vitals(vitals: SatelliteVitals): FormattedVitals {
  const period =
    vitals.period_min > PERIOD_HOURS_THRESHOLD_MIN
      ? `${(vitals.period_min / 60).toFixed(1)} h`
      : `${vitals.period_min.toFixed(1)} min`;
  return {
    motion: `${Math.round(vitals.altitude_km)} km · ${vitals.speed_km_s.toFixed(2)} km/s`,
    position: `${hemisphere(vitals.latitude_deg, "N", "S")} ${hemisphere(vitals.longitude_deg, "E", "W")}`,
    orbit: `${period} · ${vitals.inclination_deg.toFixed(1)}° incl`,
  };
}

export interface SceneSatellite {
  norad_id: number;
  name: string;
  canadian: boolean;
  flagship: FlagshipKind | null;
  orbit_class: OrbitClass;
  satrec: SatRec;
}

export interface SceneRing {
  orbit_class: OrbitClass;
  segments: Segment[];
}

export interface SatelliteScene {
  // Flagship rings on inertial globe axes, one per flagship kind, already
  // dashed and tagged with the orbit class they're coloured by. Drawn with
  // `inertial_spin`.
  rings: SceneRing[];
  // The shared geostationary ring, empty when no geostationary satellite
  // made the payload. Earth-fixed, drawn with the globe's own spin.
  geo_ring: Segment[];
  // Plain dots: every satellite that isn't a flagship.
  dots: SceneSatellite[];
  // Flagships, drawn as DOM icons rather than dots.
  flagships: SceneSatellite[];
}

function to_satrec(elements: GpElements): SatRec | null {
  try {
    return json2satrec(elements);
  } catch {
    return null;
  }
}

// Builds everything the globe draws from the payload's satellites. A
// satellite SGP4 can't place at `now` is left out entirely rather than
// failing the scene. One ring per flagship kind, sampled from the first
// member of that kind, because siblings (RCM-1/2/3, the Sentinel pairs)
// share an orbit and a ring each would just stack. Geostationary
// satellites never get their own ring - the shared one covers them.
export function build_satellite_scene(satellites: readonly CatalogSatellite[], now: Date): SatelliteScene {
  const scene: SatelliteScene = { rings: [], geo_ring: [], dots: [], flagships: [] };
  const ringed = new Set<FlagshipKind>();
  let has_geo = false;

  for (const satellite of satellites) {
    const satrec = to_satrec(satellite.elements);
    if (!satrec || !propagate_to_globe(satrec, now)) {
      continue;
    }
    const entry: SceneSatellite = {
      norad_id: satellite.norad_id,
      name: satellite.name,
      canadian: satellite.canadian,
      flagship: satellite.flagship,
      orbit_class: orbit_class(satellite.elements),
      satrec,
    };
    const geo = entry.orbit_class === "geo";
    has_geo ||= geo;

    if (!entry.flagship) {
      scene.dots.push(entry);
      continue;
    }
    scene.flagships.push(entry);
    if (!geo && !ringed.has(entry.flagship)) {
      const segments = dashed_ring(sample_orbit(satrec, now, RING_SAMPLES));
      if (segments.length > 0) {
        scene.rings.push({ orbit_class: entry.orbit_class, segments });
        ringed.add(entry.flagship);
      }
    }
  }

  if (has_geo) {
    scene.geo_ring = geo_ring_segments(GEO_RING_SAMPLES);
  }
  return scene;
}

// Fetches the nightly payload scripts/fetch-satellites.ts writes. Absent
// (a local build that never ran the fetch, or a CelesTrak outage on the
// nightly run) or malformed resolves to null, and the globe draws without
// satellites. A thin passthrough to fetch plus parse_satellite_payload,
// which carries the logic and its tests.
export async function load_satellite_payload(url: string = SATELLITES_URL): Promise<SatellitePayload | null> {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return parse_satellite_payload(await response.json());
}
