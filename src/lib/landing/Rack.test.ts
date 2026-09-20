import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import Rack from "./Rack.svelte";
import { CABLE_TRAY, HUD_PALETTE, RACK_CHASSIS, RACK_LED } from "./palette.js";
import { RACK_UNITS, TRAY_RUNG_XS, rack_u_height, rack_u_y } from "./rack-layout.js";

const SOURCE = readFileSync(new URL("./Rack.svelte", import.meta.url), "utf8");
const MODULE_SOURCE = readFileSync(new URL("./rack-layout.ts", import.meta.url), "utf8");

// Svelte scopes the stylesheet out of the component's markup, so the style
// block has to be read out of the source separately - nothing below the
// `<style>` opener reaches the rendered HTML.
const STYLE_BLOCK = SOURCE.slice(SOURCE.indexOf("<style>"));

function rack_html(): string {
  return render(Rack).body;
}

// The drawing carries no text at all - it is decorative and aria-hidden -
// so `data-device` is the only handle a test has on it. Each device is one
// group, running until the next group starts.
function device_groups(html: string): Map<string, string> {
  const groups = new Map<string, string>();
  const opens = [...html.matchAll(/<g data-device="([^"]+)"[^>]*>/g)];
  opens.forEach((open, index) => {
    const start = (open.index ?? 0) + open[0].length;
    const next = opens[index + 1];
    const end = next === undefined ? html.length : (next.index ?? html.length);
    groups.set(open[1], html.slice(start, end));
  });
  return groups;
}

describe("Rack", () => {
  // Resolution 1 of the plan: the rack is decorative and the band's ordered
  // list is what carries the content. The mockup's role="img" and its
  // one-sentence aria-label are deliberately dropped.
  it("is hidden from assistive technology", () => {
    const html = rack_html();

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
    expect(html).not.toContain("aria-label");
  });
});
