// The 42U rack's own data and arithmetic (#209 step d): the map of what is
// racked where, the U pitch that turns a unit number into a y, and the
// generated coordinate runs the drawing repeats itself over. Like globe.ts,
// orbits.ts and contributions.ts, everything here is plain functions over
// plain data with no DOM in it, tested in rack-layout.test.ts. Rack.svelte
// is the only thing that draws with it.
//
// Named `rack-layout` rather than `rack` because macOS is case-insensitive:
// `rack.test.ts` and the component's `Rack.test.ts` would be one file.

// A rack unit is 10 drawing units tall and U1's face starts at y = 94, so
// `y(U) = 94 + (U - 1) * 10`. A device occupying n U is drawn one unit
// short of n * 10, which leaves the dark seam between neighbouring faces.
const RACK_U_ORIGIN_Y = 94;
const RACK_U_PITCH = 10;
const RACK_U_SEAM = 1;
export const RACK_U_COUNT = 42;

export function rack_u_y(u: number): number {
  return RACK_U_ORIGIN_Y + (u - 1) * RACK_U_PITCH;
}

export function rack_u_height(units: number): number {
  return units * RACK_U_PITCH - RACK_U_SEAM;
}

// Where the faces meet inside a multi-U block that is drawn as one slab:
// one seam per U it occupies, measured from the block's own top.
export function rack_seam_offsets(units: number): number[] {
  return Array.from({ length: units }, (_, i) => i * RACK_U_PITCH);
}

// The equipment area, between the two mounting rails.
export const EQUIP_X = 48;
export const EQUIP_W = 160;

// The cabinet itself: 8 units of plinth above U1 and below U42.
const CABINET_PLINTH = 8;
export const CABINET_X = 30;
export const CABINET_W = 196;
export const CABINET_Y = RACK_U_ORIGIN_Y - CABINET_PLINTH;
export const CABINET_H = RACK_U_COUNT * RACK_U_PITCH + CABINET_PLINTH * 2;
export const CABINET_FLOOR_Y = CABINET_Y + CABINET_H;
export const RAIL_W = 16;

// Three blink patterns, so a wall of ports reads as traffic rather than as
// a metronome. Each port carries its own period and offset. `a` and `b`
// are the mockup's two port patterns; `activity` is the accent server's
// green LED, which flickers at its own uneven rhythm - a box doing work,
// not a port passing frames.
type RackBlinkPattern = "a" | "b" | "activity";

// A union rather than three independent optionals: a pattern without a
// period used to produce `--d: 0s`, which is a stopped animation, not the
// `var(--d, 1.9s)` fallback a reader of the stylesheet would expect. Either
// an element blinks and carries both numbers, or it does not blink at all.
type RackBlink =
  | { pattern?: undefined; period_s?: undefined; delay_s?: undefined }
  | { pattern: RackBlinkPattern; period_s: number; delay_s: number };

// The mockup's periods, ported straight, read as a strobe on a real screen
// rather than as a rack ticking over in a basement. Every one of them is
// stretched by this, in one place, so the numbers below stay the mockup's
// own and the whole rack slows together: a period a quarter longer is a
// fifth fewer flashes in the same span.
export const BLINK_PERIOD_SCALE = 1.25;

// A port: lit and holding link, or dark. `x` is absolute in the viewBox,
// and the width it is drawn at is its switch's `port_w` - every port on one
// switch is the same size, and the switches are not. The two access
// switches' rows are literal lists at the mockup's own 5.4 pitch, so they
// land exactly where it put them; the Pro Max's sixteen came later and are
// generated, because the mockup never drew that switch.
type RackPort = RackBlink & {
  x: number;
  state: "off" | "link";
};

type RackDriveBay = RackBlink & {
  x: number;
};

// A box sitting on a shelf, drawn inside the shelf's own U. `fill` names a
// `RACK_CHASSIS` tone rather than carrying a colour, because no hex is
// written outside `palette.ts`.
type RackPuck = {
  x: number;
  width: number;
  rx: number;
  fill: "puck" | "trim";
};

// The height every puck is drawn at, and the offset from the shelf's U to
// its top edge: they sit on the lip, which is `SHELF_SURFACE_DY` below.
export const PUCK_DY = 1;
export const PUCK_H = 6;

