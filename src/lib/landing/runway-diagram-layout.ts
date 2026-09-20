// Pure geometry for RunwayDiagram.svelte: a PoP's runway list in, drawn
// runway markings out, for a square SVG viewBox. No DOM, no colour.
//
// Every runway end is a real lat/lon (runway-catalog.ts), and this module
// projects the whole set into one shared local frame - not one frame per
// runway - so parallel runways keep their true lateral offset and a
// runway that shares no real point with the others stays clear of them in
// the drawing. An earlier version centered each runway independently on
// its own heading and length, which drew every runway on a PoP through
// the same point regardless of where it actually sits - a different,
// wrong airport. Pavement *width* is still drawn exaggerated relative to
// length (a runway's real width is ~1-2% of its length - invisible at
// icon scale): two runways of equal physical width still draw at equal
// width, because both are scaled by the same real projection.
//
// Markings follow FAA/ICAO precision-runway convention, simplified to
// what reads at icon scale: a dashed centerline broken clear of the number
// at each end (so the dashes never run behind the digits), a few threshold
// stripes ("piano keys") just inboard of each end, a pair of aiming-point
// boxes flanking the centerline at each end (two side-by-side lanes, not
// one block spanning the full width), and each end's designator half
// rotated to read along the runway, sized to the runway's own drawn width
// so the glyph never crosses its edges. A closed runway carries none of
// that - real closed runways have their markings removed or X'd out - and
// gets a corner-to-corner X instead.
//
// Closed runways are returned first, active ones last: RunwayDiagram
// paints in array order, so a closed runway is laid down before, and is
// therefore fully covered by, any active pavement that overlaps it -
// matching how a live airport diagram reads (decommissioned pavement is
// the thing hidden under what's actually in use, not the other way round).

import type { Runway, RunwayEnd } from "./runway-catalog.js";

export const VIEW_SIZE = 200;

// Fraction of the viewBox kept clear around the drawing's own extent, so it
// never touches the frame it sits in.
const MARGIN_RATIO = 0.12;

// How much wider than its real proportion each runway's pavement draws, and
// the floor/ceiling (in viewBox units) that keeps it visible without ever
// swallowing a short runway.
const WIDTH_EXAGGERATION = 10;
const MIN_WIDTH_PX = 6;
const MAX_WIDTH_PX = 16;

// A real runway number is two stacked lines when its ident carries a
// parallel-runway letter (06L -> "06" over "L"), one line when it doesn't
// (10 -> "10" alone). The font-size is derived from the runway's own drawn
// width rather than fixed, so the block's total height (its extent across
// the runway, once rotated to read along it) always leaves clearance
// inside the pavement edges instead of overrunning them on a narrow
// runway - a two-line block needs a smaller font than a one-line block to
// fit the same width.
const ONE_LINE_BLOCK_EM = 1;
const TWO_LINE_BLOCK_EM = 2.2;
const NUMBER_CLEARANCE_RATIO = 0.8;
const MIN_NUMBER_FONT_SIZE = 3;
const MAX_NUMBER_FONT_SIZE = 6;

// How far along the runway, beyond where the number sits, the centerline's
// dashes stay clear of it - approximated from the number's own font-size,
// since a two-character line (either the digits or, stacked below it, the
// letter) runs roughly this many em along the runway.
const NUMBER_ALONG_CLEARANCE_EM = 1.3;

const NUMBER_INSET_PX = 20;

// Aiming-point markers are two boxes straddling the centerline - one per
// landing lane - not one block spanning the pavement: `_LANE_WIDTH_RATIO`
// is each box's own width as a fraction of the pavement width, and
// `_GAP_RATIO` is the gap between them (centered on the centerline) in the
// same units.
const AIMING_POINT_INSET_PX = 40;
const AIMING_POINT_LENGTH_PX = 10;
const AIMING_POINT_LANE_WIDTH_RATIO = 0.32;
const AIMING_POINT_GAP_RATIO = 0.24;
const THRESHOLD_STRIPE_INSET_PX = 8;
const THRESHOLD_STRIPE_LENGTH_PX = 10;
const THRESHOLD_STRIPE_WIDTH_OFFSETS = [-0.3, -0.1, 0.1, 0.3];

// Metres per degree of latitude, roughly constant everywhere; longitude's
// is scaled by cos(latitude), which is what makes this a projection rather
// than just plotting lat/lon as if they were flat metres.
const METRES_PER_DEG_LAT = 111_320;

export interface Point {
  x: number;
  y: number;
}

export interface RunwayNumber {
  lines: [string] | [string, string];
  x: number;
  y: number;
  rotation: number;
  font_size: number;
}

