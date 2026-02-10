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

<section class="bg-[#1a2744] p-5">
  <div class="mb-1">
    <span class="text-[11px] uppercase tracking-[0.2em] text-[#8b9bb5]">Section {section}</span>
    <h2 class="mt-1 text-base font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
      Training Modules
    </h2>
  </div>

  <div class="mt-3 space-y-2 border-t border-[#243555] pt-3">
    {#each courses as course}
      <div class="border-b border-[#243555] pb-1.5">
        <div class="flex items-baseline justify-between">
          <span class="text-base text-[#f0e6d6]">{course.title}</span>
          <span class="shrink-0 text-xs text-[#8b9bb5]">{format_date(course.date)}</span>
        </div>
        <span class="text-xs uppercase tracking-wider text-[#8b9bb5]">
          {course.institution}
        </span>
      </div>
    {/each}
  </div>
</section>
