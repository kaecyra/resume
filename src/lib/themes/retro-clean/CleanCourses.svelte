<script lang="ts">
  import type { Course } from "$lib/types.js";
  import { format_date } from "$lib/format.js";

  let { courses }: { courses: Course[] } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section class="print:break-inside-avoid" aria-label="Certifications">
  <h2 class="text-xl font-bold uppercase tracking-[0.2em] text-clean-accent">
    Training Modules
  </h2>
  <div class="mt-1.5 h-[2px] bg-clean-rule"></div>

  <div class="mt-3 flex flex-col gap-1.5 text-sm">
    {#each courses as course}
      <div class="flex items-baseline gap-2">
        <span class="text-clean-ink">{course.title}</span>
        <span class="text-clean-secondary">&mdash; {course.institution}, {format_date(course.date)}</span>
      </div>
    {/each}
  </div>
</section>
