import { describe, expect, it } from "vitest";

import { ELEVATION, HUD_PALETTE, PIPELINE_INK } from "./palette.js";
import {
  build_pipeline_graph,
  detail_lines,
  build_pipeline_graphs,
  cubic_point_at,
  PIPELINE_ARROW_TIP,
  PIPELINE_GRAPH_GEOMETRY as GEO,
  type PipelineGraphLayout,
  type PipelinePoint,
} from "./pipeline-graph.js";
import type { PipelineBand, PipelineEdge, PipelineNode } from "$lib/types.js";

// --- Fixtures -------------------------------------------------------------
//
// Inline and minimal, per ENGINEERING.md 17: a band is built from a
// baseline and overridden per case, so nothing here breaks when
// data/pipeline.yaml changes.
//
// The three band-shaped fixtures below mirror the real bands node for node
// and edge for edge. They are still inline - no file is read - but keeping
// the same topology means the coordinates pinned in "the ported geometry"
// can be read straight against the approved mockup's own SVG rather than
// being whatever the code happened to produce on the day.

function node(id: string, overrides: Partial<PipelineNode> = {}): PipelineNode {
  return { id, label: id, style: "disc", tone: "muted", lane: "trunk", ...overrides };
}

function edge(id: string, from: string, to: string, overrides: Partial<PipelineEdge> = {}): PipelineEdge {
  return { id, from, to, kind: "trunk", tone: "default", ...overrides };
}

function band(overrides: Partial<PipelineBand> = {}): PipelineBand {
  return {
    id: "band",
    graph_side: "left",
    nodes: [node("a"), node("b")],
    edges: [edge("a-b", "a", "b")],
    note: { column: "aside", text: "note" },
    ...overrides,
  };
}

// Band 1's shape: a trunk that forks to a branch lane, takes four branch
// nodes, merges back through a node riding the merge curve, and carries on
// down the trunk. The one trunk edge spanning the fork carries `head_tone`,
// exactly as data/pipeline.yaml models it.
function forked_band(overrides: Partial<PipelineBand> = {}): PipelineBand {
  return band({
    nodes: [
      node("repo", { style: "ring", tone: "default", detail: "main", mark: "github", emphasis: true }),
      node("feature", { lane: "branch", detail: "branched off main" }),
      node("commit-one", { lane: "branch" }),
      node("commit-two", { lane: "branch" }),
      node("local-spinup", { lane: "branch", style: "ring", tone: "default", detail: "on my laptop" }),
      node("pull-request", { lane: "branch", style: "ring", tone: "accent" }),
      node("ci-green", { lane: "merge", tone: "green", detail: "typecheck", emphasis: true }),
      node("merged", { style: "ring", tone: "default" }),
      node("actions", { detail: "tagged from the VERSION file", mark: "github-actions" }),
      node("ghcr", { tone: "accent", detail: "ghcr.io/kaecyra/resume", mark: "github", emphasis: true }),
    ],
    edges: [
      edge("main", "repo", "merged", { tone: "dim", dash: "dotted", head_tone: "muted" }),
      edge("branch-out", "repo", "feature", { kind: "fork" }),
      edge("first-commit", "feature", "commit-one", { kind: "branch" }),
      edge("second-commit", "commit-one", "commit-two", { kind: "branch" }),
      edge("bring-it-up", "commit-two", "local-spinup", { kind: "branch" }),
      edge("open-it", "local-spinup", "pull-request", { kind: "branch" }),
      edge("merge-back", "pull-request", "merged", { kind: "merge", tone: "green" }),
      edge("build-it", "merged", "actions"),
      edge("push-it", "actions", "ghcr"),
    ],
    ...overrides,
  });
}

// Band 2's shape, the inverse of band 1: Watchtower is the trunk and keeps
// running whether or not there is a digest to pull, so the trunk stays
// unbroken under the branch, carries no `head_tone`, and the fork leaves
// from the node itself rather than a lead below it.
function deploy_band(overrides: Partial<PipelineBand> = {}): PipelineBand {
  return band({
    id: "deploy",
    graph_side: "right",
    tail_arrow: true,
    nodes: [
      node("watchtower", { style: "ring", tone: "default", detail: "watching", mark: "docker", emphasis: true }),
      node("registry-check", { detail: "every five minutes" }),
      node("new-digest", { lane: "branch", tone: "accent", detail: "the tag moved", emphasis: true }),
      node("pull", { detail: "into Docker on the VM" }),
      node("recreate", { detail: "and cleans up the old one" }),
      node("healthcheck", { tone: "green", detail: "live", tick: true, emphasis: true }),
    ],
    edges: [
      edge("watching", "watchtower", "registry-check"),
      edge("digest-out", "registry-check", "new-digest", { kind: "fork", tone: "accent" }),
      edge("digest-back", "new-digest", "pull", { kind: "merge", tone: "accent" }),
      edge("keeps-watching", "registry-check", "pull"),
      edge("recreating", "pull", "recreate"),
      edge("checking", "recreate", "healthcheck"),
    ],
    ...overrides,
  });
}

// Band 3's shape: four trunk nodes, no branch, no tail arrow. The reader is
// the end of the drawing, so nothing continues past it.
function serve_band(overrides: Partial<PipelineBand> = {}): PipelineBand {
  return band({
    id: "serve",
    nodes: [
      node("nginx", {
        style: "ring",
        tone: "default",
        detail: "serving the site",
        mark: "nginx",
        mark_tone: "muted",
        emphasis: true,
      }),
      node("cloudflared", { style: "ring", tone: "default", detail: "opens the tunnel", emphasis: true }),
      node("cloudflare", {
        style: "ring",
        tone: "accent",
        detail: "your TLS session ends here",
        mark: "cloudflare",
        emphasis: true,
      }),
      node("reader", { style: "reader", tone: "accent", detail: "reading this now" }),
    ],
    edges: [
      edge("serving", "nginx", "cloudflared"),
      edge("tunnel", "cloudflared", "cloudflare", { dash: "dashed" }),
      edge("delivery", "cloudflare", "reader", { tone: "accent" }),
    ],
    ...overrides,
  });
}

