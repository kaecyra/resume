<script lang="ts">
  import type { CoverLetterProps } from "$lib/themes/index.js";
  import { format_markdown } from "$lib/format.js";
  import AiDisclosure from "$lib/components/AiDisclosure.svelte";
  import CleanHeader from "./CleanHeader.svelte";
  import CleanFooter from "./CleanFooter.svelte";

  let { profile, job, cover_letter }: CoverLetterProps = $props();

  const greeting = $derived(cover_letter.greeting ?? "Dear Hiring Manager,");
  const closing = $derived(cover_letter.closing ?? "Sincerely,");
  const paragraphs = $derived(cover_letter.body.split("\n\n").filter((p) => p.trim()));
</script>

<svelte:head>
  <style>
    body { background-color: #faf8f5; }
  </style>
</svelte:head>

<svg class="hidden" aria-hidden="true">
  <filter id="paper-grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
    <feColorMatrix type="saturate" values="0" />
    <feBlend in="SourceGraphic" mode="multiply" />
  </filter>
</svg>

<main
  id="main-content"
  class="min-h-screen pb-4 md:pb-10 print:min-h-0 print:py-0"
  style="--retro-heading-font: 'Rajdhani', sans-serif; --retro-body-font: 'IBM Plex Sans', system-ui, sans-serif; font-family: var(--retro-body-font);"
>
  <div class="clean-paper mx-auto max-w-4xl print:max-w-none">
    <CleanHeader {profile} title={job.title} />

    <div class="pt-4 pb-6 md:pt-8 print:pt-8">
      <p class="mb-4 text-sm leading-relaxed text-clean-ink">{greeting}</p>

      {#each paragraphs as paragraph}
        <p class="mb-4 text-sm leading-relaxed text-clean-ink">{@html format_markdown(paragraph.trim())}</p>
      {/each}

      <div class="mt-8">
        <p class="text-sm text-clean-ink">{closing}</p>
        <p class="mt-4 text-sm font-bold text-clean-ink">{profile.name}</p>
      </div>

      <AiDisclosure />
    </div>

    <CleanFooter contact={profile.contact} />
  </div>
</main>

<style>
  .clean-paper {
    position: relative;
    background-color: #faf8f5;
  }

  .clean-paper::after {
    content: "";
    position: absolute;
    inset: 0;
    filter: url(#paper-grain);
    opacity: 0.03;
    pointer-events: none;
  }

  @media print {
    .clean-paper {
      background-color: transparent;
    }
    .clean-paper::after {
      display: none;
    }
  }
</style>
