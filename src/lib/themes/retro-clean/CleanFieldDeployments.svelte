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

<style>
  h2, h3 {
    font-family: var(--retro-heading-font);
  }
</style>

<section aria-label="Field Deployments">
  <h2 class="text-xl font-bold uppercase tracking-[0.2em] text-clean-accent">
    Field Deployment Record
  </h2>
  <div class="mt-1.5 h-[2px] bg-clean-rule"></div>

  <div class="mt-4 flex flex-col gap-4">
    {#each Object.entries(grouped) as [category, items]}
      <div>
        <h3 class="mb-1.5 text-sm font-semibold uppercase tracking-[0.1em] text-clean-ink">
          {category}
        </h3>
        <ul class="space-y-1.5">
          {#each items as item}
            <li class="flex gap-2 text-sm leading-relaxed text-clean-ink print:break-inside-avoid">
              <span class="flex h-[1lh] shrink-0 items-center">
                <span class="inline-block h-1.5 w-1.5 rotate-45 bg-clean-accent"></span>
              </span>
              <div>
                <span class="font-bold">{item.title}</span>
                <span class="text-clean-ink/70"> — </span>{#if item.venue.startsWith("http")}<a href={item.venue} target="_blank" rel="noopener noreferrer" class="text-clean-ink/70 underline hover:text-clean-accent">{item.venue}</a>{:else}<span class="text-clean-ink/70">{item.venue}</span>{/if}
                {#if item.date}
                  <span class="ml-1 text-clean-secondary">({format_date(item.date)})</span>
                {/if}
                <p class="mt-0.5 text-sm leading-relaxed text-clean-ink/80">
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