function node_by_id(layout: PipelineGraphLayout, id: string) {
  const found = layout.nodes.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`no node ${id} in layout`);
  }
  return found;
}

function segments_of(layout: PipelineGraphLayout, edge_id: string) {
  return layout.segments.filter((segment) => segment.edge_id === edge_id);
}

function placements_of(layout: PipelineGraphLayout): [string, number, number][] {
  return layout.nodes.map((entry) => [entry.id, entry.x, entry.y]);
}

function paths_of(layout: PipelineGraphLayout): [string, string][] {
  return layout.segments.map((segment) => [segment.id, segment.d]);
}

// Reads a built `M x,y C x,y x,y x,y` back into its four points, so a test
// can ask where a node sits relative to the curve the module actually drew
// rather than to a curve the test re-derived from the same constants.
function cubic_of(d: string): [PipelinePoint, PipelinePoint, PipelinePoint, PipelinePoint] {
  const points = d
    .replace(/[MC]/g, " ")
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });
  if (points.length !== 4) {
    throw new Error(`not a cubic: ${d}`);
  }
  return [points[0], points[1], points[2], points[3]];
}

// --- cubic_point_at -------------------------------------------------------

describe("cubic_point_at", () => {
  it("returns the endpoints at t = 0 and t = 1", () => {
    const p0 = { x: 130, y: 412 };
    const c1 = { x: 130, y: 450 };
    const c2 = { x: 44, y: 474 };
    const p3 = { x: 44, y: 512 };

    expect(cubic_point_at(p0, c1, c2, p3, 0)).toEqual(p0);
    expect(cubic_point_at(p0, c1, c2, p3, 1)).toEqual(p3);
  });

  it("puts the midpoint of the mockup's own merge cubic at (87, 462)", () => {
    // The worked example from the approved mockup: the CI node sits at the
    // t = 0.5 point of `M130,412 C130,450 44,474 44,512`. If this drifts,
    // every merge-riding node drifts off its curve.
    const midpoint = cubic_point_at(
      { x: 130, y: 412 },
      { x: 130, y: 450 },
      { x: 44, y: 474 },
      { x: 44, y: 512 },
      0.5,
    );

    expect(midpoint).toEqual({ x: 87, y: 462 });
  });

  it("degenerates to linear interpolation when the controls sit on the chord", () => {
    const point = cubic_point_at({ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 6, y: 6 }, { x: 9, y: 9 }, 0.25);

    expect(point.x).toBeCloseTo(2.25, 10);
    expect(point.y).toBeCloseTo(2.25, 10);
  });

  it("is not symmetric about t for an asymmetric curve", () => {
    const p0 = { x: 0, y: 0 };
    const c1 = { x: 0, y: 90 };
    const c2 = { x: 10, y: 95 };
    const p3 = { x: 10, y: 100 };

    // A mistaken (1 - t) ordering of the Bernstein terms still passes the
    // endpoint and linear cases; it fails here.
    expect(cubic_point_at(p0, c1, c2, p3, 0.25).y).toBeGreaterThan(25);
  });
});

// --- The ported geometry --------------------------------------------------
//
// Every number in this block is a literal on purpose. Rebuilding an
// expectation out of the same GEO.* constant the source reads asserts only
// that arithmetic is arithmetic, and lets a constant be changed to anything
// at all with the suite still green. These pin the drawing itself.
//
// Where a literal matches the approved mockup (tasks/209/mockup.html) the
// mockup's own value is given beside it. Where the derived rhythm
// deliberately departs from the hand-placed drawing, the computed value is
// pinned and the mockup's is noted as the difference it is - see the
// "Vertical rhythm - SETTLED" decision. Changing the rhythm is allowed;
// changing it silently is not.

