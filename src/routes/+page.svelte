<script lang="ts">
  import { onMount } from "svelte";

  import { browser } from "$app/environment";
  import LandingSections from "$lib/landing/LandingSections.svelte";
  import { ELEVATION, HUD_PALETTE } from "$lib/landing/palette.js";
  import { SITE_LOCALE } from "$lib/site-meta.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Drives the spine's amber fill (#199), 0-100. Resting value is 0 (top of
  // page) - the correct state for SSR and for any visitor without JS, since
  // scrollY is genuinely 0 before a scroll listener ever runs, not an
  // arbitrary placeholder standing in for "unknown".
  let spine_fill = $state(0);

  // Fraction of the document scrolled through, 0-1, clamped. A document no
  // taller than the viewport (scrollable_height <= 0) has nothing to track,
  // so it reads as fully at rest rather than dividing by a non-positive
  // number.
  function scroll_progress(): number {
    const scrollable_height = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable_height <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(1, window.scrollY / scrollable_height));
  }

  onMount(() => {
    // Tracked even under prefers-reduced-motion, deliberately. The fill is
    // a readout of where the reader currently is, not an animation: it only
    // ever changes in response to a scroll the reader themselves performed,
    // so it introduces no motion they did not ask for. Holding it at 0
    // instead would leave a permanently empty rail, which reads as broken
    // rather than as calm. What reduced motion does switch off is the
    // easing on that change - see .spine-fill's transition below.
    if (!browser) {
      return;
    }

    function update_spine_fill() {
      spine_fill = scroll_progress() * 100;
    }

    update_spine_fill();
    window.addEventListener("scroll", update_spine_fill, { passive: true });

    return () => window.removeEventListener("scroll", update_spine_fill);
  });
</script>

