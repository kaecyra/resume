<script lang="ts">
  // The 42U rack in the basement, drawn front-on, fed from a ceiling cable
  // tray (#209 step d). Ported from the approved mockup rather than
  // redrawn: every rect, LED, bezel rib and tray wire below carries the
  // mockup's own geometry. What changed in the port is that the colours
  // now come from `palette.ts` instead of inline hex, and that the map of
  // what is racked where, with the arithmetic that turns a U into a y,
  // lives in `rack-layout.ts` instead of being written out forty-two times.
  //
  // The drawing is decorative and carries no content: it is
  // `aria-hidden="true"` and the band's own ordered list is what a screen
  // reader reads. That is why nothing here has a label in the output -
  // `data-device` exists for the tests, which otherwise have no handle at
  // all on a drawing with no text in it.
  import { CABLE_TRAY, HUD_PALETTE, RACK_CHASSIS, RACK_LED } from "./palette.js";
  import type { RevealPhase } from "./pipeline-motion.js";
  import {
    ACCENT_CLEARANCE,
    ACCENT_W,
    ACCENT_X,
    BEZEL_RIB_INSET,
    BEZEL_RIB_XS,
    CABINET_FLOOR_Y,
    CABINET_H,
    CABINET_W,
    CABINET_X,
    CABINET_Y,
    EQUIP_W,
    EQUIP_X,
    KEYSTONE_XS,
    RAIL_HOLE_US,
    RAIL_W,
    RACK_UNITS,
    RISER_SHAPES,
    SHELF_SURFACE_DY,
    SPARK_MESH_INSET,
    SPARK_MESH_XS,
    TRAY_BUNDLES,
    TRAY_RUNG_XS,
    TRAY_RUN_X,
    TRAY_STRAP_XS,
    TRAY_STRAP_YS,
    bezel_rib_path,
    blink_vars,
    rack_seam_offsets,
    rack_u_height,
    rack_u_y,
    riser_box,
  } from "./rack-layout.js";

  // The rack's only prop, and only because the band it sits in reveals on
  // scroll: the blinking ports and drive bays hold at the off colour until
  // the band arrives, so the rack comes up with the section rather than
  // having been running since the page loaded. The status and health LEDs
  // are not gated - they are lit metal, part of the drawing, and not
  // something that starts.
  let { phase = "static" }: { phase?: RevealPhase } = $props();

  const accent_unit = RACK_UNITS.find((unit) => unit.kind === "server" && unit.accent);

  // The blink keyframes have to name their three colours in CSS, and a
  // keyframe cannot read a TypeScript import, so the three LED states are
  // handed to the stylesheet as custom properties on the root instead.
  const led_vars = [
    `--rack-led-off: ${RACK_LED.off}`,
    `--rack-led-link: ${RACK_LED.link}`,
    `--rack-led-active: ${RACK_LED.active}`,
    `--rack-led-healthy: ${RACK_LED.healthy}`,
  ].join("; ");
</script>

<svg
  class="rack-svg"
  class:is-armed={phase === "armed"}
  viewBox="0 0 256 538"
  aria-hidden="true"
  style={led_vars}
