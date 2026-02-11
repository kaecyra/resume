<script lang="ts">
  import { format_bold } from "$lib/format.js";

  let { summary, section }: { summary: string; section: string } = $props();

  const paragraphs = $derived(summary.split("\n\n").filter((p) => p.trim()));
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section>
  <div class="mb-4">
    <span class="text-[11px] uppercase tracking-[0.2em] text-[#a07850]">
      <span class="italic">[chp. {section}]</span>
    </span>
    <h2 class="mt-1 text-xl font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
      System Capacity
    </h2>
    <div class="mt-1 h-[2px] w-16 bg-[#e87a2e]"></div>
  </div>

  {#each paragraphs as paragraph}
    <p class="mt-2 first:mt-0 text-base leading-relaxed text-[#1a2744]">{@html format_bold(paragraph.trim())}</p>
  {/each}
</section>
