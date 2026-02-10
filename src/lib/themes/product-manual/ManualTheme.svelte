<script lang="ts">
  import type { ResolvedResume } from "$lib/types.js";

  import ManualHeader from "./ManualHeader.svelte";
  import ManualSummary from "./ManualSummary.svelte";
  import ManualSkills from "./ManualSkills.svelte";
  import ManualEmployment from "./ManualEmployment.svelte";
  import ManualLanguages from "./ManualLanguages.svelte";
  import ManualCourses from "./ManualCourses.svelte";

  let { resume }: { resume: ResolvedResume } = $props();
</script>

<div class="min-h-screen bg-[#8a9aa4] py-10 print:min-h-0 print:bg-white print:py-0">
  <div
    class="mx-auto max-w-4xl border border-[#c5bfb3] bg-[#f5f0e8] shadow-xl print:max-w-none print:border-none print:shadow-none"
    style="font-family: 'Share Tech Mono', ui-monospace, monospace;"
  >
    <ManualHeader profile={resume.profile} title={resume.title} />
    <div class="px-8 pb-8">
      <ManualSummary summary={resume.summary} />
      <ManualSkills skills={resume.skills} />
      <ManualEmployment employment={resume.employment} />
      <div class="grid grid-cols-2 gap-8 print:grid-cols-2">
        <ManualLanguages languages={resume.languages} />
        <ManualCourses courses={resume.courses} />
      </div>
    </div>
  </div>
</div>
