<script lang="ts">
  import { get_theme, get_theme_favicon } from "$lib/themes/index.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const Theme = $derived(get_theme(data.resume.theme));
  const theme_favicon = $derived(get_theme_favicon(data.resume.theme));
</script>

<svelte:head>
  <title>{data.resume.profile.name} - {data.resume.title}</title>
  <meta name="version" content={__APP_VERSION__} />
  {#if theme_favicon}
    <link rel="icon" type="image/svg+xml" href={theme_favicon} />
  {/if}
</svelte:head>

<Theme resume={data.resume} />
