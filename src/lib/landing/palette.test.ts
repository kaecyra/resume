import {
  CABLE_TRAY,
  CONTRIBUTION_RAMP,
  ELEVATION,
  HUD_PALETTE,
  PIPELINE_INK,
  RACK_CHASSIS,
  RACK_LED,
} from "./palette.js";

// These helpers implement the WCAG relative-luminance/contrast formulas
// (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance), used below to
// check background contrast against every foreground token (accent,
// secondary, text) that this palette actually defines.

function hex_to_rgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function relative_luminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function luminance(hex: string): number {
  return relative_luminance(hex_to_rgb(hex));
}

function contrast_ratio(hex_a: string, hex_b: string): number {
  const luminance_a = relative_luminance(hex_to_rgb(hex_a));
  const luminance_b = relative_luminance(hex_to_rgb(hex_b));
  const lighter = Math.max(luminance_a, luminance_b);
  const darker = Math.min(luminance_a, luminance_b);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("HUD_PALETTE", () => {
  it("uses valid 6-digit hex colors for every token", () => {
    for (const value of Object.values(HUD_PALETTE)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each(["accent", "secondary", "text"] as const)(
    "clears WCAG AA contrast (4.5:1) between background and %s",
    (token) => {
      const ratio = contrast_ratio(HUD_PALETTE.background, HUD_PALETTE[token]);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );

  // The checks above prove each token is readable
  // against `background`, but body copy in Hero.svelte and Commits.svelte
  // is set in `secondary` against whichever surface it actually sits on
  // (`background` for the hero, `panel` for Commits) - not always
  // `background`. Check the token against the surface it's rendered on,
  // not just the page default. `meta` is deliberately excluded: it's
  // documented in palette.ts as sub-4.5:1 and decorative-label-only, never
  // body copy.
  it.each([
    ["secondary", "background"],
    ["secondary", "panel"],
    ["secondary", "panel_alt"],
    ["chip_text", "chip_bg"],
  ] as const)("clears WCAG AA contrast (4.5:1) for %s text on the %s surface", (token, surface) => {
    const ratio = contrast_ratio(HUD_PALETTE[surface], HUD_PALETTE[token]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe("CONTRIBUTION_RAMP", () => {
  it("uses valid 6-digit hex colors for every level", () => {
    for (const value of Object.values(CONTRIBUTION_RAMP)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("reuses HUD_PALETTE.edge for level_0, so an empty day reads as an unlit slot rather than a dark green", () => {
    expect(CONTRIBUTION_RAMP.level_0).toBe(HUD_PALETTE.edge);
  });

  // Not a WCAG contrast check (see palette.ts's comment on why the ramp is
  // exempt from the text-contrast sweep above) - this protects the
  // property the ramp actually needs to communicate a value at a glance:
  // each level reads as strictly brighter than the one before it. Without
  // this, a future edit could reorder or duplicate a step and every other
  // test in this file would stay green.
  it("steps level_0 through level_4 in strictly increasing brightness", () => {
    const levels = [
      CONTRIBUTION_RAMP.level_0,
      CONTRIBUTION_RAMP.level_1,
      CONTRIBUTION_RAMP.level_2,
      CONTRIBUTION_RAMP.level_3,
      CONTRIBUTION_RAMP.level_4,
    ];
    const luminances = levels.map((hex) => relative_luminance(hex_to_rgb(hex)));

    for (let i = 1; i < luminances.length; i++) {
      expect(luminances[i]).toBeGreaterThan(luminances[i - 1]);
    }
  });
});

// The pipeline section's four hardware tables (#209). Swept together
// wherever the check is about the widening as a whole rather than about one
// token's job.
const PIPELINE_TOKEN_TABLES: [string, Record<string, string>][] = [
  ["RACK_CHASSIS", RACK_CHASSIS],
  ["RACK_LED", RACK_LED],
  ["CABLE_TRAY", CABLE_TRAY],
  ["PIPELINE_INK", PIPELINE_INK],
];

// Every hex the page already had a name for before #209 widened the
// palette. ELEVATION's two `hair` recipes are rgba rather than hex and
// nothing in the new tables carries an alpha, so they are filtered out
// instead of compared as strings.
const ESTABLISHED_HEXES = new Set<string>(
  [...Object.values(HUD_PALETTE), ...Object.values(ELEVATION)].filter((value) =>
    /^#[0-9a-f]{6}$/i.test(value),
  ),
);

describe("the pipeline hardware tables", () => {
  it.each(PIPELINE_TOKEN_TABLES)("uses valid 6-digit hex colors for every %s token", (_, table) => {
    for (const value of Object.values(table)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  // The widening exists because the rack is new subject matter that has to
  // read as metal, not because the page wanted more greys. A new token
  // landing exactly on an existing one is the failure that argument was
  // meant to prevent: it means the colour already had a home and the rack
  // should have used it. Three collisions outside these two objects are
  // deliberate and documented in palette.ts - `RACK_LED.status` on
  // `ORBIT_CLASS_COLORS.leo`, `RACK_CHASSIS.outlet` on `MARKER_RED` and
  // `RACK_LED.healthy` on the ramp's brightest green.
  it.each(PIPELINE_TOKEN_TABLES)("restates no HUD_PALETTE or ELEVATION colour in %s", (_, table) => {
    const restated = Object.entries(table).filter(([, value]) => ESTABLISHED_HEXES.has(value));
    expect(restated).toEqual([]);
  });

  // The standing constraint from `.memory/`: the contribution grid's green
  // belongs to the grid. The section declares its own "this is fine" green
  // (`RACK_LED.healthy`) rather than importing `CONTRIBUTION_RAMP`, and no
  // intermediate step of the ramp may leak into the rack at all - a dark
  // ramp green turning up as a chassis fill would quietly make the grid's
  // scale mean something on a drawing that has no scale.
  it.each(PIPELINE_TOKEN_TABLES)("borrows no intermediate step of the ramp in %s", (_, table) => {
    const ramp_middle: string[] = [
      CONTRIBUTION_RAMP.level_1,
      CONTRIBUTION_RAMP.level_2,
      CONTRIBUTION_RAMP.level_3,
    ];
    const borrowed = Object.entries(table).filter(([, value]) => ramp_middle.includes(value));
    expect(borrowed).toEqual([]);
  });
});

describe("RACK_CHASSIS", () => {
  // The `unlabelled` fitting fills its U lighter than a genuinely empty one
  // precisely so a block of it reads as "something is in here that I am not
  // naming" rather than as a hole. Equal fills would erase the distinction
  // and nothing else in this file would notice. Nothing is drawn with it
  // since U29-34 was described, and it is kept for the next block that has
  // not been.
  it("keeps an occupied but unnamed U lighter than an empty one", () => {
    expect(luminance(RACK_CHASSIS.slot_unnamed)).toBeGreaterThan(luminance(RACK_CHASSIS.slot_empty));
  });

  // A blanking panel is a plate bolted across a U, not a gap in the rack.
  // At `#141418` it sat a few values off `slot_empty` and read as one, which
  // put three holes in a column of hardware. It stays well behind the patch
  // plates - that ladder is checked below - but it has to clear the cabinet
  // it is mounted in, and its brush slot has to stay darker than the plate
  // that slot is cut into.
  it("keeps a blanking panel reading as a plate rather than a gap", () => {
    expect(contrast_ratio(RACK_CHASSIS.brush_face, RACK_CHASSIS.slot_empty)).toBeGreaterThanOrEqual(
      2,
    );
    expect(luminance(RACK_CHASSIS.brush_face)).toBeGreaterThan(luminance(RACK_CHASSIS.cabinet));
    expect(luminance(RACK_CHASSIS.brush_slot)).toBeLessThan(luminance(RACK_CHASSIS.brush_face));
  });

  // The cabinet is a dark box on a dark page; its outline is the only thing
  // separating it from the section behind it.
  it("keeps the cabinet outline lighter than the cabinet body", () => {
    expect(luminance(RACK_CHASSIS.cabinet_edge)).toBeGreaterThan(luminance(RACK_CHASSIS.cabinet));
  });

  // The light parts are what make the drawing read as installed hardware
  // rather than as a stack of empty slots. They are not text, so this is a
  // legibility floor for a shape against its surround, not a WCAG check -
  // hence a ratio well above the 4.5:1 text floor rather than at it.
  it.each(["faceplate", "drive_bay", "puck"] as const)(
    "keeps %s well clear of the cabinet it is bolted into",
    (token) => {
      expect(contrast_ratio(RACK_CHASSIS[token], RACK_CHASSIS.cabinet)).toBeGreaterThanOrEqual(7);
    },
  );

  // A patch panel is a plate with holes in it, and it sits directly between
  // two switches. It used to be drawn six values off `faceplate`, which is
  // not a step anyone can see, so the top of the rack read as five switches
  // rather than two switches and three panels. It is deliberately not one of
  // the light parts above: it has to stay behind them.
  it("keeps a patch panel visibly behind the switch faces around it", () => {
    expect(luminance(RACK_CHASSIS.patch_face)).toBeLessThan(luminance(RACK_CHASSIS.faceplate));
    expect(contrast_ratio(RACK_CHASSIS.patch_face, RACK_CHASSIS.faceplate)).toBeGreaterThanOrEqual(
      2,
    );
  });

  // Behind the switches, but still a plate bolted into the rack rather than
  // a hole in it - which is what it becomes if it falls back toward the
  // cabinet. A shape floor, not a text one.
  it("keeps a patch panel reading as installed hardware", () => {
    expect(contrast_ratio(RACK_CHASSIS.patch_face, RACK_CHASSIS.cabinet)).toBeGreaterThanOrEqual(3);
    expect(luminance(RACK_CHASSIS.patch_face)).toBeGreaterThan(luminance(RACK_CHASSIS.brush_face));
  });

  // The keystone openings are cut into that plate, so they read as holes
  // only while they are darker than it.
  it("cuts the keystone openings darker than the plate they are cut into", () => {
    expect(luminance(RACK_CHASSIS.keystone)).toBeLessThan(luminance(RACK_CHASSIS.patch_face));
  });

  // Two reds in the drawing, each meaning one thing: a socket on the power
  // strip, and the plastic the two Pis are wearing. Collapsing them into one
  // token would make a case and an outlet the same object.
  it("keeps the Pi cases' red apart from the PDU's outlet red", () => {
    expect(RACK_CHASSIS.pi_case).not.toBe(RACK_CHASSIS.outlet);
    expect(contrast_ratio(RACK_CHASSIS.pi_case, RACK_CHASSIS.cabinet)).toBeGreaterThanOrEqual(3);
  });

  // The Pyle's three rockers and its nine sockets are drawn on one face,
  // about 8px apart. They are two rows of controls on the same strip, so
  // they stand off that face by the same distance - a rocker at half the
  // socket's separation reads as a smudge beside a row of lit outlets. The
  // ratio between the two separations is what is pinned, not either value,
  // so the face and the red stay free to move together.
  it("stands the Pyle's rockers off its face as far as the outlets beside them", () => {
    const outlet_gap = contrast_ratio(RACK_CHASSIS.outlet, RACK_CHASSIS.pdu_face);
    const rocker_gap = contrast_ratio(RACK_CHASSIS.pdu_switch, RACK_CHASSIS.pdu_face);

    expect(rocker_gap).toBeGreaterThanOrEqual(3);
    expect(rocker_gap / outlet_gap).toBeGreaterThanOrEqual(0.85);
    expect(rocker_gap / outlet_gap).toBeLessThanOrEqual(1.15);
  });

  // The Spark's mesh front is cut into its own face, the same relationship
  // the keystones have to their plate. It is also deliberately duller than
  // the page's amber, which already means "the node this site runs on" and
  // is not what a machine on a shelf is.
  it("keeps the Spark's mesh darker than its face, and the face off the accent", () => {
    expect(luminance(RACK_CHASSIS.spark_mesh)).toBeLessThan(luminance(RACK_CHASSIS.spark_face));
    expect(contrast_ratio(RACK_CHASSIS.spark_face, RACK_CHASSIS.cabinet)).toBeGreaterThanOrEqual(3);
    expect(luminance(RACK_CHASSIS.spark_face)).toBeLessThan(luminance(HUD_PALETTE.accent));
  });

  // The two Lenovo boxes on the u33 shelf are dark boxes standing in front
  // of an empty U. Why their faces stay there instead of rising to the
  // blanking panel's floor is recorded beside the tones in palette.ts; what
  // this pins is what that reasoning implies.
  //
  // The 1.7 floor is calibrated against the bezel, which is the same
  // arrangement one shelf up: `bezel_top_light` clears `cabinet` by 1.56:1
  // and the Dells read, so a Lenovo's edge has to do at least that much. The
  // face is then held by a distance from `brush_face` rather than by order
  // alone, because order alone admits `#434349` - one value under the plate,
  // which is the collision itself.
  //
  // The first assertion is the lighting direction the test is named for, and
  // it is documentation rather than a guard: a face bright enough to overtake
  // a legal top light is already well inside the 1.5 the last assertion
  // demands, so it cannot fail on its own. It stays for the reason the bezel
  // test below spells its own order out.
  it("draws the Lenovo with its lit edge rather than its face", () => {
    expect(luminance(RACK_CHASSIS.lenovo_top_light)).toBeGreaterThan(
      luminance(RACK_CHASSIS.lenovo_face),
    );
    expect(
      contrast_ratio(RACK_CHASSIS.lenovo_top_light, RACK_CHASSIS.slot_empty),
    ).toBeGreaterThanOrEqual(1.7);
    expect(luminance(RACK_CHASSIS.lenovo_face)).toBeLessThan(luminance(RACK_CHASSIS.brush_face));
    expect(
      contrast_ratio(RACK_CHASSIS.brush_face, RACK_CHASSIS.lenovo_face),
    ).toBeGreaterThanOrEqual(1.5);
  });

  // The server bezel is lit from above: a bright strip along its top edge,
  // the face below it, end caps in shadow at either side. Reordering any two
  // of those flips where the light is coming from.
  it("lights the server bezel from the top down", () => {
    expect(luminance(RACK_CHASSIS.bezel_top_light)).toBeGreaterThan(
      luminance(RACK_CHASSIS.bezel_face),
    );
    expect(luminance(RACK_CHASSIS.bezel_face)).toBeGreaterThan(
      luminance(RACK_CHASSIS.bezel_end_cap),
    );
  });
});

describe("RACK_LED", () => {
  // The port animation blinks dark, steady link, active. If two of those
  // ever land out of order the blink still runs, it just reads backwards,
  // which nothing else here would catch.
  it("steps an unlit port through steady link to an active blink in increasing brightness", () => {
    expect(luminance(RACK_LED.link)).toBeGreaterThan(luminance(RACK_LED.off));
    expect(luminance(RACK_LED.active)).toBeGreaterThan(luminance(RACK_LED.link));
  });

  // One green means one thing across the whole section: a healthy device in
  // the rack, and a step that passed in the graph. Declared once here and
  // aliased by PIPELINE_INK.pass so the two can never drift apart.
  it("paints a healthy device the same green the graph gives a passing step", () => {
    expect(PIPELINE_INK.pass).toBe(RACK_LED.healthy);
  });
});

describe("CABLE_TRAY", () => {
  // Each bundle is painted casing, then core, then seam. The core is the lit
  // inside of the jacket - darker than its casing would make the bundle read
  // as a flat line rather than as a round cable.
  it.each([
    ["far", "bundle_far", "core_far"],
    ["mid", "bundle_mid", "core_mid"],
    ["near", "bundle_near", "core_near"],
  ] as const)("keeps the %s bundle's core lighter than its casing", (_, casing, core) => {
    expect(luminance(CABLE_TRAY[core])).toBeGreaterThan(luminance(CABLE_TRAY[casing]));
  });

  // Three bundles run the same path at three depths, and the only cue for
  // which one is nearest is that its core is brightest. The casings sit too
  // close together to carry it, so the cores do.
  it("brightens the cores from the far bundle to the near one", () => {
    expect(luminance(CABLE_TRAY.core_mid)).toBeGreaterThan(luminance(CABLE_TRAY.core_far));
    expect(luminance(CABLE_TRAY.core_near)).toBeGreaterThan(luminance(CABLE_TRAY.core_mid));
  });

  // The seam is a thin line drawn just above each centreline. The mockup
  // calls it a highlight, but its value is darker than every casing, and
  // that is what makes it read as the fold in the jacket rather than as a
  // specular edge. Brightening it past a casing would invert that.
  it.each(["bundle_far", "bundle_mid", "bundle_near"] as const)(
    "keeps the seam line darker than the %s casing it is drawn over",
    (casing) => {
      expect(luminance(CABLE_TRAY.seam)).toBeLessThan(luminance(CABLE_TRAY[casing]));
    },
  );
});

describe("PIPELINE_INK", () => {
  // Band 1's trunk goes dotted for the whole stretch where the branch is
  // out. It has to recede behind the live trunk, and `edge` is already the
  // dimmest line tone the page uses, so the dormant stretch sits below it.
  it("keeps the dormant trunk dimmer than the page's dimmest line tone", () => {
    expect(luminance(PIPELINE_INK.dormant)).toBeLessThan(luminance(HUD_PALETTE.edge));
  });

  // The terminal's three turn types are told apart by bar fill. The reader's
  // own turn uses `edge`; the agent and tool replies sit below it, so the
  // transcript reads as the person speaking loudest in their own terminal.
  it.each(["agent_bar", "tool_bar"] as const)("keeps the %s below the reader's own turn", (token) => {
    expect(luminance(PIPELINE_INK[token])).toBeLessThan(luminance(HUD_PALETTE.edge));
  });

  // A crossing is a dashed rule ending in an arrow. The tip is where the eye
  // is meant to land, so it is the brighter of the two.
  it("makes a crossing's arrow tip brighter than the rule it ends", () => {
    expect(luminance(PIPELINE_INK.crossing_arrow)).toBeGreaterThan(
      luminance(PIPELINE_INK.crossing_rule),
    );
  });
});
