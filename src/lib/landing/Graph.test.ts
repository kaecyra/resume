import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import Graph from "./Graph.svelte";
import { build_pipeline_graph } from "./pipeline-graph.js";
import { node_delays, type RevealPhase } from "./pipeline-motion.js";
import type { PipelineBand, PipelineNode } from "$lib/types.js";

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

function html_for(source: PipelineBand, phase?: RevealPhase): string {
  return render(Graph, {
    props: { band: source, layout: build_pipeline_graph(source), phase },
  }).body;
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

  it("puts each label and every detail line where the layout put it", () => {
    // A two-line detail, because that is the case the whole detail_ys
    // change exists for: data/pipeline.yaml breaks band 3's Cloudflare
    // detail over two lines, and a drawing that spends only the first
    // silently loses half of it.
    const source = band();
    source.nodes[0].detail = ["main", "and the tags on it"];
    const layout = build_pipeline_graph(source);
    const html = html_for(source);
    const repo = layout.nodes[0];

    expect(html).toContain(`x="${repo.label_x}" y="${repo.label_y}"`);
    expect(html).toContain("the repo");
    // Paired, not four independent searches: two ys existing somewhere and
    // two strings existing somewhere stays true when the lines swap places.
    const details = [
      ...html.matchAll(/<text[^>]*class="[^"]*\bdetail\b[^"]*"[^>]*>([^<]*)</g),
    ];

    expect(repo.detail_ys).toHaveLength(2);
    expect(details).toHaveLength(2);
    details.forEach(([element, text], line) => {
      expect(element).toContain(`x="${repo.label_x}" y="${repo.detail_ys[line]}"`);
      expect(text.trim()).toBe((source.nodes[0].detail as string[])[line]);
    });
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

  it("spends the layout's label ink rather than deciding the colour here", () => {
    const source = band({
      nodes: [
        node("lit", { label: "lit one", tone: "green", emphasis: true }),
        node("plain", { label: "plain one", tone: "muted" }),
      ],
      edges: [{ id: "down", from: "lit", to: "plain", kind: "trunk", tone: "default" }],
    });
    const layout = build_pipeline_graph(source);
    const html = html_for(source);

    // Scoped to the label elements: a node's circle is painted with the
    // same ink, so matching over the whole document would pass on a
    // component that hardcoded every label instead of spending label_ink.
    const labels = [...html.matchAll(/<text[^>]*class="[^"]*\blabel\b[^"]*"[^>]*>/g)].map(
      ([element]) => element,
    );

    expect(labels).toHaveLength(layout.nodes.length);
    layout.nodes.forEach((placed, index) => {
      expect(labels[index]).toContain(`fill="${placed.label_ink}"`);
    });
  });

  it("sizes the drawing from the layout's own view box", () => {
    const layout = build_pipeline_graph(band());
    const html = html_for(band());

    expect(html).toContain(`viewBox="${layout.view_box}"`);
  });

  it("binds the detail fill to detail_ink rather than to the label's ink", () => {
    const source = band();
    const layout = build_pipeline_graph(source);
    const html = html_for(source);
    const details = [...html.matchAll(/<text[^>]*class="[^"]*\bdetail\b[^"]*"[^>]*>/g)].map(
      ([element]) => element,
    );

    expect(details).toHaveLength(1);
    expect(details[0]).toContain(`fill="${layout.nodes[0].detail_ink}"`);
  });

  it("does not import the palette", () => {
    // The structural half of the rule the two tests above check by value.
    // Matched on the specifier wherever it starts, not on one spelling of
    // it: `./palette.js`, `./palette` and `$lib/landing/palette.js` all
    // resolve, and this file already imports `$lib/types.js`, so the alias
    // is the spelling someone working here would actually type. Two
    // narrower versions of this test missed two of those three.
    //
    // Still not proof against a colour re-exported through another module,
    // which is why the name claims only what it checks. Nothing re-exports
    // one today: pipeline-graph.ts has no re-export and vendor-marks.ts
    // exports path strings.
    const source = readFileSync(new URL("./Graph.svelte", import.meta.url), "utf8");

    expect(source).not.toMatch(/from\s+["'][^"']*palette/);
  });

  describe("the reveal (#209 step f)", () => {
    it("draws itself finished, with no reveal state, when no phase is given", () => {
      const html = html_for(band());

      expect(html).not.toContain("is-armed");
      expect(html).not.toContain("is-revealed");
    });

    it("carries the phase it was handed onto the drawing", () => {
      expect(html_for(band(), "armed")).toContain("is-armed");
      expect(html_for(band(), "revealed")).toContain("is-revealed");
    });

    it("gives each node its own stagger, in the order the nodes are drawn", () => {
      const source = band();
      const html = html_for(source, "revealed");
      const delays = [...html.matchAll(/--node-delay: (\d+)ms/g)].map((match) => Number(match[1]));

      expect(delays).toEqual(node_delays(source.nodes.length));
    });

    it("clips only the lines, so the nodes light on their own clock", () => {
      const source = band();
      const layout = build_pipeline_graph(source);
      const html = html_for(source, "revealed");

      // The clip has to be referenced exactly once - one group holding the
      // lines. A second reference would mean the nodes were gated on it
      // too, and they run off --node-delay instead.
      expect([...html.matchAll(/clip-path="url\(#pipeline-clip-band\)"/g)]).toHaveLength(1);
      expect(html).toContain(`--clip-height: ${layout.height}px`);
    });
  });
});
