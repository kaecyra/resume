<script lang="ts">
  import type { PipelineData } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  // Placeholder for #209 step (c), which replaces this file with the real
  // three-band section. It exists now so that "pipeline" can join
  // KNOWN_SECTIONS in $lib/landing.ts with somewhere to dispatch to: an id
  // in that set with no arm in LandingSections.svelte renders nothing at
  // all and reports no error, which is the failure this step's registry
  // test is written to catch. Renders the heading from the data and
  // nothing else.
  let { pipeline }: { pipeline: PipelineData } = $props();
</script>

<section
  id="pipeline"
  class="pipeline"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text};"
>
  <h2 class="pipeline-heading">{pipeline.heading}</h2>
</section>

<style>
  .pipeline {
    background: var(--hud-bg);
    color: var(--hud-text);
  }

  .pipeline-heading {
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: clamp(2.1rem, 6vw, 3.4rem);
    line-height: 1.02;
    letter-spacing: -0.01em;
    margin: 0;
    padding-block: 64px 0;
    text-wrap: balance;
  }
</style>