<svelte:head>
  <title>{data.document_title}</title>
  <meta name="version" content={__APP_VERSION__} />
  <meta name="description" content={data.og.description} />
  <meta name="author" content={data.profile_name} />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={data.profile_name} />
  <meta property="og:locale" content={SITE_LOCALE} />
  <meta property="og:title" content={data.og.title} />
  <meta property="og:description" content={data.og.description} />
  <meta property="og:image" content={data.og.image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={data.og.title} />
  {#if data.og.url}
    <meta property="og:url" content={data.og.url} />
    <link rel="canonical" href={data.og.url} />
  {/if}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.og.title} />
  <meta name="twitter:description" content={data.og.description} />
  <meta name="twitter:image" content={data.og.image} />
  <meta name="twitter:image:alt" content={data.og.title} />

  <meta name="theme-color" content={HUD_PALETTE.background} />

  <!-- Sets --hud-bg once at :root so both html/body (for the :global(body)
       rule below) and .landing (which reads the same inherited var) track
       HUD_PALETTE.background from one place, instead of a literal hex
       copied by hand into a second spot - see the :global(body) comment
       below for why body can't just take a style attribute directly.
       {@html}, not a literal <style> tag: Svelte's compiler special-cases
       a literal <style> element (even inside <svelte:head>) as its
       component-scoped stylesheet and doesn't evaluate expressions inside
       it, so `{...}` here would render as literal, uninterpolated text
       instead of CSS. Same reason the jsonld <script> tag below goes
       through {@html} rather than a literal <script> tag. -->
  {@html `<style>:root { --hud-bg: ${HUD_PALETTE.background}; }</style>`}

  {@html `<script type="application/ld+json">${JSON.stringify(data.jsonld.profile_page)}</script>`}
</svelte:head>

<main id="main-content" class="landing">
  <!--
    Decorative depth-pass chrome (#199), both aria-hidden - neither carries
    content, and .grain is pointer-events: none so it can never steal a
    click or a focus ring meant for the real page underneath it.
  -->
  <div class="grain" aria-hidden="true"></div>
  <div class="spine" aria-hidden="true" style="--hud-hair: {ELEVATION.hair}; --hud-accent: {HUD_PALETTE.accent};">
    <span class="spine-fill" style="height: {spine_fill}%"></span>
  </div>

  <LandingSections
    landing={data.landing}
    profile_name={data.profile_name}
    resume_title={data.resume_title}
    contributions_grid={data.contributions_grid}
    pipeline={data.pipeline}
  />
</main>

<style>
  /*
   * The landing page uses its own greyscale-plus-amber palette
   * (HUD_PALETTE in $lib/landing/palette.ts, #0a0a0b ground), not the
   * retro resume theme's navy - every section is full-bleed, so the body
   * background only shows during initial paint/scroll overscroll.
   *
   * :global(body) targets the document body, which this component doesn't
   * render an element for, so there's nowhere here to attach a style
   * attribute carrying HUD_PALETTE.background as a CSS var. Instead, the
   * <style> tag rendered through <svelte:head> above sets --hud-bg once on
   * :root; html/body inherit it like any other custom property, so this
   * reads the same value .landing uses below rather than a second literal
   * kept in sync by hand - the theme-color meta tag above shipped exactly
   * that kind of stale hardcoded hex once already (the pre-redesign
   * #1a2744; see page.dom.test.ts), which is what this is avoiding.
   */
  :global(body) {
    background-color: var(--hud-bg);
  }

  .landing {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    overflow-x: clip;
    background-color: var(--hud-bg);
    /* Body font for the whole redesign (#177). Set here, once, so every
       section inherits it - Hero previously set this on .hero alone, which
       left Work's blurbs and Contact's link row falling through to
       Tailwind preflight's default stack instead. Display headings
       (Archivo Black) stay unaffected, setting their own font-family per
       element. Share Tech Mono is retired everywhere outside the hero
       (#187) - Hero.svelte's own HUD chrome still sets it explicitly, but
       every other element that used to (meta labels, links, captions) now
       inherits this body face instead of setting its own. */
    font-family: "IBM Plex Sans", system-ui, sans-serif;
  }

  /* Grain overlay (#199): a fixed, greyscale fractal-noise texture over the
     whole page. On this near-black ground a flat fill reads as a void; a
     little noise makes it read as a material instead of a hole. Fixed
     (not absolute) so it stays put regardless of document height, and
     pointer-events: none keeps it inert - see the aria-hidden comment
     above the markup for why it must never intercept a click or a focus
     ring. The data URI is the one place a raw value stands in for a
     palette token: feColorMatrix's saturate=0 makes the noise
     colour-agnostic by construction, so there is no HUD_PALETTE/ELEVATION
     entry to route it through. */
  .grain {
    position: fixed;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  @media (prefers-reduced-motion: reduce) {
    /* The grain never animates to begin with - this only softens an
       already-static texture further, matching the reference mockup's own
       reduced-motion recipe. */
    .grain {
      opacity: 0.035;
    }

    /* The fill still tracks scroll (see onMount above for why that is not
       motion) - only the easing on it goes. */
    .spine-fill {
      transition: none;
    }
  }

  /* The spine (#199): a 2px rail down the left edge whose amber fill
     tracks scroll progress, so the sections read as one continuous
     document instead of a stack of bands - approved specifically over the
     standing objection to coloured left accent bars
     (.memory/no-default-ai-styling.md). Fixed to the viewport rather than
     absolute over the document, so the rail and its current fill level
     stay visible the whole time a visitor scrolls, the way a
     reading-progress indicator does. Colours come in via inline custom
     properties set on this element in the markup (ELEVATION.hair,
     HUD_PALETTE.accent) rather than a literal hex, same pattern
     Hero.svelte/Commits.svelte use for their own HUD_PALETTE values -
     --hud-accent cascades down to .spine-fill below since custom
     properties inherit. */
  .spine {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    z-index: 2;
    pointer-events: none;
    background-color: var(--hud-hair);
  }

  .spine-fill {
    display: block;
    width: 100%;
    height: 0;
    background-color: var(--hud-accent);
    /* Smooths the step between scroll events so the fill glides rather than
       jumping. This easing is the only actual motion in the spine, which is
       why it is the only part reduced motion turns off - the fill still
       tracks, it just arrives instantly. */
    transition: height 0.12s linear;
  }
</style>
