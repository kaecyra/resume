<script lang="ts">
  import type { Domain } from "$lib/types.js";
  import { format_markdown } from "$lib/format.js";

  let { domains, section }: { domains: Domain[]; section: string } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section aria-label="Areas of Expertise">
  <div class="mb-4 print:break-after-avoid">
    <span class="text-[11px] uppercase tracking-[0.2em] text-retro-tan">
      <span class="italic">[chp. {section}]</span>
    </span>
    <h2 class="mt-1 text-xl font-semibold uppercase tracking-[0.15em] text-retro-accent">
      Functional Subsystems
    </h2>
    <div class="mt-1 h-[2px] w-16 bg-retro-accent"></div>
  </div>

  <div class="flex flex-col gap-3">
    {#each domains as domain}
      <div class="print:break-inside-avoid">
        <h3 class="text-base font-semibold uppercase tracking-[0.15em] text-retro-accent-dark" style="font-family: var(--retro-heading-font);">
          {domain.title}
        </h3>
        <p class="mt-1 text-sm leading-relaxed text-retro-navy">
          {@html format_markdown(domain.description.trim())}
        </p>
      </div>
    {/each}
  </div>
</section>
