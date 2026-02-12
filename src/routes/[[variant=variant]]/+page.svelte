<script lang="ts">
  import { get_theme, get_theme_favicon } from "$lib/themes/index.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const Theme = $derived(get_theme(data.resume.theme));
  const theme_favicon = $derived(get_theme_favicon(data.resume.theme));
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
  <meta property="og:url" content={data.og.url} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.og.title} />
  <meta name="twitter:description" content={data.og.description} />
  <meta name="twitter:image" content={data.og.image} />

  {#if theme_favicon}
    <link rel="icon" type="image/svg+xml" href={theme_favicon} />
  {/if}
</svelte:head>

<Theme resume={data.resume} />
