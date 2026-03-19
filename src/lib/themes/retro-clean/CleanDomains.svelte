<script lang="ts">
  import type { Domain } from "$lib/types.js";
  import { format_markdown } from "$lib/format.js";

  let { domains }: { domains: Domain[] } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section aria-label="Areas of Expertise">
  <h2 class="text-xl font-bold uppercase tracking-[0.2em] text-clean-accent">
    Functional Subsystems
  </h2>
  <div class="mt-1.5 h-[2px] bg-clean-rule"></div>

  <div class="mt-4 flex flex-col gap-4">
    {#each domains as domain}
      <div class="print:break-inside-avoid">
        <h3 class="text-sm font-semibold uppercase tracking-[0.1em] text-clean-ink" style="font-family: var(--retro-heading-font);">
          {domain.title}
        </h3>
        <p class="mt-0.5 text-sm leading-relaxed text-clean-ink/80">
          {@html format_markdown(domain.description.trim())}
        </p>
      </div>
    {/each}
  </div>
</section>
