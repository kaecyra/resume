// Layout maths for the "Building a pipeline" section's three graphs (#209).
//
// data/pipeline.yaml describes each band as nodes and the edges between
// them and carries no coordinate at all; this module turns that topology
// into positions, `d` strings and resolved ink. Like orbits.ts it is plain
// functions over plain data, no DOM, tested in pipeline-graph.test.ts. The
// Svelte side does nothing but read the result out.
//
// Two lanes, one frame. Every band draws in a 440-unit-wide viewBox with
// its trunk on a spine at x = 44 - exactly a tenth of the width, which is
// the relationship the CSS crossings between bands hang off - a branch lane
// at x = 130, and labels starting at x = 166. A band whose `graph_side` is
// `right` moves to the other column of its grid; the drawing inside it is
// not mirrored, so both spines stay a tenth of the way in from their own
// column's left edge and a crossing can still land on them.
//
// Where the numbers come from. The constants below are ported from the
// approved mockup's own SVG - its lane positions, its curve control
// offsets, its radii, its dash arrays and its arrow marker. The one thing
// the mockup cannot supply is a rule for vertical spacing: its per-node y
// values were placed by hand and its gaps between two nodes of the same
// kind run anywhere from 84 to 120 units, so no rule reproduces all three
// bands. The rhythm here (`trunk_pitch`, `branch_pitch`, the fork's lead
// and rise, the merge's drop) is fitted to bands 1 and 2, which between
// them exercise every feature there is: both land every node within 8 units
// of the mockup, with the fork point, the branch lane's 60-unit pitch and
// the merge drop exact. Band 3 - four trunk nodes and nothing else - comes
// out about 15% tighter than the hand-placed drawing, which spread it to
// match the height of the column facing it. That is a component's business,
// not a coordinate's. One rhythm the data drives beats three tables of
// literals that rot the moment a node is added.
//
// Tones are role names in the data, resolved here against palette.ts. A
// line is painted one step dimmer than a node of the same tone, which is
// why there are two ladders rather than one: `default` on a node is the
// page's text grey, `default` on a line is the secondary grey below it.

import type {
  PipelineBand,
  PipelineEdge,
  PipelineGraphSide,
  PipelineMark,
  PipelineNode,
  PipelineNodeStyle,
  PipelineTone,
} from "$lib/types.js";

import { ELEVATION, HUD_PALETTE, PIPELINE_INK } from "./palette.js";

// --- Geometry -------------------------------------------------------------

export const PIPELINE_GRAPH_GEOMETRY = {
  // The frame. 440 wide in every band; the height is computed.
  width: 440,
  spine_x: 44,
  branch_x: 130,
  label_x: 166,

  // The vertical rhythm.
  first_node_y: 40,
  trunk_pitch: 92,
  branch_pitch: 60,
  // How far below the fork source the trunk runs before it forks, and how
  // far the fork curve then falls. The lead is only spent where the band's
  // trunk carries a `head_tone` - see `fork_lead_of`.
  fork_lead: 64,
  fork_rise: 64,
  fork_control_out: 35,
  fork_control_in: 36,
  // Band 1's merge falls 100 units. The two control offsets are equal so
  // that the curve's t=0.5 *y* lands exactly halfway between the leaving
  // and landing nodes - the middle Bernstein terms cancel only when they
  // match. The halfway x comes free either way, since the controls sit on
  // the two lanes. The merge rider is hung at t=0.5, so this is the reason
  // the pair must stay equal.
  merge_drop: 100,
  merge_control_out: 38,
  merge_control_in: 38,

  // Strokes.
  edge_width: 2,
  ring_stroke_width: 2.5,
  tick_width: 2,
  // The checkmark, ported from the mockup stroke for stroke: start half a
  // unit left of where it ends, dip 4 and rise 8. The drawn box is 11 wide
  // and sits half a unit right of the node's centre, which is the mockup's
  // own asymmetry, not a rounding fault.
  tick_lead: 5,
  tick_dip: 4,
  tick_run: 7,
  tick_rise: 8,
  dotted_dash: "1 5",
  dashed_dash: "5 5",

  // Nodes. A ring is an outlined circle over the page ground and does not
  // grow with emphasis - the label weight carries that. A disc is solid, so
  // it does. A ticked node has to hold the tick.
  ring_radius: 6.5,
  disc_radius: 5.5,
  disc_emphasis_radius: 7.5,
  disc_tick_radius: 8.5,
  reader_radius: 9,
  reader_halo_radius: 14,
  reader_halo_width: 1.5,
  reader_halo_opacity: 0.45,

  // Vendor marks, drawn from 24-unit source icons, sitting between the node
  // and its label.
  mark_x: 95.5,
  mark_size: 19,
  mark_source_size: 24,

  // Labels. A node with a detail line lifts its primary label off the
  // baseline to make room; a node without one sits centred on it.
  label_dy: -3,
  label_dy_solo: 4,
  detail_dy: 13,
  // The reader node's label is set in the display face at 18px, so its
  // detail line needs more room under it than a 13px label does.
  reader_detail_dy: 16,
  // A detail written as more than one line steps by this much. The mockup's
  // own spacing for band 3's Cloudflare node, which it broke over two
  // <text> elements.
  detail_line_dy: 16,

  // The arrow off the bottom of a band that continues into the next one,
  // and the room left under the last node of one that does not.
  tail_gap: 1,
  tail_length: 46,
  tail_pad: 10,
  terminus_pad: 40,
} as const;

