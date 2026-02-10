<script lang="ts">
  import type { Course } from "$lib/types.js";
  import { format_date } from "$lib/format.js";

  let { courses }: { courses: Course[] } = $props();
</script>

<section class="mb-6">
  <div class="mb-3 border-b border-stone-300 pb-1">
    <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
      Certifications:
    </h2>
  </div>
  <div class="space-y-2">
    {#each courses as course}
      <div class="border-b border-dotted border-stone-300 pb-1">
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-stone-700">{course.title}</span>
          <span class="shrink-0 text-[10px] text-stone-400">{format_date(course.date)}</span>
        </div>
        <span class="text-[10px] uppercase tracking-wider text-stone-400">
          {course.institution}
        </span>
      </div>
    {/each}
  </div>
</section>
