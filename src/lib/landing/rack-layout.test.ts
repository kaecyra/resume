import {
  BLINK_PERIOD_SCALE,
  EQUIP_W,
  EQUIP_X,
  OUTLET_W,
  PDU_SWITCH_W,
  PUCK_DY,
  PUCK_H,
  RACK_UNITS,
  RACK_U_COUNT,
  RISER_SHAPES,
  SPARK_MESH_INSET,
  SPARK_MESH_SLAT_W,
  SPARK_MESH_XS,
  TRAY_RUNG_FIRST_X,
  TRAY_RUNG_LAST_X,
  TRAY_RUNG_STEP,
  TRAY_RUNG_XS,
  blink_vars,
  rack_seam_offsets,
  rack_u_height,
  rack_u_y,
  riser_base_y,
  riser_box,
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
      "shelf-u17",
      "pdu-u18",
      "empty-u19",
      "r430",
      "r730xd-u23",
      "r730xd-u25",
      "empty-u27",
      "usw-pro-max-16",
      "empty-u30",
      "shelf-u33",
      "pyle-pdu",
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

describe("the bottom six U", () => {
  // U29-34 was a 6U slab drawn as "something is in here" until the hardware
  // was described. Each entry below is a real box in the basement, and the
  // four of them fill the six U exactly.
  it("racks the switch, the air above the shelf, the shelf and the PDU", () => {
    const bottom = RACK_UNITS.filter((unit) => unit.u >= 29 && unit.u <= 34);

    expect(bottom.map((unit) => [unit.id, unit.u, unit.units, unit.kind])).toEqual([
      ["usw-pro-max-16", 29, 1, "switch"],
      ["empty-u30", 30, 3, "empty"],
      ["shelf-u33", 33, 1, "shelf"],
      ["pyle-pdu", 34, 1, "pdu"],
    ]);
  });

  it("gives the Pro Max its sixteen ports, every one inside the equipment area", () => {
    const switch_unit = RACK_UNITS.find((unit) => unit.id === "usw-pro-max-16");

    expect(switch_unit?.kind).toBe("switch");
    if (switch_unit?.kind !== "switch") return;

    expect(switch_unit.ports).toHaveLength(16);
    for (const port of switch_unit.ports) {
      expect(port.x).toBeGreaterThanOrEqual(EQUIP_X);
      expect(port.x + switch_unit.port_w).toBeLessThanOrEqual(EQUIP_X + EQUIP_W);
    }
  });

  // Nine outlets rather than the u18 strip's eight, and the switches on its
  // front are why they had to move: the same eight-outlet run left no room
  // for them.
  it("gives the Pyle nine outlets and its front switches, all inside the equipment area", () => {
    const pdu = RACK_UNITS.find((unit) => unit.id === "pyle-pdu");
    const strip = RACK_UNITS.find((unit) => unit.id === "pdu-u18");

    expect(pdu?.kind).toBe("pdu");
    expect(strip?.kind).toBe("pdu");
    if (pdu?.kind !== "pdu" || strip?.kind !== "pdu") return;

    expect(pdu.outlet_xs).toHaveLength(9);
    expect(pdu.switch_xs).toHaveLength(3);
    expect(strip.outlet_xs).toHaveLength(8);
    expect(strip.switch_xs).toEqual([]);

    // Right edges, not just where each rect starts: an outlet is OUTLET_W
    // wide and a switch PDU_SWITCH_W, and a run that starts inside the area
    // can still finish painted over the right mounting rail.
    for (const [xs, width] of [
      [pdu.outlet_xs, OUTLET_W],
      [strip.outlet_xs, OUTLET_W],
      [pdu.switch_xs, PDU_SWITCH_W],
    ] as const) {
      for (const x of xs) {
        expect(x).toBeGreaterThanOrEqual(EQUIP_X);
        expect(x + width).toBeLessThanOrEqual(EQUIP_X + EQUIP_W);
      }
    }
  });
});

describe("gear standing on a unit", () => {
  const RISERS = RACK_UNITS.flatMap((unit) =>
    (unit.risers ?? []).map((riser) => ({ unit, riser, box: riser_box(unit, riser) })),
  );

  it("stands two Raspberry Pis on the switch and two Lenovo-plus-Spark stacks on the shelf", () => {
    expect(
      RISERS.map(({ unit, riser }) => [unit.id, riser.kind]),
    ).toEqual([
      ["usw-pro-max-16", "pi"],
      ["usw-pro-max-16", "pi"],
      ["shelf-u33", "lenovo_spark"],
      ["shelf-u33", "lenovo_spark"],
    ]);
  });

  // A box standing on something is drawn above it, not inside its own U -
  // that is the whole decision, and these are the four boxes it produces.
  // `rack_u_y(29)` is 374, so a 6-tall Pi standing on that face starts at
  // 368; the shelf's lip is `rack_u_y(33) + SHELF_SURFACE_DY`, 421, so a
  // 30-tall stack starts at 391. A sign flip, a changed shape or a moved
  // lip all land here.
  it("draws each riser above the surface it stands on", () => {
    expect(RISERS.map(({ box }) => [box.x, box.y, box.width, box.height])).toEqual([
      [97, 368, 26, 6],
      [133, 368, 26, 6],
      [71, 391, 50, 30],
      [135, 391, 50, 30],
    ]);
  });

  // The relationship the box is derived from, stated once: a riser's
  // underside sits on the surface it stands on, whatever that surface is.
  it("sits each riser's underside on the surface it stands on", () => {
    for (const { unit, box } of RISERS) {
      expect(box.y + box.height).toBe(riser_base_y(unit));
    }
  });

  it("keeps every riser inside the equipment area", () => {
    for (const { box } of RISERS) {
      expect(box.x).toBeGreaterThanOrEqual(EQUIP_X);
      expect(box.x + box.width).toBeLessThanOrEqual(EQUIP_X + EQUIP_W);
    }
  });

  // `Rack.svelte` carves the Spark off the top of the stack's box and
  // centres it, so a Spark taller or wider than the box it comes out of
  // emits a negative height or a negative inset on a rect. Invalid SVG, and
  // nothing downstream would say so.
  it("keeps the Spark inside the stack it is carved out of", () => {
    const stack = RISER_SHAPES.lenovo_spark;

    expect(stack.spark_height).toBeLessThan(stack.height);
    expect(stack.spark_width).toBeLessThan(stack.width);
  });

  // One level further down, and the same failure: the grille is a run of
  // slats across the Spark's inset face, offset from its left edge. Nothing
  // relates the end of that run to the width of the face, so a narrower
  // Spark draws slats out past the box they belong to. The inset is taken
  // off both axes, so a short enough Spark empties the slats' height the
  // same way - that is the `height="-10"` this shape was written after.
  it("keeps the mesh slats inside the face they are cut into", () => {
    const stack = RISER_SHAPES.lenovo_spark;
    const face_w = stack.spark_width - SPARK_MESH_INSET * 2;
    const last_slat = SPARK_MESH_XS[SPARK_MESH_XS.length - 1];

    expect(SPARK_MESH_XS[0]).toBeGreaterThanOrEqual(0);
    expect(last_slat + SPARK_MESH_SLAT_W).toBeLessThanOrEqual(face_w);
    expect(SPARK_MESH_INSET * 2).toBeLessThan(stack.spark_height);
  });

  // The u17 pair is the older reading of gear on a shelf: compressed into
  // the shelf's own U rather than standing on it. They moved out of a
  // `unit.id === "shelf-u17"` branch in the template and into the map, so
  // the map is now the only thing saying they exist.
  it("compresses the u17 shelf's Hue bridge and Apple TV into its own U", () => {
    const shelf = RACK_UNITS.find((unit) => unit.id === "shelf-u17");

    expect(shelf?.kind).toBe("shelf");
    if (shelf?.kind !== "shelf") return;

    expect(shelf.pucks.map((puck) => puck.fill)).toEqual(["puck", "trim"]);
    // Drawn from the top of the U down, so the pair has to finish inside
    // the U's own height rather than over the shelf below it.
    expect(PUCK_DY + PUCK_H).toBeLessThanOrEqual(rack_u_height(shelf.units));

    for (const puck of shelf.pucks) {
      expect(puck.x).toBeGreaterThanOrEqual(EQUIP_X);
      expect(puck.x + puck.width).toBeLessThanOrEqual(EQUIP_X + EQUIP_W);
    }
  });

  // The rule the bottom 6U was designed around: gear rises into the U above
  // it, so that U has to be air. Rack something there later and the drawing
  // silently paints two faces over each other.
  it("rises only into U the map leaves empty", () => {
    // The pitch from the module rather than a literal 10: if it ever moves,
    // this arithmetic would otherwise go on reporting confidently about the
    // wrong U.
    const pitch = rack_u_y(2) - rack_u_y(1);
    const kind_of_u = new Map<number, string>();
    for (const unit of RACK_UNITS) {
      for (let u = unit.u; u < unit.u + unit.units; u += 1) {
        kind_of_u.set(u, unit.kind);
      }
    }

    for (const { unit, box } of RISERS) {
      const top_u = Math.floor((box.y - rack_u_y(1)) / pitch) + 1;
      // Exclusive at the bottom: a riser's base edge sits on the surface it
      // stands on, which is the unit's own U, not a U it rises into.
      const bottom_u = Math.ceil((box.y + box.height - rack_u_y(1)) / pitch);

      expect(top_u).toBeLessThan(unit.u);
      for (let u = top_u; u <= bottom_u; u += 1) {
        if (u === unit.u) continue;
        expect(kind_of_u.get(u), `U${u} under ${unit.id}'s riser`).toBe("empty");
      }
    }
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
