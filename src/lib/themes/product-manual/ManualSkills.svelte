<script lang="ts">
  import type { Skill } from "$lib/types.js";

  let { skills }: { skills: Skill[] } = $props();

  const STAMP_STYLES = [
    { border: "#2a7b88", text: "#2a7b88", bg: "rgba(42, 123, 136, 0.07)" },
    { border: "#c4412b", text: "#c4412b", bg: "rgba(196, 65, 43, 0.07)" },
    { border: "#d4822b", text: "#d4822b", bg: "rgba(212, 130, 43, 0.07)" },
  ];

  function get_stamp_style(index: number): string {
    const color = STAMP_STYLES[index % STAMP_STYLES.length];
    return [
      `border-color: ${color.border}`,
      `color: ${color.text}`,
      `background-color: ${color.bg}`,
    ].join("; ");
  }

  function get_dot_color(index: number, filled: boolean): string {
    if (!filled) return "background-color: rgba(0, 0, 0, 0.12)";
    return `background-color: ${STAMP_STYLES[index % STAMP_STYLES.length].border}`;
  }

  const MAX_LEVEL = 5;
</script>

<section class="mb-6" aria-label="Skills">
  <div class="mb-4 border-b border-stone-300 pb-1">
    <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">
      Protocol: Proficiency
    </h2>
  </div>
  <div class="flex flex-wrap justify-center gap-5">
    {#each skills as skill, i}
      <div
        class="flex w-28 flex-col items-center justify-center border-2 px-2 py-3 text-center"
        style={get_stamp_style(i)}
      >
        <span class="text-[10px] font-bold uppercase leading-tight">{skill.name}</span>
        <div class="mt-1 flex gap-1">
          {#each Array(MAX_LEVEL) as _, j}
            <span
              class="inline-block h-1.5 w-1.5"
              style={get_dot_color(i, j < skill.level)}
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
