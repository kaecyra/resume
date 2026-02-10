<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.resume.profile.name} - {data.resume.title}</title>
</svelte:head>

<main class="mx-auto max-w-3xl p-8">
  <h1 class="text-3xl font-bold">{data.resume.profile.name}</h1>
  <p class="text-xl text-gray-600">{data.resume.title}</p>
</main>
