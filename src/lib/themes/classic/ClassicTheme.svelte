<script lang="ts">
  import type { ResolvedResume } from "$lib/types.js";

  import OnlineCallout from "$lib/components/OnlineCallout.svelte";
  import ClassicHeader from "./ClassicHeader.svelte";
  import ClassicSummary from "./ClassicSummary.svelte";
  import ClassicSkills from "./ClassicSkills.svelte";
  import ClassicDomains from "./ClassicDomains.svelte";
  import ClassicFieldDeployments from "./ClassicFieldDeployments.svelte";
  import ClassicEmployment from "./ClassicEmployment.svelte";
  import ClassicLanguages from "./ClassicLanguages.svelte";
  import ClassicCourses from "./ClassicCourses.svelte";

  let { resume }: { resume: ResolvedResume } = $props();
</script>

<div class="mx-auto max-w-4xl px-8 pb-8 text-gray-800 print:max-w-none print:px-12 print:py-8">
  <ClassicHeader profile={resume.profile} title={resume.title} qr_svg={resume.online_qr_svg} />
  <ClassicSummary summary={resume.summary} tagline={resume.tagline} />
  {#if resume.online_callout && resume.online_url}
    <OnlineCallout url={resume.online_url} text={resume.online_callout} />
  {/if}
  <ClassicSkills skills={resume.skills} />
  {#if resume.domains.length > 0}
    <ClassicDomains domains={resume.domains} />
  {/if}
  {#if resume.field_deployments.length > 0}
    <ClassicFieldDeployments field_deployments={resume.field_deployments} />
  {/if}
  <ClassicEmployment employment={resume.employment} />
  <ClassicLanguages languages={resume.languages} />
  <ClassicCourses courses={resume.courses} />
</div>
