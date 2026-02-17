<script lang="ts">
  import type { ResolvedResume } from "$lib/types.js";

  import ClassicHeader from "./ClassicHeader.svelte";
  import ClassicSummary from "./ClassicSummary.svelte";
  import ClassicSkills from "./ClassicSkills.svelte";
  import ClassicEmployment from "./ClassicEmployment.svelte";
  import ClassicLanguages from "./ClassicLanguages.svelte";
  import ClassicCourses from "./ClassicCourses.svelte";

  let { resume }: { resume: ResolvedResume } = $props();
</script>

<div class="mx-auto max-w-4xl px-8 pb-8 text-gray-800 print:max-w-none print:px-12 print:py-8">
  <ClassicHeader profile={resume.profile} title={resume.title} />
  <ClassicSummary summary={resume.summary} />
  <ClassicSkills skills={resume.skills} />
  <ClassicEmployment employment={resume.employment} />
  <ClassicLanguages languages={resume.languages} />
  <ClassicCourses courses={resume.courses} />
</div>