describe("the ported geometry", () => {
  it("pins band 1's nodes against the mockup's own coordinates", () => {
    const layout = build_pipeline_graph(forked_band({ tail_arrow: true }));

    // mockup:            40 / 168 / 228 / 288 / 348 / 412 / 462 / 512 / 600 / 685
    // derived is exact at six of ten and within 7 at the rest.
    expect(placements_of(layout)).toEqual([
      ["repo", 44, 40],
      ["feature", 130, 168],
      ["commit-one", 130, 228],
      ["commit-two", 130, 288],
      ["local-spinup", 130, 348],
      ["pull-request", 130, 408],
      ["ci-green", 87, 458],
      ["merged", 44, 508],
      ["actions", 44, 600],
      ["ghcr", 44, 692],
    ]);
    expect(layout.fork_y).toBe(104); // mockup 105
    expect(layout.merge_y).toBe(508); // mockup 512
    expect(layout.height).toBe(756.5); // mockup viewBox 744
    expect(layout.view_box).toBe("0 0 440 756.5");
    expect(layout.tail).toEqual({
      // mockup M44,693 L44,734
      d: "M44,700.5 L44,746.5",
      ink: HUD_PALETTE.accent,
      width: 2,
    });
  });

  it("pins band 1's curves and split trunk", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(paths_of(layout)).toEqual([
      // mockup: 44,40 -> 44,105 then 44,105 -> 44,512
      ["main-0", "M44,40 L44,104"],
      ["main-1", "M44,104 L44,508"],
      // mockup: M44,105 C44,140 130,132 130,168
      ["branch-out", "M44,104 C44,139 130,132 130,168"],
      ["first-commit", "M130,168 L130,228"],
      ["second-commit", "M130,228 L130,288"],
      ["bring-it-up", "M130,288 L130,348"],
      ["open-it", "M130,348 L130,408"],
      // mockup: M130,412 C130,450 44,474 44,512
      ["merge-back", "M130,408 C130,446 44,470 44,508"],
      ["build-it", "M44,508 L44,600"],
      ["push-it", "M44,600 L44,692"],
    ]);
  });

  it("pins band 2, which forks from the node itself and keeps its trunk", () => {
    const layout = build_pipeline_graph(deploy_band());

    // mockup:              40 / 124 / 188 / 288 / 388 / 480
    expect(placements_of(layout)).toEqual([
      ["watchtower", 44, 40],
      ["registry-check", 44, 132],
      ["new-digest", 130, 196],
      ["pull", 44, 296],
      ["recreate", 44, 388],
      ["healthcheck", 44, 480],
    ]);
    expect(layout.fork_y).toBe(132); // mockup 124
    expect(layout.merge_y).toBe(296); // mockup 288
    expect(layout.height).toBe(545.5); // mockup viewBox 552
    expect(paths_of(layout)).toEqual([
      ["watching", "M44,40 L44,132"],
      // mockup: M44,124 C44,158 130,152 130,188
      ["digest-out", "M44,132 C44,167 130,160 130,196"],
      // mockup: M130,188 C130,232 44,250 44,288
      ["digest-back", "M130,196 C130,234 44,258 44,296"],
      ["keeps-watching", "M44,132 L44,296"],
      ["recreating", "M44,296 L44,388"],
      ["checking", "M44,388 L44,480"],
    ]);
    expect(layout.tail?.d).toBe("M44,489.5 L44,535.5"); // mockup M44,490 L44,540
  });

  it("pins band 3 at the derived height, not the mockup's", () => {
    const layout = build_pipeline_graph(serve_band());

    // The mockup hand-places these at 40 / 140 / 260 / 380 and gives the
    // band a 420-unit frame, because it stretched this column to meet the
    // delivery readout facing it. The derived rhythm marches at 92 and
    // comes out 356. That is the accepted outcome, pinned here so a later
    // change to the rhythm shows up as a failure rather than as a quietly
    // different drawing.
    expect(placements_of(layout)).toEqual([
      ["nginx", 44, 40],
      ["cloudflared", 44, 132],
      ["cloudflare", 44, 224],
      ["reader", 44, 316],
    ]);
    expect(layout.height).toBe(356); // mockup viewBox 420
    expect(layout.tail).toBeNull();
    expect(paths_of(layout)).toEqual([
      ["serving", "M44,40 L44,132"],
      ["tunnel", "M44,132 L44,224"],
      ["delivery", "M44,224 L44,316"],
    ]);
  });

  it("pins the lanes, the label column and the frame width", () => {
    const layout = build_pipeline_graph(forked_band());

    // All four straight off the mockup's SVG, and the spine being exactly a
    // tenth of the width is what the CSS crossings between bands hang off.
    expect(layout.width).toBe(440);
    expect(layout.spine_x).toBe(44);
    expect(layout.branch_x).toBe(130);
    expect(layout.label_x).toBe(166);
    expect(layout.spine_x).toBe(layout.width * 0.1);
  });

  it("pins the stroke weights and dash arrays", () => {
    const layout = build_pipeline_graph(serve_band());

    // mockup: stroke-width 2 on every line, 2.5 on every ring, 5 5 on the
    // tunnel's dashes and 1 5 on band 1's dotted trunk.
    expect(layout.segments.map((segment) => segment.width)).toEqual([2, 2, 2]);
    expect(node_by_id(layout, "nginx").stroke_width).toBe(2.5);
    expect(segments_of(layout, "tunnel")[0].dash).toBe("5 5");
    expect(segments_of(build_pipeline_graph(forked_band()), "main")[1].dash).toBe("1 5");
  });

  it("pins the label, detail and vendor mark offsets", () => {
    const layout = build_pipeline_graph(forked_band());
    const repo = node_by_id(layout, "repo");
    const commit = node_by_id(layout, "commit-one");

    // repo sits at y 40 in both drawings, so these are the mockup's own
    // text and icon coordinates, unmodified.
    expect(repo.label_x).toBe(166);
    expect(repo.label_y).toBe(37);
    expect(repo.detail_ys[0]).toBe(53);
    expect(repo.mark).toMatchObject({ id: "github", x: 95.5, y: 30.5 });
    expect(repo.mark?.scale).toBeCloseTo(0.791667, 6); // mockup scale(0.7917)
    // commit-one sits at 228 in both, and carries no detail line, so its
    // label centres on the baseline instead of lifting off it.
    expect(commit.label_y).toBe(232);
    expect(commit.detail_ys).toEqual([]);
  });

  it("pins the reader node's rings and its wider detail gap", () => {
    const reader = node_by_id(build_pipeline_graph(serve_band()), "reader");

    // mockup, at its own y of 380: r 9 over an r 14 ring at 1.5 wide and
    // 0.45 opacity, label 3 above the baseline and detail 16 below it.
    expect(reader.radius).toBe(9);
    expect(reader.halo_radius).toBe(14);
    expect(reader.halo_width).toBe(1.5);
    expect(reader.halo_opacity).toBe(0.45);
    expect(reader.label_y).toBe(reader.y - 3);
    expect(reader.detail_ys[0]).toBe(reader.y + 16);
  });

  it("pins the tick against the mockup's own path", () => {
    const healthcheck = node_by_id(build_pipeline_graph(deploy_band()), "healthcheck");

    // The node lands on the mockup's own 480, so this is byte for byte the
    // mockup's `M39,480 l4,4 l7,-8` with its rounded ends.
    expect(healthcheck.tick).toEqual({
      d: "M39,480 l4,4 l7,-8",
      stroke: ELEVATION.void,
      width: 2,
      linecap: "round",
      linejoin: "round",
    });
  });

  it("pins the arrow tip marker shared by every band", () => {
    expect(PIPELINE_ARROW_TIP).toEqual({
      view_box: "0 0 10 10",
      ref_x: 8,
      ref_y: 5,
      width: 6,
      height: 6,
      d: "M0,1 L9,5 L0,9 z",
      ink: HUD_PALETTE.accent,
    });
  });
});

