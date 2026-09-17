<script lang="ts">
  import type { LandingHero } from "$lib/types.js";

  import HudFrame from "./HudFrame.svelte";

  let { hero }: { hero: LandingHero } = $props();
</script>

<HudFrame label="Identity" id="hero">
  <div class="hud-hero">
    <!--
      Reserved for a later node: an animated canvas rendered behind this
      content. Not built in this round - see issue #166 scope note.
    -->
    <div class="hud-hero-canvas-slot" aria-hidden="true"></div>

    <div class="hud-hero-content">
      <p class="hud-hero-status">{hero.status}</p>
      <h1 class="hud-hero-name">{hero.name}</h1>
      <p class="hud-hero-role">{hero.role}</p>
      <p class="hud-hero-tagline">{hero.tagline}</p>
    </div>
  </div>
</HudFrame>

<style>
  .hud-hero {
    position: relative;
  }

  .hud-hero-canvas-slot {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .hud-hero-content {
    position: relative;
    z-index: 1;
  }

  .hud-hero-status {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    color: var(--hud-secondary);
  }

  .hud-hero-name {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--hud-text);
  }

  .hud-hero-role {
    margin: 0.25rem 0 0;
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--hud-accent);
  }

  .hud-hero-tagline {
    margin: 1rem 0 0;
    max-width: 42rem;
    line-height: 1.6;
    color: var(--hud-text);
  }

  @media (min-width: 768px) {
    .hud-hero-name {
      font-size: 2.5rem;
    }
  }
</style>
