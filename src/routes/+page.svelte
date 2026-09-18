<script lang="ts">
  import LandingSections from "$lib/landing/LandingSections.svelte";

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

  <meta name="theme-color" content="#1a2744" />

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
   */
  :global(body) {
    background-color: #0a0a0b;
  }

  .landing {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    overflow-x: clip;
    background-color: #0a0a0b;
  }
</style>
