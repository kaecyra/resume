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
  // Every fitting kind has its own branch and there is no catch-all, so a
  // kind nobody drew renders an empty group rather than borrowing the
  // branch that happens to sit last. That is what this assertion sees: a
  // group with no face in it has neither its y nor its height.
  it("renders one group per unit, each at its own U's y and height", () => {
    const groups = device_groups(rack_html());

    expect([...groups.keys()]).toEqual(RACK_UNITS.map((unit) => unit.id));

    for (const unit of RACK_UNITS) {
      const group = groups.get(unit.id) ?? "";
      expect(group).toContain(`y="${rack_u_y(unit.u)}"`);
      expect(group).toContain(`height="${rack_u_height(unit.units)}"`);
    }
  });

  describe("the Proxmox node", () => {
    // The dashed box clears the 1U face by 8 units on each side, so it
    // overlaps the empty U above and below it. Drawn inside the loop it
    // would be painted over by whatever comes next.
    it("draws the dashed box after every device, so nothing in the rack crosses it", () => {
      const html = rack_html();
      const accent_at = html.indexOf('stroke-dasharray="5 4"');
      const last_device_at = html.lastIndexOf("<g data-device=");

      expect(accent_at).toBeGreaterThan(-1);
      expect(accent_at).toBeGreaterThan(last_device_at);
    });

    it("sizes the box around the R430's own U rather than a copied literal", () => {
      const html = rack_html();

      expect(html).toContain(`y="${rack_u_y(22) - 8}"`);
      expect(html).toMatch(
        new RegExp(`<rect[^>]*height="${rack_u_height(1) + 16}"[^>]*stroke-dasharray="5 4"`),
      );
    });
  });

  describe("the ceiling tray", () => {
    it("draws every rung it generated", () => {
      const html = rack_html();

      for (const x of [TRAY_RUNG_XS[0], TRAY_RUNG_XS[122], TRAY_RUNG_XS.at(-1)]) {
        expect(html).toContain(`d="M${x},10 V38"`);
      }
      expect([...html.matchAll(/,10 V38"/g)]).toHaveLength(TRAY_RUNG_XS.length);
    });

    // `overflow: visible` is what lets the negative-x tray out of the SVG
    // box. Svelte extracts scoped styles to their own stylesheet, so this
    // declaration never reaches the rendered HTML and only the source can
    // be read for it (the same trick as Commits.test.ts).
    it("keeps the SVG from clipping its own negative-x paint", () => {
      expect(SOURCE).toMatch(/\.rack-svg\s*\{[^}]*overflow:\s*visible/);
    });
  });

  describe("the port LEDs", () => {
    it("gives every animated element its own period and offset", () => {
      const html = rack_html();
      const animated = [...html.matchAll(/<rect[^>]*class="[^"]*led-[ab][^"]*"[^>]*>/g)];

      expect(animated.length).toBeGreaterThan(0);
      for (const [element] of animated) {
        expect(element).toMatch(/--d:\s*[\d.]+s/);
        expect(element).toMatch(/--t:\s*[\d.]+s/);
      }
    });

    it("stops blinking when the reader has asked for reduced motion", () => {
      const reduced = SOURCE.match(
        /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n  \}/,
      );

      expect(reduced).not.toBeNull();
      expect(reduced?.[1]).toContain(".led-a");
      expect(reduced?.[1]).toContain(".led-b");
      expect(reduced?.[1]).toMatch(/animation:\s*none/);
    });
  });

  describe("colour", () => {
    // Resolution 2 of the plan widened palette.ts specifically so the rack
    // would not carry its own hex. A literal here would be invisible to
    // every other test in the suite.
    //
    // The stylesheet needs a guard of its own, and a wider one. The
    // keyframes are where a hex is most tempting - they cannot import
    // palette.ts, which is the whole reason the three LED states arrive as
    // custom properties - and nothing there reaches the rendered HTML for
    // the token test below to see. It is also the only part of the file
    // where a three-digit literal cannot be confused with an issue number:
    // `{3,8}` over the whole source would match `#209` in the header.
    it("carries no hex literal of its own", () => {
      expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/);
      expect(MODULE_SOURCE).not.toMatch(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/);
      expect(STYLE_BLOCK).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it("paints only with the rack's own palette tokens", () => {
      const allowed = new Set<string>([
        ...Object.values(RACK_CHASSIS),
        ...Object.values(RACK_LED),
        ...Object.values(CABLE_TRAY),
        HUD_PALETTE.accent,
      ]);

      const painted = new Set(
        [...rack_html().matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(([hex]) => hex),
      );

      expect(painted.size).toBeGreaterThan(0);
      expect([...painted].filter((hex) => !allowed.has(hex))).toEqual([]);
    });
  });

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
