<script lang="ts">
  import { onMount } from "svelte";

  import { browser } from "$app/environment";
  import type { LandingGithub, LandingHero } from "$lib/types.js";

  import {
    GLOBE_STILL_URL,
    load_globe_lines,
    MONTREAL_LAT,
    MONTREAL_LON,
    start_globe,
    type GlobeController,
  } from "./globe.js";
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

  // Derived from globe.ts's MONTREAL_LON/MONTREAL_LAT rather than typed out
  // here a second time, so this topbar chrome can never drift out of sync
  // with the globe's own marker coordinates. Rendered longitude drops the
  // sign and reads "W" - MONTREAL_LON is always negative (west) here, so
  // Math.abs is just undoing that sign for display, not a general-purpose
  // conversion.
  const montreal_coords = `${MONTREAL_LAT.toFixed(2)}°N ${Math.abs(MONTREAL_LON).toFixed(2)}°W`;

  let canvas_el: HTMLCanvasElement | undefined = $state();
  let marker_el: HTMLDivElement | undefined = $state();

  // Starts false for SSR/prerendering and for every path where the globe
  // never actually starts drawing (no JS at all, reduced motion, no WebGL
  // context, or the geometry fetch failing): the pre-rendered
  // `.hero-globe-still` SVG (same projection, same tilt, built by
  // scripts/build-geo.ts) is what those visitors see. It can only flip to
  // true once `start_globe` has actually returned a controller, so the
  // failure mode of any of this wiring being wrong is that same static
  // image staying visible, never an empty box and never a frozen
  // flag/label sitting at the wrong spot. Flipping back to false (reduced
  // motion toggled on mid-session) brings the still back too.
  let canvas_animating = $state(false);

  // Guarded twice on purpose, matching the parked hud-canvas.ts (#168)
  // pattern: onMount's body never runs during SSR/prerendering, but
  // `browser` is kept as a cheap, explicit second guard so this stays safe
  // even if the lifecycle wiring above it changes later.
  onMount(() => {
    if (!browser || !canvas_el) {
      return;
    }

    const motion_query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let controller: GlobeController | null = null;
    let cancelled = false;

    // Bidirectional prefers-reduced-motion handling is more machinery than
    // this warrants, but the direction that matters for accessibility - a
    // visitor switching *to* reduce mid-session - is cheap to honour: stop
    // the globe and fall back to the still, same as if it had never
    // started.
    function on_motion_change(event: MediaQueryListEvent) {
      if (event.matches) {
        controller?.stop();
        controller = null;
        canvas_animating = false;
      }
    }
    motion_query.addEventListener("change", on_motion_change);

    if (!motion_query.matches) {
      (async () => {
        try {
          const lines = await load_globe_lines();
          if (cancelled || !canvas_el || motion_query.matches) {
            return;
          }
          controller = start_globe({ canvas: canvas_el, lines, marker_el });
          canvas_animating = controller !== null;
        } catch {
          // Geometry fetch or WebGL setup failed - leave canvas_animating
          // false so the static still image is what's shown.
        }
      })();
    }

    return () => {
      cancelled = true;
      motion_query.removeEventListener("change", on_motion_change);
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
    availability - the base layer every other layer composites over. It
    never gets hidden or replaced.
  -->
  <div class="hero-backdrop" aria-hidden="true"></div>

  <div class="hero-visual" aria-hidden="true">
    <!--
      The still (scripts/build-geo.ts's `build_globe_still_svg`) is the
      real backdrop for every path that isn't the animating canvas: reduced
      motion, no WebGL context, and no JS at all (SSR ships this markup
      with `canvas_animating` at its default `false`, so this is what a
      no-JS visitor sees - the canvas next to it stays empty since nothing
      ever draws into it). It's only hidden once `canvas_animating` proves
      the canvas is genuinely drawing, so exactly one of the two is ever
      visible - never both, never neither.
    -->
    <img
      class="hero-globe-still"
      class:hero-globe-still-hidden={canvas_animating}
      src={GLOBE_STILL_URL}
      alt=""
      width="760"
      height="760"
    />
    <canvas bind:this={canvas_el} class="hero-globe-canvas"></canvas>
  </div>

  <div class="hero-scrim" aria-hidden="true"></div>

  <!--
    A sibling of `.hero-visual` placed after `.hero-scrim` (rather than
    nested inside it) so it paints above the scrim while the globe lines
    stay behind it - the scrim's fade is what lets `hero-name` read cleanly
    over the wireframe, but the flag/label were made DOM elements
    specifically to stay legible, and under the scrim they washed out for
    most of each rotation. It shares `.hero-visual`'s exact box so the
    marker's canvas-relative coordinates (see globe.ts's `montreal_marker`)
    still land in the same place.
  -->
  <div class="hero-globe-marker-layer" aria-hidden="true">
    <div class="hero-globe-marker" class:hero-globe-marker-hidden={!canvas_animating} bind:this={marker_el}>
      <img class="hero-globe-flag" src="/landing/canada-flag.svg" alt="" width="24" height="18" />
      <span class="hero-globe-marker-label">MONTREAL</span>
    </div>
  </div>

  <div class="hero-topbar">
    <span>{github.user}</span>
    <!-- Fixed presentational chrome (Montreal), not content - not worth a
         second one-off schema field on `hero`. Derived from globe.ts's
         MONTREAL_LAT/MONTREAL_LON (see montreal_coords above). -->
    <span>{montreal_coords}</span>
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

  /*
   * `.hero-globe-marker-layer` shares this exact box so the marker (a
   * sibling placed after `.hero-scrim` in the DOM - see the markup above)
   * lands in the same place without needing its own coordinate math.
   *
   * Deliberately larger than the hero and pinned near the top rather than
   * vertically centred (#185): `top: -50px` crops a small strip off the
   * top, and the 960px box left to run past the hero's bottom edge crops
   * roughly 20% off the bottom (960 - 50 top-crop - ~720 visible height
   * for a hero at its 720px min-height). `.hero`'s `overflow: hidden`
   * (above) is what actually does the cropping - this box is intentionally
   * bigger than the space it renders into. `right: 60px` pulls it in from
   * the edge instead of bleeding past it.
   */
  .hero-visual,
  .hero-globe-marker-layer {
    position: absolute;
    right: 60px;
    top: -50px;
    width: 960px;
    height: 960px;
    max-width: none;
  }

  .hero-globe-marker-layer {
    pointer-events: none;
  }

  .hero-globe-still,
  .hero-globe-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  /*
   * Hidden once the canvas confirms it's actually animating (see
   * `canvas_animating` in the script block). Until then - reduced motion,
   * no WebGL context, or no JS at all - this still is the only thing
   * drawing into `.hero-visual`; the canvas next to it stays transparent.
   */
  .hero-globe-still-hidden {
    display: none;
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
    margin: 0 0 1.75rem;
    font-size: 1.1875rem;
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
