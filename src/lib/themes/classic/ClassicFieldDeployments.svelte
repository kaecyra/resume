<script lang="ts">
  import type { FieldDeployment } from "$lib/types.js";
  import { format_markdown, format_date } from "$lib/format.js";

  let { field_deployments }: { field_deployments: FieldDeployment[] } = $props();

  const grouped = $derived(
    field_deployments.reduce<Record<string, FieldDeployment[]>>((acc, fd) => {
      (acc[fd.category] ??= []).push(fd);
      return acc;
    }, {})
  );
</script>

<section class="mb-6" aria-label="Field Deployments">
  <h2 class="mb-3 text-lg font-semibold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
    Speaking &amp; Publications
  </h2>
  <div class="space-y-4">
    {#each Object.entries(grouped) as [category, items]}
      <div>
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {category}
        </h3>
        <ul class="space-y-2">
          {#each items as item}
            <li class="text-sm leading-relaxed text-gray-700 print:break-inside-avoid">
              <span class="font-semibold text-gray-800">{item.title}</span>
              <span class="text-gray-400"> — </span>{#if item.venue.startsWith("http")}<a href={item.venue} target="_blank" rel="noopener noreferrer" class="text-gray-500 underline hover:text-gray-900">{item.venue}</a>{:else}<span class="text-gray-500">{item.venue}</span>{/if}
              {#if item.date}
                <span class="ml-1 text-xs text-gray-500">({format_date(item.date)})</span>
              {/if}
              <p class="mt-0.5 text-sm leading-relaxed text-gray-700">
                {@html format_markdown(item.description.trim())}
              </p>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</section>
