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

<div
  class="min-h-screen bg-[#faf9f7] py-10 print:min-h-0 print:py-0"
  style="--retro-heading-font: 'Rajdhani', sans-serif; --retro-body-font: 'IBM Plex Sans', system-ui, sans-serif; font-family: var(--retro-body-font);"
>
  <div
    class="mx-auto max-w-5xl border-2 border-[#c96620] bg-[#f5e6c8] shadow-xl print:max-w-none print:border-none print:shadow-none print:bg-[#f5e6c8]"
  >
    <!-- Title bar -->
    <div class="flex items-center gap-6 bg-[#1a2744] px-8 py-5">
      <div class="min-w-0 flex-1">
        <h1 class="retro-heading text-lg uppercase tracking-[0.15em] text-[#e87a2e]">
          Technical Specifications Manual:

          <div class="mt-1 flex items-center gap-4 text-2xl">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-double border-[#e87a2e] bg-[#243555]"
            >
              <span class="retro-heading pl-0.5 text-lg text-[#e87a2e]">{initials}</span>
            </div>
            <div>
              <span class="font-bold text-[#f0e6d6]">{resume.profile.name}</span>
              <span class="mx-2 text-[#8b9bb5]">|</span>
              <span class="text-[#f0e6d6]">{resume.title}</span>
            </div>
          </div>
        </h1>
      </div>

      <!-- Headshot illustration -->
      <img
        src="/{resume.profile.photo}"
        alt={resume.profile.name}
        class="h-28 w-28 shrink-0 border-2 border-[#e87a2e] object-cover"
      />
    </div>

    <!-- Subtitle bar -->
    <div class="flex items-center justify-between border-b-2 border-[#c96620] bg-[#243555] px-8 py-2">
      <span class="text-xs uppercase tracking-[0.25em] text-[#8b9bb5]">
        1984 Technical Service Manual Supplement
      </span>
      {#if resume.profile.contact.linkedin}
        <a
          href="https://{resume.profile.contact.linkedin}"
          class="text-xs tracking-wide text-[#f0e6d6] hover:text-white"
        >
          {resume.profile.contact.linkedin}
        </a>
      {/if}
    </div>

    <!-- Summary - full width -->
    <div class="bg-[#faf9f7] p-6">
      <RetroSummary summary={resume.summary} section="1" />
    </div>

    <!-- Bottom row: skills left, languages+courses right -->
    <div class="grid grid-cols-[60%_1fr] gap-6 border-t-2 border-[#c96620] p-6 print:grid-cols-[60%_1fr]">
      <RetroSkills skills={resume.skills} section="2" />
      <div class="flex flex-col gap-4">
        <RetroLanguages languages={resume.languages} section="2.1" />
        <RetroCourses courses={resume.courses} section="2.2" />
      </div>
    </div>

    <!-- Employment section: full width -->
    <div class="border-t-2 border-[#c96620] p-6">
      <RetroEmployment employment={resume.employment} section="3" />
    </div>

    <!-- Footer -->
    <div class="border-t-2 border-[#c96620] bg-[#1a2744] px-8 py-3">
      <div class="flex items-center justify-center gap-6 text-xs uppercase tracking-[0.2em] text-[#8b9bb5]">
        <span>Manufacturer Contact:</span>
        <span class="text-[#f0e6d6]">{resume.profile.contact.phone}</span>
        <span class="text-[#e87a2e]">|</span>
        <span class="text-[#f0e6d6]">{resume.profile.contact.email}</span>
        <span class="text-[#e87a2e]">|</span>
        <span class="text-[#f0e6d6]">{resume.profile.contact.address}</span>
      </div>
    </div>
  </div>
</div>
