<script lang="ts">
  // Realistic-in-miniature runway diagram for one Cloudflare PoP
  // (#213 follow-up): filled pavement, a dashed centerline, threshold
  // stripes, aiming-point blocks and each end's own rotated designator -
  // the markings that make a runway read as a runway, not a bare line.
  // Purely decorative - aria-hidden, no text a screen reader resolves to
  // anything (the numbers are drawn shapes, not content); whatever mounts
  // this is responsible for a visible IATA/city label alongside it.
  //
  // Geometry lives in runway-diagram-layout.ts; this component only turns
  // that geometry into SVG and picks colour - markings paint in `text`
  // (bright, like real runway paint) over a fully opaque `chip_bg`
  // pavement outlined in `secondary`. Pavement fill is opaque, not
  // translucent, on purpose: runway-diagram-layout.ts returns closed
  // runways first, so an active runway painted after it needs a solid fill
  // to actually hide the decommissioned pavement wherever the two overlap
  // - a translucent fill would let it show through. A closed runway
  // carries none of the active markings - real decommissioned runways have
  // theirs removed - and draws as a dim `chip_text` wash with a
  // corner-to-corner X instead.
  import { HUD_PALETTE } from "./palette.js";
  import { layout_runway_diagram, type Point } from "./runway-diagram-layout.js";
  import type { PopAirport } from "./runway-catalog.js";

  let { pop }: { pop: PopAirport } = $props();

  const geometry = $derived(layout_runway_diagram(pop.runways));

  function points(corners: readonly Point[]): string {
    return corners.map((p) => `${p.x},${p.y}`).join(" ");
  }
</script>

<svg class="runway-diagram" viewBox="0 0 {geometry.view_size} {geometry.view_size}" aria-hidden="true">
  {#each geometry.runways as runway (runway.designator)}
    <polygon
      class="runway-pavement"
      points={points(runway.pavement)}
      fill={runway.closed ? HUD_PALETTE.chip_text : HUD_PALETTE.chip_bg}
      fill-opacity={runway.closed ? 0.12 : 1}
      stroke={runway.closed ? HUD_PALETTE.chip_text : HUD_PALETTE.secondary}
      stroke-width={runway.closed ? 0.5 : 0.6}
      stroke-dasharray={runway.closed ? "4 3" : "none"}
    />

    {#if runway.closed}
      {#each runway.closed_cross as [a, b], i (i)}
        <line
          class="runway-closed-cross"
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={HUD_PALETTE.chip_text}
          stroke-width="0.75"
          stroke-linecap="round"
        />
      {/each}
    {:else}
      {#if runway.centerline}
        <line
          class="runway-centerline"
          x1={runway.centerline[0].x}
          y1={runway.centerline[0].y}
          x2={runway.centerline[1].x}
          y2={runway.centerline[1].y}
          stroke={HUD_PALETTE.text}
          stroke-width="0.5"
          stroke-dasharray="6 4"
        />
      {/if}

      {#each runway.threshold_stripes as [a, b], i (i)}
        <line
          class="runway-stripe"
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={HUD_PALETTE.text}
          stroke-width="0.75"
          stroke-linecap="round"
        />
      {/each}

      {#each runway.aiming_points as block, i (i)}
        <polygon class="runway-aiming-point" points={points(block)} fill={HUD_PALETTE.text} />
      {/each}

      {#each runway.numbers as label (label.lines.join("|") + ":" + label.rotation)}
        <text
          class="runway-number"
          x={label.x}
          y={label.y}
          transform="rotate({label.rotation} {label.x} {label.y})"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size={label.font_size}
          fill={HUD_PALETTE.text}
        >{#each label.lines as line, i (i)}<tspan x={label.x} dy={label.lines.length === 1 ? "0" : i === 0 ? "-0.6em" : "1.2em"}
            >{line}</tspan
          >{/each}</text>
      {/each}
    {/if}
  {/each}
</svg>

<style>
  .runway-diagram {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  /* Eurostile/Microgramma are the geometric, angular faces real airport
     signage and diagrams actually use; Bank Gothic and a condensed
     fallback keep the same squared-off character if neither is installed.
     font-size comes from the element itself (runway-diagram-layout.ts
     sizes each number to its own runway's drawn width), not from here. */
  .runway-number {
    font-family: "Eurostile", "Microgramma", "Bank Gothic", "Arial Narrow", sans-serif;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
</style>