// --- Lanes and node ordering ---------------------------------------------

describe("node placement", () => {
  it("keeps nodes in data order", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(layout.nodes.map((entry) => entry.id)).toEqual([
      "repo",
      "feature",
      "commit-one",
      "commit-two",
      "local-spinup",
      "pull-request",
      "ci-green",
      "merged",
      "actions",
      "ghcr",
    ]);
  });

  it("runs strictly down the page, merge riders included", () => {
    const layout = build_pipeline_graph(forked_band());
    const ys = layout.nodes.map((entry) => entry.y);

    for (let index = 1; index < ys.length; index += 1) {
      expect(ys[index]).toBeGreaterThan(ys[index - 1]);
    }
  });

  it("places a lone node and draws nothing else", () => {
    const layout = build_pipeline_graph(band({ nodes: [node("only")], edges: [] }));

    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({ x: 44, y: 40 });
    expect(layout.segments).toEqual([]);
    expect(layout.tail).toBeNull();
    expect(layout.fork_y).toBeNull();
    expect(layout.merge_y).toBeNull();
    expect(layout.height).toBe(80);
  });

  it("still places every node when the band has no edges at all", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("a"), node("b", { lane: "branch" }), node("c")], edges: [] }),
    );

    expect(layout.segments).toEqual([]);
    // No fork edge means no fork curve, but the lane change still has to
    // open the same gap or the branch node would land on top of its
    // neighbour, and coming back opens the merge drop.
    expect(placements_of(layout)).toEqual([
      ["a", 44, 40],
      ["b", 130, 104],
      ["c", 44, 204],
    ]);
  });
});

// --- The merge rider ------------------------------------------------------

describe("merge-lane nodes", () => {
  it("puts a merge-lane node exactly on the merge curve's midpoint", () => {
    const layout = build_pipeline_graph(forked_band());
    const ci = node_by_id(layout, "ci-green");
    const [p0, c1, c2, p3] = cubic_of(segments_of(layout, "merge-back")[0].d);

    // Read off the curve the band actually drew, not one re-derived here
    // from the same constants.
    expect({ x: ci.x, y: ci.y }).toEqual(cubic_point_at(p0, c1, c2, p3, 0.5));
    // Halfway between the two lanes, which is what makes the node read as
    // riding the curve rather than standing in either lane.
    expect(ci.x).toBe(87);
  });

  it("rides the merge edge's own curve, not the last branch node's", () => {
    // A band that merges from `f1` while `f2` is the last branch node in
    // the data. Deriving the rider from the last branch node would put it
    // at y 214, thirty units off the curve the band draws.
    const layout = build_pipeline_graph(
      band({
        nodes: [
          node("root"),
          node("f1", { lane: "branch" }),
          node("f2", { lane: "branch" }),
          node("rider", { lane: "merge" }),
          node("landing"),
        ],
        edges: [
          edge("out", "root", "f1", { kind: "fork" }),
          edge("along", "f1", "f2", { kind: "branch" }),
          edge("back", "f1", "landing", { kind: "merge" }),
        ],
      }),
    );
    const rider = node_by_id(layout, "rider");
    const [p0, c1, c2, p3] = cubic_of(segments_of(layout, "back")[0].d);

    expect(segments_of(layout, "back")[0].d).toBe("M130,104 C130,142 44,226 44,264");
    expect({ x: rider.x, y: rider.y }).toEqual({ x: 87, y: 184 });
    expect({ x: rider.x, y: rider.y }).toEqual(cubic_point_at(p0, c1, c2, p3, 0.5));
  });

  it("falls back to the spine when the band has no merge curve to ride", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("a"), node("rider", { lane: "merge" })], edges: [] }),
    );

    expect(placements_of(layout)).toEqual([
      ["a", 44, 40],
      ["rider", 44, 132],
    ]);
  });
});

// --- Curves ---------------------------------------------------------------

