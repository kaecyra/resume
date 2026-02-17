<script lang="ts">
  import type { ResolvedResume } from "$lib/types.js";

  import RetroSummary from "./RetroSummary.svelte";
  import RetroDomains from "./RetroDomains.svelte";
  import RetroFieldDeployments from "./RetroFieldDeployments.svelte";
  import RetroEmployment from "./RetroEmployment.svelte";
  import RetroLanguages from "./RetroLanguages.svelte";
  import RetroCourses from "./RetroCourses.svelte";

  let { resume }: { resume: ResolvedResume } = $props();

  const initials = $derived(
    resume.profile.name
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

<svelte:head>
  <style>
    body { background-color: var(--color-retro-paper); }
  </style>
</svelte:head>

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
          Technical Specifications Manual:

          <div class="mt-1 flex flex-wrap items-center gap-2 text-lg md:flex-nowrap md:gap-4 md:text-2xl">
            <div
              class="hidden h-12 w-12 shrink-0 items-center justify-center border-2 border-double border-retro-accent bg-retro-navy-light md:flex print:flex"
            >
              <span class="retro-heading pl-0.5 text-lg text-retro-accent">{initials}</span>
            </div>
            <div>
              <div>
                <span class="block font-bold text-retro-cream md:inline print:inline">{resume.profile.name}</span>
                <span class="mx-2 hidden text-retro-muted md:inline">|</span>
                <span class="block text-retro-cream md:inline print:inline">{resume.title}</span>
              </div>
              {#if resume.profile.contact.linkedin}
                <a
                  href="https://{resume.profile.contact.linkedin}"
                  class="block text-xs normal-case tracking-wide text-retro-muted hover:text-white"
                >
                  {resume.profile.contact.linkedin}
                </a>
              {/if}
            </div>
          </div>
        </h1>
      </div>

      <!-- Headshot illustration -->
      <img
        src="/{resume.profile.photo}"
        alt={resume.profile.name}
        class="mx-auto mt-4 h-52 w-52 border-2 border-retro-accent object-cover md:absolute md:right-8 md:top-8 md:z-10 md:mt-0 md:mx-0 print:absolute print:right-8 print:top-8 print:z-10 print:mx-0"
      />
    </div>

    <!-- Subtitle bar -->
    <div class="border-b-2 border-retro-accent-dark bg-retro-navy-light px-4 py-2 md:px-8">
      <span class="text-xs uppercase tracking-[0.25em] text-retro-muted">
        1984 Technical Service Manual Supplement
      </span>
    </div>

    <!-- Summary - full width -->
    <div class="bg-retro-paper p-4 md:p-6 print:p-6">
      <RetroSummary summary={resume.summary} section="1" tagline={resume.tagline} />
    </div>

    <!-- Bottom row: skills left, languages+courses right -->
    <div class="grid grid-cols-1 gap-6 border-t-2 border-retro-accent-dark p-4 md:grid-cols-[60%_1fr] md:p-6 print:grid-cols-[60%_1fr] print:p-6">
      <RetroDomains domains={resume.domains} section="2" />
      <div class="flex flex-col gap-4">
        <RetroLanguages languages={resume.languages} section="2.1" />
        <RetroCourses courses={resume.courses} section="2.2" />
      </div>
    </div>

    <!-- Field Deployment Record -->
    {#if resume.field_deployments.length > 0}
      <div class="border-t-2 border-retro-accent-dark bg-retro-paper p-4 md:p-6 print:p-6">
        <RetroFieldDeployments field_deployments={resume.field_deployments} section="3" />
      </div>
    {/if}

    <!-- Employment section: full width -->
    <div class="border-t-2 border-retro-accent-dark p-4 md:p-6 print:p-6">
      <RetroEmployment employment={resume.employment} section="4" />
    </div>

    <!-- Footer -->
    <div class="border-t-2 border-retro-accent-dark bg-retro-navy px-4 py-3 md:px-8">
      <div class="flex flex-col items-center gap-1 text-center text-xs uppercase tracking-[0.2em] text-retro-muted md:flex-row md:justify-center md:gap-6">
        <span>Manufacturer Contact:</span>
        <span class="text-retro-cream">{resume.profile.contact.phone}</span>
        <span class="hidden text-retro-accent md:inline">|</span>
        <span class="text-retro-cream">{resume.profile.contact.email}</span>
        <span class="hidden text-retro-accent md:inline">|</span>
        <span class="text-retro-cream">{resume.profile.contact.location}</span>
      </div>
    </div>
  </div>
</div>
