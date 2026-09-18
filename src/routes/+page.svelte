<script lang="ts">
  import LandingSections from "$lib/landing/LandingSections.svelte";
  import { HUD_PALETTE } from "$lib/landing/palette.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.og.title}</title>
  <meta name="version" content={__APP_VERSION__} />
  <meta name="description" content={data.og.description} />

  <meta property="og:type" content="website" />
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
       instead of CSS. Same reason the jsonld <script> tags below go
       through {@html} rather than a literal <script> tag. -->
  {@html `<style>:root { --hud-bg: ${HUD_PALETTE.background}; }</style>`}

  {@html `<script type="application/ld+json">${JSON.stringify(data.jsonld.person)}</script>`}
  {@html `<script type="application/ld+json">${JSON.stringify(data.jsonld.webpage)}</script>`}
</svelte:head>

<main id="main-content" class="landing">
  <LandingSections
    landing={data.landing}
    profile_name={data.profile_name}
    resume_title={data.resume_title}
    contributions_grid={data.contributions_grid}
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
</style>
