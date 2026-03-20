<script lang="ts">
  import type { Language } from "$lib/types.js";

  let { languages }: { languages: Language[] } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section class="print:break-inside-avoid" aria-label="Languages">
  <h2 class="text-xl font-bold uppercase tracking-[0.2em] text-clean-accent">
    Communication Protocols
  </h2>
  <div class="mt-1.5 h-[2px] bg-clean-rule"></div>

  <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
    {#each languages as language}
      <span class="text-clean-ink">{language.name} <span class="text-clean-secondary">({language.proficiency})</span></span>
    {/each}
  </div>
</section>
