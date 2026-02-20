<script lang="ts">
  import type { Employment } from "$lib/types.js";

  import ClassicEmploymentEntry from "./ClassicEmploymentEntry.svelte";

  let { employment }: { employment: Employment[] } = $props();
</script>

<section class="mb-6" aria-label="Work Experience">
  <h2 class="mb-3 text-lg font-semibold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
    Experience
  </h2>
  {#each employment as entry}
    <ClassicEmploymentEntry {entry} />
  {/each}
</section>
