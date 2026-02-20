<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const resume = $derived(data.resume);
  const palette = $derived(data.palette);
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div
  id="main-content"
  class="card"
  style="background-color: {palette.background}; color: {palette.text};"
>
  <div class="photo-column">
    <img
      src="/assets/headshot-illustration.png"
      alt="{resume.profile.name}"
      class="photo"
      style="border-color: {palette.accent};"
    />
  </div>
  <div class="text-column">
    <h1 class="name" style="color: {palette.text};">{resume.profile.name}</h1>
    <div class="divider" style="background-color: {palette.accent};"></div>
    <h2 class="title" style="color: {palette.secondary};">{resume.title}</h2>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .card {
    width: 1200px;
    height: 630px;
    display: flex;
    align-items: center;
    padding: 60px;
    box-sizing: border-box;
    font-family: "IBM Plex Sans", sans-serif;
  }

  .photo-column {
    flex-shrink: 0;
    margin-right: 60px;
  }

  .photo {
    width: 280px;
    height: 280px;
    border: 6px solid;
    object-fit: cover;
  }

  .text-column {
    flex: 1;
    min-width: 0;
  }

  .name {
    font-size: 80px;
    font-weight: 700;
    margin: 0 0 24px 0;
    line-height: 1.1;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .divider {
    width: 120px;
    height: 6px;
    margin-bottom: 24px;
    border-radius: 2px;
  }

  .title {
    font-size: 44px;
    font-weight: 500;
    margin: 0;
    line-height: 1.2;
  }
</style>
