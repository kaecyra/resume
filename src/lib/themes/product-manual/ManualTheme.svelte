<script lang="ts">
  import type { ResolvedResume } from "$lib/types.js";

  import ManualHeader from "./ManualHeader.svelte";
  import ManualSummary from "./ManualSummary.svelte";
  import ManualDomains from "./ManualDomains.svelte";
  import ManualSkills from "./ManualSkills.svelte";
  import ManualFieldDeployments from "./ManualFieldDeployments.svelte";
  import ManualEmployment from "./ManualEmployment.svelte";
  import ManualLanguages from "./ManualLanguages.svelte";
  import ManualCourses from "./ManualCourses.svelte";

  let { resume }: { resume: ResolvedResume } = $props();
</script>

<svelte:head>
  {@html '<style>footer[data-global-version] { display: none; }</style>'}
</svelte:head>

<div class="min-h-screen bg-[#8a9aa4] pb-10 print:min-h-0 print:py-0">
  <div
    class="mx-auto max-w-4xl border border-[#c5bfb3] bg-[#f5f0e8] shadow-xl print:max-w-none print:border-none print:shadow-none"
    style="font-family: 'Share Tech Mono', ui-monospace, monospace;"
  >
    <ManualHeader profile={resume.profile} title={resume.title} />
    <div class="px-8 pb-8">
      <ManualSummary summary={resume.summary} tagline={resume.tagline} />
      <ManualSkills skills={resume.skills} />
      {#if resume.domains.length > 0}
        <div class="grid grid-cols-2 gap-8 print:grid-cols-2">
          <ManualDomains domains={resume.domains} />
          <div>
            <ManualLanguages languages={resume.languages} />
            <ManualCourses courses={resume.courses} />
          </div>
        </div>
      {/if}
      {#if resume.field_deployments.length > 0}
        <ManualFieldDeployments field_deployments={resume.field_deployments} />
      {/if}
      <ManualEmployment employment={resume.employment} />
      {#if resume.domains.length === 0}
        <div class="grid grid-cols-2 gap-8 print:grid-cols-2">
          <ManualLanguages languages={resume.languages} />
          <ManualCourses courses={resume.courses} />
        </div>
      {/if}
    </div>
  </div>
  <p class="mt-4 text-center text-xs text-white/60 print:hidden">
    v{__APP_VERSION__}
  </p>
</div>
