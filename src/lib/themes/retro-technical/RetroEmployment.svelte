<script lang="ts">
  import type { Employment } from "$lib/types.js";

  import RetroEmploymentEntry from "./RetroEmploymentEntry.svelte";

  let { employment }: { employment: Employment[] } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section>
  <div class="mb-4">
    <span class="text-[11px] uppercase tracking-[0.2em] text-[#a07850]">
      <span class="italic">[chp. 2]</span>
    </span>
    <h2 class="mt-1 text-xl font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
      Operational Log
    </h2>
    <div class="mt-1 h-[2px] w-16 bg-[#e87a2e]"></div>
  </div>

  {#each employment as entry, i}
    <RetroEmploymentEntry {entry} index={i} />
  {/each}
</section>
