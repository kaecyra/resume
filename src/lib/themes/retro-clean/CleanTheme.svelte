<script lang="ts">
  import type { ResolvedResume } from "$lib/types.js";

  import OnlineCallout from "$lib/components/OnlineCallout.svelte";
  import CleanHeader from "./CleanHeader.svelte";
  import CleanSummary from "./CleanSummary.svelte";
  import CleanSkills from "./CleanSkills.svelte";
  import CleanDomains from "./CleanDomains.svelte";
  import CleanFieldDeployments from "./CleanFieldDeployments.svelte";
  import CleanEmployment from "./CleanEmployment.svelte";
  import CleanLanguages from "./CleanLanguages.svelte";
  import CleanCourses from "./CleanCourses.svelte";
  import CleanFooter from "./CleanFooter.svelte";

  let { resume }: { resume: ResolvedResume } = $props();
</script>

<svelte:head>
  <style>
    body { background-color: #faf8f5; }
  </style>
</svelte:head>

<!-- SVG noise filter for subtle paper texture -->
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
    <CleanHeader profile={resume.profile} title={resume.title} qr_svg={resume.online_qr_svg} />

    <div class="flex flex-col gap-8 pb-8">
      <!-- Summary -->
      <CleanSummary summary={resume.summary} tagline={resume.tagline} />

      {#if resume.online_callout && resume.online_url}
        <OnlineCallout url={resume.online_url} text={resume.online_callout} />
      {/if}

      <!-- Skills — inline keyword list for ATS -->
      {#if resume.skills.length > 0}
        <CleanSkills skills={resume.skills} />
      {/if}

      <!-- Experience -->
      <CleanEmployment employment={resume.employment} />

      <!-- Domains / Areas of Expertise -->
      {#if resume.domains.length > 0}
        <CleanDomains domains={resume.domains} />
      {/if}

      <!-- Field Deployments -->
      {#if resume.field_deployments.length > 0}
        <CleanFieldDeployments field_deployments={resume.field_deployments} />
      {/if}

      <!-- Languages & Certifications side by side -->
      <div class="grid grid-cols-1 gap-8 md:grid-cols-2 print:grid-cols-2">
        {#if resume.languages.length > 0}
          <CleanLanguages languages={resume.languages} />
        {/if}
        {#if resume.courses.length > 0}
          <CleanCourses courses={resume.courses} />
        {/if}
      </div>
    </div>

    <CleanFooter contact={resume.profile.contact} />
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
