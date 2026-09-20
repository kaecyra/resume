import { describe, expect, it } from "vitest";

import { ELEVATION, HUD_PALETTE, PIPELINE_INK } from "./palette.js";
import {
  build_pipeline_graph,
  build_pipeline_graphs,
  cubic_point_at,
  PIPELINE_ARROW_TIP,
  PIPELINE_GRAPH_GEOMETRY as GEO,
  type PipelineGraphLayout,
} from "./pipeline-graph.js";
import type { PipelineBand, PipelineEdge, PipelineNode } from "$lib/types.js";

// --- Fixtures -------------------------------------------------------------
//
// Inline and minimal, per ENGINEERING.md 17: a band is built from a
// baseline and overridden per case, so nothing here breaks when
// data/pipeline.yaml changes.

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

// The shape of band 1: a trunk that forks to a branch lane, takes three
// branch nodes, merges back through a node riding the merge curve, and
// carries on down the trunk. The one trunk edge spanning the fork carries
// `head_tone`, exactly as data/pipeline.yaml models it.
function forked_band(overrides: Partial<PipelineBand> = {}): PipelineBand {
  return band({
    nodes: [
      node("repo", { style: "ring", tone: "default", detail: "main", mark: "github", emphasis: true }),
      node("feature", { lane: "branch", detail: "branched off main" }),
      node("commit", { lane: "branch" }),
      node("pull-request", { lane: "branch", style: "ring", tone: "accent" }),
      node("ci", { lane: "merge", tone: "green", detail: "typecheck", emphasis: true }),
      node("merged", { style: "ring", tone: "default" }),
      node("ghcr", { tone: "accent", detail: "ghcr.io/kaecyra/resume", emphasis: true }),
    ],
    edges: [
      edge("main", "repo", "merged", { tone: "dim", dash: "dotted", head_tone: "muted" }),
      edge("branch-out", "repo", "feature", { kind: "fork" }),
      edge("first-commit", "feature", "commit", { kind: "branch" }),
      edge("open-it", "commit", "pull-request", { kind: "branch" }),
      edge("merge-back", "pull-request", "merged", { kind: "merge", tone: "green" }),
      edge("push-it", "merged", "ghcr"),
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

// --- Lanes and node ordering ---------------------------------------------

describe("node placement", () => {
  it("keeps nodes in data order", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(layout.nodes.map((entry) => entry.id)).toEqual([
      "repo",
      "feature",
      "commit",
      "pull-request",
      "ci",
      "merged",
      "ghcr",
    ]);
  });

  it("puts trunk nodes on the spine and branch nodes in the branch lane", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(node_by_id(layout, "repo").x).toBe(GEO.spine_x);
    expect(node_by_id(layout, "merged").x).toBe(GEO.spine_x);
    expect(node_by_id(layout, "feature").x).toBe(GEO.branch_x);
    expect(node_by_id(layout, "commit").x).toBe(GEO.branch_x);
    expect(layout.spine_x).toBe(44);
    expect(layout.branch_x).toBe(130);
    expect(layout.label_x).toBe(166);
  });

  it("runs strictly down the page, merge riders included", () => {
    const layout = build_pipeline_graph(forked_band());
    const ys = layout.nodes.map((entry) => entry.y);

    for (let index = 1; index < ys.length; index += 1) {
      expect(ys[index]).toBeGreaterThan(ys[index - 1]);
    }
  });

  it("starts the first node at the ported top offset", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(node_by_id(layout, "repo").y).toBe(GEO.first_node_y);
  });

  it("places a lone node and draws nothing else", () => {
    const layout = build_pipeline_graph(band({ nodes: [node("only")], edges: [] }));

    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({ x: GEO.spine_x, y: GEO.first_node_y });
    expect(layout.segments).toEqual([]);
    expect(layout.tail).toBeUndefined();
    expect(layout.fork_y).toBeNull();
    expect(layout.merge_y).toBeNull();
    expect(layout.height).toBe(GEO.first_node_y + GEO.terminus_pad);
  });

  it("still places every node when the band has no edges at all", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("a"), node("b", { lane: "branch" }), node("c")], edges: [] }),
    );

    expect(layout.segments).toEqual([]);
    expect(layout.nodes.map((entry) => entry.x)).toEqual([GEO.spine_x, GEO.branch_x, GEO.spine_x]);
    // No fork edge means no fork curve, but the lane change still has to
    // open the same gap or the branch node would land on top of its
    // neighbour.
    expect(node_by_id(layout, "b").y).toBeGreaterThan(node_by_id(layout, "a").y);
    expect(node_by_id(layout, "c").y).toBeGreaterThan(node_by_id(layout, "b").y);
  });
});