describe("fork and merge curves", () => {
  it("runs a lead past the last trunk node before forking when there is a live head", () => {
    const layout = build_pipeline_graph(forked_band());

    // 64 below `repo`, which is the mockup's own behaviour: the solid head
    // stretch has to be long enough to read as one, clearing the node's
    // label block.
    expect(layout.fork_y).toBe(104);
    expect(layout.fork_y).toBeGreaterThan(node_by_id(layout, "repo").y);
    expect(node_by_id(layout, "feature").y).toBe(168);
  });

  it("forks straight off the source node when the trunk shows no live head", () => {
    // Band 2's shape: Watchtower keeps running whether or not there is a
    // digest to pull, so its trunk is unbroken, carries no `head_tone`, and
    // has no live stretch to make room for above the fork.
    const layout = build_pipeline_graph(deploy_band());

    expect(layout.fork_y).toBe(132);
    expect(layout.fork_y).toBe(node_by_id(layout, "registry-check").y);
    expect(node_by_id(layout, "new-digest").y).toBe(196);
    // The unbroken trunk still runs the whole way under the branch.
    expect(segments_of(layout, "keeps-watching")).toHaveLength(1);
  });

  it("drops the merge curve the ported distance onto the spine", () => {
    const layout = build_pipeline_graph(forked_band());
    const merge = segments_of(layout, "merge-back")[0];

    // The mockup's own drop, 412 to 512.
    expect(node_by_id(layout, "merged").y - node_by_id(layout, "pull-request").y).toBe(100);
    expect(layout.merge_y).toBe(508);
    expect(merge.ink).toBe(PIPELINE_INK.pass);
  });

  it("draws a fork edge from its source when no node ever leaves the trunk", () => {
    // A fork edge whose source is already in the branch lane: the band
    // never changes lane, so there is no fork point to hang the curve off
    // and the source node has to do the job.
    const layout = build_pipeline_graph(
      band({
        nodes: [node("a", { lane: "branch" }), node("b", { lane: "branch" })],
        edges: [edge("out", "a", "b", { kind: "fork" })],
      }),
    );

    expect(layout.fork_y).toBeNull();
    expect(segments_of(layout, "out")[0].d).toBe("M44,40 C44,75 130,64 130,100");
  });

  it("hangs each fork curve off its own departure, not off the band's last one", () => {
    // A band that leaves the trunk twice. The fork point is a property of
    // the stretch above each departure, so reading a band-global put the
    // first curve at the second fork's y and ran it back up the page.
    const layout = build_pipeline_graph(
      band({
        nodes: [
          node("t1"),
          node("br1", { lane: "branch" }),
          node("t2"),
          node("br2", { lane: "branch" }),
          node("t3"),
        ],
        edges: [
          edge("f1", "t1", "br1", { kind: "fork" }),
          edge("m1", "br1", "t2", { kind: "merge" }),
          edge("f2", "t2", "br2", { kind: "fork" }),
          edge("m2", "br2", "t3", { kind: "merge" }),
        ],
      }),
    );

    const [first] = cubic_of(segments_of(layout, "f1")[0].d);
    const [second] = cubic_of(segments_of(layout, "f2")[0].d);

    expect(first.y).toBeLessThan(second.y);
    expect(first.y).toBeLessThan(node_by_id(layout, "br1").y);
    expect(second.y).toBeLessThan(node_by_id(layout, "br2").y);
    // The published pair names the first departure, which is the one a
    // single-fork band has.
    expect(layout.fork_y).toBe(first.y);
  });

  it("keeps the fork where it is when a live head sits nowhere near it", () => {
    // `head_tone` earns the 64-unit lead only on a trunk edge that actually
    // spans the departure. One sitting entirely below the merge says
    // nothing about the stretch above the fork, and used to move it anyway.
    const nodes = [node("root"), node("br", { lane: "branch" }), node("land"), node("last")];
    const edges = [
      edge("out", "root", "br", { kind: "fork" }),
      edge("back", "br", "land", { kind: "merge" }),
    ];

    const plain = build_pipeline_graph(band({ nodes, edges }));
    const below = build_pipeline_graph(
      band({ nodes, edges: [...edges, edge("tail", "land", "last", { head_tone: "muted" })] }),
    );

    expect(below.fork_y).toBe(plain.fork_y);
    expect(node_by_id(below, "br").y).toBe(node_by_id(plain, "br").y);
  });

  it("stacks a detail written as two lines, one under the other", () => {
    // The mockup breaks band 3's Cloudflare detail over two <text> lines.
    // One string cannot say where that break goes, and a single line of
    // that length runs past the drawing's own box and is clipped.
    const layout = build_pipeline_graph(
      band({
        nodes: [node("a", { detail: ["first line", "second line"] }), node("b")],
        edges: [edge("a-b", "a", "b")],
      }),
    );
    const [first, second] = layout.nodes[0].detail_ys;

    expect(layout.nodes[0].detail_ys).toHaveLength(2);
    expect(second - first).toBe(GEO.detail_line_dy);
    expect(first).toBe(node_by_id(layout, "a").y + GEO.detail_dy);
  });

  it("treats a one-line detail and a one-entry list as the same thing", () => {
    const plain = build_pipeline_graph(band({ nodes: [node("a", { detail: "one" })], edges: [] }));
    const listed = build_pipeline_graph(band({ nodes: [node("a", { detail: ["one"] })], edges: [] }));

    expect(listed.nodes[0].detail_ys).toEqual(plain.nodes[0].detail_ys);
    expect(listed.nodes[0].label_y).toBe(plain.nodes[0].label_y);
  });

  it("gives a node with no detail no detail line at all", () => {
    const layout = build_pipeline_graph(band({ nodes: [node("a")], edges: [] }));

    expect(layout.nodes[0].detail_ys).toEqual([]);
    // A node with nothing under it sits centred on its own baseline.
    expect(layout.nodes[0].label_y).toBe(node_by_id(layout, "a").y + GEO.label_dy_solo);
  });

  it("reads a node's detail lines back in the order they were written", () => {
    expect(detail_lines({ detail: ["one", "two"] })).toEqual(["one", "two"]);
    expect(detail_lines({ detail: "one" })).toEqual(["one"]);
    expect(detail_lines({})).toEqual([]);
    // An empty line is no line: it would lift the label off its baseline to
    // make room for nothing, and the validator lets an empty string past.
    expect(detail_lines({ detail: "" })).toEqual([]);
    expect(detail_lines({ detail: ["one", ""] })).toEqual(["one"]);
  });

  it("inks an emphasised label with its node's own tone and a plain one with page text", () => {
    // The mockup's rule, and the only colour decision the drawing used to
    // make for itself: every font-weight="500" label carries the node's
    // ink, every plain one is the page's text colour whatever tone its node
    // has. A muted node's label is not muted.
    const layout = build_pipeline_graph(
      band({
        nodes: [
          node("lit", { tone: "green", emphasis: true }),
          node("plain", { tone: "muted" }),
          node("you", { style: "reader", tone: "accent" }),
        ],
        edges: [edge("down", "lit", "plain")],
      }),
    );
    const [lit, plain, reader] = layout.nodes;

    expect(lit.label_ink).toBe(lit.ink);
    expect(plain.label_ink).toBe(HUD_PALETTE.text);
    expect(plain.label_ink).not.toBe(plain.ink);
    // The reader's node is set in the display face and reads as the point
    // of the whole drawing, so it takes its ink without needing emphasis.
    expect(reader.label_ink).toBe(reader.ink);
    // The detail line is page-secondary for all three, whatever their node
    // tone. One value, but an unpinned one is a value nobody would notice
    // changing.
    for (const placed of layout.nodes) {
      expect(placed.detail_ink).toBe(HUD_PALETTE.secondary);
    }
  });

  it("skips an edge naming a node the band does not have", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("a")], edges: [edge("dangling", "a", "ghost")] }),
    );

    expect(layout.segments).toEqual([]);
  });

  it("spends the lead on a band that forks and never comes back", () => {
    // No landing node, so "reaches the node the run lands on" cannot be the
    // test. A live head that starts above the departure and ends below it
    // still spans the fork.
    const layout = build_pipeline_graph(
      band({
        nodes: [node("root"), node("br", { lane: "branch" }), node("tip", { lane: "branch" })],
        edges: [
          edge("out", "root", "br", { kind: "fork" }),
          edge("along", "br", "tip", { kind: "branch" }),
          edge("head", "root", "tip", { head_tone: "muted" }),
        ],
      }),
    );

    expect(layout.fork_y).toBe(GEO.first_node_y + GEO.fork_lead);
    expect(layout.merge_y).toBeNull();
  });

  it("lands a band that starts in the branch lane back on the trunk without a fork", () => {
    // Nothing opened an excursion, so the transition onto the trunk closes
    // nothing. It still costs the merge drop, because the node is a lane
    // change either way.
    const layout = build_pipeline_graph(
      band({
        nodes: [node("br", { lane: "branch" }), node("landing")],
        edges: [edge("back", "br", "landing", { kind: "merge" })],
      }),
    );

    expect(layout.fork_y).toBeNull();
    expect(layout.merge_y).toBeNull();
    expect(node_by_id(layout, "landing").y).toBe(GEO.first_node_y + GEO.merge_drop);
  });

  it("drops a merge rider onto the spine when the merge edge names a node the band lacks", () => {
    // `merge_endpoints` returns null here, so there is no curve to ride and
    // the rider falls back to the spine a trunk pitch on. Without a real
    // merge edge to read, hanging it at t=0.5 of nothing would put it at
    // the origin.
    const layout = build_pipeline_graph(
      band({
        nodes: [node("root"), node("b", { lane: "branch" }), node("rider", { lane: "merge" })],
        edges: [
          edge("out", "root", "b", { kind: "fork" }),
          edge("back", "b", "ghost", { kind: "merge" }),
        ],
      }),
    );
    const rider = node_by_id(layout, "rider");

    expect(rider.x).toBe(GEO.spine_x);
    expect(rider.y).toBe(node_by_id(layout, "b").y + GEO.trunk_pitch);
  });
});

