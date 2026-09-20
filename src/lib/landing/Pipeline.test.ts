import { readFileSync } from "node:fs";

import { render } from "svelte/server";
import yaml from "js-yaml";

import Pipeline from "./Pipeline.svelte";
import type { PipelineBand, PipelineData } from "$lib/types.js";

const SOURCE = readFileSync(new URL("./Pipeline.svelte", import.meta.url), "utf8");

// The shipped document, read once. Every other case is built from the
// fixture below; this one exists because the band-to-crossing interleave
// and the column placement are only interesting against the real three
// bands, and a structure test that agrees with a two-band toy says nothing
// about the page anyone will look at.
const REAL: PipelineData = yaml.load(
  readFileSync(new URL("../../../data/pipeline.yaml", import.meta.url), "utf8"),
) as PipelineData;

function band(overrides: Partial<PipelineBand> = {}): PipelineBand {
  return {
    id: "band",
    graph_side: "left",
    nodes: [
      { id: "a", label: "a", style: "ring", tone: "default", lane: "trunk" },
      { id: "b", label: "b", style: "disc", tone: "muted", lane: "trunk" },
    ],
    edges: [{ id: "a-b", from: "a", to: "b", kind: "trunk", tone: "default" }],
    note: { column: "aside", text: "a note" },
    ...overrides,
  };
}

function pipeline(overrides: Partial<PipelineData> = {}): PipelineData {
  return {
    heading: "Building a pipeline",
    lede: "This page ships the way the work does.",
    bands: [band()],
    crossings: [],
    closer: "That is the whole pipeline.",
    ...overrides,
  };
}

function html_for(data: PipelineData): string {
  return render(Pipeline, { props: { pipeline: data } }).body;
}

// The order things appear in the markup, which is what the reading order
// and the crossing direction both depend on.
function order_of(html: string, ...needles: string[]): number[] {
  return needles.map((needle) => html.indexOf(needle));
}

