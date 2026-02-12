<script lang="ts">
  import type { Language } from "$lib/types.js";

  let { languages, section }: { languages: Language[]; section: string } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section class="bg-[#1a2744] p-5 print:break-inside-avoid">
  <div class="mb-1">
    <span class="text-[11px] uppercase tracking-[0.2em] text-[#8b9bb5]">Section {section}</span>
    <h2 class="mt-1 text-base font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
      Communication Protocols
    </h2>
  </div>

  <div class="mt-3 space-y-2 border-t border-[#243555] pt-3">
    {#each languages as language}
      <div class="flex items-baseline justify-between border-b border-[#243555] pb-1.5">
        <span class="text-base text-[#f0e6d6]">{language.name}</span>
        <span class="text-xs uppercase tracking-wider text-[#8b9bb5]">
          {language.proficiency}
        </span>
      </div>
    {/each}
  </div>
</section>
