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
  import { split_tagline } from "./tagline-format.js";
  import { HUD_PALETTE, MARKER_RED } from "./palette.js";
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
  const tagline = $derived(split_tagline(hero.tagline, hero.tagline_emphasis));

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

  // Starts null for SSR/no-JS and for anyone whose reduced-motion
  // preference was already set at mount - both keep rendering `hero.name`
  // as one plain, contiguous text node (the {#else} branch below), which
  // is load-bearing: LandingSections.test.ts asserts the rendered page
  // contains the literal name string, and a no-JS reader gets the name
  // without ever depending on script running. Only flips to the per-word
  // array once onMount confirms motion is welcome, at which point the
  // {#if staged_words} branch below takes over and the staged-arrival CSS
  // animation (see .hero-name-line-text) plays.
  let staged_words: string[] | null = $state(null);

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
      // Independent of the globe's own async geometry fetch below - the
      // name has nothing to wait on, so it's populated synchronously as
      // soon as motion is confirmed welcome, rather than tying two
      // unrelated staged arrivals to the same fetch.
      staged_words = hero.name.split(" ");

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
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-meta: {HUD_PALETTE.meta}; --hud-accent: {HUD_PALETTE.accent}; --hud-edge: {HUD_PALETTE.edge}; --hud-marker-red: {MARKER_RED};"
>
  <!--
    Always rendered, regardless of JavaScript, reduced motion, or WebGL
    availability - the base layer every other layer composites over. It
    never gets hidden or replaced.
  -->
  <div class="hero-backdrop" aria-hidden="true"></div>

  <!--
    Depth pass (#196): a soft amber haze behind the globe, so the wireframe
    reads as lit rather than sitting on flat black. Placed before
    `.hero-visual` in the DOM (both are unordered/`auto` in the stacking
    order, so DOM order decides) and never given its own z-index, so it
    always paints under the globe and never competes with it for
    legibility.
  -->
  <div class="hero-glow" aria-hidden="true"></div>

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
      <span class="hero-globe-marker-label">
        <span class="hero-globe-marker-city">MONTREAL</span>
        <!-- Reuses montreal_coords (see script above) rather than
             re-deriving MONTREAL_LAT/MONTREAL_LON a second time - same
             reasoning as the topbar's own coordinate span below. -->
        <span class="hero-globe-marker-coords">YUL &middot; {montreal_coords}</span>
      </span>
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
    <h1 class="hero-name" class:hero-name-staged={staged_words}>
      {#if staged_words}
        {#each staged_words as word, index}<span
            class="hero-name-line"
            style="--hero-line-index: {index};"><span class="hero-name-line-text">{word}</span></span
          >{" "}{/each}
      {:else}
        {hero.name}
      {/if}
    </h1>
    <div class="hero-badge">
      <span class="hero-badge-tag">{role.tag}</span>
      {#if role.label}
        <span class="hero-badge-label">{role.label}</span>
      {/if}
    </div>
  </div>

  <div class="hero-foot">
    <!-- Three text nodes, not one with markup from the data: the emphasis
         phrase arrives as plain text (hero.tagline_emphasis) and is wrapped
         here, so the YAML never carries HTML and seo.ts can keep reading
         hero.tagline as the flat string it already expects. -->
    <p class="hero-tagline">
      {tagline.before}{#if tagline.emphasis}<strong class="hero-tagline-emphasis"
          >{tagline.emphasis}</strong
        >{tagline.after}{/if}
    </p>
    <ResumeCta {resume_link} {profile_name} {resume_title} />
  </div>

  <!--
    Decorative "keep going" affordance (#196): a thin track with an amber
    sliver sweeping across it. aria-hidden and pointer-events: none since
    it carries no information a reader needs - scrolling works regardless.
  -->
</section>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2rem;
    /* Relaxed from a fixed 720px (#196): the viewport-relative floor lets
       the hero shrink on shorter viewports instead of always claiming
       720px regardless of how much room there actually is. */
    min-height: min(86vh, 720px);
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

  .hero-glow {
    position: absolute;
    right: -60px;
    top: -160px;
    width: 58rem;
    height: 58rem;
    max-width: none;
    pointer-events: none;
    /* Amber haze derived from --hud-accent via color-mix, not a fresh
       literal - same reasoning as .hero-scrim's derivation from --hud-bg
       below. */
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--hud-accent) 15%, transparent) 0%,
      color-mix(in srgb, var(--hud-accent) 5%, transparent) 34%,
      transparent 66%
    );
    filter: blur(12px);
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
    /* The label's two line sizes and the gap between them live here as
       custom properties because the flag's height is derived from all
       three below - the flag is sized to span exactly from the top of
       MONTREAL to the bottom of the coordinate line, so if either line
       size changes the flag has to follow. Declaring them on the shared
       parent is what keeps that from drifting. */
    --marker-city-size: 0.6875rem;
    --marker-coords-size: 0.625rem;
    --marker-line-gap: 0.3rem;
    /* Separate from --marker-line-gap on purpose: the flag and the text
       are two different objects and want real separation, while the two
       text lines are one block and want to stay tight. */
    --marker-flag-gap: 0.75rem;

    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    gap: var(--marker-flag-gap);
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
    /* Spans the full label block - the top of MONTREAL to the bottom of
       the coordinates - rather than sitting at an arbitrary size beside
       it. Both lines set line-height: 1 below, so each line's box is
       exactly its own font-size and this sum is the real rendered height.
       Width is left to the intrinsic 4:3 of the asset's viewBox
       (640x480), so the flag keeps its proportions. */
    height: calc(var(--marker-city-size) + var(--marker-line-gap) + var(--marker-coords-size));
    width: auto;
    box-shadow: 0 0 0 1px rgba(237, 237, 236, 0.35);
  }

  .hero-globe-marker-label {
    display: flex;
    flex-direction: column;
    gap: var(--marker-line-gap);
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: var(--marker-city-size);
    /* Pinned to 1 so each line's box is exactly its font-size, which is
       what makes the flag's height calc above land on the real top and
       bottom of the text rather than on a leading-padded approximation.
       All-caps mono with no descenders, so nothing clips. */
    line-height: 1;
    letter-spacing: 0.14em;
    color: var(--hud-text);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }


  .hero-globe-marker-coords {
    /* Inherits the mono face from .hero-globe-marker-label above rather
       than declaring it again - #196 keeps Share Tech Mono confined to the
       three places this file already sets it, and this is not a fourth. */
    font-size: var(--marker-coords-size);
    line-height: 1;
    letter-spacing: 0.12em;
    color: var(--hud-marker-red);
  }

  .hero-scrim {
    position: absolute;
    inset: 0;
    /* Angled falloff (#196), not a flat left-to-right wipe: the old
       `to right` gradient stayed opaque out to 64% across the whole hero
       height and muted the globe badly. Tilting the angle and pulling the
       opaque region in over the type lets the wireframe run clearer
       through the rest of the frame. Still a translucent derivation of
       --hud-bg (HUD_PALETTE.background), not a fresh literal - color-mix
       keeps it tied to the token instead of drifting if the token changes,
       same pattern as Divider.svelte. The 78% stop is fully transparent
       already, so it needs no colour component. */
    background: linear-gradient(
      100deg,
      color-mix(in srgb, var(--hud-bg) 96%, transparent) 0%,
      color-mix(in srgb, var(--hud-bg) 80%, transparent) 32%,
      color-mix(in srgb, var(--hud-bg) 26%, transparent) 58%,
      transparent 78%
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
       Tim<br>Gunter break. The per-word spans below (staged_words) don't
       change this - they're inline-block, so they still wrap wherever the
       browser would have wrapped plain text. */
  }

  /* Light-catching sheen (#196), guarded so a browser without
     background-clip: text keeps the flat --hud-text colour above rather
     than invisible glyphs. Stops are color-mix derivations of the existing
     text/secondary tokens (plus the "white" keyword, not a hex literal),
     not a fresh brand colour. */
  /* The light-catching gradient has to be painted on whichever element
     actually holds the glyphs, and that differs between the two branches
     of the markup above.
     
     background-clip: text paints the element's own background and clips it
     to that element's glyph geometry, in that element's own box. A
     transformed descendant paints its glyphs somewhere else, so an
     ancestor's clipped background no longer lines up behind them and the
     text renders as the transparent colour it inherited - it vanishes,
     with a flicker as compositing hands over. That is exactly what the
     staged arrival's per-word translateY did to it.
     
     So: the plain text node gets the gradient from the <h1>, and the
     staged words each get it from the span that carries their own
     transform. The two rules are mutually exclusive via
     .hero-name-staged, never both at once. */
  @supports ((-webkit-background-clip: text) or (background-clip: text)) {
    .hero-name:not(.hero-name-staged),
    .hero-name-staged .hero-name-line-text {
      background: linear-gradient(
        104deg,
        var(--hud-secondary) 0%,
        var(--hud-text) 40%,
        color-mix(in srgb, var(--hud-text) 60%, white) 72%,
        var(--hud-secondary) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }

  /*
   * Staged arrival (#196): each word gets its own overflow-hidden mask so
   * it can slide up into place. "One word at a time" rather than "one line
   * at a time" - the name wraps naturally (see the comment above), so
   * there's no fixed number of visual lines to key an index off without
   * either measuring layout in JS or hardcoding line breaks, both of which
   * this file already deliberately avoids. Only ever rendered once
   * `staged_words` is populated (see the script block and the {#if} in the
   * markup above) - SSR and reduced motion both keep rendering the plain
   * `hero.name` text node instead, so this markup never reaches a no-JS
   * reader or LandingSections.test.ts's substring check against the plain
   * name.
   */
  .hero-name-line {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
    /* Compensates for the very tight 0.82 line-height above, which would
       otherwise clip the tops of uppercase glyphs against this mask. */
    padding-top: 0.09em;
    margin-top: -0.09em;
  }

  .hero-name-line-text {
    display: inline-block;
    /* Entrance-only, not continuous motion - plays once per mount, unlike
       the globe's rotation there's nothing to reverse if reduced motion is
       toggled mid-session. Gated twice: staged_words (script above) only
       populates when motion_query didn't match at mount, and the reduced
       motion media query below drops the animation outright for anyone
       whose CSS-level query still says reduce. */
    animation: hero-name-rise 0.9s cubic-bezier(0.16, 0.9, 0.24, 1) both;
    animation-delay: calc(140ms + var(--hero-line-index) * 95ms);
  }

  @keyframes hero-name-rise {
    from {
      transform: translateY(105%);
    }

    to {
      transform: translateY(0);
    }
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
    /* The tagline holds the left, the CTA pair flies right. space-between
       with align-items: flex-end sits them on a shared baseline edge, so
       the button lip lines up with the last line of the tagline rather
       than floating above it. Wraps back to a stack on narrow viewports,
       where there is no width to spend on a gap. */
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: clamp(1.375rem, 4vw, 3rem);
  }

  .hero-tagline {
    /* 34ch, not a rem width: measured in characters the line length holds
       its readability as the font size scales, which a fixed rem width
       would not. The old bottom margin is gone with the stacked layout -
       .hero-foot's gap owns the space between this and the CTA now. */
    margin: 0;
    max-width: 34ch;
    font-size: 1.1875rem;
    line-height: 1.5;
    color: var(--hud-secondary);
    text-wrap: pretty;
  }

  .hero-tagline-emphasis {
    /* The one phrase the sentence is actually about. Lifted out of
       --hud-secondary to full --hud-text and up one weight step - no
       colour accent, since amber on this page is spent on the featured
       work and the close, not on body copy. */
    color: var(--hud-text);
    font-weight: 500;
  }





  @media (max-width: 640px) {
    .hero {
      min-height: auto;
      padding: 3rem 1.25rem 2.25rem;
      gap: 3rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-name-line-text {
      animation: none;
    }
  }
</style>