// --- The trunk split ------------------------------------------------------

describe("trunk splitting", () => {
  it("cuts a head_tone trunk edge at the fork and paints the stretches apart", () => {
    const layout = build_pipeline_graph(forked_band());
    const parts = segments_of(layout, "main");

    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({
      d: "M44,40 L44,104",
      ink: HUD_PALETTE.edge,
      // The live stretch is solid whatever the dormant stretch does.
      dash: null,
      linecap: null,
    });
    expect(parts[1]).toMatchObject({
      d: "M44,104 L44,508",
      ink: PIPELINE_INK.dormant,
      dash: "1 5",
      linecap: "round",
    });
  });

  it("cuts into three when the edge runs past the merge as well", () => {
    const source = forked_band();
    const edges = source.edges.map((entry) => (entry.id === "main" ? { ...entry, to: "ghcr" } : entry));
    const layout = build_pipeline_graph({ ...source, edges });
    const parts = segments_of(layout, "main");

    expect(parts).toHaveLength(3);
    expect(parts.map((part) => [part.d, part.ink, part.dash])).toEqual([
      ["M44,40 L44,104", HUD_PALETTE.edge, null],
      ["M44,104 L44,508", PIPELINE_INK.dormant, "1 5"],
      ["M44,508 L44,692", HUD_PALETTE.edge, null],
    ]);
  });

  it("leaves the segments joined end to end", () => {
    const layout = build_pipeline_graph(forked_band());
    const parts = segments_of(layout, "main");
    const head_end = parts[0].d.split(" L")[1];
    const body_start = parts[1].d.slice(1).split(" C")[0].split(" L")[0];

    expect(head_end).toBe(body_start);
  });

  it("does not split a trunk edge that carries no head_tone", () => {
    const source = forked_band();
    const edges = source.edges.map((entry) =>
      entry.id === "main" ? { ...entry, head_tone: undefined } : entry,
    );
    const layout = build_pipeline_graph({ ...source, edges });
    const parts = segments_of(layout, "main");

    expect(parts).toHaveLength(1);
    expect(parts[0].ink).toBe(PIPELINE_INK.dormant);
    expect(parts[0].dash).toBe("1 5");
  });

  it("paints an uncut head_tone edge below the merge as the live head", () => {
    // Nothing to cut, but the edge runs entirely past the merge, so the
    // branch is back and this stretch is the live tip again. Painting it
    // the dormant ink would be the inverse of what the head_tone says.
    const source = forked_band();
    const edges = [
      ...source.edges,
      edge("short", "merged", "actions", { tone: "dim", dash: "dotted", head_tone: "muted" }),
    ];
    const layout = build_pipeline_graph({ ...source, edges });
    const parts = segments_of(layout, "short");

    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ ink: HUD_PALETTE.edge, dash: null, linecap: null });
  });

  it("paints an uncut head_tone edge inside the fork-to-merge stretch as dormant", () => {
    // The other side of the same coin: an edge that starts below the fork
    // and ends on the merge has nothing to cut either, but every unit of it
    // is the stretch the branch is out for, so it keeps the dormant ink and
    // its dash. Declaring a head must not make a dormant edge live.
    const layout = build_pipeline_graph(
      band({
        nodes: [
          node("root"),
          node("b", { lane: "branch" }),
          node("rider", { lane: "merge" }),
          node("landing"),
        ],
        edges: [
          edge("out", "root", "b", { kind: "fork" }),
          edge("back", "b", "landing", { kind: "merge" }),
          edge("under", "rider", "landing", { tone: "dim", dash: "dotted", head_tone: "muted" }),
        ],
      }),
    );
    const parts = segments_of(layout, "under");

    // This edge starts at the merge rider, below the fork, so it earns no
    // lead: the fork sits on `root` itself and the merge lands a drop below
    // the branch node. Declaring a head somewhere under the branch says
    // nothing about the stretch above it.
    expect(layout.fork_y).toBe(40);
    expect(layout.merge_y).toBe(204);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ ink: PIPELINE_INK.dormant, dash: "1 5", linecap: "round" });
  });
});

