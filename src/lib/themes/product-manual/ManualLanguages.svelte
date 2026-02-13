<script lang="ts">
  import type { Language } from "$lib/types.js";

  let { languages }: { languages: Language[] } = $props();
</script>

<section class="mb-6">
  <div class="mb-3 border-b border-stone-300 pb-1">
    <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">
      Communication Protocols:
    </h2>
  </div>
  <div class="space-y-2">
    {#each languages as language}
      <div class="flex items-baseline justify-between border-b border-dotted border-stone-300 pb-1">
        <span class="text-sm text-stone-700">{language.name}</span>
        <span class="text-xs uppercase tracking-wider text-stone-500">
          {language.proficiency}
        </span>
      </div>
    {/each}
  </div>
</section>
