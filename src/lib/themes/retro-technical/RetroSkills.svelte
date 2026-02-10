<script lang="ts">
  import type { Skill } from "$lib/types.js";

  let { skills }: { skills: Skill[] } = $props();

  const MAX_LEVEL = 5;
  const GAUGE_RADIUS = 34;
  const GAUGE_CX = 60;
  const GAUGE_CY = 50;

  function needle_angle(level: number): number {
    return 180 - ((level - 1) / (MAX_LEVEL - 1)) * 180;
  }

  function to_radians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  function needle_endpoint(level: number): { x: number; y: number } {
    const angle = to_radians(needle_angle(level));
    return {
      x: GAUGE_CX + Math.cos(angle) * (GAUGE_RADIUS - 4),
      y: GAUGE_CY - Math.sin(angle) * (GAUGE_RADIUS - 4),
    };
  }

  function tick_position(index: number): { x1: number; y1: number; x2: number; y2: number } {
    const angle = to_radians(180 - index * 45);
    return {
      x1: GAUGE_CX + Math.cos(angle) * (GAUGE_RADIUS - 2),
      y1: GAUGE_CY - Math.sin(angle) * (GAUGE_RADIUS - 2),
      x2: GAUGE_CX + Math.cos(angle) * (GAUGE_RADIUS + 4),
      y2: GAUGE_CY - Math.sin(angle) * (GAUGE_RADIUS + 4),
    };
  }

  function filled_arc_path(level: number): string {
    const start_angle = 180;
    const end_angle = needle_angle(level);
    const start_rad = to_radians(start_angle);
    const end_rad = to_radians(end_angle);

    const x1 = GAUGE_CX + Math.cos(start_rad) * GAUGE_RADIUS;
    const y1 = GAUGE_CY - Math.sin(start_rad) * GAUGE_RADIUS;
    const x2 = GAUGE_CX + Math.cos(end_rad) * GAUGE_RADIUS;
    const y2 = GAUGE_CY - Math.sin(end_rad) * GAUGE_RADIUS;

    const large_arc = start_angle - end_angle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 ${large_arc} 1 ${x2} ${y2}`;
  }
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section>
  <div class="mb-4">
    <span class="text-[11px] uppercase tracking-[0.2em] text-[#a07850]">
      <span class="italic">[chp. 3]</span>
    </span>
    <h2 class="mt-1 text-xl font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
      Capability Matrix
    </h2>
    <div class="mt-1 h-[2px] w-16 bg-[#e87a2e]"></div>
  </div>

  <div class="grid grid-cols-4 gap-4 print:break-inside-avoid">
    {#each skills as skill}
      {@const tip = needle_endpoint(skill.level)}
      <div class="flex flex-col items-center">
        <svg viewBox="0 0 120 65" class="w-full max-w-[120px]">
          <!-- background arc -->
          <path
            d="M {GAUGE_CX - GAUGE_RADIUS} {GAUGE_CY} A {GAUGE_RADIUS} {GAUGE_RADIUS} 0 0 1 {GAUGE_CX + GAUGE_RADIUS} {GAUGE_CY}"
            fill="none"
            stroke="#243555"
            stroke-width="6"
            stroke-linecap="round"
          />
          <!-- filled arc -->
          <path
            d={filled_arc_path(skill.level)}
            fill="none"
            stroke="#e87a2e"
            stroke-width="6"
            stroke-linecap="round"
          />
          <!-- tick marks -->
          {#each Array(MAX_LEVEL) as _, i}
            {@const t = tick_position(i)}
            <line
              x1={t.x1} y1={t.y1}
              x2={t.x2} y2={t.y2}
              stroke="#8b9bb5"
              stroke-width="1"
            />
          {/each}
          <!-- needle -->
          <line
            x1={GAUGE_CX} y1={GAUGE_CY}
            x2={tip.x} y2={tip.y}
            stroke="#f0e6d6"
            stroke-width="2"
            stroke-linecap="round"
          />
          <!-- center dot -->
          <circle cx={GAUGE_CX} cy={GAUGE_CY} r="3" fill="#e87a2e" />
        </svg>
        <span
          class="mt-1 text-center text-[11px] font-bold uppercase leading-tight tracking-wider text-[#1a2744]"
        >
          {skill.name}
        </span>
      </div>
    {/each}
  </div>
</section>
