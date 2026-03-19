<script lang="ts">
  import type { Skill } from "$lib/types.js";

  let { skills }: { skills: Skill[] } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section aria-label="Skills" class="print:break-inside-avoid">
  <h2 class="text-xl font-bold uppercase tracking-[0.2em] text-clean-accent">
    Capability Matrix
  </h2>
  <div class="mt-1.5 h-[2px] bg-clean-rule"></div>

  <p class="mt-3 text-sm leading-relaxed text-clean-ink">
    {#each skills as skill, i}{skill.name}{#if i < skills.length - 1}<span class="mx-1.5 text-clean-accent">&diamond;</span>{/if}{/each}
  </p>
</section>