const GEO = PIPELINE_GRAPH_GEOMETRY;

// The marker every band's tail arrow points with. One definition shared by
// all three rather than the mockup's three identical copies.
export const PIPELINE_ARROW_TIP = {
  view_box: "0 0 10 10",
  ref_x: 8,
  ref_y: 5,
  width: 6,
  height: 6,
  d: "M0,1 L9,5 L0,9 z",
  ink: HUD_PALETTE.accent,
} as const;

// --- Ink ------------------------------------------------------------------

const NODE_TONE_INK: Record<PipelineTone, string> = {
  default: HUD_PALETTE.text,
  muted: HUD_PALETTE.secondary,
  dim: HUD_PALETTE.edge,
  accent: HUD_PALETTE.accent,
  green: PIPELINE_INK.pass,
};

// One rung down the same ladder: a two-unit line at the node's own tone
// would out-shout the node it connects.
const EDGE_TONE_INK: Record<PipelineTone, string> = {
  default: HUD_PALETTE.secondary,
  muted: HUD_PALETTE.edge,
  dim: PIPELINE_INK.dormant,
  accent: HUD_PALETTE.accent,
  green: PIPELINE_INK.pass,
};

// --- Shapes ---------------------------------------------------------------

export interface PipelinePoint {
  x: number;
  y: number;
}

export interface PipelineGraphMark {
  id: PipelineMark;
  // Top-left of the scaled icon box, with `scale` applied to a 24-unit
  // source: `translate(x, y) scale(scale)`.
  x: number;
  y: number;
  scale: number;
  ink: string;
}

export interface PipelineGraphTick {
  d: string;
  stroke: string;
  width: number;
  // A 2-unit checkmark drawn with mitred ends spikes at the elbow and reads
  // nothing like the mockup's, which rounds both. Carried here because this
  // module owns the tick's paint.
  linecap: "round";
  linejoin: "round";
}

export interface PipelineGraphNode {
  id: string;
  x: number;
  y: number;
  style: PipelineNodeStyle;
  radius: number;
  // The reader node's outer ring. Null on every other style.
  halo_radius: number | null;
  halo_width: number | null;
  halo_opacity: number | null;
  ink: string;
  fill: string;
  // Null on a filled node, which has no outline.
  stroke: string | null;
  stroke_width: number | null;
  tick: PipelineGraphTick | null;
  mark: PipelineGraphMark | null;
  emphasis: boolean;
  label_x: number;
  // The label's own ink, which is not always the node's. A plain label is
  // page text whatever tone its node carries; an emphasised one, and the
  // reader's own node, take the node's ink so the label says what the
  // drawing is pointing at. The mockup does exactly this - every
  // font-weight="500" label is inked, every plain one is #ededec.
  label_ink: string;
  label_y: number;
  // One y per line of the node's detail, empty where it carries none. A
  // list rather than a single y because the copy chooses its own breaks:
  // nothing here can measure a proportional face, so a detail long enough
  // to run past the drawing's box would be clipped rather than wrapped.
  detail_ys: number[];
}

