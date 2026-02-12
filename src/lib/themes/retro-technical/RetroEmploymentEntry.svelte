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

<div class="mt-6">
  <div class="-mx-4 md:-mx-6 print:-mx-6 bg-retro-navy px-4 py-4 md:px-6 md:py-5 print:px-6 print:py-5 print:break-inside-avoid">
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
      <div class="min-w-0">
        <div class="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5">
          <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">
            Log {log_number}
          </span>
          <div class="flex items-baseline gap-3">
            <h3 class="text-base font-semibold uppercase tracking-[0.15em] text-retro-accent">
              {entry.company}
            </h3>
            {#if is_active}
              <span
                class="inline-block bg-retro-active px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              >
                Active
              </span>
            {/if}
          </div>

          <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">
            Role
          </span>
          <span class="text-base text-retro-cream">{entry.title}</span>

          {#if entry.location}
            <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">
              Loc
            </span>
            <span class="text-base text-retro-muted">{entry.location}</span>
          {/if}
        </div>
      </div>
      <div class="shrink-0 text-left md:text-right">
        <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">Period</span>
        <p class="text-base text-retro-muted">{date_range}</p>
      </div>
    </div>
  </div>

  {#if entry.description || entry.summary || entry.highlights.length > 0}
    <div class="px-4 pt-3 pb-2 md:px-5">
      {#if entry.description}
        <p class="mb-3 text-base italic leading-relaxed text-retro-navy/70 print:break-inside-avoid">
          {@html format_markdown(entry.description.trim())}
        </p>
      {/if}

      {#if entry.summary}
        <p class="mt-2 text-base leading-relaxed text-retro-navy print:break-inside-avoid">{@html format_markdown(entry.summary.trim())}</p>
      {/if}

      {#if entry.highlights.length > 0}
        <ul class="mt-3 space-y-1.5 border-t border-dashed border-retro-accent-dark/30 pt-3">
          {#each entry.highlights as highlight}
            <li class="flex gap-2 text-base leading-relaxed text-retro-navy print:break-inside-avoid">
              <span class="flex h-[1lh] shrink-0 items-center">
                <span class="inline-block h-1.5 w-1.5 rotate-45 bg-retro-accent"></span>
              </span>
              <span>
                {#if highlight.title}
                  <span class="font-semibold uppercase text-retro-accent-dark" style="font-family: var(--retro-heading-font);">{highlight.title}:</span>
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
