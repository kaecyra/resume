import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { PipelineReadout } from "$lib/types.js";

import { HUD_PALETTE, PIPELINE_INK } from "./palette.js";
import Readout from "./Readout.svelte";

// Band 2's pair and band 3's four, as data/pipeline.yaml carries them. The
// same component renders both; what differs is entirely in the data. "-"
// rather than a sample number: there is no reading honest enough to print
// before the page has actually polled for one.
const BASEMENT: PipelineReadout = {
  column: "graph",
  entries: [
    { id: "temperature", label: "In the basement", value: "-", tone: "accent" },
    { id: "humidity", label: "Humidity", value: "-" },
  ],
};

const BASEMENT_LIVE: PipelineReadout = { ...BASEMENT, live: "basement" };

const DELIVERY: PipelineReadout = {
  column: "aside",
  live: "delivery",
  entries: [
    { id: "edge", label: "Edge that answered", value: "YYZ", tone: "accent" },
    { id: "first-byte", label: "First byte", value: "41", unit: "ms" },
    { id: "transferred", label: "Transferred", value: "47", unit: "KB" },
    { id: "protocol", label: "Protocol", value: "h2", unit: "TLS 1.3" },
  ],
};

const SOURCE = readFileSync(new URL("./Readout.svelte", import.meta.url), "utf8");

function html_for(readout: PipelineReadout, follows_note = false): string {
  // Svelte 5's SSR output is peppered with `<!--[-->` block anchors and
  // with the compiler's scoping class. Both are machinery, not content,
  // and both sit in the middle of every element these assertions care
  // about.
  return render(Readout, { props: { readout, follows_note } })
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
      { label: "In the basement", value: "-" },
      { label: "Humidity", value: "-" },
    ]);
  });

  // onMount never runs under svelte/server, so this is exactly what a
  // reader with no JavaScript sees: the honest "-" pair, an OFFLINE badge,
  // fully visible - never hidden waiting for a poll that will never happen.
  // Readout.dom.test.ts covers the live poll itself.
  it("renders a basement-sourced readout as OFFLINE, visible, before any poll can run", () => {
    const html = html_for(BASEMENT_LIVE);

    expect(fields(html)).toEqual([
      { label: "In the basement", value: "-" },
      { label: "Humidity", value: "-" },
    ]);
    expect(html).toContain("OFFLINE");
    expect(html).not.toContain("LIVE");
    expect(html).not.toContain("readout-pending");
    expect(html).toContain(`fill="${HUD_PALETTE.chip_text}"`);
    expect(html).not.toContain(`fill="${PIPELINE_INK.live}"`);
  });

  it("draws no LIVE/OFFLINE badge for a readout that is not basement-sourced", () => {
    expect(html_for(BASEMENT)).not.toContain("live-badge");
    expect(html_for(DELIVERY)).not.toContain("live-badge");
  });

  it("renders the delivery four from its data, with no JavaScript involved", () => {
    // This is the prerendered document: adapter-static writes exactly this
    // HTML, and a reader with JavaScript off never sees anything else. The
    // values have to stand on their own here.
    const html = html_for(DELIVERY);

    expect(fields(html)).toEqual([
      { label: "Edge that answered", value: "YYZ" },
      { label: "First byte", value: "41<small>ms</small>" },
      { label: "Transferred", value: "47<small>KB</small>" },
      { label: "Protocol", value: "h2<small>TLS 1.3</small>" },
    ]);
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

  // The spacing is for a readout sitting under a note, and that is the
  // only thing that may switch it on. Keying it off the graph column
  // instead would give every future graph-column readout 30px of air it
  // never asked for, on the strength of a coincidence that holds for
  // band 2 alone.
  it("spaces a readout that follows a note, and only that one", () => {
    expect(html_for(BASEMENT, true)).toMatch(/<dl class="[^"]*readout-after-note/);
    expect(html_for(BASEMENT)).not.toContain("readout-after-note");
    expect(html_for(DELIVERY, true)).toMatch(/<dl class="[^"]*readout-after-note/);
    expect(html_for(DELIVERY)).not.toContain("readout-after-note");
  });

  // #226's runway diagram, wired in here: the "edge" entry names a
  // Cloudflare PoP, and that PoP's own airport has real runways. YYZ
  // (Toronto Pearson) is DELIVERY's sample value and has generated runway
  // data, so the default, pre-measurement render already shows it.
  it("draws the edge PoP's runway diagram and labels it, below the values", () => {
    const html = html_for(DELIVERY);

    expect(html).toContain("runway-diagram");
    expect(html).toMatch(/<figcaption[^>]*>YYZ.*?Toronto.*?<\/figcaption>/s);
    expect(html.indexOf("</dl>")).toBeLessThan(html.indexOf("runway-diagram"));
  });

  it("draws no runway diagram for a readout with no edge entry", () => {
    expect(html_for(BASEMENT)).not.toContain("runway-diagram");
    expect(html_for(BASEMENT)).not.toContain("edge-airport");
  });

  it("draws no runway diagram when the edge value names no known PoP", () => {
    const unknown: PipelineReadout = {
      ...DELIVERY,
      entries: [
        { id: "edge", label: "Edge that answered", value: "ZZZ", tone: "accent" },
        ...DELIVERY.entries.slice(1),
      ],
    };

    const html = html_for(unknown);

    expect(html).not.toContain("runway-diagram");
    expect(html).not.toContain("edge-airport");
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
