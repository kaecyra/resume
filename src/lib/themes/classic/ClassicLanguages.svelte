<script lang="ts">
  import type { Language } from "$lib/types.js";

  let { languages }: { languages: Language[] } = $props();
</script>

<section class="mb-6">
  <h2 class="mb-3 text-lg font-semibold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
    Languages
  </h2>
  <div class="flex flex-wrap gap-x-8 gap-y-1">
    {#each languages as language}
      <span class="text-sm text-gray-700">
        {language.name}
        <span class="text-gray-400">({language.proficiency})</span>
      </span>
    {/each}
  </div>
</section>
