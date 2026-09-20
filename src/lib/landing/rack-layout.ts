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

// Two blink patterns, so a wall of ports reads as traffic rather than as
// a metronome. Each port carries its own period and offset.
type RackBlinkPattern = "a" | "b";

interface RackBlink {
  pattern?: RackBlinkPattern;
  period_s?: number;
  delay_s?: number;
}

// A port: lit and holding link, or dark. `x` is absolute in the viewBox,
// kept as a literal list rather than a start-plus-step so the two
// 5.4-wide port rows land exactly where the mockup put them.
interface RackPort extends RackBlink {
  x: number;
  state: "off" | "link";
}

interface RackDriveBay extends RackBlink {
  x: number;
}

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
  // The shelf, with the Hue bridge and the Apple TV sitting on it.
  | { kind: "shelf" }
  // The power strip.
  | { kind: "pdu" }
  // Racked, deliberately not drawn as anything in particular.
  | { kind: "unlabelled" }
  // The UPS at the floor.
  | { kind: "ups" }
  // A Dell wearing its hex security bezel. `accent` marks the one node
  // this site actually runs on.
  | { kind: "server"; accent: boolean };

type RackUnit = {
  id: string;
  u: number;
  units: number;
} & RackFitting;

// The real hardware, top to bottom. `u` is the topmost U the device
// occupies and `units` how many it takes, so the two together tile the
// whole 42U column with no gaps and no overlaps.
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
    ports: [
      { x: 76.0, state: "off" },
      { x: 90.0, state: "link", pattern: "a", period_s: 1.82, delay_s: 2.36 },
      { x: 104.0, state: "link", pattern: "a", period_s: 1.7, delay_s: 2.01 },
      { x: 118.0, state: "link" },
      { x: 132.0, state: "link", pattern: "b", period_s: 1.56, delay_s: 1.42 },
      { x: 146.0, state: "link", pattern: "a", period_s: 1.3, delay_s: 0.69 },
      { x: 160.0, state: "link", pattern: "b", period_s: 1.41, delay_s: 2.35 },
      { x: 174.0, state: "link", pattern: "a", period_s: 0.71, delay_s: 1.46 },
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
    bays: [
      { x: 68 },
      { x: 100, pattern: "b", period_s: 3.1, delay_s: 1.1 },
      { x: 132, pattern: "b", period_s: 3.8, delay_s: 2.2 },
      { x: 164 },
    ],
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
  { id: "shelf", u: 17, units: 1, kind: "shelf" },
  { id: "pdu", u: 18, units: 1, kind: "pdu" },
  { id: "empty-u19", u: 19, units: 3, kind: "empty" },
  { id: "r430", u: 22, units: 1, kind: "server", accent: true },
  { id: "r730xd-u23", u: 23, units: 2, kind: "server", accent: false },
  { id: "r730xd-u25", u: 25, units: 2, kind: "server", accent: false },
  { id: "empty-u27", u: 27, units: 2, kind: "empty" },
  { id: "unlabelled-u29", u: 29, units: 6, kind: "unlabelled" },
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
export const OUTLET_XS = Array.from({ length: 8 }, (_, i) => 58 + i * 15);
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
  return `--d: ${blink.period_s}s; --t: ${blink.delay_s}s`;
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
