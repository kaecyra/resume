import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { PipelineReadout } from "$lib/types.js";

import { HUD_PALETTE } from "./palette.js";
import Readout from "./Readout.svelte";

// Band 2's pair and band 3's four, as data/pipeline.yaml carries them. The
// same component renders both; what differs is entirely in the data.
const BASEMENT: PipelineReadout = {
  column: "graph",
  entries: [
    {
      id: "temperature",
      label: "In the basement right now",
      value: "21.5",
      unit: "°C",
      tone: "accent",
    },
    { id: "humidity", label: "Humidity", value: "46", unit: "%" },
  ],
};

const DELIVERY: PipelineReadout = {
  column: "aside",
  live: true,
  caption: "Sample values until the page measures your own request.",
  entries: [
    { id: "edge", label: "Edge that answered", value: "YYZ", tone: "accent" },
    { id: "first-byte", label: "First byte", value: "41", unit: "ms" },
    { id: "transferred", label: "Transferred", value: "47", unit: "KB" },
    { id: "protocol", label: "Protocol", value: "h2", unit: "TLS 1.3" },
  ],
};

const SOURCE = readFileSync(new URL("./Readout.svelte", import.meta.url), "utf8");

function html_for(readout: PipelineReadout): string {
  // Svelte 5's SSR output is peppered with `<!--[-->` block anchors and
  // with the compiler's scoping class. Both are machinery, not content,
  // and both sit in the middle of every element these assertions care
  // about.
  return render(Readout, { props: { readout } })
    .body.replace(/<!--.*?-->/gs, "")
    .replace(/\s*class="svelte-[^"]*"/g, "")
    .replace(/\s+svelte-[a-z0-9]+/g, "");
}

// The same source with every comment taken out: issue references like
// #209 are three hex digits, and the hex check below is about colours.
const SOURCE_WITHOUT_COMMENTS = SOURCE.replace(/\/\*.*?\*\//gs, "")
  .replace(/<!--.*?-->/gs, "")
  .replace(/^\s*\/\/.*$/gm, "");

// Each entry's <dt> and <dd>, in document order.
function fields(html: string): { label: string; value: string }[] {
  return [...html.matchAll(/<dt[^>]*>(.*?)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/gs)].map((match) => ({
    label: match[1],
    value: match[2],
  }));
}

describe("Readout", () => {
  it("renders the basement pair from its data", () => {
    const html = html_for(BASEMENT);

    expect(fields(html)).toEqual([
      { label: "In the basement right now", value: "21.5<small>°C</small>" },
      { label: "Humidity", value: "46<small>%</small>" },
    ]);
  });

  it("renders the delivery four from its data, with no JavaScript involved", () => {
    // This is the prerendered document: adapter-static writes exactly this
    // HTML, and a reader with JavaScript off never sees anything else. The
    // values have to stand on their own here, which is what the caption is
    // for.
    const html = html_for(DELIVERY);

    expect(fields(html)).toEqual([
      { label: "Edge that answered", value: "YYZ" },
      { label: "First byte", value: "41<small>ms</small>" },
      { label: "Transferred", value: "47<small>KB</small>" },
      { label: "Protocol", value: "h2<small>TLS 1.3</small>" },
    ]);
    expect(html).toContain("Sample values until the page measures your own request.");
  });

  it("puts the label before the value in the markup, and flips them in CSS", () => {
    // column-reverse, so the value reads above its label while the <dt>
    // still precedes its <dd> for anything reading the document in order.
    const html = html_for(BASEMENT);

    expect(html.indexOf("<dt")).toBeLessThan(html.indexOf("<dd"));
    expect(SOURCE).toContain("flex-direction: column-reverse;");
  });

  it("omits the unit element entirely for a value that has no unit", () => {
    const html = html_for(DELIVERY);

    expect(html).toContain(">YYZ</dd>");
  });

  it("paints an accent-toned value amber and leaves every other value alone", () => {
    const html = html_for(DELIVERY);
    const colors = [...html.matchAll(/--readout-value:\s*([^;"]+)/g)].map((match) =>
      match[1].trim(),
    );

    expect(colors).toEqual([
      HUD_PALETTE.accent,
      HUD_PALETTE.text,
      HUD_PALETTE.text,
      HUD_PALETTE.text,
    ]);
  });

  it("marks the graph-column readout as the pair that follows a note", () => {
    expect(html_for(BASEMENT)).toMatch(/<dl class="[^"]*readout-pair/);
    expect(html_for(DELIVERY)).not.toContain("readout-pair");
  });

  it("renders no caption when the data carries none", () => {
    expect(html_for(BASEMENT)).not.toContain("readout-caption");
  });

  // The trace response is the reader's own IP address plus their user
  // agent and TLS parameters. Nothing in this component may hold it: the
  // response body is read into the argument of parse_trace_fields and
  // never bound to anything else, and the only state the component keeps
  // is the formatter's four-field output. Readout.dom.test.ts proves the
  // behaviour with a real fetch mock; this pins the shape of the code that
  // makes it true, because a future edit could keep the behaviour passing
  // while parking the body in a variable that ends up logged.
  it("never binds the trace response to anything but the parser's argument", () => {
    expect(SOURCE).toContain("parse_trace_fields(await response.text())");
    expect(SOURCE).not.toMatch(/=\s*await response\.text\(\)/);
    expect(SOURCE).not.toContain("console.");
    expect(SOURCE).not.toContain("localStorage");
    expect(SOURCE).not.toContain("sessionStorage");
  });

  // Every colour in this component comes from palette.ts. #209 widened the
  // palette precisely so this section would not need literals.
  it("carries no raw hex", () => {
    expect(SOURCE_WITHOUT_COMMENTS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  // The four tells from .memory/no-default-ai-styling.md, plus the mono
  // #187 retired outside the hero. This readout is typographic - scale and
  // space carry it, not a surface.
  it("is typographic, not a panel", () => {
    expect(SOURCE).not.toContain("Share Tech Mono");
    expect(SOURCE_WITHOUT_COMMENTS).not.toMatch(/\bborder(-[a-z]+)?\s*:/);
    expect(SOURCE_WITHOUT_COMMENTS).not.toMatch(/\bbackground(-color)?\s*:/);
    expect(SOURCE_WITHOUT_COMMENTS).not.toMatch(/\bbox-shadow\s*:/);
  });
});
