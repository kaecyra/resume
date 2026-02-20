<script lang="ts">
  import type { Employment } from "$lib/types.js";

  import ManualEmploymentEntry from "./ManualEmploymentEntry.svelte";

  let { employment }: { employment: Employment[] } = $props();
</script>

<section class="mb-6" aria-label="Work Experience">
  <div class="mb-4 border-b border-stone-300 pb-1">
    <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">
      Project Files
    </h2>
  </div>
  {#each employment as entry}
    <ManualEmploymentEntry {entry} />
  {/each}
</section>
