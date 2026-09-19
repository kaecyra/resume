<script lang="ts">
  import type { FlagshipKind } from "./satellite-catalog.js";

  // Outline silhouettes for the hero globe's flagship satellites (#203),
  // drawn for this page rather than pulled from an icon set. Stroke only,
  // in currentColor, so the parent decides the colour (amber for Canadian,
  // text for the rest) and nothing sits behind the shape - no badge, no
  // halo, no border. Each shape is what identifies the craft at 16px: the
  // ISS's truss and paired arrays, Hubble's tube, a radar satellite's long
  // flat antenna, a single-winged bus, GHGSat's cube.
  let { kind }: { kind: FlagshipKind } = $props();

  // Siblings that look alike share a silhouette.
  const SHAPES: Record<FlagshipKind, "iss" | "hubble" | "radar" | "single-wing" | "earthcare" | "cube"> = {
    iss: "iss",
    hubble: "hubble",
    rcm: "radar",
    "radarsat-2": "radar",
    "sentinel-1": "single-wing",
    "sentinel-2": "single-wing",
    earthcare: "earthcare",
    ghgsat: "cube",
  };

  const shape = $derived(SHAPES[kind]);
</script>

<svg
  class="satellite-icon"
  viewBox="0 0 24 24"
  width="16"
  height="16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if shape === "iss"}
    <path d="M2 12h20" />
    <rect x="3" y="4" width="4" height="6" />
    <rect x="3" y="14" width="4" height="6" />
    <rect x="17" y="4" width="4" height="6" />
    <rect x="17" y="14" width="4" height="6" />
    <rect x="10" y="9.5" width="4" height="5" />
  {:else if shape === "hubble"}
    <rect x="9.5" y="3" width="5" height="15" rx="1" />
    <path d="M10.5 18v2.5h3V18" />
    <rect x="2.5" y="8" width="4.5" height="7" />
    <rect x="17" y="8" width="4.5" height="7" />
    <path d="M7 11.5h2.5M14.5 11.5H17" />
  {:else if shape === "radar"}
    <rect x="2" y="9" width="20" height="3" />
    <path d="M7 9v3M12 9v3M17 9v3" />
    <rect x="9.5" y="12" width="5" height="5" />
  {:else if shape === "single-wing"}
    <rect x="3" y="8" width="7" height="8" />
    <path d="M10 12h2.5" />
    <rect x="12.5" y="9" width="9" height="6" />
    <path d="M15.5 9v6M18.5 9v6" />
  {:else if shape === "earthcare"}
    <rect x="2" y="10" width="12" height="4" />
    <path d="M14 12h2" />
    <rect x="16" y="5" width="6" height="14" />
    <path d="M16 12h6" />
  {:else}
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  {/if}
</svg>

<style>
  .satellite-icon {
    display: block;
    overflow: visible;
  }
</style>
