<script lang="ts">
  import type { ResolvedResume } from "$lib/types.js";

  import OnlineCallout from "$lib/components/OnlineCallout.svelte";
  import RetroHeader from "./RetroHeader.svelte";
  import RetroSummary from "./RetroSummary.svelte";
  import RetroDomains from "./RetroDomains.svelte";
  import RetroFieldDeployments from "./RetroFieldDeployments.svelte";
  import RetroEmployment from "./RetroEmployment.svelte";
  import RetroLanguages from "./RetroLanguages.svelte";
  import RetroCourses from "./RetroCourses.svelte";
  import RetroFooter from "./RetroFooter.svelte";

  let { resume }: { resume: ResolvedResume } = $props();
</script>

<svelte:head>
  <style>
    body { background-color: var(--color-retro-paper); }
  </style>
</svelte:head>

<main
  id="main-content"
  class="min-h-screen pb-4 md:pb-10 print:min-h-0 print:py-0"
  style="--retro-heading-font: 'Rajdhani', sans-serif; --retro-body-font: 'IBM Plex Sans', system-ui, sans-serif; font-family: var(--retro-body-font);"
>
  <div
    class="mx-auto max-w-5xl border-2 border-retro-accent-dark bg-retro-parchment shadow-xl print:max-w-none print:border-none print:shadow-none print:bg-retro-parchment"
  >
    <RetroHeader profile={resume.profile} heading="Technical Specifications Manual:" title={resume.title} subtitle="1984 Service Manual Supplement" qr_svg={resume.online_qr_svg} />

    <!-- Summary - full width -->
    <div class="bg-retro-paper p-4 md:p-6 print:p-6">
      <RetroSummary summary={resume.summary} section="1" tagline={resume.tagline} />
    </div>

    {#if resume.online_callout && resume.online_url}
      <div class="px-4 md:px-6 print:px-6">
        <OnlineCallout url={resume.online_url} text={resume.online_callout} />
      </div>
    {/if}

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

    <RetroFooter contact={resume.profile.contact} />
  </div>
</main>
