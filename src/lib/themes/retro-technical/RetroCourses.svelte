<script lang="ts">
  import type { Course } from "$lib/types.js";
  import { format_date } from "$lib/format.js";

  let { courses, section }: { courses: Course[]; section: string } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section class="bg-retro-navy p-5 print:break-inside-avoid">
  <div class="mb-1">
    <span class="text-[11px] uppercase tracking-[0.2em] text-retro-muted">Section {section}</span>
    <h2 class="mt-1 text-base font-semibold uppercase tracking-[0.15em] text-retro-accent">
      Training Modules
    </h2>
  </div>

  <div class="mt-3 space-y-2 border-t border-retro-navy-light pt-3">
    {#each courses as course}
      <div class="border-b border-retro-navy-light pb-1.5">
        <div class="flex items-baseline justify-between">
          <span class="text-base text-retro-cream">{course.title}</span>
          <span class="shrink-0 text-xs text-retro-muted">{format_date(course.date)}</span>
        </div>
        <span class="text-xs uppercase tracking-wider text-retro-muted">
          {course.institution}
        </span>
      </div>
    {/each}
  </div>
</section>
