<script lang="ts">
  import type { Domain } from "$lib/types.js";

  let { domains, section }: { domains: Domain[]; section: string } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section>
  <div class="mb-4 print:break-after-avoid">
    <span class="text-[11px] uppercase tracking-[0.2em] text-[#a07850]">
      <span class="italic">[chp. {section}]</span>
    </span>
    <h2 class="mt-1 text-xl font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
      Functional Subsystems
    </h2>
    <div class="mt-1 h-[2px] w-16 bg-[#e87a2e]"></div>
  </div>

  <div class="flex flex-col gap-3">
    {#each domains as domain}
      <div class="print:break-inside-avoid">
        <h3 class="text-base font-semibold uppercase tracking-[0.15em] text-[#c96620]" style="font-family: var(--retro-heading-font);">
          {domain.title}
        </h3>
        <p class="mt-1 text-sm leading-relaxed text-[#1a2744]">
          {domain.description.trim()}
        </p>
      </div>
    {/each}
  </div>
</section>