// Absence is `null` everywhere in this module's output - never an optional
// property and never `undefined` - so the render side writes one idiom for
// one idea and `{#if segment.dash}` reads the same as `{#if node.tick}`.
export interface PipelineGraphSegment {
  // Unique within the band: the edge id, suffixed where one edge splits.
  id: string;
  edge_id: string;
  d: string;
  ink: string;
  width: number;
  // Null on a solid line, and null on a line whose dash the split gave to
  // its dormant stretch only.
  dash: string | null;
  linecap: "round" | null;
}

export interface PipelineGraphTail {
  d: string;
  ink: string;
  width: number;
}

export interface PipelineGraphLayout {
  id: string;
  side: PipelineGraphSide;
  view_box: string;
  width: number;
  height: number;
  spine_x: number;
  branch_x: number;
  label_x: number;
  // Where the branch leaves the trunk and where it rejoins it, or null in a
  // band that has no branch. A trunk edge spanning either is split there.
  // Both name the band's first departure, which in every band the mockup
  // draws is its only one; a band that leaves twice splits its trunk at all
  // four points regardless.
  fork_y: number | null;
  merge_y: number | null;
  nodes: PipelineGraphNode[];
  segments: PipelineGraphSegment[];
  // Null in a band that ends rather than continuing into the next one.
  tail: PipelineGraphTail | null;
}

// --- Curves ---------------------------------------------------------------

// A point on a cubic Bezier, in Bernstein form. The merge-riding node in
// band 1 is this at t = 0.5 of the band's merge curve rather than a
// coordinate of its own, so it stays on the curve when the curve moves.
export function cubic_point_at(
  p0: PipelinePoint,
  c1: PipelinePoint,
  c2: PipelinePoint,
  p3: PipelinePoint,
  t: number,
): PipelinePoint {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;

  return {
    x: b0 * p0.x + b1 * c1.x + b2 * c2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * c1.y + b2 * c2.y + b3 * p3.y,
  };
}

