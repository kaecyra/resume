import {
  BLINK_PERIOD_SCALE,
  RACK_UNITS,
  RACK_U_COUNT,
  TRAY_RUNG_FIRST_X,
  TRAY_RUNG_LAST_X,
  TRAY_RUNG_STEP,
  TRAY_RUNG_XS,
  blink_vars,
  rack_seam_offsets,
  rack_u_height,
  rack_u_y,
} from "./rack-layout.js";

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

  // The seams inside a multi-U slab follow the block's own size. A copied
  // count would paint a seam on the empty U below a shortened block.
  it("puts one seam per U of the block it is asked about", () => {
    expect(rack_seam_offsets(1)).toEqual([0]);
    expect(rack_seam_offsets(5)).toEqual([0, 10, 20, 30, 40]);
    expect(rack_seam_offsets(6)).toEqual([0, 10, 20, 30, 40, 50]);
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
});

describe("the blink custom properties", () => {
  it("hands an animated element its own period and offset", () => {
    expect(blink_vars({ pattern: "a", period_s: 1.82, delay_s: 2.36 })).toBe(
      `--d: ${1.82 * BLINK_PERIOD_SCALE}s; --t: 2.36s`,
    );
  });

  it("slows every period by the same scale, and only the period", () => {
    const slow = blink_vars({ pattern: "b", period_s: 2.0, delay_s: 1.0 });

    expect(slow).toBe(`--d: ${2.0 * BLINK_PERIOD_SCALE}s; --t: 1s`);
  });

  // 1.93 * 1.25 is 2.4125000000000005 in binary floating point, and a
  // style attribute is not the place to find that out.
  it("rounds the scaled period rather than shipping float noise", () => {
    expect(blink_vars({ pattern: "b", period_s: 1.93, delay_s: 1.07 })).toBe(
      "--d: 2.413s; --t: 1.07s",
    );
  });

  // Without a pattern there is no animation to time, and an empty style
  // attribute would otherwise ship on every unlit port in the rack.
  it("gives an unpatterned element nothing at all", () => {
    expect(blink_vars({})).toBeUndefined();
  });
});

describe("what blinks", () => {
  // The aggregation switch carries the two access switches rather than any
  // endpoint of its own, and the NVR's bays are drive faces, not LEDs.
  it("blinks on the two access switches and nowhere else", () => {
    const blinking = RACK_UNITS.filter((unit) => {
      if (unit.kind === "switch") {
        return unit.ports.some((port) => port.pattern !== undefined);
      }
      if (unit.kind === "nvr") {
        return unit.bays.some((bay) => bay.pattern !== undefined);
      }
      return false;
    });

    expect(blinking.map((unit) => unit.id)).toEqual([
      "usw-enterprise-48-poe",
      "usw-enterprise-24-poe",
    ]);
  });

  it("holds every port on the aggregation switch still", () => {
    const aggregation = RACK_UNITS.find((unit) => unit.id === "usw-aggregation");

    expect(aggregation?.kind).toBe("switch");
    expect(
      aggregation?.kind === "switch" && aggregation.ports.every((port) => port.pattern === undefined),
    ).toBe(true);
  });

  it("gives the activity LED to the accent node alone", () => {
    const lit = RACK_UNITS.filter((unit) => unit.kind === "server" && unit.health !== undefined);

    expect(lit.map((unit) => unit.id)).toEqual(["r430"]);
    expect(lit.every((unit) => unit.kind === "server" && unit.accent)).toBe(true);
    expect(lit.every((unit) => unit.kind === "server" && unit.health?.pattern === "activity")).toBe(
      true,
    );
  });

  // It is disk activity, not a slow health pulse, so it has to turn over on
  // the same order as the ports beside it rather than once every several
  // seconds. The bound is the slowest port, not the busiest: the LED is
  // deliberately not the fastest thing in the rack, and asserting against
  // the minimum would pin a number this test has no opinion about.
  it("turns over no slower than the slowest port on a switch", () => {
    const activity = RACK_UNITS.find((unit) => unit.kind === "server" && unit.health !== undefined);
    const port_periods = RACK_UNITS.flatMap((unit) =>
      unit.kind === "switch"
        ? unit.ports.flatMap((port) => (port.pattern === undefined ? [] : [port.period_s ?? 0]))
        : [],
    );

    const period = activity?.kind === "server" ? (activity.health?.period_s ?? 0) : 0;
    expect(period).toBeGreaterThan(0);
    expect(period).toBeLessThanOrEqual(Math.max(...port_periods));
  });
});