type RackFitting =
  // A blanking panel with a brush strip for cables to pass through.
  | { kind: "brush" }
  // Nothing racked.
  | { kind: "empty" }
  // A patch panel: a row of keystone openings.
  | { kind: "patch_panel" }
  // A small Ubiquiti box: status LED plus one port block.
  | { kind: "appliance"; port_block_w: number }
  // A switch: status LED plus a row of port LEDs.
  | { kind: "switch"; port_w: number; ports: RackPort[] }
  // The NVR: green health LED plus four drive bays.
  | { kind: "nvr"; bays: RackDriveBay[] }
  // A shelf, and whatever is compressed into its own U rather than drawn
  // standing on it - the u17 shelf's Hue bridge and Apple TV, which predate
  // the riser rule and stay as the mockup had them. A shelf whose gear
  // stands carries an empty list and a `risers` list instead.
  | { kind: "shelf"; pucks: readonly RackPuck[] }
  // A power strip: a row of outlets, and on the Pyle at the bottom of the
  // rack, a row of switches beside them. The two strips carry their own
  // runs rather than sharing one: nine outlets and three switches do not
  // fit where eight outlets sat.
  | { kind: "pdu"; outlet_xs: readonly number[]; switch_xs: readonly number[] }
  // Racked, deliberately not drawn as anything in particular. Nothing in
  // the map is one of these since U29-34 was described and drawn; it is
  // kept on purpose, for the next block of hardware that has not been.
  | { kind: "unlabelled" }
  // The UPS at the floor.
  | { kind: "ups" }
  // A Dell wearing its hex security bezel. `accent` marks the one node
  // this site actually runs on, and it is the only one whose LED does
  // anything - see `activity`.
  | { kind: "server"; accent: boolean; health?: RackBlink };

// Gear that stands on a unit rather than being racked in a U of its own.
// It is drawn rising into the U above, because that is what the real thing
// does: a Pi sitting on a switch does not stop taking up space because the
// rack has no rail for it. The u17 shelf compresses its Hue bridge and
// Apple TV into their own U instead, which is the older reading of the same
// situation and is left alone.
//
// `x` is absolute in the viewBox. The height and width come from
// `RISER_SHAPES`, so a riser cannot be given a size that nothing else in
// the drawing agrees with.
type RackRiser = {
  kind: keyof typeof RISER_SHAPES;
  x: number;
};

export const RISER_SHAPES = {
  // A Raspberry Pi 5 in its red case, seen end on.
  pi: { width: 26, height: 6 },
  // A Lenovo Neo Ultra Gen2 with an NVIDIA DGX Spark on top of it, drawn as
  // one box: the Spark is the top `spark_height` of it, narrower than the
  // machine it sits on.
  lenovo_spark: { width: 50, height: 30, spark_width: 34, spark_height: 16 },
} as const;

// The Spark's front is a mesh, not a flat panel. The grille is drawn as
// slats across the inset face, offset from its left edge, so the whole run
// moves with the box rather than being placed against the viewBox. The slat
// width lives here rather than in the template so the test that checks the
// run fits the face can see where the last slat ends.
export const SPARK_MESH_INSET = 3;
export const SPARK_MESH_SLAT_W = 1.4;
export const SPARK_MESH_XS = Array.from({ length: 7 }, (_, i) => 2 + i * 4);

// The shelf's own surface: its lip, not the top edge of its U. Both the
// shelf and anything standing on it measure from this, so the two cannot
// drift apart.
export const SHELF_SURFACE_DY = 7;

type RackUnit = {
  id: string;
  u: number;
  units: number;
  risers?: readonly RackRiser[];
} & RackFitting;

// Where a riser's underside sits: the top edge of the unit it stands on,
// except on a shelf, where it stands on the lip.
export function riser_base_y(unit: RackUnit): number {
  return rack_u_y(unit.u) + (unit.kind === "shelf" ? SHELF_SURFACE_DY : 0);
}

export function riser_box(
  unit: RackUnit,
  riser: RackRiser,
): { x: number; y: number; width: number; height: number } {
  const shape = RISER_SHAPES[riser.kind];

  return {
    x: riser.x,
    y: riser_base_y(unit) - shape.height,
    width: shape.width,
    height: shape.height,
  };
}

