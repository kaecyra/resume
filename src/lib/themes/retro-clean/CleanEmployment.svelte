<script lang="ts">
  import type { Employment } from "$lib/types.js";

  import CleanEmploymentEntry from "./CleanEmploymentEntry.svelte";

  let { employment }: { employment: Employment[] } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section aria-label="Work Experience">
  <h2 class="text-xl font-bold uppercase tracking-[0.2em] text-clean-accent">
    Operational Log
  </h2>
  <div class="mt-1.5 h-[2px] bg-clean-rule"></div>

  {#each employment as entry, i}
    <CleanEmploymentEntry {entry} index={i} />
  {/each}
</section>
