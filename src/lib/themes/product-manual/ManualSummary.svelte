<script lang="ts">
  let { summary }: { summary: string } = $props();

  const paragraphs = $derived(summary.split("\n\n").filter((p) => p.trim()));
</script>

<section class="mb-6">
  <div class="mb-3 border-b border-stone-300 pb-1">
    <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
      Technical Overview:
    </h2>
  </div>
  {#each paragraphs as paragraph}
    <p class="mt-2 text-xs leading-relaxed text-stone-700">{paragraph.trim()}</p>
  {/each}
</section>