export interface RunwayGeometry {
  designator: string;
  closed: boolean;
  length_ft: number;
  pavement: [Point, Point, Point, Point];
  centerline: [Point, Point] | null;
  threshold_stripes: [Point, Point][];
  aiming_points: [Point, Point, Point, Point][];
  numbers: RunwayNumber[];
  closed_cross: [Point, Point][];
}

export interface RunwayDiagramGeometry {
  view_size: number;
  runways: RunwayGeometry[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// "06L" -> ["06", "L"] (stacked digits-over-letter, how it's painted on the
// pavement); "10" -> ["10"] (no parallel-runway letter to stack).
function ident_lines(ident: string): [string] | [string, string] {
  const match = ident.match(/^(\d+)([A-Za-z])?$/);
  if (!match) return [ident];
  return match[2] ? [match[1], match[2].toUpperCase()] : [match[1]];
}

function number_font_size(width_px: number, line_count: number): number {
  const block_em = line_count === 2 ? TWO_LINE_BLOCK_EM : ONE_LINE_BLOCK_EM;
  return clamp((width_px * NUMBER_CLEARANCE_RATIO) / block_em, MIN_NUMBER_FONT_SIZE, MAX_NUMBER_FONT_SIZE);
}

// Projects every runway end into one shared local frame (metres, north
// positive), then scales and centers that whole frame to fill the viewBox
// - so what comes out preserves every runway's true position, offset and
// heading relative to every other runway on the same PoP.
interface Projection {
  points: Map<RunwayEnd, Point>;
  metres_to_px: number;
}

function project_ends(runways: readonly Runway[]): Projection {
  const ends = runways.flatMap((r) => [r.low_end, r.high_end]);
  const lat0 = ends.reduce((sum, e) => sum + e.lat, 0) / ends.length;
  const metres_per_deg_lon = METRES_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);

  // Longitude delta from the first end, wrapped to (-180, 180]: an airport
  // straddling the antimeridian (e.g. Fiji's NAN) has ends whose raw
  // longitudes are ~179 and ~-179 - 358 degrees apart on paper but 2 apart
  // in the world. A plain mean/subtract would draw it as if it spanned
  // most of the globe; anchoring on one end and wrapping every delta keeps
  // it a couple of pixels wide, same as any other PoP. Latitude has no
  // equivalent seam (no PoP sits at a pole), so it stays a plain mean.
  const lon_anchor = ends[0].lon;
  const wrapped_dlon = (lon: number) => (((lon - lon_anchor + 180) % 360) + 360) % 360 - 180;

  const metres = new Map<RunwayEnd, Point>(
    ends.map((e) => [e, { x: wrapped_dlon(e.lon) * metres_per_deg_lon, y: (e.lat - lat0) * METRES_PER_DEG_LAT }]),
  );

  const xs = [...metres.values()].map((p) => p.x);
  const ys = [...metres.values()].map((p) => p.y);
  const bbox_w = Math.max(...xs) - Math.min(...xs);
  const bbox_h = Math.max(...ys) - Math.min(...ys);
  const bbox_center = { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 };

  const drawable_span = VIEW_SIZE * (1 - MARGIN_RATIO);
  const scale = drawable_span / Math.max(bbox_w, bbox_h, 1);
  const view_center = VIEW_SIZE / 2;

  const points = new Map<RunwayEnd, Point>();
  for (const [end, m] of metres) {
    points.set(end, {
      x: view_center + (m.x - bbox_center.x) * scale,
      y: view_center - (m.y - bbox_center.y) * scale,
    });
  }
  return { points, metres_to_px: scale };
}

const FT_TO_M = 0.3048;

export function layout_runway_diagram(runways: readonly Runway[] | undefined): RunwayDiagramGeometry {
  if (!runways || runways.length === 0) {
    return { view_size: VIEW_SIZE, runways: [] };
  }

  const { points: view_points, metres_to_px } = project_ends(runways);

  const geometries = runways.map((runway): RunwayGeometry => {
    const p_low = view_points.get(runway.low_end)!;
    const p_high = view_points.get(runway.high_end)!;
    const len = Math.hypot(p_high.x - p_low.x, p_high.y - p_low.y);
    const forward = { x: (p_high.x - p_low.x) / len, y: (p_high.y - p_low.y) / len };
    const across = { x: -forward.y, y: forward.x };

    const width_px = clamp(
      runway.width_ft * FT_TO_M * metres_to_px * WIDTH_EXAGGERATION,
      MIN_WIDTH_PX,
      MAX_WIDTH_PX,
    );
    const half_width = width_px / 2;
    const offset = (p: Point, across_offset: number): Point => ({
      x: p.x + across.x * across_offset,
      y: p.y + across.y * across_offset,
    });

    const pavement: [Point, Point, Point, Point] = [
      offset(p_low, -half_width),
      offset(p_high, -half_width),
      offset(p_high, half_width),
      offset(p_low, half_width),
    ];

    if (runway.closed) {
      return {
        designator: runway.designator,
        closed: true,
        length_ft: runway.length_ft,
        pavement,
        centerline: null,
        threshold_stripes: [],
        aiming_points: [],
        numbers: [],
        closed_cross: [
          [pavement[0], pavement[2]],
          [pavement[1], pavement[3]],
        ],
      };
    }

    // `dir` points from each threshold toward the runway's interior: +forward
    // from the low end, -forward from the high end.
    const ends: readonly [Point, Point][] = [
      [p_low, forward],
      [p_high, { x: -forward.x, y: -forward.y }],
    ];
    const move = (p: Point, dir: Point, distance: number): Point => ({
      x: p.x + dir.x * distance,
      y: p.y + dir.y * distance,
    });

    const threshold_stripes: [Point, Point][] = [];
    const stripe_inset = clamp(THRESHOLD_STRIPE_INSET_PX, 0, len * 0.3);
    for (const [end, dir] of ends) {
      const stripe_center = move(end, dir, stripe_inset);
      for (const width_ratio of THRESHOLD_STRIPE_WIDTH_OFFSETS) {
        const across_offset = width_ratio * width_px;
        const a = offset(move(stripe_center, dir, -THRESHOLD_STRIPE_LENGTH_PX / 2), across_offset);
        const b = offset(move(stripe_center, dir, THRESHOLD_STRIPE_LENGTH_PX / 2), across_offset);
        threshold_stripes.push([a, b]);
      }
    }

    const aiming_inset = clamp(AIMING_POINT_INSET_PX, 0, len * 0.35);
    const aiming_half_len = AIMING_POINT_LENGTH_PX / 2;
    const lane_width = width_px * AIMING_POINT_LANE_WIDTH_RATIO;
    const lane_gap_half = (width_px * AIMING_POINT_GAP_RATIO) / 2;
    const aiming_points: [Point, Point, Point, Point][] = ends.flatMap(([end, dir]) => {
      const center = move(end, dir, aiming_inset);
      const near = move(center, dir, -aiming_half_len);
      const far = move(center, dir, aiming_half_len);
      const lane = (inner_edge: number): [Point, Point, Point, Point] => [
        offset(near, inner_edge),
        offset(far, inner_edge),
        offset(far, inner_edge + lane_width),
        offset(near, inner_edge + lane_width),
      ];
      // One box on each side of the centerline, its inner edge `lane_gap_half`
      // off the centerline rather than meeting it.
      return [lane(-lane_gap_half - lane_width), lane(lane_gap_half)];
    });

    const heading_deg = ((Math.atan2(forward.x, -forward.y) * 180) / Math.PI + 360) % 360;
    const low_lines = ident_lines(runway.low_end.ident);
    const high_lines = ident_lines(runway.high_end.ident);
    const number_inset = clamp(NUMBER_INSET_PX, 0, len * 0.4);
    const low_font_size = number_font_size(width_px, low_lines.length);
    const high_font_size = number_font_size(width_px, high_lines.length);
    const numbers: RunwayNumber[] = [
      { lines: low_lines, ...move(p_low, forward, number_inset), rotation: heading_deg, font_size: low_font_size },
      {
        lines: high_lines,
        ...move(p_high, forward, -number_inset),
        rotation: heading_deg + 180,
        font_size: high_font_size,
      },
    ];

    // The centerline runs only between the two numbers, not through them:
    // each end's dashes stop `number_inset` plus that number's own
    // footprint short of the threshold, so nothing is drawn behind a digit.
    const centerline_clearance = (font_size: number) =>
      clamp(number_inset + font_size * NUMBER_ALONG_CLEARANCE_EM, 0, len * 0.45);
    const centerline: [Point, Point] = [
      move(p_low, forward, centerline_clearance(low_font_size)),
      move(p_high, forward, -centerline_clearance(high_font_size)),
    ];

    return {
      designator: runway.designator,
      closed: false,
      length_ft: runway.length_ft,
      pavement,
      centerline,
      threshold_stripes,
      aiming_points,
      numbers,
      closed_cross: [],
    };
  });

  // Stable sort: closed runways move to the front (painted first, so
  // active pavement painted after them fully covers any overlap) without
  // reordering runways within either group.
  geometries.sort((a, b) => Number(b.closed) - Number(a.closed));

  return { view_size: VIEW_SIZE, runways: geometries };
}
