import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import Graph from "./Graph.svelte";
import { HUD_PALETTE } from "./palette.js";
import { build_pipeline_graph } from "./pipeline-graph.js";
import type { PipelineBand, PipelineNode } from "$lib/types.js";

const SOURCE = readFileSync(new URL("./Graph.svelte", import.meta.url), "utf8");

function node(id: string, overrides: Partial<PipelineNode> = {}): PipelineNode {
  return { id, label: id, style: "disc", tone: "muted", lane: "trunk", ...overrides };
}

function band(overrides: Partial<PipelineBand> = {}): PipelineBand {
  return {
    id: "band",
    graph_side: "left",
    nodes: [
      node("repo", { label: "the repo", detail: "main", style: "ring", tone: "default" }),
      node("out", { label: "a branch", lane: "branch" }),
      node("back", { label: "merged", style: "ring", tone: "default" }),
    ],
    edges: [
      { id: "fork", from: "repo", to: "out", kind: "fork", tone: "default" },
      { id: "merge", from: "out", to: "back", kind: "merge", tone: "green" },
      { id: "trunk", from: "repo", to: "back", kind: "trunk", tone: "dim", dash: "dotted" },
    ],
    note: { column: "aside", text: "note" },
    ...overrides,
  };
}

function html_for(source: PipelineBand): string {
  return render(Graph, { props: { band: source, layout: build_pipeline_graph(source) } }).body;
}

describe("Graph", () => {
  it("draws every segment the layout computed, at its own ink and width", () => {
    const source = band();
    const layout = build_pipeline_graph(source);
    const html = html_for(source);

    for (const segment of layout.segments) {
      expect(html).toContain(`d="${segment.d}"`);
      expect(html).toContain(`stroke="${segment.ink}"`);
    }
    expect(html.match(/<path class="segment[ "]/g)).toHaveLength(layout.segments.length);
  });

  it("carries a segment's dash and its round caps only where the layout asked for them", () => {
    const layout = build_pipeline_graph(band());
    const dashed = layout.segments.filter((segment) => segment.dash !== null);
    const html = html_for(band());

    // The fixture's trunk edge is dotted, so this is a real comparison
    // rather than two empty lists agreeing.
    expect(dashed.length).toBeGreaterThan(0);
    expect(html.match(/stroke-dasharray=/g)).toHaveLength(dashed.length);
    expect(html.match(/stroke-linecap="round"/g)).toHaveLength(dashed.length);
  });

  it("gives the reader node its halo and leaves every other node without one", () => {
    const source = band({
      nodes: [node("you", { style: "reader", tone: "accent" }), node("plain")],
      edges: [{ id: "down", from: "you", to: "plain", kind: "trunk", tone: "default" }],
    });
    const layout = build_pipeline_graph(source);
    const reader = layout.nodes[0];
    const html = html_for(source);

    expect(reader.halo_radius).not.toBeNull();
    expect(html).toContain(`r="${reader.halo_radius}"`);
    expect(html.match(/class="halo[ "]/g)).toHaveLength(1);
  });

  it("outlines a ring node and fills a disc, from the layout's own paint", () => {
    const layout = build_pipeline_graph(band());
    const ring = layout.nodes[0];
    const disc = layout.nodes[1];
    const html = html_for(band());

    expect(ring.stroke).not.toBeNull();
    expect(disc.stroke).toBeNull();
    expect(html).toContain(`fill="${ring.fill}" stroke="${ring.stroke}"`);
    expect(html).toContain(`fill="${disc.ink}"`);
  });

  it("draws the tick and the vendor mark only on the nodes that carry them", () => {
    const source = band({
      nodes: [
        node("gate", { tick: true, tone: "green" }),
        node("ghcr", { mark: "github" }),
        node("bare"),
      ],
      edges: [{ id: "down", from: "gate", to: "bare", kind: "trunk", tone: "default" }],
    });
    const layout = build_pipeline_graph(source);
    const html = html_for(source);

    expect(html.match(/class="tick[ "]/g)).toHaveLength(1);
    expect(html.match(/class="mark[ "]/g)).toHaveLength(1);
    expect(html).toContain(`d="${layout.nodes[0].tick?.d}"`);
    // Mitred ends spike at the checkmark's elbow, so the layout carries
    // both joins and the drawing has to spend them.
    expect(html).toContain('stroke-linejoin="round"');
  });

  it("puts each label and detail where the layout put it", () => {
    const layout = build_pipeline_graph(band());
    const html = html_for(band());
    const repo = layout.nodes[0];

    expect(html).toContain(`x="${repo.label_x}" y="${repo.label_y}"`);
    expect(html).toContain("the repo");
    expect(repo.detail_ys).toHaveLength(1);
    expect(html).toContain(`x="${repo.label_x}" y="${repo.detail_ys[0]}"`);
    expect(html).toContain("main");
  });

  it("leaves out the detail line for a node that has none", () => {
    const html = html_for(band());

    // Three nodes, one detail: two `<text class="detail">` would mean an
    // empty line rendered for a node the data says nothing more about.
    expect(html.match(/class="detail[ "]/g)).toHaveLength(1);
  });

  it("draws the tail arrow only for a band that continues", () => {
    expect(html_for(band())).not.toMatch(/class="tail[ "]/);

    const continuing = band({ tail_arrow: true });
    const layout = build_pipeline_graph(continuing);
    const html = html_for(continuing);

    expect(layout.tail).not.toBeNull();
    expect(html).toContain(`d="${layout.tail?.d}"`);
    expect(html).toMatch(/class="tail[ "]/);
  });

  it("hides the drawing from assistive technology and says the same thing in a list", () => {
    // Resolution 1: the mockup's role="img" plus one long aria-label is
    // dropped. A reader gets the nodes in order instead, which is the
    // thing the drawing is actually saying.
    const html = html_for(band());

    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).not.toContain('role="img"');
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html).toContain("the repo");
  });

  it("names every node in the list in data order, detail included", () => {
    const source = band();
    const html = html_for(source);
    const items = [...html.matchAll(/<li>(.*?)<\/li>/gs)].map((match) => match[1]);

    expect(items).toHaveLength(source.nodes.length);
    expect(items[0]).toContain("the repo");
    expect(items[0]).toContain("main");
    expect(items[1]).toContain("a branch");
    expect(items[2]).toContain("merged");
  });

  it("sizes the drawing from the layout's own view box", () => {
    const layout = build_pipeline_graph(band());
    const html = html_for(band());

    expect(html).toContain(`viewBox="${layout.view_box}"`);
  });

  it("leaves no raw hex in the source, so every tone has a name in palette.ts", () => {
    const style_block = SOURCE.slice(SOURCE.indexOf("<style>"));

    expect(style_block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SOURCE.slice(0, SOURCE.indexOf("<style>"))).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });

  it("takes its text colours from the HUD palette, not from a second set", () => {
    const html = html_for(band());

    expect(html).toContain(HUD_PALETTE.text);
    expect(html).toContain(HUD_PALETTE.secondary);
  });
});