// --- The merge rider ------------------------------------------------------

describe("merge-lane nodes", () => {
  it("puts a merge-lane node exactly on the merge curve's midpoint", () => {
    const layout = build_pipeline_graph(forked_band());
    const ci = node_by_id(layout, "ci");
    const merge = segments_of(layout, "merge-back")[0];

    const start = { x: GEO.branch_x, y: node_by_id(layout, "pull-request").y };
    const end = { x: GEO.spine_x, y: node_by_id(layout, "merged").y };
    const midpoint = cubic_point_at(
      start,
      { x: start.x, y: start.y + GEO.merge_control_out },
      { x: end.x, y: end.y - GEO.merge_control_in },
      end,
      0.5,
    );

    expect({ x: ci.x, y: ci.y }).toEqual(midpoint);
    // Halfway between the two lanes, which is what makes the node read as
    // riding the curve rather than standing in either lane.
    expect(ci.x).toBe((GEO.spine_x + GEO.branch_x) / 2);
    expect(merge.d).toContain(`M${GEO.branch_x},${start.y}`);
  });

  it("falls back to the spine when the band has no merge curve to ride", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("a"), node("rider", { lane: "merge" })], edges: [] }),
    );

    expect(node_by_id(layout, "rider").x).toBe(GEO.spine_x);
    expect(node_by_id(layout, "rider").y).toBeGreaterThan(node_by_id(layout, "a").y);
  });
});

// --- Curves ---------------------------------------------------------------

describe("fork and merge curves", () => {
  it("leaves the trunk above the branch node and lands on it", () => {
    const layout = build_pipeline_graph(forked_band());
    const fork = segments_of(layout, "branch-out")[0];
    const feature_y = node_by_id(layout, "feature").y;
    const fork_y = layout.fork_y as number;

    expect(fork_y).toBe(feature_y - GEO.fork_rise);
    expect(fork_y).toBeGreaterThan(node_by_id(layout, "repo").y);
    expect(fork.d).toBe(
      `M44,${fork_y} C44,${fork_y + GEO.fork_control_out} 130,${feature_y - GEO.fork_control_in} 130,${feature_y}`,
    );
  });

  it("forks straight off the source node when the trunk shows no live head", () => {
    // Band 2's shape: Watchtower keeps running whether or not there is a
    // digest to pull, so its trunk is unbroken, carries no `head_tone`, and
    // has no live stretch to make room for above the fork.
    const layout = build_pipeline_graph(
      band({
        nodes: [node("check"), node("digest", { lane: "branch" }), node("pull")],
        edges: [
          edge("out", "check", "digest", { kind: "fork", tone: "accent" }),
          edge("back", "digest", "pull", { kind: "merge", tone: "accent" }),
          edge("keeps-running", "check", "pull"),
        ],
      }),
    );

    expect(layout.fork_y).toBe(node_by_id(layout, "check").y);
    expect(node_by_id(layout, "digest").y).toBe(layout.fork_y as number + GEO.fork_rise);
    // The unbroken trunk still runs the whole way under the branch.
    expect(segments_of(layout, "keeps-running")).toHaveLength(1);
  });

  it("drops the merge curve the ported distance onto the spine", () => {
    const layout = build_pipeline_graph(forked_band());
    const merge = segments_of(layout, "merge-back")[0];
    const from_y = node_by_id(layout, "pull-request").y;
    const to_y = node_by_id(layout, "merged").y;

    expect(to_y - from_y).toBe(GEO.merge_drop);
    expect(layout.merge_y).toBe(to_y);
    expect(merge.d).toBe(
      `M130,${from_y} C130,${from_y + GEO.merge_control_out} 44,${to_y - GEO.merge_control_in} 44,${to_y}`,
    );
    expect(merge.ink).toBe(PIPELINE_INK.pass);
  });

  it("draws branch-lane edges straight down the branch lane", () => {
    const layout = build_pipeline_graph(forked_band());
    const [first] = segments_of(layout, "first-commit");

    expect(first.d).toBe(`M130,${node_by_id(layout, "feature").y} L130,${node_by_id(layout, "commit").y}`);
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
    expect(segments_of(layout, "out")[0].d.startsWith(`M${GEO.spine_x},${GEO.first_node_y} `)).toBe(true);
  });

  it("skips an edge naming a node the band does not have", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("a")], edges: [edge("dangling", "a", "ghost")] }),
    );

    expect(layout.segments).toEqual([]);
  });
});

