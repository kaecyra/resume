<script lang="ts">
  import type { Course } from "$lib/types.js";
  import { format_date } from "$lib/format.js";

  let { courses }: { courses: Course[] } = $props();
</script>

<section class="mb-6">
  <h2 class="mb-3 text-lg font-semibold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
    Certifications
  </h2>
  <div class="space-y-1">
    {#each courses as course}
      <div class="flex items-baseline justify-between text-sm">
        <span class="text-gray-700">
          {course.title}
          <span class="text-gray-400">- {course.institution}</span>
        </span>
        <span class="shrink-0 text-gray-500">{format_date(course.date)}</span>
      </div>
    {/each}
  </div>
</section>
