<script lang="ts">
  import type { FieldDeployment } from "$lib/types.js";
  import { format_markdown, format_date } from "$lib/format.js";

  let { field_deployments, section }: { field_deployments: FieldDeployment[]; section: string } = $props();

  const grouped = $derived(
    field_deployments.reduce<Record<string, FieldDeployment[]>>((acc, fd) => {
      (acc[fd.category] ??= []).push(fd);
      return acc;
    }, {})
  );
</script>

<style>
  h2, h3 {
    font-family: var(--retro-heading-font);
  }
</style>

<section aria-label="Field Deployments">
  <div class="mb-4 print:break-after-avoid">
    <span class="text-[11px] uppercase tracking-[0.2em] text-retro-tan">
      <span class="italic">[chp. {section}]</span>
    </span>
    <h2 class="mt-1 text-xl font-semibold uppercase tracking-[0.15em] text-retro-accent">
      Field Deployment Record
    </h2>
    <div class="mt-1 h-[2px] w-16 bg-retro-accent"></div>
  </div>

  <div class="flex flex-col gap-4">
    {#each Object.entries(grouped) as [category, items]}
      <div>
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-retro-accent-dark">
          {category}
        </h3>
        <ul class="space-y-2">
          {#each items as item}
            <li class="flex gap-2 text-base leading-relaxed text-retro-navy print:break-inside-avoid">
              <span class="flex h-[1lh] shrink-0 items-center">
                <span class="inline-block h-1.5 w-1.5 rotate-45 bg-retro-accent"></span>
              </span>
              <div>
                <span class="font-bold text-retro-navy">{item.title}</span>
                <span class="text-retro-navy/70"> — </span>{#if item.venue.startsWith("http")}<a href={item.venue} target="_blank" rel="noopener noreferrer" class="text-retro-navy/70 underline hover:text-retro-accent">{item.venue}</a>{:else}<span class="text-retro-navy/70">{item.venue}</span>{/if}
                {#if item.date}
                  <span class="ml-1 text-sm text-retro-tan">({format_date(item.date)})</span>
                {/if}
                <p class="mt-0.5 text-sm leading-relaxed text-retro-navy">
                  {@html format_markdown(item.description.trim())}
                </p>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</section>
