<script lang="ts">
  import type { Employment } from "$lib/types.js";

  import RetroEmploymentEntry from "./RetroEmploymentEntry.svelte";

  let { employment, section }: { employment: Employment[]; section: string } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section>
  <div class="mb-4 print:break-after-avoid">
    <span class="text-[11px] uppercase tracking-[0.2em] text-retro-tan">
      <span class="italic">[chp. {section}]</span>
    </span>
    <h2 class="mt-1 text-xl font-semibold uppercase tracking-[0.15em] text-retro-accent">
      Operational Log
    </h2>
    <div class="mt-1 h-[2px] w-16 bg-retro-accent"></div>
  </div>

  {#each employment as entry, i}
    <RetroEmploymentEntry {entry} index={i} />
  {/each}
</section>
