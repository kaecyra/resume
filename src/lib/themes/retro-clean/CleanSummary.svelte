<script lang="ts">
  import { format_markdown } from "$lib/format.js";

  let { summary, tagline }: { summary: string; tagline?: string } = $props();

  const paragraphs = $derived(summary.split("\n\n").filter((p) => p.trim()));
</script>

<section class="print:break-inside-avoid" aria-label="Professional Summary">
  {#each paragraphs as paragraph}
    <p class="mt-2 first:mt-0 text-base leading-relaxed text-clean-ink">{@html format_markdown(paragraph.trim())}</p>
  {/each}

  {#if tagline}
    <p class="mt-3 text-base leading-relaxed text-clean-ink/80">{@html format_markdown(tagline.trim())}</p>
  {/if}
</section>
