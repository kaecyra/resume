<script lang="ts">
  import type { Employment } from "$lib/types.js";
  import { format_markdown, format_date_range } from "$lib/format.js";

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

<div class="mt-6 first:mt-4 print:break-inside-avoid">
  <!-- Company / Title / Date — single block -->
  <div class="flex flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-4">
    <div class="min-w-0">
      <div class="flex items-baseline gap-2">
        <span class="text-xs font-normal uppercase tracking-[0.15em] text-clean-secondary">Log {log_number}</span>
        <h3 class="text-base font-semibold uppercase tracking-[0.15em] text-clean-accent">
          {entry.company}
        </h3>
        {#if is_active}
          <span class="inline-block bg-clean-active px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Active</span>
        {/if}
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-base text-clean-ink">{entry.title}</span>
        {#if entry.location}
          <span class="text-sm text-clean-secondary">&mdash; {entry.location}</span>
        {/if}
      </div>
    </div>
    <span class="shrink-0 text-sm text-clean-secondary">{date_range}</span>
  </div>

  {#if entry.description || entry.summary || entry.highlights.length > 0}
    <div class="mt-2">
      {#if entry.description}
        <p class="text-sm italic leading-relaxed text-clean-ink/70 print:break-inside-avoid">
          {@html format_markdown(entry.description.trim())}
        </p>
      {/if}

      {#if entry.summary}
        <p class="mt-1.5 text-sm leading-relaxed text-clean-ink print:break-inside-avoid">{@html format_markdown(entry.summary.trim())}</p>
      {/if}

      {#if entry.highlights.length > 0}
        <ul class="mt-2 space-y-1.5">
          {#each entry.highlights as highlight}
            <li class="flex gap-2 text-sm leading-relaxed text-clean-ink print:break-inside-avoid">
              <span class="flex h-[1lh] shrink-0 items-center">
                <span class="inline-block h-1.5 w-1.5 rotate-45 bg-clean-accent"></span>
              </span>
              <span>
                {#if highlight.title}
                  <span class="font-semibold uppercase text-clean-accent" style="font-family: var(--retro-heading-font);">{highlight.title}:</span>
                {/if}
                {@html format_markdown(highlight.description.trim())}
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