// --- Ink ------------------------------------------------------------------

describe("ink", () => {
  it("steps a node's tone down the page's own greys", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [
          node("default", { tone: "default" }),
          node("muted", { tone: "muted" }),
          node("dim", { tone: "dim" }),
          node("accent", { tone: "accent" }),
          node("green", { tone: "green" }),
        ],
        edges: [],
      }),
    );

    expect(layout.nodes.map((entry) => entry.ink)).toEqual([
      HUD_PALETTE.text,
      HUD_PALETTE.secondary,
      HUD_PALETTE.edge,
      HUD_PALETTE.accent,
      PIPELINE_INK.pass,
    ]);
  });

  it("paints a line one step dimmer than a node of the same tone", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [node("a"), node("b"), node("c"), node("d")],
        edges: [
          edge("default", "a", "b", { tone: "default" }),
          edge("muted", "b", "c", { tone: "muted" }),
          edge("dim", "c", "d", { tone: "dim" }),
        ],
      }),
    );

    expect(layout.segments.map((segment) => segment.ink)).toEqual([
      HUD_PALETTE.secondary,
      HUD_PALETTE.edge,
      PIPELINE_INK.dormant,
    ]);
  });

  it("fills a ring with the page ground and a disc with its own ink", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [node("ring", { style: "ring", tone: "default" }), node("disc", { tone: "accent" })],
        edges: [],
      }),
    );

    expect(node_by_id(layout, "ring")).toMatchObject({
      fill: HUD_PALETTE.background,
      stroke: HUD_PALETTE.text,
      stroke_width: 2.5,
    });
    expect(node_by_id(layout, "disc")).toMatchObject({
      fill: HUD_PALETTE.accent,
      stroke: null,
      stroke_width: null,
    });
  });

  it("lets a mark override its node's tone without moving the node", () => {
    const nginx = node_by_id(build_pipeline_graph(serve_band()), "nginx");

    expect(nginx.ink).toBe(HUD_PALETTE.text);
    expect(nginx.mark).toMatchObject({ id: "nginx", ink: HUD_PALETTE.secondary });
  });
});

// --- Node paint -----------------------------------------------------------

describe("node paint", () => {
  it("sizes a node from its style, its emphasis and its tick", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [
          node("ring", { style: "ring" }),
          node("ring-emphasis", { style: "ring", emphasis: true }),
          node("disc"),
          node("disc-emphasis", { emphasis: true }),
          node("ticked", { tick: true, emphasis: true }),
          node("reader", { style: "reader", tone: "accent" }),
        ],
        edges: [],
      }),
    );

    expect(node_by_id(layout, "ring").radius).toBe(6.5);
    // A ring is already the outlined, open shape; emphasis is carried by
    // the label weight, not by growing it.
    expect(node_by_id(layout, "ring-emphasis").radius).toBe(6.5);
    expect(node_by_id(layout, "disc").radius).toBe(5.5);
    expect(node_by_id(layout, "disc-emphasis").radius).toBe(7.5);
    expect(node_by_id(layout, "ticked").radius).toBe(8.5);
    expect(node_by_id(layout, "reader").radius).toBe(9);
    expect(node_by_id(layout, "ring").halo_radius).toBeNull();
  });

  it("leaves the mark off a node that has none", () => {
    const layout = build_pipeline_graph(band({ nodes: [node("plain")], edges: [] }));

    expect(node_by_id(layout, "plain").mark).toBeNull();
    expect(node_by_id(layout, "plain").tick).toBeNull();
  });

  it("centres a vendor mark on its node's baseline, between node and label", () => {
    const mark = node_by_id(build_pipeline_graph(forked_band()), "repo").mark;

    expect(mark?.x).toBeGreaterThan(44);
    expect(mark?.x).toBeLessThan(166);
  });

  it("lifts the label off the node's baseline only when a detail line follows", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [node("solo"), node("paired", { detail: "second line" })],
        edges: [],
      }),
    );
    const solo = node_by_id(layout, "solo");
    const paired = node_by_id(layout, "paired");

    // Both offsets are the mockup's: 4 below the baseline on its own, 3
    // above it with a detail line 13 under that.
    expect(solo.label_y).toBe(solo.y + 4);
    expect(solo.detail_ys).toEqual([]);
    expect(paired.label_y).toBe(paired.y - 3);
    expect(paired.detail_ys[0]).toBe(paired.y + 13);
  });

  it("gives the reader node's larger face more room before its detail line", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [node("plain", { detail: "one" }), node("you", { style: "reader", detail: "two" })],
        edges: [],
      }),
    );
    const plain = node_by_id(layout, "plain");
    const you = node_by_id(layout, "you");

    // The reader's label is set in the display face at 18px, so 13 would
    // crowd it: the mockup gives it 16.
    expect(plain.detail_ys[0]).toBe(plain.y + 13);
    expect(you.detail_ys[0]).toBe(you.y + 16);
  });
});