>
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
    <g data-device={unit.id}>
      {#if unit.kind === "brush"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.brush_face} />
        <rect x="60" y={unit_y + 3} width="136" height="3" fill={RACK_CHASSIS.brush_slot} />
      {:else if unit.kind === "empty"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.slot_empty} />
      {:else if unit.kind === "patch_panel"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.patch_face} />
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
            fill={RACK_LED[port.state]}
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
        <rect
          x={EQUIP_X}
          y={unit_y + SHELF_SURFACE_DY}
          width={EQUIP_W}
          height="2"
          fill={RACK_CHASSIS.trim}
        />
        <!-- The u17 shelf's own pair, compressed into its U rather than
             drawn standing: they predate the riser rule and are left as the
             mockup had them. -->
        {#if unit.id === "shelf-u17"}
          <rect x="76" y={unit_y + 1} width="18" height="6" rx="2" fill={RACK_CHASSIS.puck} />
          <rect x="104" y={unit_y + 1} width="20" height="6" rx="1.5" fill={RACK_CHASSIS.trim} />
        {/if}
      {:else if unit.kind === "pdu"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.pdu_face} />
        <g fill={RACK_CHASSIS.pdu_switch}>
          {#each unit.switch_xs as switch_x (switch_x)}
            <rect x={switch_x} y={unit_y + 2} width="8" height="5" rx="1" />
          {/each}
        </g>
        <g fill={RACK_CHASSIS.outlet}>
          {#each unit.outlet_xs as outlet_x (outlet_x)}
            <rect x={outlet_x} y={unit_y + 3} width="9" height="4" />
          {/each}
        </g>
      {:else if unit.kind === "unlabelled"}
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.slot_unnamed} />
        {#each rack_seam_offsets(unit.units) as seam_offset (seam_offset)}
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
      {:else if unit.kind === "server"}
        {@const cy = unit_y + unit_h / 2}
        {@const rib_top = unit_y + BEZEL_RIB_INSET}
        {@const rib_bottom = unit_y + unit_h - BEZEL_RIB_INSET}
        <!-- The Dells wear their hex security bezels: dark frame, grey
             ribs, lock barrel on the left, status LED on the end cap. -->
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height={unit_h} fill={RACK_CHASSIS.bezel_face} />
        <rect x={EQUIP_X} y={unit_y} width={EQUIP_W} height="1.5" fill={RACK_CHASSIS.bezel_top_light} />
        <rect x={EQUIP_X} y={unit_y} width="11" height={unit_h} fill={RACK_CHASSIS.bezel_end_cap} />
        <rect x="197" y={unit_y} width="11" height={unit_h} fill={RACK_CHASSIS.bezel_end_cap} />
        <rect
          x="50.5"
          y={cy - 1.5}
          width="3"
          height="3"
          fill={RACK_LED.healthy}
          class:led-activity={unit.health?.pattern === "activity"}
          style={unit.health === undefined ? undefined : blink_vars(unit.health)}
        />
        <circle cx="64" {cy} r="2.2" fill="none" stroke={RACK_CHASSIS.bezel_lock} stroke-width="1" />
        <g fill="none" stroke={RACK_CHASSIS.bezel_rib} stroke-width="1.3">
          {#each BEZEL_RIB_XS as rib_x (rib_x)}
            <path d={bezel_rib_path(rib_x, cy, rib_top, rib_bottom)} />
          {/each}
        </g>
      {/if}

      <!-- What stands on this unit rather than being racked in a U of its
           own, drawn after the fitting and therefore over the empty U it
           rises into. Every unit is drawn in U order, so a riser always
           paints after the air above it. -->
      {#each unit.risers ?? [] as riser (riser.x)}
        {@const box = riser_box(unit, riser)}
        {#if riser.kind === "pi"}
          <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            rx="1"
            fill={RACK_CHASSIS.pi_case}
          />
        {:else}
          {@const spark = RISER_SHAPES.lenovo_spark}
          {@const spark_x = box.x + (box.width - spark.spark_width) / 2}
          {@const lenovo_y = box.y + spark.spark_height}
          <!-- The Lenovo below, the Spark on top of it and narrower, with
               the mesh cut into the Spark's face. -->
          <rect
            x={box.x}
            y={lenovo_y}
            width={box.width}
            height={box.height - spark.spark_height}
            fill={RACK_CHASSIS.lenovo_face}
          />
          <rect
            x={box.x}
            y={lenovo_y}
            width={box.width}
            height="1.2"
            fill={RACK_CHASSIS.lenovo_top_light}
          />
          <rect
            x={spark_x}
            y={box.y}
            width={spark.spark_width}
            height={spark.spark_height}
            rx="1.5"
            fill={RACK_CHASSIS.spark_face}
          />
          {@const mesh_x = spark_x + SPARK_MESH_INSET}
          {@const mesh_y = box.y + SPARK_MESH_INSET}
          {@const mesh_h = spark.spark_height - SPARK_MESH_INSET * 2}
          <rect
            x={mesh_x}
            y={mesh_y}
            width={spark.spark_width - SPARK_MESH_INSET * 2}
            height={mesh_h}
            rx="1"
            fill={RACK_CHASSIS.spark_mesh}
          />
          <g fill={RACK_CHASSIS.spark_face}>
            {#each SPARK_MESH_XS as slat_x (slat_x)}
              <rect x={mesh_x + slat_x} y={mesh_y} width="1.4" height={mesh_h} />
            {/each}
          </g>
        {/if}
      {/each}
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

  /* The accent server's LED: disk activity, green, at no rhythm at all.
     Every stop below is a different width on purpose - an even split reads
     as a metronome, which is exactly what the two port patterns already
     avoid by carrying their own periods. */
  @keyframes led-activity {
    0%,
    9% {
      fill: var(--rack-led-healthy);
    }
    10%,
    16% {
      fill: var(--rack-led-off);
    }
    17%,
    19% {
      fill: var(--rack-led-healthy);
    }
    20%,
    37% {
      fill: var(--rack-led-off);
    }
    38%,
    52% {
      fill: var(--rack-led-healthy);
    }
    53%,
    57% {
      fill: var(--rack-led-off);
    }
    58%,
    61% {
      fill: var(--rack-led-healthy);
    }
    62%,
    64% {
      fill: var(--rack-led-off);
    }
    65%,
    83% {
      fill: var(--rack-led-healthy);
    }
    84%,
    100% {
      fill: var(--rack-led-off);
    }
  }

  .led-activity {
    animation: led-activity var(--d, 2.3s) steps(1, end) var(--t, 0s) infinite;
  }

  /* Armed is the one state where the rack is drawn but not yet running:
     the blink is held and every blinking LED sits at the off colour. A CSS
     `fill` beats the element's own `fill` attribute, which is what makes
     the dark state reachable without the markup knowing about it. There is
     no `is-revealed` rule to match - revealed is what the two above already
     do, and what a reader with scripting off or reduced motion gets from
     the first frame. */
  .is-armed .led-a,
  .is-armed .led-b {
    animation: none;
    fill: var(--rack-led-off);
  }

  /* The activity LED holds too, but at its own colour: a dark green LED
     means a box that is down, which is not what "the band has not arrived
     yet" should say. */
  .is-armed .led-activity {
    animation: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .led-a,
    .led-b,
    .led-activity {
      animation: none;
    }
  }
</style>
