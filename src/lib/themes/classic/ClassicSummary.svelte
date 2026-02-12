<script lang="ts">
  import { format_markdown } from "$lib/format.js";

  let { summary }: { summary: string } = $props();

  const paragraphs = $derived(summary.split("\n\n").filter((p) => p.trim()));
</script>

<section class="mb-6">
  <h2 class="mb-3 text-lg font-semibold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
    Summary
  </h2>
  {#each paragraphs as paragraph}
    <p class="mt-2 text-sm leading-relaxed text-gray-700">{@html format_markdown(paragraph.trim())}</p>
  {/each}
</section>
