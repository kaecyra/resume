<script lang="ts">
  import type { Domain } from "$lib/types.js";
  import { format_markdown } from "$lib/format.js";

  let { domains }: { domains: Domain[] } = $props();
</script>

<section class="mb-6">
  <div class="mb-3 border-b border-stone-300 pb-1">
    <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">
      Operational Parameters:
    </h2>
  </div>
  <div class="space-y-2">
    {#each domains as domain, i}
      {#if i > 0}
        <div class="border-t border-dashed border-stone-300"></div>
      {/if}
      <div class="print:break-inside-avoid">
        <h3 class="text-sm font-bold uppercase text-stone-800">{domain.title}</h3>
        <p class="mt-1 text-sm leading-relaxed text-stone-700">
          {@html format_markdown(domain.description.trim())}
        </p>
      </div>
    {/each}
  </div>
</section>