// The two power strips' faces. The u18 strip is eight outlets at the
// mockup's own pitch; the Pyle at the floor of the rack carries nine, and
// its three front switches take the left of the face, which is why the
// outlets start further in rather than sharing the run above.
const OUTLET_XS = Array.from({ length: 8 }, (_, i) => 58 + i * 15);
const PYLE_OUTLET_XS = Array.from({ length: 9 }, (_, i) => 94 + i * 12);
const PYLE_SWITCH_XS = [54, 66, 78];

// Both runs' widths live here rather than in the template, so the test that
// checks a run fits the equipment area can see the right edge of a rect and
// not just where it starts.
export const OUTLET_W = 9;
export const PDU_SWITCH_W = 8;

// The Pro Max's sixteen ports, one run at one pitch: unlike the two access
// switches above it, nothing on it is dark and nothing on it blinks.
const PRO_MAX_PORT_XS = Array.from({ length: 16 }, (_, i) => 66 + i * 8);

// The real hardware, top to bottom. `u` is the topmost U the device
// occupies and `units` how many it takes, so the two together tile the
// whole 42U column with no gaps and no overlaps. Anything standing on a
// unit instead of being racked in a U carries a `risers` list and is drawn
// above the face it stands on - see `RackRiser`.
export const RACK_UNITS: readonly RackUnit[] = [
  { id: "brush-u1", u: 1, units: 1, kind: "brush" },
  { id: "uxg-pro", u: 2, units: 1, kind: "appliance", port_block_w: 34 },
  { id: "uck-g2-ssd", u: 3, units: 1, kind: "appliance", port_block_w: 24 },
  { id: "brush-u4", u: 4, units: 1, kind: "brush" },
  {
    id: "usw-aggregation",
    u: 5,
    units: 1,
    kind: "switch",
    port_w: 9,
    // The aggregation switch holds link and sits still. It carries the two
    // access switches below it rather than any endpoint of its own, and its
    // eight fat ports blinking alongside their ninety-six read as one more
    // busy row instead of the uplink they are.
    ports: [
      { x: 76.0, state: "off" },
      { x: 90.0, state: "link" },
      { x: 104.0, state: "link" },
      { x: 118.0, state: "link" },
      { x: 132.0, state: "link" },
      { x: 146.0, state: "link" },
      { x: 160.0, state: "link" },
      { x: 174.0, state: "link" },
    ],
  },
  { id: "patch-panel-u6", u: 6, units: 1, kind: "patch_panel" },
  {
    id: "usw-enterprise-48-poe",
    u: 7,
    units: 1,
    kind: "switch",
    port_w: 3,
    ports: [
      { x: 64.0, state: "link", pattern: "b", period_s: 1.93, delay_s: 1.07 },
      { x: 69.4, state: "link" },
      { x: 74.8, state: "link" },
      { x: 80.2, state: "off" },
      { x: 85.6, state: "link", pattern: "b", period_s: 1.56, delay_s: 1.65 },
      { x: 91.0, state: "link" },
      { x: 96.4, state: "link", pattern: "b", period_s: 2.6, delay_s: 0.36 },
      { x: 101.8, state: "link" },
      { x: 107.2, state: "link" },
      { x: 112.6, state: "link" },
      { x: 118.0, state: "link" },
      { x: 123.4, state: "link" },
      { x: 128.8, state: "link" },
      { x: 134.2, state: "link", pattern: "b", period_s: 1.47, delay_s: 1.42 },
      { x: 139.6, state: "link" },
      { x: 145.0, state: "link" },
      { x: 150.4, state: "link", pattern: "a", period_s: 0.95, delay_s: 2.22 },
      { x: 155.8, state: "link", pattern: "b", period_s: 1.25, delay_s: 0.57 },
      { x: 161.2, state: "link" },
      { x: 166.6, state: "link", pattern: "a", period_s: 0.89, delay_s: 2.23 },
      { x: 172.0, state: "link" },
      { x: 177.4, state: "link", pattern: "a", period_s: 1.58, delay_s: 0.71 },
      { x: 182.8, state: "link" },
      { x: 188.2, state: "link" },
      { x: 193.6, state: "off" },
      { x: 199.0, state: "off" },
    ],
  },
  { id: "patch-panel-u8", u: 8, units: 1, kind: "patch_panel" },
  {
    id: "unvr",
    u: 9,
    units: 1,
    kind: "nvr",
    // The bays sit still. Blinking is the switches' alone: four rows of
    // ports already carry the traffic, and the NVR joining in read as the
    // whole rack twitching at once.
    bays: [{ x: 68 }, { x: 100 }, { x: 132 }, { x: 164 }],
  },
  { id: "brush-u10", u: 10, units: 1, kind: "brush" },
  {
    id: "usw-enterprise-24-poe",
    u: 11,
    units: 1,
    kind: "switch",
    port_w: 3,
    ports: [
      { x: 68.0, state: "link" },
      { x: 73.4, state: "link" },
      { x: 78.8, state: "link" },
      { x: 84.2, state: "link", pattern: "b", period_s: 2.08, delay_s: 0.9 },
      { x: 89.6, state: "off" },
      { x: 95.0, state: "link" },
      { x: 100.4, state: "link" },
      { x: 105.8, state: "off" },
      { x: 111.2, state: "link", pattern: "b", period_s: 0.73, delay_s: 0.87 },
      { x: 116.6, state: "link" },
      { x: 122.0, state: "link", pattern: "a", period_s: 1.91, delay_s: 1.53 },
      { x: 127.4, state: "off" },
      { x: 132.8, state: "link" },
      { x: 138.2, state: "link", pattern: "a", period_s: 1.74, delay_s: 0.38 },
      { x: 143.6, state: "link", pattern: "a", period_s: 1.81, delay_s: 1.44 },
      { x: 149.0, state: "link", pattern: "b", period_s: 2.47, delay_s: 0.34 },
      { x: 154.4, state: "link" },
      { x: 159.8, state: "link", pattern: "b", period_s: 0.92, delay_s: 2.22 },
      { x: 165.2, state: "link" },
      { x: 170.6, state: "link", pattern: "a", period_s: 1.51, delay_s: 2.22 },
      { x: 176.0, state: "link" },
      { x: 181.4, state: "link" },
      { x: 186.8, state: "link" },
      { x: 192.2, state: "link" },
    ],
  },
  { id: "patch-panel-u12", u: 12, units: 1, kind: "patch_panel" },
  { id: "empty-u13", u: 13, units: 4, kind: "empty" },
  {
    id: "shelf-u17",
    u: 17,
    units: 1,
    kind: "shelf",
    pucks: [
      { x: 76, width: 18, rx: 2, fill: "puck" },
      { x: 104, width: 20, rx: 1.5, fill: "trim" },
    ],
  },
  { id: "pdu-u18", u: 18, units: 1, kind: "pdu", outlet_xs: OUTLET_XS, switch_xs: [] },
  { id: "empty-u19", u: 19, units: 3, kind: "empty" },
  {
    id: "r430",
    u: 22,
    units: 1,
    kind: "server",
    accent: true,
    health: { pattern: "activity", period_s: 2.3, delay_s: 1.6 },
  },
  { id: "r730xd-u23", u: 23, units: 2, kind: "server", accent: false },
  { id: "r730xd-u25", u: 25, units: 2, kind: "server", accent: false },
  { id: "empty-u27", u: 27, units: 2, kind: "empty" },
  {
    id: "usw-pro-max-16",
    u: 29,
    units: 1,
    kind: "switch",
    port_w: 5,
    ports: PRO_MAX_PORT_XS.map((x) => ({ x, state: "link" as const })),
    // The two Pis stand on its lid, side by side, and are drawn in U28 -
    // which the map leaves as air above them.
    risers: [
      { kind: "pi", x: 97 },
      { kind: "pi", x: 133 },
    ],
  },
  { id: "empty-u30", u: 30, units: 3, kind: "empty" },
  {
    id: "shelf-u33",
    u: 33,
    units: 1,
    kind: "shelf",
    // Nothing is compressed into this shelf's U: both stacks stand on it.
    pucks: [],
    // Each stack is a Lenovo with a Spark on top, and the pair of them rise
    // off the shelf through the three U of air above it. That air is what
    // U30-32 is for: the shelf is 1U and what stands on it is not.
    risers: [
      { kind: "lenovo_spark", x: 71 },
      { kind: "lenovo_spark", x: 135 },
    ],
  },
  {
    id: "pyle-pdu",
    u: 34,
    units: 1,
    kind: "pdu",
    outlet_xs: PYLE_OUTLET_XS,
    switch_xs: PYLE_SWITCH_XS,
  },
  { id: "empty-u35", u: 35, units: 6, kind: "empty" },
  { id: "smart-ups", u: 41, units: 2, kind: "ups" },
];

