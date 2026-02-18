<script lang="ts">
  import type { CoverLetterProps } from "$lib/themes/index.js";
  import { format_markdown } from "$lib/format.js";

  let { profile, job, cover_letter }: CoverLetterProps = $props();

  const greeting = $derived(cover_letter.greeting ?? "Dear Hiring Manager,");
  const closing = $derived(cover_letter.closing ?? "Sincerely,");
  const paragraphs = $derived(cover_letter.body.split("\n\n").filter((p) => p.trim()));

  const initials = $derived(
    profile.name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
  );
</script>

<style>
  .retro-heading {
    font-family: var(--retro-heading-font);
  }
</style>

<div
  class="min-h-screen pb-4 md:pb-10 print:min-h-0 print:py-0"
  style="--retro-heading-font: 'Rajdhani', sans-serif; --retro-body-font: 'IBM Plex Sans', system-ui, sans-serif; font-family: var(--retro-body-font);"
>
  <div
    class="mx-auto max-w-5xl border-2 border-retro-accent-dark bg-retro-parchment shadow-xl print:max-w-none print:border-none print:shadow-none print:bg-retro-parchment"
  >
    <!-- Title bar -->
    <div class="relative flex flex-col bg-retro-navy px-4 py-4 md:flex-row md:items-center md:gap-6 md:px-8 md:py-5 print:flex-row print:items-center print:gap-6 print:px-8 print:py-5">
      <div class="min-w-0 md:flex-1 print:flex-1">
        <h1 class="retro-heading text-lg uppercase tracking-[0.15em] text-retro-accent">
          Cover Letter:

          <div class="mt-1 flex flex-wrap items-center gap-2 text-lg md:flex-nowrap md:gap-4 md:text-2xl">
            <div
              class="hidden h-12 w-12 shrink-0 items-center justify-center border-2 border-double border-retro-accent bg-retro-navy-light md:flex print:flex"
            >
              <span class="retro-heading pl-0.5 text-lg text-retro-accent">{initials}</span>
            </div>
            <div>
              <div>
                <span class="block font-bold text-retro-cream md:inline print:inline">{profile.name}</span>
                <span class="mx-2 hidden text-retro-muted md:inline">|</span>
                <span class="block text-retro-cream md:inline print:inline">{job.title}</span>
              </div>
              {#if profile.contact.linkedin}
                <a
                  href="https://{profile.contact.linkedin}"
                  class="block text-xs normal-case tracking-wide text-retro-muted hover:text-white"
                >
                  {profile.contact.linkedin}
                </a>
              {/if}
            </div>
          </div>
        </h1>
      </div>
    </div>

    <!-- Subtitle bar -->
    <div class="border-b-2 border-retro-accent-dark bg-retro-navy-light px-4 py-2 md:px-8">
      <span class="text-xs uppercase tracking-[0.25em] text-retro-muted">
        Re: {job.title} at {job.company}
      </span>
    </div>

    <!-- Letter body -->
    <div class="bg-retro-paper p-4 md:p-8 print:p-8">
      <p class="mb-4 text-sm leading-relaxed text-retro-navy">{greeting}</p>

      {#each paragraphs as paragraph}
        <p class="mb-4 text-sm leading-relaxed text-retro-navy">{@html format_markdown(paragraph.trim())}</p>
      {/each}

      <div class="mt-8">
        <p class="text-sm text-retro-navy">{closing}</p>
        <p class="mt-4 text-sm font-bold text-retro-navy">{profile.name}</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t-2 border-retro-accent-dark bg-retro-navy px-4 py-3 md:px-8">
      <div class="flex flex-col items-center gap-1 text-center text-xs uppercase tracking-[0.2em] text-retro-muted md:flex-row md:justify-center md:gap-6">
        <span>Manufacturer Contact:</span>
        <span class="text-retro-cream">{profile.contact.phone}</span>
        <span class="hidden text-retro-accent md:inline">|</span>
        <span class="text-retro-cream">{profile.contact.email}</span>
        <span class="hidden text-retro-accent md:inline">|</span>
        <span class="text-retro-cream">{profile.contact.location}</span>
        {#if profile.contact.linkedin}
          <span class="hidden text-retro-accent md:inline">|</span>
          <a href="https://{profile.contact.linkedin}" class="text-retro-cream hover:text-white">{profile.contact.linkedin}</a>
        {/if}
      </div>
    </div>
  </div>
</div>