// --- The trunk split ------------------------------------------------------

describe("trunk splitting", () => {
  it("cuts a head_tone trunk edge at the fork and paints the stretches apart", () => {
    const layout = build_pipeline_graph(forked_band());
    const parts = segments_of(layout, "main");
    const fork_y = layout.fork_y as number;

    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({
      d: `M44,${GEO.first_node_y} L44,${fork_y}`,
      ink: HUD_PALETTE.edge,
    });
    // The live stretch is solid whatever the dormant stretch does.
    expect(parts[0].dash).toBeUndefined();
    expect(parts[1]).toMatchObject({
      d: `M44,${fork_y} L44,${node_by_id(layout, "merged").y}`,
      ink: PIPELINE_INK.dormant,
      dash: "1 5",
      linecap: "round",
    });
  });

  it("cuts into three when the edge runs past the merge as well", () => {
    const source = forked_band();
    const edges = source.edges.map((entry) =>
      entry.id === "main" ? { ...entry, to: "ghcr" } : entry,
    );
    const layout = build_pipeline_graph({ ...source, edges });
    const parts = segments_of(layout, "main");

    expect(parts).toHaveLength(3);
    expect(parts.map((part) => part.ink)).toEqual([
      HUD_PALETTE.edge,
      PIPELINE_INK.dormant,
      HUD_PALETTE.edge,
    ]);
    expect(parts[2].d).toBe(`M44,${layout.merge_y} L44,${node_by_id(layout, "ghcr").y}`);
    expect(parts[2].dash).toBeUndefined();
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
  });

  it("does not split a head_tone edge that never reaches the fork", () => {
    const source = forked_band();
    const edges = [
      ...source.edges,
      edge("short", "merged", "ghcr", { tone: "dim", head_tone: "muted" }),
    ];
    const layout = build_pipeline_graph({ ...source, edges });

    expect(segments_of(layout, "short")).toHaveLength(1);
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
      stroke_width: GEO.ring_stroke_width,
    });
    expect(node_by_id(layout, "disc")).toMatchObject({
      fill: HUD_PALETTE.accent,
      stroke: null,
    });
  });

  it("lets a mark override its node's tone without moving the node", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [node("nginx", { style: "ring", tone: "default", mark: "nginx", mark_tone: "muted" })],
        edges: [],
      }),
    );
    const nginx = node_by_id(layout, "nginx");

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
    expect(node_by_id(layout, "reader").halo_radius).toBe(14);
    expect(node_by_id(layout, "ring").halo_radius).toBeNull();
  });

  it("draws the tick inside the node it belongs to", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("healthcheck", { tick: true, tone: "green" })], edges: [] }),
    );
    const healthcheck = node_by_id(layout, "healthcheck");

    expect(healthcheck.tick).toEqual({
      d: `M${GEO.spine_x - 5},${healthcheck.y} l4,4 l7,-8`,
      stroke: ELEVATION.void,
      width: GEO.tick_width,
    });
    expect(node_by_id(layout, "healthcheck").tick?.d).toContain("l4,4");
  });

  it("centres a vendor mark on its node's baseline, between node and label", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("repo", { mark: "github" })], edges: [] }),
    );
    const mark = node_by_id(layout, "repo").mark;

    expect(mark).not.toBeNull();
    expect(mark?.x).toBe(GEO.mark_x);
    expect(mark?.x).toBeGreaterThan(GEO.spine_x);
    expect(mark?.x).toBeLessThan(GEO.label_x);
    expect(mark?.y).toBe(GEO.first_node_y - GEO.mark_size / 2);
    expect(mark?.scale).toBeCloseTo(GEO.mark_size / 24, 10);
  });

  it("leaves the mark off a node that has none", () => {
    const layout = build_pipeline_graph(band({ nodes: [node("plain")], edges: [] }));

    expect(node_by_id(layout, "plain").mark).toBeNull();
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

    expect(solo.label_y).toBe(solo.y + GEO.label_dy_solo);
    expect(solo.detail_y).toBeNull();
    expect(paired.label_y).toBe(paired.y + GEO.label_dy);
    expect(paired.detail_y).toBe(paired.y + GEO.detail_dy);
    expect(solo.label_x).toBe(GEO.label_x);
  });

  it("gives the reader node's larger face more room before its detail line", () => {
    const layout = build_pipeline_graph(
      band({ nodes: [node("you", { style: "reader", detail: "reading this now" })], edges: [] }),
    );
    const you = node_by_id(layout, "you");

    expect(you.detail_y).toBe(you.y + GEO.reader_detail_dy);
    expect(GEO.reader_detail_dy).toBeGreaterThan(GEO.detail_dy);
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

    expect(segments_of(layout, "solid")[0].dash).toBeUndefined();
    expect(segments_of(layout, "dotted")[0]).toMatchObject({ dash: "1 5", linecap: "round" });
    expect(segments_of(layout, "dashed")[0].dash).toBe("5 5");
    expect(segments_of(layout, "dashed")[0].linecap).toBeUndefined();
  });

  it("gives every stroke the ported width", () => {
    const layout = build_pipeline_graph(forked_band());

    for (const segment of layout.segments) {
      expect(segment.width).toBe(GEO.edge_width);
    }
  });
});