// The dashed amber box around the R430. It clears the 1U face by this
// much above and below, and is drawn after every device so nothing in
// the rack crosses it.
export const ACCENT_CLEARANCE = 8;
export const ACCENT_X = 39;
export const ACCENT_W = 178;

export const RAIL_HOLE_US = Array.from({ length: RACK_U_COUNT }, (_, i) => i + 1);
export const KEYSTONE_XS = Array.from({ length: 24 }, (_, i) => 54 + i * 6);
export const BEZEL_RIB_XS = Array.from({ length: 6 }, (_, i) => 70 + i * 21);
export const BEZEL_RIB_INSET = 1.5;

export function bezel_rib_path(x0: number, cy: number, top: number, bottom: number): string {
  return [
    `M${x0},${cy}`,
    `L${x0 + 5.5},${top}`,
    `L${x0 + 14},${top}`,
    `L${x0 + 19.5},${cy}`,
    `L${x0 + 14},${bottom}`,
    `L${x0 + 5.5},${bottom}`,
    "Z",
  ].join(" ");
}

// The blink keyframes have to name their period and offset in CSS, so each
// animated element carries them as custom properties. An element with no
// pattern is not animated and gets no style attribute at all.
export function blink_vars(blink: RackBlink): string | undefined {
  if (blink.pattern === undefined) {
    return undefined;
  }
  // No `?? 0` on either number: the union above makes both of them present
  // wherever a pattern is, so a default here could only paper over a shape
  // the type no longer allows.
  return `--d: ${round(blink.period_s * BLINK_PERIOD_SCALE)}s; --t: ${blink.delay_s}s`;
}

