<script lang="ts">
  import type { Employment } from "$lib/types.js";
  import { format_bold, format_date_range } from "$lib/format.js";

  let { entry, index }: { entry: Employment; index: number } = $props();

  const date_range = $derived(format_date_range(entry.start_date, entry.end_date));
  const is_active = $derived(entry.end_date === null);
  const log_number = $derived(String(index + 1).padStart(3, "0"));
</script>

<style>
  h3 {
    font-family: var(--retro-heading-font);
  }
</style>

<div class="mb-4 bg-[#1a2744] p-5 print:break-inside-avoid">
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <div class="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5">
        <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">
          Log {log_number}
        </span>
        <div class="flex items-baseline gap-3">
          <h3 class="text-base font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
            {entry.company}
          </h3>
          {#if is_active}
            <span
              class="inline-block bg-[#2a9d8f] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            >
              Active
            </span>
          {/if}
        </div>

        <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">
          Role
        </span>
        <span class="text-base text-[#f0e6d6]">{entry.title}</span>

        {#if entry.location}
          <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">
            Loc
          </span>
          <span class="text-base text-[#8b9bb5]">{entry.location}</span>
        {/if}
      </div>
    </div>
    <div class="shrink-0 text-right">
      <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">Period</span>
      <p class="text-base text-[#8b9bb5]">{date_range}</p>
    </div>
  </div>

  {#if entry.description}
    <p class="mt-3 border-t border-[#243555] pt-3 text-xs italic leading-relaxed text-[#8b9bb5]">
      {entry.description.trim()}
    </p>
  {/if}

  {#if entry.summary}
    <p class="mt-2 text-base leading-relaxed text-[#f0e6d6]">{entry.summary.trim()}</p>
  {/if}

  {#if entry.highlights.length > 0}
    <ul class="mt-3 space-y-1.5 border-t border-dashed border-[#243555] pt-3">
      {#each entry.highlights as highlight}
        <li class="flex items-start gap-2 text-base leading-relaxed text-[#f0e6d6]">
          <span class="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rotate-45 bg-[#e87a2e]"></span>
          <span>
            {#if highlight.title}
              <span class="font-bold uppercase text-[#8b9bb5]">{highlight.title}:</span>
            {/if}
            {@html format_bold(highlight.description.trim())}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
