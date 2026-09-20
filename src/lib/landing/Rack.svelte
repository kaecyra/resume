<script module lang="ts">
  // The 42U rack in the basement, drawn front-on, fed from a ceiling cable
  // tray (#209 step d). Ported from the approved mockup rather than
  // redrawn: every rect, LED, bezel rib and tray wire below carries the
  // mockup's own geometry. What changed in the port is that the colours
  // now come from `palette.ts` instead of inline hex, and that the U
  // positions are computed from the rack's pitch instead of being written
  // out forty-two times.
  //
  // The drawing is decorative and carries no content: it is
  // `aria-hidden="true"` and the band's own ordered list is what a screen
  // reader reads. That is why nothing here has a label in the output -
  // `data-device` exists for the tests, which otherwise have no handle at
  // all on a drawing with no text in it.

  // A rack unit is 10 drawing units tall and U1's face starts at y = 94, so
  // `y(U) = 94 + (U - 1) * 10`. A device occupying n U is drawn one unit
  // short of n * 10, which leaves the dark seam between neighbouring faces.
  export const RACK_U_ORIGIN_Y = 94;
  export const RACK_U_PITCH = 10;
  export const RACK_U_SEAM = 1;
  export const RACK_U_COUNT = 42;

  export function rack_u_y(u: number): number {
    return RACK_U_ORIGIN_Y + (u - 1) * RACK_U_PITCH;
  }

  export function rack_u_height(units: number): number {
    return units * RACK_U_PITCH - RACK_U_SEAM;
  }

  // The equipment area, between the two mounting rails.
  const EQUIP_X = 48;
  const EQUIP_W = 160;

  // The cabinet itself: 8 units of plinth above U1 and below U42.
  const CABINET_PLINTH = 8;
  const CABINET_X = 30;
  const CABINET_W = 196;
  const CABINET_Y = RACK_U_ORIGIN_Y - CABINET_PLINTH;
  const CABINET_H = RACK_U_COUNT * RACK_U_PITCH + CABINET_PLINTH * 2;
  const CABINET_FLOOR_Y = CABINET_Y + CABINET_H;
  const RAIL_W = 16;

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

  export type RackUnit = {
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
  const ACCENT_CLEARANCE = 8;
  const ACCENT_X = 39;
  const ACCENT_W = 178;

  const RAIL_HOLE_US = Array.from({ length: RACK_U_COUNT }, (_, i) => i + 1);
  const KEYSTONE_XS = Array.from({ length: 24 }, (_, i) => 54 + i * 6);
  const OUTLET_XS = Array.from({ length: 8 }, (_, i) => 58 + i * 15);
  const UNLABELLED_SEAM_YS = Array.from({ length: 6 }, (_, i) => i * RACK_U_PITCH);
  const BEZEL_RIB_XS = Array.from({ length: 6 }, (_, i) => 70 + i * 21);
  const BEZEL_RIB_INSET = 1.5;

  function bezel_rib_path(x0: number, cy: number, top: number, bottom: number): string {
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

  // The ceiling tray. It is drawn from x = -3000 to x = 168 inside a
  // viewBox that starts at 0: `overflow: visible` on the SVG lets the
  // negative-x paint out, and `.landing`'s `overflow-x: clip`
  // (`src/routes/+page.svelte`) is what crops it at the viewport instead
  // of raising a horizontal scrollbar. The effect is that the tray runs
  // off the side of the screen rather than stopping at the drawing's edge.
  const TRAY_RUN_X = -3000;

  // Three bundles, far to near, each painted casing then core then seam.
  const TRAY_BUNDLES = [
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

  const TRAY_STRAP_XS = [101, 117, 133];
  const TRAY_STRAP_YS = [60, 73];

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
</script>

<script lang="ts">
  import { CABLE_TRAY, HUD_PALETTE, RACK_CHASSIS, RACK_LED } from "./palette.js";

  const PORT_FILL = { off: RACK_LED.off, link: RACK_LED.link } as const;

  const accent_unit = RACK_UNITS.find((unit) => unit.kind === "server" && unit.accent);

  // The blink keyframes have to name their three colours in CSS, and a
  // keyframe cannot read a TypeScript import, so the three LED states are
  // handed to the stylesheet as custom properties on the root instead.
  const led_vars = [
    `--rack-led-off: ${RACK_LED.off}`,
    `--rack-led-link: ${RACK_LED.link}`,
    `--rack-led-active: ${RACK_LED.active}`,
  ].join("; ");

  function blink_vars(blink: RackBlink): string | undefined {
    if (blink.pattern === undefined) {
      return undefined;
    }
    return `--d: ${blink.period_s}s; --t: ${blink.delay_s}s`;
  }
</script>

<svg class="rack-svg" viewBox="0 0 256 538" aria-hidden="true" style={led_vars}>
  <!-- Wire-mesh basket tray, seen from the front. The three bundles lie
       flat along the run, bend over and drop into the top of the cabinet,
       so along the run the near one covers the two behind it. -->
  {#each TRAY_BUNDLES as bundle (bundle.path)}
    <path d={bundle.path} fill="none" stroke={CABLE_TRAY[bundle.casing]} stroke-width="10" />
    <path d={bundle.path} fill="none" stroke={CABLE_TRAY[bundle.core]} stroke-width="4.5" />
    <path d={bundle.seam} fill="none" stroke={CABLE_TRAY.seam} stroke-width="0.9" />
  {/each}

  <!-- velcro lacing down each drop -->
  <g fill={CABLE_TRAY.strap}>
    {#each TRAY_STRAP_XS as strap_x (strap_x)}
      {#each TRAY_STRAP_YS as strap_y (strap_y)}
        <rect x={strap_x} y={strap_y} width="14" height="3.2" rx="1.2" />
      {/each}
    {/each}
  </g>

  <!-- the basket, welded over what it carries -->
  <g stroke={CABLE_TRAY.basket_rail} stroke-width="1.3" fill="none">
    <path d="M{TRAY_RUN_X},36 H168" />
    <path d="M{TRAY_RUN_X},12 H168" />
    <path d="M168,12 V36" />
  </g>
  <g stroke={CABLE_TRAY.basket_wire} stroke-width="0.9" fill="none">
    <path d="M{TRAY_RUN_X},20.0 H168" />
    <path d="M{TRAY_RUN_X},28.0 H168" />
  </g>
  <g stroke={CABLE_TRAY.basket_rung} stroke-width="1.1" fill="none">
    {#each TRAY_RUNG_XS as rung_x (rung_x)}
      <path d="M{rung_x},10 V38" />
    {/each}
  </g>

  <!-- APC NetShelter, 42U -->
  <rect
    x={CABINET_X}
    y={CABINET_Y}
    width={CABINET_W}
    height={CABINET_H}
    fill={RACK_CHASSIS.cabinet}
    stroke={RACK_CHASSIS.cabinet_edge}
    stroke-width="2"
  />
  <rect x={CABINET_X} y={CABINET_Y} width={RAIL_W} height={CABINET_H} fill={RACK_CHASSIS.rail} />
  <rect
    x={CABINET_X + CABINET_W - RAIL_W}
    y={CABINET_Y}
    width={RAIL_W}
    height={CABINET_H}
    fill={RACK_CHASSIS.rail}
  />
  <g fill={RACK_CHASSIS.cabinet_edge}>
    {#each RAIL_HOLE_US as hole_u (hole_u)}
      {@const hole_y = rack_u_y(hole_u) + 3}
      <rect x="36" y={hole_y} width="4" height="3" />
      <rect x="216" y={hole_y} width="4" height="3" />
    {/each}
  </g>

  {#each RACK_UNITS as unit (unit.id)}
    {@const unit_y = rack_u_y(unit.u)}
    {@const unit_h = rack_u_height(unit.units)}
    <g data-device={unit.id} data-u={unit.u}>
      {#if unit.kind === "brush"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.brush_face} />
        <rect x="60" y={unit_y + 3} width="136" height="3" fill={RACK_CHASSIS.brush_slot} />
      {:else if unit.kind === "empty"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.slot_empty} />
      {:else if unit.kind === "patch_panel"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.faceplate_dim} />
        <g fill={RACK_CHASSIS.keystone}>
          {#each KEYSTONE_XS as keystone_x (keystone_x)}
            <rect x={keystone_x} y={unit_y + 3} width="3" height="4" />
          {/each}
        </g>
      {:else if unit.kind === "appliance"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.faceplate} />
        <rect x="53" y={unit_y + 3} width="4" height="4" fill={RACK_LED.status} />
        <rect
          x="70"
          y={unit_y + 2}
          width={unit.port_block_w}
          height="5"
          fill={RACK_CHASSIS.cabinet_edge}
        />
      {:else if unit.kind === "switch"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.faceplate} />
        <rect x="53" y={unit_y + 3} width="4" height="4" fill={RACK_LED.status} />
        {#each unit.ports as port (port.x)}
          <rect
            x={port.x}
            y={unit_y + 3}
            width={unit.port_w}
            height="4"
            fill={PORT_FILL[port.state]}
            class:led-a={port.pattern === "a"}
            class:led-b={port.pattern === "b"}
            style={blink_vars(port)}
          />
        {/each}
      {:else if unit.kind === "nvr"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.faceplate} />
        <rect x="53" y={unit_y + 3} width="4" height="4" fill={RACK_LED.healthy} />
        {#each unit.bays as bay (bay.x)}
          <rect
            x={bay.x}
            y={unit_y + 2}
            width="28"
            height="5"
            fill={RACK_CHASSIS.drive_bay}
            class:led-a={bay.pattern === "a"}
            class:led-b={bay.pattern === "b"}
            style={blink_vars(bay)}
          />
        {/each}
      {:else if unit.kind === "shelf"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.slot_empty} />
        <rect x={EQUIP_X} y={unit_y + 7} width={EQUIP_W} height="2" fill={RACK_CHASSIS.trim} />
        <rect x="76" y={unit_y + 1} width="18" height="6" rx="2" fill={RACK_CHASSIS.puck} />
        <rect x="104" y={unit_y + 1} width="20" height="6" rx="1.5" fill={RACK_CHASSIS.trim} />
      {:else if unit.kind === "pdu"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.pdu_face} />
        <g fill={RACK_CHASSIS.outlet}>
          {#each OUTLET_XS as outlet_x (outlet_x)}
            <rect x={outlet_x} y={unit_y + 3} width="9" height="4" />
          {/each}
        </g>
      {:else if unit.kind === "unlabelled"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.slot_unnamed} />
        {#each UNLABELLED_SEAM_YS as seam_offset (seam_offset)}
          <rect
            x={EQUIP_X}
            y={unit_y + seam_offset}
            width={EQUIP_W}
            height="0.8"
            fill={RACK_CHASSIS.slot_empty}
          />
        {/each}
      {:else if unit.kind === "ups"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.ups_body} />
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height="2.5" fill={RACK_CHASSIS.bezel_face} />
        <rect x="66" y={unit_y + 5} width="60" height="9" fill={RACK_CHASSIS.ups_display} />
        <g fill={RACK_LED.healthy}>
          <rect x="72" y={unit_y + 8} width="4" height="4" />
          <rect x="80" y={unit_y + 8} width="4" height="4" />
        </g>
        <rect x="150" y={unit_y + 7} width="34" height="5" fill={RACK_CHASSIS.cabinet_edge} />
      {:else}
        {@const cy = unit_y + unit_h / 2}
        {@const rib_top = unit_y + BEZEL_RIB_INSET}
        {@const rib_bottom = unit_y + unit_h - BEZEL_RIB_INSET}
        <!-- The Dells wear their hex security bezels: dark frame, grey
             ribs, lock barrel on the left, status LED on the end cap. -->
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.bezel_face} />
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height="1.5" fill={RACK_CHASSIS.bezel_top_light} />
        <rect x={EQUIP_X} y={unit_y} width="11" height={unit_h} fill={RACK_CHASSIS.bezel_end_cap} />
        <rect x="197" y={unit_y} width="11" height={unit_h} fill={RACK_CHASSIS.bezel_end_cap} />
        <rect x="50.5" y={cy - 1.5} width="3" height="3" fill={RACK_LED.healthy} />
        <circle cx="64" {cy} r="2.2" fill="none" stroke={RACK_CHASSIS.bezel_lock} stroke-width="1" />
        <g fill="none" stroke={RACK_CHASSIS.bezel_rib} stroke-width="1.3">
          {#each BEZEL_RIB_XS as rib_x (rib_x)}
            <path d={bezel_rib_path(rib_x, cy, rib_top, rib_bottom)} />
          {/each}
        </g>
        <rect x="115" y={cy - 1} width="26" height="2.5" fill={RACK_CHASSIS.bezel_badge} />
      {/if}
    </g>
  {/each}

  <!-- drawn last so it sits over every device in the rack -->
  {#if accent_unit}
    <rect
      x={ACCENT_X}
      y={rack_u_y(accent_unit.u) - ACCENT_CLEARANCE}
      width={ACCENT_W}
      height={rack_u_height(accent_unit.units) + ACCENT_CLEARANCE * 2}
      rx="2"
      fill="none"
      stroke={HUD_PALETTE.accent}
      stroke-width="1.5"
      stroke-dasharray="5 4"
    />
  {/if}

  <rect x="36" y={CABINET_FLOOR_Y} width="24" height="8" fill={RACK_CHASSIS.trim} />
  <rect x="196" y={CABINET_FLOOR_Y} width="24" height="8" fill={RACK_CHASSIS.trim} />
</svg>

<style>
  .rack-svg {
    width: 100%;
    max-width: 370px;
    height: auto;
    display: block;
    /* The mesh tray is drawn at negative x so it runs out of the drawing
       and off the side of the screen. The clip happens further up the
       tree (`.landing` in src/routes/+page.svelte carries
       `overflow-x: clip`), not here. */
    overflow: visible;
  }

  /* Port activity. Two patterns, each element carrying its own period and
     offset, so the switches read as traffic rather than a metronome. The
     three fills come from the root's custom properties because a keyframe
     cannot read palette.ts directly. */
  @keyframes led-a {
    0%,
    38% {
      fill: var(--rack-led-active);
    }
    39%,
    47% {
      fill: var(--rack-led-off);
    }
    48%,
    71% {
      fill: var(--rack-led-link);
    }
    72%,
    77% {
      fill: var(--rack-led-off);
    }
    78%,
    100% {
      fill: var(--rack-led-active);
    }
  }
  @keyframes led-b {
    0%,
    22% {
      fill: var(--rack-led-link);
    }
    23%,
    30% {
      fill: var(--rack-led-off);
    }
    31%,
    58% {
      fill: var(--rack-led-active);
    }
    59%,
    63% {
      fill: var(--rack-led-off);
    }
    64%,
    88% {
      fill: var(--rack-led-link);
    }
    89%,
    100% {
      fill: var(--rack-led-off);
    }
  }
  .led-a {
    animation: led-a var(--d, 1.4s) steps(1, end) var(--t, 0s) infinite;
  }
  .led-b {
    animation: led-b var(--d, 1.9s) steps(1, end) var(--t, 0s) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .led-a,
    .led-b {
      animation: none;
    }
  }
</style>
