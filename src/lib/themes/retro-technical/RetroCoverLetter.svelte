<script lang="ts">
  import type { CoverLetterProps } from "$lib/themes/index.js";
  import { format_markdown } from "$lib/format.js";
  import AiDisclosure from "$lib/components/AiDisclosure.svelte";
  import RetroHeader from "./RetroHeader.svelte";
  import RetroFooter from "./RetroFooter.svelte";

  let { profile, job, cover_letter }: CoverLetterProps = $props();

  const greeting = $derived(cover_letter.greeting ?? "Dear Hiring Manager,");
  const closing = $derived(cover_letter.closing ?? "Sincerely,");
  const paragraphs = $derived(cover_letter.body.split("\n\n").filter((p) => p.trim()));
</script>

<main
  id="main-content"
  class="min-h-screen pb-4 md:pb-10 print:min-h-0 print:py-0"
  style="--retro-heading-font: 'Rajdhani', sans-serif; --retro-body-font: 'IBM Plex Sans', system-ui, sans-serif; font-family: var(--retro-body-font);"
>
  <div
    class="mx-auto max-w-5xl border-2 border-retro-accent-dark bg-retro-parchment shadow-xl print:max-w-none print:border-none print:shadow-none print:bg-retro-parchment"
  >
    <RetroHeader {profile} heading="Cover Letter:" title={job.title} subtitle="Re: {job.title} at {job.company}" />

    <!-- Letter body -->
    <div class="bg-retro-paper p-4 md:p-8 md:pt-16 print:p-8 print:pt-16">
      <p class="mb-4 text-sm leading-relaxed text-retro-navy">{greeting}</p>

      {#each paragraphs as paragraph}
        <p class="mb-4 text-sm leading-relaxed text-retro-navy">{@html format_markdown(paragraph.trim())}</p>
      {/each}

      <div class="mt-8">
        <p class="text-sm text-retro-navy">{closing}</p>
        <p class="mt-4 text-sm font-bold text-retro-navy">{profile.name}</p>
      </div>

      <AiDisclosure />
    </div>

    <RetroFooter contact={profile.contact} />
  </div>
</main>
