<script lang="ts">
  import type { ResolvedResume } from "$lib/types.js";

  import RetroSummary from "./RetroSummary.svelte";
  import RetroSkills from "./RetroSkills.svelte";
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
    body { background-color: #faf9f7; }
  </style>
</svelte:head>

<div
  class="min-h-screen py-4 md:py-10 print:min-h-0 print:py-0"
  style="--retro-heading-font: 'Rajdhani', sans-serif; --retro-body-font: 'IBM Plex Sans', system-ui, sans-serif; font-family: var(--retro-body-font);"
>
  <div
    class="mx-auto max-w-5xl border-2 border-[#c96620] bg-[#f5e6c8] shadow-xl print:max-w-none print:border-none print:shadow-none print:bg-[#f5e6c8]"
  >
    <!-- Title bar -->
    <div class="relative flex flex-col bg-[#1a2744] px-4 py-4 md:flex-row md:items-center md:gap-6 md:px-8 md:py-5 print:flex-row print:items-center print:gap-6 print:px-8 print:py-5">
      <div class="min-w-0 md:flex-1 print:flex-1">
        <h1 class="retro-heading text-lg uppercase tracking-[0.15em] text-[#e87a2e]">
          Technical Specifications Manual:

          <div class="mt-1 flex flex-wrap items-center gap-2 text-lg md:flex-nowrap md:gap-4 md:text-2xl">
            <div
              class="hidden h-12 w-12 shrink-0 items-center justify-center border-2 border-double border-[#e87a2e] bg-[#243555] md:flex print:flex"
            >
              <span class="retro-heading pl-0.5 text-lg text-[#e87a2e]">{initials}</span>
            </div>
            <div>
              <div>
                <span class="block font-bold text-[#f0e6d6] md:inline print:inline">{resume.profile.name}</span>
                <span class="mx-2 hidden text-[#8b9bb5] md:inline">|</span>
                <span class="block text-[#f0e6d6] md:inline print:inline">{resume.title}</span>
              </div>
              {#if resume.profile.contact.linkedin}
                <a
                  href="https://{resume.profile.contact.linkedin}"
                  class="block text-xs normal-case tracking-wide text-[#8b9bb5] hover:text-white"
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
        class="mx-auto mt-4 h-52 w-52 border-2 border-[#e87a2e] object-cover md:absolute md:right-8 md:top-8 md:z-10 md:mt-0 md:mx-0 print:absolute print:right-8 print:top-8 print:z-10 print:mx-0"
      />
    </div>

    <!-- Subtitle bar -->
    <div class="border-b-2 border-[#c96620] bg-[#243555] px-4 py-2 md:px-8">
      <span class="text-xs uppercase tracking-[0.25em] text-[#8b9bb5]">
        1984 Technical Service Manual Supplement
      </span>
    </div>

    <!-- Summary - full width -->
    <div class="bg-[#faf9f7] p-4 md:p-6 print:p-6">
      <RetroSummary summary={resume.summary} section="1" />
    </div>

    <!-- Bottom row: skills left, languages+courses right -->
    <div class="grid grid-cols-1 gap-6 border-t-2 border-[#c96620] p-4 md:grid-cols-[60%_1fr] md:p-6 print:grid-cols-[60%_1fr] print:p-6">
      <RetroSkills skills={resume.skills} section="2" />
      <div class="flex flex-col gap-4">
        <RetroLanguages languages={resume.languages} section="2.1" />
        <RetroCourses courses={resume.courses} section="2.2" />
      </div>
    </div>

    <!-- Employment section: full width -->
    <div class="border-t-2 border-[#c96620] p-4 md:p-6 print:p-6">
      <RetroEmployment employment={resume.employment} section="3" />
    </div>

    <!-- Footer -->
    <div class="border-t-2 border-[#c96620] bg-[#1a2744] px-4 py-3 md:px-8">
      <div class="flex flex-col items-center gap-1 text-center text-xs uppercase tracking-[0.2em] text-[#8b9bb5] md:flex-row md:justify-center md:gap-6">
        <span>Manufacturer Contact:</span>
        <span class="text-[#f0e6d6]">{resume.profile.contact.phone}</span>
        <span class="hidden text-[#e87a2e] md:inline">|</span>
        <span class="text-[#f0e6d6]">{resume.profile.contact.email}</span>
        <span class="hidden text-[#e87a2e] md:inline">|</span>
        <span class="text-[#f0e6d6]">{resume.profile.contact.address}</span>
      </div>
    </div>
  </div>
</div>
