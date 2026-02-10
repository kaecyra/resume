<script lang="ts">
  import type { Skill } from "$lib/types.js";

  let { skills }: { skills: Skill[] } = $props();

  const STAMP_STYLES = [
    { border: "#2a7b88", text: "#2a7b88", bg: "rgba(42, 123, 136, 0.07)" },
    { border: "#c4412b", text: "#c4412b", bg: "rgba(196, 65, 43, 0.07)" },
    { border: "#d4822b", text: "#d4822b", bg: "rgba(212, 130, 43, 0.07)" },
  ];

  const ROTATIONS = [-4, 3, -2, 5, -3, 2, -5, 4];

  function get_stamp_style(index: number): string {
    const color = STAMP_STYLES[index % STAMP_STYLES.length];
    const rotation = ROTATIONS[index % ROTATIONS.length];
    return [
      `border-color: ${color.border}`,
      `color: ${color.text}`,
      `background-color: ${color.bg}`,
      `transform: rotate(${rotation}deg)`,
    ].join("; ");
  }

  function get_dot_color(index: number, filled: boolean): string {
    if (!filled) return "background-color: rgba(0, 0, 0, 0.12)";
    return `background-color: ${STAMP_STYLES[index % STAMP_STYLES.length].border}`;
  }

  const MAX_LEVEL = 5;
</script>

<section class="mb-6">
  <div class="mb-4 border-b border-stone-300 pb-1">
    <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
      Protocol: Proficiency
    </h2>
  </div>
  <div class="flex flex-wrap justify-center gap-5">
    {#each skills as skill, i}
      <div
        class="flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full border-[3px] text-center"
        style={get_stamp_style(i)}
      >
        <span class="px-1 text-[8px] font-bold uppercase leading-tight">{skill.name}</span>
        <div class="mt-1 flex gap-[3px]">
          {#each Array(MAX_LEVEL) as _, j}
            <span
              class="inline-block h-[5px] w-[5px] rounded-full"
              style={get_dot_color(i, j < skill.level)}
            ></span>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</section>
