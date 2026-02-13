<script lang="ts">
  import type { Employment } from "$lib/types.js";
  import { format_markdown, format_date_range } from "$lib/format.js";

  let { entry }: { entry: Employment } = $props();

  const date_range = $derived(format_date_range(entry.start_date, entry.end_date));
</script>

<div class="mb-5 border border-stone-300 bg-[#f8f4ed] p-4 print:break-inside-avoid">
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <div class="flex items-baseline gap-2 border-b border-stone-300 pb-1">
        <span class="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-500">Role</span>
        <h3 class="font-sans text-base font-bold uppercase tracking-wide text-stone-800">
          {entry.title}
        </h3>
      </div>
      <div class="mt-2 flex items-baseline gap-2 border-b border-stone-300 pb-1">
        <span class="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-500">Org</span>
        <span class="text-sm text-stone-600">
          {entry.company}{#if entry.location}
            <span class="text-stone-400">&ensp;//&ensp;{entry.location}</span>
          {/if}
        </span>
      </div>
    </div>
    <div class="shrink-0 border-b border-stone-300 pb-1">
      <span class="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-500">Period</span>
      <p class="text-sm text-stone-600">{date_range}</p>
    </div>
  </div>

  {#if entry.description}
    <p class="mt-3 text-xs italic leading-relaxed text-stone-500">
      {@html format_markdown(entry.description.trim())}
    </p>
  {/if}

  {#if entry.summary}
    <p class="mt-2 text-sm leading-relaxed text-stone-700">{@html format_markdown(entry.summary.trim())}</p>
  {/if}

  {#if entry.highlights.length > 0}
    <ul class="mt-3 space-y-1.5 border-t border-dashed border-stone-300 pt-3">
      {#each entry.highlights as highlight}
        <li class="flex items-start gap-2 text-sm leading-relaxed text-stone-700">
          <span class="mt-1 inline-block h-1.5 w-1.5 shrink-0 rotate-45 bg-[#c4412b]"></span>
          <span>
            {#if highlight.title}
              <span class="font-bold uppercase text-stone-500">{highlight.title}:</span>
            {/if}
            {@html format_markdown(highlight.description.trim())}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