// SVG coordinates, with binary floating-point dust trimmed off so two runs
// of the same layout produce byte-identical `d` strings.
function coord(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function line_path(x: number, from_y: number, to_y: number): string {
  return `M${coord(x)},${coord(from_y)} L${coord(x)},${coord(to_y)}`;
}

function cubic_path(p0: PipelinePoint, c1: PipelinePoint, c2: PipelinePoint, p3: PipelinePoint): string {
  return (
    `M${coord(p0.x)},${coord(p0.y)} C${coord(c1.x)},${coord(c1.y)}` +
    ` ${coord(c2.x)},${coord(c2.y)} ${coord(p3.x)},${coord(p3.y)}`
  );
}

function fork_curve(fork_y: number, land_y: number): PipelinePoint[] {
  return [
    { x: GEO.spine_x, y: fork_y },
    { x: GEO.spine_x, y: fork_y + GEO.fork_control_out },
    { x: GEO.branch_x, y: land_y - GEO.fork_control_in },
    { x: GEO.branch_x, y: land_y },
  ];
}

function merge_curve(leave_y: number, land_y: number): PipelinePoint[] {
  return [
    { x: GEO.branch_x, y: leave_y },
    { x: GEO.branch_x, y: leave_y + GEO.merge_control_out },
    { x: GEO.spine_x, y: land_y - GEO.merge_control_in },
    { x: GEO.spine_x, y: land_y },
  ];
}

// --- Placement ------------------------------------------------------------

// One trip off the trunk: where the lane change leaves the spine, where it
// lands back, and the nodes at either end so an edge can find its own
// departure rather than the band's last one. A band that leaves twice has
// two of these; reading a band-global drew the first curve from the second
// fork's y and ran it back up the page.
interface Excursion {
  fork_y: number;
  merge_y: number | null;
  entry_id: string;
  exit_id: string | null;
}

interface Rhythm {
  // Parallel to `band.nodes`, so the layout can stay in data order, plus
  // the same placements by id for the edges to look up.
  at: PipelinePoint[];
  by_id: Map<string, PipelinePoint>;
  excursions: Excursion[];
}

function lane_x(node: PipelineNode): number {
  return node.lane === "branch" ? GEO.branch_x : GEO.spine_x;
}

// Where a branch run ends: the first node after it that stands on the
// trunk again, or null where the band forks and never returns. Merge-lane
// nodes ride the curve rather than the lane, so they are not the end of
// anything.
function branch_run_end(band: PipelineBand, entry_index: number): number | null {
  for (let index = entry_index + 1; index < band.nodes.length; index += 1) {
    const node = band.nodes[index];
    if (node.lane === "merge") {
      continue;
    }
    if (node.lane !== "branch") {
      return index;
    }
  }
  return null;
}

// A trunk edge with a `head_tone` says the stretch above the fork is still
// the live tip, and that stretch has to be long enough to read as one - so
// the trunk runs a lead past its last node before forking, clearing that
// node's own label block. A band whose trunk keeps running underneath the
// branch (band 2: Watchtower does not stop because there is an image to
// pull) has no such stretch to show, and its fork leaves at the node
// itself. Both are the mockup's own behaviour, and this is the difference
// the two bands' data already records.
//
// Only an edge that actually spans this departure says anything about it:
// it has to start above the branch run and reach at least as far as the
// node the run lands on. One sitting entirely below the merge used to move
// the fork, and everything under it, by the whole lead.
function fork_lead_of(
  band: PipelineBand,
  entry_index: number,
  index_of: ReadonlyMap<string, number>,
): number {
  const exit_index = branch_run_end(band, entry_index);
  const spans_the_fork = band.edges.some((edge) => {
    if (edge.kind !== "trunk" || edge.head_tone === undefined) {
      return false;
    }
    const from = index_of.get(edge.from);
    const to = index_of.get(edge.to);
    if (from === undefined || to === undefined || from >= entry_index) {
      return false;
    }
    return exit_index === null ? to > entry_index : to >= exit_index;
  });

  return spans_the_fork ? GEO.fork_lead : 0;
}

// The single merge curve's endpoints, or null where the band has no merge
// edge or names nodes it does not carry. One reading, shared by the drawn
// segment and by whatever rides it.
function merge_endpoints(
  band: PipelineBand,
  by_id: ReadonlyMap<string, PipelinePoint>,
): { leave_y: number; land_y: number } | null {
  for (const edge of band.edges) {
    if (edge.kind !== "merge") {
      continue;
    }
    const leave = by_id.get(edge.from);
    const land = by_id.get(edge.to);
    if (leave !== undefined && land !== undefined) {
      return { leave_y: leave.y, land_y: land.y };
    }
  }
  return null;
}

// Walks the band's nodes in data order, which data/pipeline.yaml keeps
// topological: down the trunk, out along the branch, back onto the trunk.
// Merge-lane nodes are skipped here and hung off the merge curve afterwards.
function place_nodes(band: PipelineBand): Rhythm {
  const at: PipelinePoint[] = [];
  const by_id = new Map<string, PipelinePoint>();
  const index_of = new Map(band.nodes.map((node, index) => [node.id, index]));
  const excursions: Excursion[] = [];

  let open: Excursion | null = null;
  let previous: PipelineNode | null = null;
  let cursor = GEO.first_node_y;

  for (let index = 0; index < band.nodes.length; index += 1) {
    const node = band.nodes[index];
    if (node.lane === "merge") {
      continue;
    }

    if (previous === null) {
      cursor = GEO.first_node_y;
    } else if (previous.lane !== "branch" && node.lane === "branch") {
      // Leaving the trunk.
      const fork_y = cursor + fork_lead_of(band, index, index_of);
      cursor = fork_y + GEO.fork_rise;
      open = { fork_y, merge_y: null, entry_id: node.id, exit_id: null };
      excursions.push(open);
    } else if (previous.lane === "branch" && node.lane !== "branch") {
      cursor += GEO.merge_drop;
      if (open !== null) {
        open.merge_y = cursor;
        open.exit_id = node.id;
        open = null;
      }
    } else if (node.lane === "branch") {
      cursor += GEO.branch_pitch;
    } else {
      cursor += GEO.trunk_pitch;
    }

    const placement: PipelinePoint = { x: lane_x(node), y: cursor };
    at[index] = placement;
    by_id.set(node.id, placement);
    previous = node;
  }

  // The merge riders, hung off the curve rather than laid out. The curve is
  // the one `build_segments` draws, read off the merge edge's own endpoints
  // rather than re-derived from whichever branch node happens to come last
  // in the data - those agree only when the band merges from its last
  // branch node, and a rider hung off the wrong one floats in open space.
  // A band with no merge curve has nothing to ride, so its riders fall back
  // onto the spine one trunk pitch on.
  const merge_ends = merge_endpoints(band, by_id);

  for (let index = 0; index < band.nodes.length; index += 1) {
    const node = band.nodes[index];
    if (node.lane !== "merge") {
      continue;
    }

    let placement: PipelinePoint;
    if (merge_ends === null) {
      cursor += GEO.trunk_pitch;
      placement = { x: GEO.spine_x, y: cursor };
    } else {
      const [p0, c1, c2, p3] = merge_curve(merge_ends.leave_y, merge_ends.land_y);
      placement = cubic_point_at(p0, c1, c2, p3, 0.5);
    }

    at[index] = placement;
    by_id.set(node.id, placement);
  }

  return { at, by_id, excursions };
}

// --- Node paint -----------------------------------------------------------

// A node's detail as the lines it will be drawn on. One string is one
// line; a list is the copy choosing its own breaks, which is the only way
// the break can be chosen at all - nothing here can measure text. Exported
// because the drawing needs the same reading the geometry was built from.
export function detail_lines(node: Pick<PipelineNode, "detail">): string[] {
  if (typeof node.detail === "string") {
    return node.detail.length > 0 ? [node.detail] : [];
  }
  if (Array.isArray(node.detail)) {
    return node.detail.filter((line) => typeof line === "string" && line.length > 0);
  }
  return [];
}

function node_radius(node: PipelineNode): number {
  if (node.style === "reader") {
    return GEO.reader_radius;
  }
  if (node.style === "ring") {
    return GEO.ring_radius;
  }
  if (node.tick === true) {
    return GEO.disc_tick_radius;
  }
  return node.emphasis === true ? GEO.disc_emphasis_radius : GEO.disc_radius;
}

function build_node(node: PipelineNode, at: PipelinePoint): PipelineGraphNode {
  const ink = NODE_TONE_INK[node.tone];
  const radius = node_radius(node);
  const is_reader = node.style === "reader";
  const is_ring = node.style === "ring";
  const lines = detail_lines(node);
  const has_detail = lines.length > 0;
  const detail_dy = is_reader ? GEO.reader_detail_dy : GEO.detail_dy;

  return {
    id: node.id,
    x: at.x,
    y: at.y,
    style: node.style,
    radius,
    halo_radius: is_reader ? GEO.reader_halo_radius : null,
    halo_width: is_reader ? GEO.reader_halo_width : null,
    halo_opacity: is_reader ? GEO.reader_halo_opacity : null,
    ink,
    fill: is_ring ? HUD_PALETTE.background : ink,
    stroke: is_ring ? ink : null,
    stroke_width: is_ring ? GEO.ring_stroke_width : null,
    tick:
      node.tick === true
        ? {
            d:
              `M${coord(at.x - GEO.tick_lead)},${coord(at.y)}` +
              ` l${coord(GEO.tick_dip)},${coord(GEO.tick_dip)}` +
              ` l${coord(GEO.tick_run)},${coord(-GEO.tick_rise)}`,
            stroke: ELEVATION.void,
            width: GEO.tick_width,
            linecap: "round",
            linejoin: "round",
          }
        : null,
    mark:
      node.mark === undefined
        ? null
        : {
            id: node.mark,
            x: GEO.mark_x,
            y: at.y - GEO.mark_size / 2,
            scale: GEO.mark_size / GEO.mark_source_size,
            ink: NODE_TONE_INK[node.mark_tone ?? node.tone],
          },
    emphasis: node.emphasis === true,
    label_x: GEO.label_x,
    label_ink: node.emphasis === true || node.style === "reader" ? ink : HUD_PALETTE.text,
    label_y: at.y + (has_detail ? GEO.label_dy : GEO.label_dy_solo),
    detail_ys: lines.map((_unused, line) => at.y + detail_dy + line * GEO.detail_line_dy),
  };
}

// --- Edges ----------------------------------------------------------------

function dash_of(edge: PipelineEdge): Pick<PipelineGraphSegment, "dash" | "linecap"> {
  if (edge.dash === "dotted") {
    // Round caps are what turn a 1-unit dash into a dot rather than a tick.
    return { dash: GEO.dotted_dash, linecap: "round" };
  }
  if (edge.dash === "dashed") {
    return { dash: GEO.dashed_dash, linecap: null };
  }
  return { dash: null, linecap: null };
}

function segment(
  edge: PipelineEdge,
  id: string,
  d: string,
  ink: string,
  carries_dash: boolean,
): PipelineGraphSegment {
  return {
    id,
    edge_id: edge.id,
    d,
    ink,
    width: GEO.edge_width,
    ...(carries_dash ? dash_of(edge) : { dash: null, linecap: null }),
  };
}

// A trunk edge that spans the fork is reading two things at once: above the
// fork its lane is still the live tip, below it the branch has taken over.
// `head_tone` paints the live stretches - above the fork and, where the
// edge runs that far, below the merge - and `tone` plus the dash paint the
// dormant one between them. The data models band 1's whole trunk as this
// one edge, so the split lives here rather than in the YAML.
function split_points(from_y: number, to_y: number, rhythm: Rhythm): number[] {
  return rhythm.excursions
    .flatMap((excursion) => [excursion.fork_y, excursion.merge_y])
    .filter((at): at is number => at !== null && at > from_y && at < to_y)
    .sort((a, b) => a - b);
}

// The one stretch the branch is out for: between the fork and the merge.
// Everything outside that is the live tip again.
function is_dormant(start: number, end: number, rhythm: Rhythm): boolean {
  return rhythm.excursions.some(
    (excursion) =>
      start >= excursion.fork_y && (excursion.merge_y === null || end <= excursion.merge_y),
  );
}

function trunk_segments(edge: PipelineEdge, from_y: number, to_y: number, rhythm: Rhythm): PipelineGraphSegment[] {
  const head_tone = edge.head_tone;
  if (head_tone === undefined) {
    // No live head declared, so the whole edge is the dormant line.
    return [segment(edge, edge.id, line_path(GEO.spine_x, from_y, to_y), EDGE_TONE_INK[edge.tone], true)];
  }

  const head_ink = EDGE_TONE_INK[head_tone];
  const cuts = split_points(from_y, to_y, rhythm);
  if (cuts.length === 0) {
    // Nothing to cut, but a head was declared: an edge that lies wholly
    // outside the fork-to-merge stretch is live for its whole length and
    // takes the head ink, not the dormant one.
    const dormant = is_dormant(from_y, to_y, rhythm);
    return [
      segment(
        edge,
        edge.id,
        line_path(GEO.spine_x, from_y, to_y),
        dormant ? EDGE_TONE_INK[edge.tone] : head_ink,
        dormant,
      ),
    ];
  }

  const bounds = [from_y, ...cuts, to_y];

  return bounds.slice(0, -1).map((start, index) => {
    const end = bounds[index + 1];
    const dormant = is_dormant(start, end, rhythm);

    return segment(
      edge,
      `${edge.id}-${index}`,
      line_path(GEO.spine_x, start, end),
      dormant ? EDGE_TONE_INK[edge.tone] : head_ink,
      dormant,
    );
  });
}

function build_segments(band: PipelineBand, rhythm: Rhythm): PipelineGraphSegment[] {
  const segments: PipelineGraphSegment[] = [];

  for (const edge of band.edges) {
    const from = rhythm.by_id.get(edge.from);
    const to = rhythm.by_id.get(edge.to);
    if (from === undefined || to === undefined) {
      continue;
    }

    const ink = EDGE_TONE_INK[edge.tone];

    if (edge.kind === "fork") {
      // The departure this edge opens, not the band's last one. A fork edge
      // that opens no lane change - a band already in the branch lane - has
      // no fork point to hang off, and its source node does the job.
      const departure = rhythm.excursions.find((excursion) => excursion.entry_id === edge.to);
      const [p0, c1, c2, p3] = fork_curve(departure?.fork_y ?? from.y, to.y);
      segments.push(segment(edge, edge.id, cubic_path(p0, c1, c2, p3), ink, true));
      continue;
    }

    if (edge.kind === "merge") {
      const [p0, c1, c2, p3] = merge_curve(from.y, to.y);
      segments.push(segment(edge, edge.id, cubic_path(p0, c1, c2, p3), ink, true));
      continue;
    }

    if (edge.kind === "branch") {
      segments.push(segment(edge, edge.id, line_path(GEO.branch_x, from.y, to.y), ink, true));
      continue;
    }

    segments.push(...trunk_segments(edge, from.y, to.y, rhythm));
  }

  return segments;
}

// --- The band -------------------------------------------------------------

interface TailPlan {
  tail: PipelineGraphTail | null;
  height: number;
}

// The arrow continues the trunk, so it hangs off the last node standing on
// the spine rather than the last node in the data. A band that ends instead
// of continuing leaves room under its last node for that node's labels.
function plan_tail(band: PipelineBand, nodes: readonly PipelineGraphNode[]): TailPlan {
  const lowest = nodes.reduce<number>((deepest, node) => Math.max(deepest, node.y), GEO.first_node_y);
  const anchor = [...nodes].reverse().find((node) => node.x === GEO.spine_x);

  if (band.tail_arrow !== true || anchor === undefined) {
    return { tail: null, height: lowest + GEO.terminus_pad };
  }

  const start = anchor.y + anchor.radius + GEO.tail_gap;
  const end = start + GEO.tail_length;

  return {
    tail: {
      d: line_path(GEO.spine_x, start, end),
      ink: HUD_PALETTE.accent,
      width: GEO.edge_width,
    },
    // The arrow hangs off the last node on the spine, which in both real
    // bands is also the deepest node - but a band that forks and never
    // returns has branch nodes below it, and they have to stay in frame.
    height: Math.max(end + GEO.tail_pad, lowest + GEO.terminus_pad),
  };
}

export function build_pipeline_graph(band: PipelineBand): PipelineGraphLayout {
  const rhythm = place_nodes(band);
  const [first_excursion] = rhythm.excursions;
  const nodes = band.nodes.map((node, index) => build_node(node, rhythm.at[index]));
  const { tail, height } = plan_tail(band, nodes);

  return {
    id: band.id,
    side: band.graph_side,
    view_box: `0 0 ${coord(GEO.width)} ${coord(height)}`,
    width: GEO.width,
    height,
    spine_x: GEO.spine_x,
    branch_x: GEO.branch_x,
    label_x: GEO.label_x,
    fork_y: first_excursion?.fork_y ?? null,
    merge_y: first_excursion?.merge_y ?? null,
    nodes,
    segments: build_segments(band, rhythm),
    tail,
  };
}

export function build_pipeline_graphs(bands: readonly PipelineBand[]): PipelineGraphLayout[] {
  return bands.map(build_pipeline_graph);
}
