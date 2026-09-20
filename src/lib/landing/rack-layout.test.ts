import {
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
      "--d: 1.82s; --t: 2.36s",
    );
  });

  // Without a pattern there is no animation to time, and an empty style
  // attribute would otherwise ship on every unlit port in the rack.
  it("gives an unpatterned element nothing at all", () => {
    expect(blink_vars({})).toBeUndefined();
  });
});
