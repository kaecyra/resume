<script lang="ts">
  import type { Skill } from "$lib/types.js";

  let { skills }: { skills: Skill[] } = $props();

  const MAX_LEVEL = 5;
</script>

<section class="mb-6" aria-label="Skills">
  <h2 class="mb-3 text-lg font-semibold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
    Skills
  </h2>
  <div class="grid grid-cols-2 gap-x-8 gap-y-2">
    {#each skills as skill}
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-700">{skill.name}</span>
        <div class="flex gap-1">
          {#each Array(MAX_LEVEL) as _, i}
            <span
              class="inline-block h-2 w-2 rounded-full {i < skill.level ? 'bg-gray-700' : 'bg-gray-200'}"
            ></span>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <ul class="sr-only">
    {#each skills as skill}
      <li>{skill.name}</li>
    {/each}
  </ul>
</section>
