<script lang="ts">
  import type { Domain } from "$lib/types.js";
  import { format_markdown } from "$lib/format.js";

  let { domains }: { domains: Domain[] } = $props();
</script>

<section class="mb-6" aria-label="Areas of Expertise">
  <h2 class="mb-3 text-lg font-semibold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
    Areas of Expertise
  </h2>
  <div class="space-y-2">
    {#each domains as domain}
      <div class="print:break-inside-avoid">
        <h3 class="text-sm font-semibold text-gray-800">{domain.title}</h3>
        <p class="mt-1 text-sm leading-relaxed text-gray-700">
          {@html format_markdown(domain.description.trim())}
        </p>
      </div>
    {/each}
  </div>
</section>