// The scale multiplies out to float noise otherwise - 1.93 * 1.25 is
// 2.4125000000000005 in binary floating point, and that is not a number
// anyone wants to read in a style attribute.
function round(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}

// The ceiling tray. It is drawn from x = -3000 to x = 168 inside a
// viewBox that starts at 0: `overflow: visible` on the SVG lets the
// negative-x paint out, and `.landing`'s `overflow-x: clip`
// (`src/routes/+page.svelte`) is what crops it at the viewport instead
// of raising a horizontal scrollbar. The effect is that the tray runs
// off the side of the screen rather than stopping at the drawing's edge.
export const TRAY_RUN_X = -3000;

// Three bundles, far to near, each painted casing then core then seam.
export const TRAY_BUNDLES = [
  {
    path: `M${TRAY_RUN_X},26.0 H96 C116,26.0 108,52.0 108,86`,
    seam: `M${TRAY_RUN_X},22.4 H90`,
    casing: "bundle_far",
    core: "core_far",
  },
  {
    path: `M${TRAY_RUN_X},28.5 H112 C132,28.5 124,54.5 124,86`,
    seam: `M${TRAY_RUN_X},24.9 H106`,
    casing: "bundle_mid",
    core: "core_mid",
  },
  {
    path: `M${TRAY_RUN_X},31.0 H128 C148,31.0 140,57.0 140,86`,
    seam: `M${TRAY_RUN_X},27.4 H122`,
    casing: "bundle_near",
    core: "core_near",
  },
] as const;

export const TRAY_STRAP_XS = [101, 117, 133];
export const TRAY_STRAP_YS = [60, 73];

// The basket's rungs. The mockup lists these as 244 literal paths; the
// run is regular, so it is generated here from the same first x, last x
// and step.
export const TRAY_RUNG_FIRST_X = 168;
export const TRAY_RUNG_LAST_X = -2991;
export const TRAY_RUNG_STEP = 13;

export const TRAY_RUNG_XS = Array.from(
  { length: (TRAY_RUNG_FIRST_X - TRAY_RUNG_LAST_X) / TRAY_RUNG_STEP + 1 },
  (_, i) => TRAY_RUNG_FIRST_X - i * TRAY_RUNG_STEP,
);
