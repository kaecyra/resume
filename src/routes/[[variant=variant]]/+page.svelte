<script lang="ts">
  import { get_theme } from "$lib/themes/index.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const Theme = $derived(get_theme(data.resume.theme));
</script>

<svelte:head>
  <title>{data.resume.profile.name} - {data.resume.title}</title>
  <meta name="version" content={__APP_VERSION__} />
</svelte:head>

<Theme resume={data.resume} />