// --- Dashes ---------------------------------------------------------------

describe("dashes", () => {
  it("carries the ported dash arrays through and rounds only the dotted caps", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [node("a"), node("b"), node("c"), node("d")],
        edges: [
          edge("solid", "a", "b"),
          edge("dotted", "b", "c", { dash: "dotted" }),
          edge("dashed", "c", "d", { dash: "dashed" }),
        ],
      }),
    );

    expect(segments_of(layout, "solid")[0]).toMatchObject({ dash: null, linecap: null });
    // Round caps are what turn a 1-unit dash into a dot rather than a tick.
    expect(segments_of(layout, "dotted")[0]).toMatchObject({ dash: "1 5", linecap: "round" });
    expect(segments_of(layout, "dashed")[0]).toMatchObject({ dash: "5 5", linecap: null });
  });
});

// --- The tail arrow -------------------------------------------------------

describe("the tail arrow", () => {
  it("leaves the last trunk node's edge and runs off the bottom in the accent", () => {
    const layout = build_pipeline_graph(forked_band({ tail_arrow: true }));
    const last = node_by_id(layout, "ghcr");

    // One unit clear of the node's own edge, 46 long, 10 of air under it.
    expect(layout.tail?.d).toBe(`M44,${last.y + last.radius + 1} L44,${last.y + last.radius + 47}`);
    expect(layout.tail?.ink).toBe(HUD_PALETTE.accent);
    expect(layout.height).toBe(756.5);
  });

  it("closes the band under its last node when nothing continues past it", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(layout.tail).toBeNull();
    expect(layout.height).toBe(732);
  });

  it("hangs the arrow off the trunk even when the last node in the data is not on it", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [node("trunk-end"), node("stray", { lane: "branch" })],
        edges: [],
        tail_arrow: true,
      }),
    );

    expect(layout.tail?.d).toBe("M44,46.5 L44,92.5");
  });

  it("keeps branch nodes in frame when the tail anchor is not the deepest node", () => {
    // A band that forks and never comes back. The arrow hangs off the root,
    // so an arrow-only height would clip every branch node under it.
    const layout = build_pipeline_graph(
      band({
        nodes: [
          node("root"),
          node("b1", { lane: "branch" }),
          node("b2", { lane: "branch" }),
          node("b3", { lane: "branch" }),
        ],
        edges: [
          edge("out", "root", "b1", { kind: "fork" }),
          edge("first", "b1", "b2", { kind: "branch" }),
          edge("second", "b2", "b3", { kind: "branch" }),
        ],
        tail_arrow: true,
      }),
    );

    expect(layout.tail?.d).toBe("M44,46.5 L44,92.5");
    expect(node_by_id(layout, "b3").y).toBe(224);
    expect(layout.height).toBe(264);
  });
});

// --- The frame ------------------------------------------------------------

describe("the frame", () => {
  it("matches the viewBox to the computed height", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(layout.view_box).toBe("0 0 440 732");
  });

  it("does not mirror a right-side band", () => {
    const left = build_pipeline_graph(forked_band({ graph_side: "left" }));
    const right = build_pipeline_graph(forked_band({ graph_side: "right" }));

    expect(right.side).toBe("right");
    expect(left.side).toBe("left");
    // Only the column the graph sits in flips; the drawing inside it does
    // not, so the two spines stay a tenth of the way in from their own
    // column's left edge and the crossings keep landing on them.
    expect({ ...right, side: left.side }).toEqual(left);
  });

  it("carries the band's own id and side through", () => {
    const layout = build_pipeline_graph(band({ id: "deploy", graph_side: "right" }));

    expect(layout.id).toBe("deploy");
    expect(layout.side).toBe("right");
  });
});

// --- The whole section ----------------------------------------------------

describe("build_pipeline_graphs", () => {
  it("lays out every band, in order", () => {
    const layouts = build_pipeline_graphs([
      band({ id: "commit" }),
      band({ id: "deploy", graph_side: "right" }),
      band({ id: "serve" }),
    ]);

    expect(layouts.map((layout) => layout.id)).toEqual(["commit", "deploy", "serve"]);
    expect(layouts.map((layout) => layout.side)).toEqual(["left", "right", "left"]);
  });

  it("returns nothing for no bands", () => {
    expect(build_pipeline_graphs([])).toEqual([]);
  });
});