describe("Pipeline", () => {
  it("renders the heading, the lede and the closer from the data", () => {
    const html = html_for(REAL);

    expect(html).toContain(REAL.heading);
    expect(html).toContain(REAL.closer.slice(0, 20));
  });

  it("wraps the emphasis phrase rather than taking markup from the data", () => {
    const html = html_for(
      pipeline({ lede: "ships the way the work does", lede_emphasis: "the way the work" }),
    );

    expect(html).toContain("<strong");
    expect(html).toContain("the way the work");
    // The phrase is carried as plain text, so the halves around it have to
    // survive intact rather than being swallowed by the wrap.
    expect(html).toContain("ships ");
    expect(html).toContain(" does");
  });

  it("renders a lede with no emphasis as one intact run of text", () => {
    const html = html_for(pipeline({ lede: "no emphasis here" }));

    expect(html).toContain("no emphasis here");
  });

  it("gives every band a section and flips only the ones whose graph is on the right", () => {
    const html = html_for(REAL);
    const sections = html.match(/<section class="band[^"]*"/g) ?? [];
    const flipped = REAL.bands.filter((each) => each.graph_side === "right");

    expect(sections).toHaveLength(REAL.bands.length);
    expect(html.match(/band--flip/g) ?? []).toHaveLength(flipped.length);
    // A real comparison, not two empty lists agreeing: the shipped document
    // alternates, so some bands flip and some do not.
    expect(flipped.length).toBeGreaterThan(0);
    expect(flipped.length).toBeLessThan(REAL.bands.length);
  });

  it("puts each crossing between the band it follows and the next one", () => {
    const html = html_for(REAL);

    expect(html.match(/class="crossing/g) ?? []).toHaveLength(REAL.crossings.length);

    REAL.crossings.forEach((crossing, index) => {
      const [before, connector, after] = order_of(
        html,
        REAL.bands[index].note.text.slice(0, 24),
        crossing.label,
        REAL.bands[index + 1].note.text.slice(0, 24),
      );

      expect(before).toBeGreaterThan(-1);
      expect(connector).toBeGreaterThan(before);
      expect(after).toBeGreaterThan(connector);
    });
  });

  it("alternates the crossings' direction with their index", () => {
    const html = html_for(REAL);
    const directions = [...html.matchAll(/crossing--(out|back)/g)].map((match) => match[1]);

    expect(directions).toEqual(REAL.crossings.map((_unused, index) => (index % 2 === 0 ? "out" : "back")));
  });

  it("renders no crossing at all for a document with one band", () => {
    const html = html_for(pipeline());

    expect(html).not.toContain("class=\"crossing");
  });

  it("puts the note in the column the data names, not the column the band is on", () => {
    const graph_side = html_for(
      pipeline({ bands: [band({ note: { column: "graph", text: "in the graph column" } })] }),
    );
    const [graph_col, note] = order_of(graph_side, "col-graph", "in the graph column");
    const [aside_col] = order_of(graph_side, "col-aside");

    expect(note).toBeGreaterThan(graph_col);
    expect(note).toBeLessThan(aside_col);
  });

  it("puts the readout in its own column, which need not be the note's", () => {
    const data = pipeline({
      bands: [
        band({
          note: { column: "graph", text: "in the graph column" },
          readout: {
            column: "aside",
            entries: [{ id: "edge", label: "Edge that answered", value: "YYZ" }],
          },
        }),
      ],
    });
    const html = html_for(data);
    const [aside_col, readout] = order_of(html, "col-aside", "Edge that answered");

    expect(readout).toBeGreaterThan(aside_col);
  });

  it("tells the readout it follows a note only when the two share a column", () => {
    const together = html_for(
      pipeline({
        bands: [
          band({
            note: { column: "graph", text: "note" },
            readout: {
              column: "graph",
              entries: [{ id: "edge", label: "Edge", value: "YYZ" }],
            },
          }),
        ],
      }),
    );
    const apart = html_for(
      pipeline({
        bands: [
          band({
            note: { column: "aside", text: "note" },
            readout: {
              column: "graph",
              entries: [{ id: "edge", label: "Edge", value: "YYZ" }],
            },
          }),
        ],
      }),
    );

    // Readout.svelte spends `follows_note` as this class. Miss it and the
    // pair loses the 30px that separates them.
    expect(together).toContain("readout-after-note");
    expect(apart).not.toContain("readout-after-note");
  });

  it("renders the terminal, the code block, the rack and the marks only where the band asks", () => {
    const bare = html_for(pipeline());

    expect(bare).not.toContain("class=\"terminal");
    expect(bare).not.toContain("class=\"codeblock");
    expect(bare).not.toContain("class=\"rack-row");
    expect(bare).not.toContain("class=\"marks");

    const full = html_for(
      pipeline({
        bands: [
          band({
            terminal: { path: "~/resume", turns: [{ speaker: "you", bars: [64, 38] }] },
            code: "$ npm run dev",
            rack: true,
            marks: [{ id: "docker", label: "Docker" }],
          }),
        ],
      }),
    );

    expect(full).toContain("class=\"terminal");
    expect(full).toContain("class=\"codeblock");
    expect(full).toContain("class=\"rack-row");
    expect(full).toContain("class=\"marks");
  });

  it("draws one graph per band, each at its own computed size", () => {
    const html = html_for(REAL);
    const view_boxes = [...html.matchAll(/class="graph-svg[^"]*" viewBox="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(view_boxes).toHaveLength(REAL.bands.length);
    // The bands are different heights, so a single shared view box would
    // mean every graph was drawn from one band's geometry.
    expect(new Set(view_boxes).size).toBe(REAL.bands.length);
  });

  it("renders a band label as a hop only when the data names both ends", () => {
    const hop = html_for(pipeline({ bands: [band({ label: { from: "My laptop", to: "GitHub" } })] }));
    const single = html_for(pipeline({ bands: [band({ label: { from: "My basement" } })] }));

    expect(hop).toContain("My laptop");
    expect(hop).toContain("GitHub");
    expect(hop).toContain("band-label-hop");
    expect(single).toContain("My basement");
    expect(single).not.toContain("band-label-hop");
  });

  it("omits the label element entirely for a band that carries no label", () => {
    expect(html_for(pipeline())).not.toContain("band-label");
  });

  it("pairs the columns by starting both at the top rather than stretching either", () => {
    // Band 3's graph is shorter than the readout facing it. The decision
    // was to let the difference fall below, which is this one declaration;
    // happy-dom does no layout, so the source is the only seam.
    const style_block = SOURCE.slice(SOURCE.indexOf("<style>"));

    expect(style_block).toMatch(/\.band-grid\s*\{[^}]*align-items: start;/);
  });

});
