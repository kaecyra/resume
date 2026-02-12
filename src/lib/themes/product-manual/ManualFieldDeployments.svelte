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

<section class="mb-6">
  <div class="mb-3 border-b border-stone-300 pb-1">
    <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
      Deployment Log:
    </h2>
  </div>
  <div class="space-y-4">
    {#each Object.entries(grouped) as [category, items]}
      <div>
        <h3 class="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-stone-500">
          {category}
        </h3>
        <ul class="space-y-2">
          {#each items as item}
            <li class="flex gap-2 text-xs leading-relaxed text-stone-700 print:break-inside-avoid">
              <span class="flex h-[1lh] shrink-0 items-center">
                <span class="inline-block h-1.5 w-1.5 rotate-45 bg-[#c4412b]"></span>
              </span>
              <div>
                <span class="font-bold text-stone-800">{item.title}</span>
                <span class="text-stone-400"> — </span>{#if item.venue.startsWith("http")}<a href={item.venue} target="_blank" rel="noopener noreferrer" class="text-stone-500 underline hover:text-[#c4412b]">{item.venue}</a>{:else}<span class="text-stone-500">{item.venue}</span>{/if}
                {#if item.date}
                  <span class="ml-1 text-[10px] text-stone-400">({format_date(item.date)})</span>
                {/if}
                <p class="mt-0.5 text-xs leading-relaxed text-stone-700">
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
