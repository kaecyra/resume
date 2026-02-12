<script lang="ts">
  import type { Employment } from "$lib/types.js";
  import { format_markdown, format_date_range } from "$lib/format.js";

  let { entry }: { entry: Employment } = $props();

  const date_range = $derived(format_date_range(entry.start_date, entry.end_date));
</script>

<div class="mb-4 print:break-inside-avoid">
  <div class="flex items-baseline justify-between">
    <div>
      <h3 class="text-base font-semibold text-gray-900">{entry.title}</h3>
      <p class="text-sm text-gray-600">
        {entry.company}{#if entry.location}, {entry.location}{/if}
      </p>
    </div>
    <span class="shrink-0 text-sm text-gray-500">{date_range}</span>
  </div>

  {#if entry.description}
    <p class="mt-2 text-sm leading-relaxed text-gray-600 italic">{@html format_markdown(entry.description.trim())}</p>
  {/if}

  {#if entry.summary}
    <p class="mt-2 text-sm leading-relaxed text-gray-700">{@html format_markdown(entry.summary.trim())}</p>
  {/if}

  {#if entry.highlights.length > 0}
    <ul class="mt-2 list-disc space-y-1 pl-5">
      {#each entry.highlights as highlight}
        <li class="text-sm leading-relaxed text-gray-700">
          {#if highlight.title}
            <span class="font-medium">{highlight.title}:</span>
          {/if}
          {@html format_markdown(highlight.description.trim())}
        </li>
      {/each}
    </ul>
  {/if}
</div>
