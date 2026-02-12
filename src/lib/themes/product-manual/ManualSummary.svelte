<script lang="ts">
  import { format_markdown } from "$lib/format.js";

  let { summary, tagline }: { summary: string; tagline?: string } = $props();

  const paragraphs = $derived(summary.split("\n\n").filter((p) => p.trim()));
</script>

<section class="mb-6">
  <div class="mb-3 border-b border-stone-300 pb-1">
    <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
      Technical Overview:
    </h2>
  </div>
  {#each paragraphs as paragraph}
    <p class="mt-2 text-xs leading-relaxed text-stone-700">{@html format_markdown(paragraph.trim())}</p>
  {/each}
  {#if tagline}
    <div class="mt-3 border-t border-stone-300 pt-3">
      <p class="text-xs leading-relaxed text-stone-700/80">{@html format_markdown(tagline.trim())}</p>
    </div>
  {/if}
</section>
