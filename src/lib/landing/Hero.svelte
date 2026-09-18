<script lang="ts">
  import { onMount } from "svelte";

  import { browser } from "$app/environment";
  import type { LandingGithub, LandingHero } from "$lib/types.js";

  import { load_globe_lines, start_globe, type GlobeController } from "./globe.js";
  import { split_role_badge } from "./hero-format.js";
  import { HUD_PALETTE } from "./palette.js";
  import ResumeCta from "./ResumeCta.svelte";

  let {
    hero,
    github,
    resume_link,
    profile_name,
    resume_title,
  }: {
    hero: LandingHero;
    github: LandingGithub;
    resume_link: string;
    profile_name: string;
    resume_title: string;
  } = $props();

  const role = $derived(split_role_badge(hero.role));

  let canvas_el: HTMLCanvasElement | undefined = $state();
  let marker_el: HTMLDivElement | undefined = $state();

  // Starts false for SSR/prerendering and for every path where the globe
  // never actually starts drawing (no JS at all, reduced motion, no WebGL
  // context, or the geometry fetch failing): Hero's `.hero-backdrop`
  // radial gradient is what those visitors see, on its own. It can only
  // flip to true once `start_globe` has actually returned a controller, so
  // the failure mode of any of this wiring being wrong is that same static
  // gradient staying visible, never an empty box and never a frozen
  // flag/label sitting at the wrong spot.
  let canvas_animating = $state(false);

  // Guarded twice on purpose, matching the parked hud-canvas.ts (#168)
  // pattern: onMount's body never runs during SSR/prerendering, but
  // `browser` is kept as a cheap, explicit second guard so this stays safe
  // even if the lifecycle wiring above it changes later.
  onMount(() => {
    if (!browser || !canvas_el) {
      return;
    }

    const prefers_reduced_motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let controller: GlobeController | null = null;
    let cancelled = false;

    if (!prefers_reduced_motion) {
      (async () => {
        try {
          const lines = await load_globe_lines();
          if (cancelled || !canvas_el) {
            return;
          }
          controller = start_globe({ canvas: canvas_el, lines, marker_el });
          canvas_animating = controller !== null;
        } catch {
          // Geometry fetch or WebGL setup failed - leave canvas_animating
          // false so the static gradient backdrop is what's shown.
        }
      })();
    }

    return () => {
      cancelled = true;
      controller?.stop();
    };
  });
</script>

<section
  id="hero"
  class="hero"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-meta: {HUD_PALETTE.meta}; --hud-accent: {HUD_PALETTE.accent};"
>
  <!--
    Always rendered, regardless of JavaScript, reduced motion, or WebGL
    availability - this is the one static backdrop every fallback case
    resolves to. The globe (#178) draws on top of it once it actually
    starts animating; it never replaces or hides this layer.
  -->
  <div class="hero-backdrop" aria-hidden="true"></div>

  <div id="hero-globe-mount" class="hero-visual" aria-hidden="true">
    <canvas bind:this={canvas_el} class="hero-globe-canvas"></canvas>
    <div class="hero-globe-marker" class:hero-globe-marker-hidden={!canvas_animating} bind:this={marker_el}>
      <img class="hero-globe-flag" src="/landing/canada-flag.svg" alt="" width="24" height="18" />
      <span class="hero-globe-marker-label">MONTREAL</span>
    </div>
  </div>

  <div class="hero-scrim" aria-hidden="true"></div>

  <div class="hero-topbar">
    <span>{github.user}</span>
    <!-- Fixed presentational chrome (Montreal), not content - not worth a
         second one-off schema field on `hero`. -->
    <span>45.50&deg;N 73.57&deg;W</span>
  </div>

  <div class="hero-identity">
    <h1 class="hero-name">{hero.name}</h1>
    <div class="hero-badge">
      <span class="hero-badge-tag">{role.tag}</span>
      {#if role.label}
        <span class="hero-badge-label">{role.label}</span>
      {/if}
    </div>
  </div>

  <div class="hero-foot">
    <p class="hero-tagline">{hero.tagline}</p>
    <p class="hero-status">{hero.status}</p>
    <ResumeCta {resume_link} {profile_name} {resume_title} />
  </div>
</section>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2rem;
    min-height: 720px;
    padding: 4rem 2.5rem 2.75rem;
    background: var(--hud-bg);
    color: var(--hud-text);
  }

  .hero-backdrop {
    position: absolute;
    inset: 0;
    /* These three stops are bespoke gradient shades, not a translated
       HUD_PALETTE token - there's no token to point at, so they stay
       literals. Not a missed spot in the token-literal sweep. */
    background: radial-gradient(70% 70% at 68% 48%, #17171b 0%, #0d0d0f 55%, #09090a 100%);
  }

  .hero-visual {
    position: absolute;
    right: -40px;
    top: 50%;
    transform: translateY(-50%);
    width: 760px;
    height: 760px;
    max-width: none;
  }

  .hero-globe-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .hero-globe-marker {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    pointer-events: none;
    white-space: nowrap;
  }

  /*
   * Hidden until the globe confirms it is actually animating (see
   * `canvas_animating` in the script block), so a wiring bug never leaves
   * a flag/label frozen at the unpositioned (0, 0) origin.
   */
  .hero-globe-marker-hidden {
    display: none;
  }

  .hero-globe-flag {
    display: block;
    box-shadow: 0 0 0 1px rgba(237, 237, 236, 0.35);
  }

  .hero-globe-marker-label {
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.14em;
    color: var(--hud-text);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }

  .hero-scrim {
    position: absolute;
    inset: 0;
    /* Translucent derivation of --hud-bg (HUD_PALETTE.background), not a
       fresh literal - color-mix keeps it tied to the token instead of
       drifting if the token changes. Same pattern as Divider.svelte. The
       64% stop is fully transparent already, so it needs no colour
       component. */
    background: linear-gradient(
      to right,
      color-mix(in srgb, var(--hud-bg) 97%, transparent) 0%,
      color-mix(in srgb, var(--hud-bg) 84%, transparent) 36%,
      transparent 64%
    );
  }

  .hero-topbar,
  .hero-identity,
  .hero-foot {
    position: relative;
    z-index: 1;
  }

  .hero-topbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    row-gap: 0.5rem;
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--hud-meta);
  }

  .hero-identity {
    max-width: 40rem;
  }

  .hero-name {
    margin: 0;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: clamp(2.75rem, 13vw, 8.875rem);
    line-height: 0.82;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--hud-text);
    /* Natural word wrap - deliberately not the prototype's hardcoded
       Tim<br>Gunter break. */
  }

  .hero-badge {
    display: inline-flex;
    align-items: baseline;
    gap: 0.875rem;
    margin-top: 1.625rem;
    padding: 0.625rem 1rem;
    background: var(--hud-accent);
    color: var(--hud-bg);
  }

  .hero-badge-tag {
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .hero-badge-label {
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
    text-transform: uppercase;
  }

  .hero-foot {
    max-width: 37.5rem;
  }

  .hero-tagline {
    margin: 0 0 0.875rem;
    font-size: 1.1875rem;
    line-height: 1.5;
    color: var(--hud-secondary);
  }

  .hero-status {
    margin: 0 0 1.75rem;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--hud-secondary);
  }

  @media (max-width: 640px) {
    .hero {
      min-height: auto;
      padding: 3rem 1.25rem 2.25rem;
      gap: 3rem;
    }
  }
</style>
