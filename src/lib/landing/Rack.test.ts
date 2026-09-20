import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import Rack, {
  RACK_UNITS,
  RACK_U_COUNT,
  TRAY_RUNG_FIRST_X,
  TRAY_RUNG_LAST_X,
  TRAY_RUNG_STEP,
  TRAY_RUNG_XS,
  rack_u_height,
  rack_u_y,
} from "./Rack.svelte";
import { CABLE_TRAY, HUD_PALETTE, RACK_CHASSIS, RACK_LED } from "./palette.js";

const SOURCE = readFileSync(new URL("./Rack.svelte", import.meta.url), "utf8");

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
  describe("the 42U map", () => {
    it("places every U at the documented pitch, y(U) = 94 + (U - 1) * 10", () => {
      for (let u = 1; u <= RACK_U_COUNT; u += 1) {
        expect(rack_u_y(u)).toBe(94 + (u - 1) * 10);
      }
    });

    it("draws an n-U device one unit short of its slot, leaving the seam between faces", () => {
      expect(rack_u_height(1)).toBe(9);
      expect(rack_u_height(2)).toBe(19);
      expect(rack_u_height(3)).toBe(29);
      expect(rack_u_height(4)).toBe(39);
      expect(rack_u_height(6)).toBe(59);
    });

    // A gap or an overlap in the map would show as a stripe of cabinet
    // where a device should be, or as two faces painted over each other -
    // neither of which any rendered-output assertion would notice.
    it("tiles all 42U with no gaps and no overlaps", () => {
      let next_u = 1;
      for (const unit of RACK_UNITS) {
        expect(unit.u).toBe(next_u);
        next_u += unit.units;
      }
      expect(next_u - 1).toBe(RACK_U_COUNT);
    });

    it("racks every device the map names", () => {
      expect(RACK_UNITS.map((unit) => unit.id)).toEqual([
        "brush-u1",
        "uxg-pro",
        "uck-g2-ssd",
        "brush-u4",
        "usw-aggregation",
        "patch-panel-u6",
        "usw-enterprise-48-poe",
        "patch-panel-u8",
        "unvr",
        "brush-u10",
        "usw-enterprise-24-poe",
        "patch-panel-u12",
        "empty-u13",
        "shelf",
        "pdu",
        "empty-u19",
        "r430",
        "r730xd-u23",
        "r730xd-u25",
        "empty-u27",
        "unlabelled-u29",
        "empty-u35",
        "smart-ups",
      ]);
    });

    it("renders one group per unit, each at its own U's y and height", () => {
      const groups = device_groups(rack_html());

      expect([...groups.keys()]).toEqual(RACK_UNITS.map((unit) => unit.id));

      for (const unit of RACK_UNITS) {
        const group = groups.get(unit.id) ?? "";
        expect(group).toContain(`y="${rack_u_y(unit.u)}"`);
        expect(group).toContain(`height="${rack_u_height(unit.units)}"`);
      }
    });
  });

  describe("the Proxmox node", () => {
    it("is the R430 at U22, the only unit wearing the accent", () => {
      const accented = RACK_UNITS.filter((unit) => unit.kind === "server" && unit.accent);

      expect(accented).toHaveLength(1);
      expect(accented[0].id).toBe("r430");
      expect(accented[0].u).toBe(22);
      expect(accented[0].units).toBe(1);
    });

    it("keeps the other two Dells where they are, at U23 and U25, two U each", () => {
      const plain = RACK_UNITS.filter((unit) => unit.kind === "server" && !unit.accent);

      expect(plain.map((unit) => [unit.id, unit.u, unit.units])).toEqual([
        ["r730xd-u23", 23, 2],
        ["r730xd-u25", 25, 2],
      ]);
    });

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
      expect(html).toMatch(/<rect[^>]*height="25"[^>]*stroke-dasharray="5 4"/);
    });
  });

  describe("the ceiling tray", () => {
    // The mockup lists 244 literal rungs. They are generated here, so the
    // ends of the run are what has to be pinned: the first rung meets the
    // basket's cut end and the last is far enough out that no viewport
    // reaches it.
    it("runs its rungs from the mockup's first x to its last, at the mockup's step", () => {
      expect(TRAY_RUNG_XS[0]).toBe(TRAY_RUNG_FIRST_X);
      expect(TRAY_RUNG_XS[0]).toBe(168);
      expect(TRAY_RUNG_XS.at(-1)).toBe(TRAY_RUNG_LAST_X);
      expect(TRAY_RUNG_XS.at(-1)).toBe(-2991);
      expect(TRAY_RUNG_XS[1] - TRAY_RUNG_XS[0]).toBe(-TRAY_RUNG_STEP);
      expect(TRAY_RUNG_XS).toHaveLength(244);
    });

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
    it("carries no hex literal of its own", () => {
      expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/);
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