// --- The tail arrow -------------------------------------------------------

describe("the tail arrow", () => {
  it("leaves the last trunk node's edge and runs off the bottom in the accent", () => {
    const layout = build_pipeline_graph(forked_band({ tail_arrow: true }));
    const last = node_by_id(layout, "ghcr");
    const start = last.y + last.radius + GEO.tail_gap;

    expect(layout.tail).toEqual({
      d: `M44,${start} L44,${start + GEO.tail_length}`,
      ink: HUD_PALETTE.accent,
      width: GEO.edge_width,
    });
    expect(layout.height).toBe(start + GEO.tail_length + GEO.tail_pad);
  });

  it("closes the band under its last node when nothing continues past it", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(layout.tail).toBeUndefined();
    expect(layout.height).toBe(node_by_id(layout, "ghcr").y + GEO.terminus_pad);
  });

  it("hangs the arrow off the trunk even when the last node in the data is not on it", () => {
    const layout = build_pipeline_graph(
      band({
        nodes: [node("trunk-end"), node("stray", { lane: "branch" })],
        edges: [],
        tail_arrow: true,
      }),
    );

    expect(layout.tail?.d.startsWith(`M${GEO.spine_x},`)).toBe(true);
  });

  it("publishes one arrow tip marker for every band to share", () => {
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

// --- The frame ------------------------------------------------------------

describe("the frame", () => {
  it("reports the ported 440-unit width and a viewBox matching the computed height", () => {
    const layout = build_pipeline_graph(forked_band());

    expect(layout.width).toBe(440);
    expect(layout.view_box).toBe(`0 0 440 ${layout.height}`);
    // The spine is exactly a tenth of the width: the CSS crossings in step
    // (d) hang off that relationship.
    expect(layout.spine_x).toBe(layout.width * 0.1);
  });

  it("does not mirror a right-side band", () => {
    const left = build_pipeline_graph(forked_band({ graph_side: "left" }));
    const right = build_pipeline_graph(forked_band({ graph_side: "right" }));

    expect(right.side).toBe("right");
    expect(left.side).toBe("left");
    // Only the column the graph sits in flips; the drawing inside it does
    // not, so the two spines stay a tenth of the way in from their own
    // column's left edge and the crossings keep landing on them.
    expect({ ...right, side: left.side, id: left.id }).toEqual(left);
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
