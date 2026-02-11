<script lang="ts">
  import type { Skill } from "$lib/types.js";

  let { skills, section }: { skills: Skill[]; section: string } = $props();

  const MAX_LEVEL = 5;
  const GAUGE_RADIUS = 34;
  const GAUGE_CX = 60;
  const GAUGE_CY = 50;
  const STROKE_WIDTH = 8;

  function to_radians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  function end_angle(level: number): number {
    return 180 - ((level - 1) / (MAX_LEVEL - 1)) * 180;
  }

  function filled_arc_path(level: number): string {
    const start_angle = 180;
    const stop = end_angle(level);
    const start_rad = to_radians(start_angle);
    const end_rad = to_radians(stop);

    const x1 = GAUGE_CX + Math.cos(start_rad) * GAUGE_RADIUS;
    const y1 = GAUGE_CY - Math.sin(start_rad) * GAUGE_RADIUS;
    const x2 = GAUGE_CX + Math.cos(end_rad) * GAUGE_RADIUS;
    const y2 = GAUGE_CY - Math.sin(end_rad) * GAUGE_RADIUS;

    const large_arc = start_angle - stop > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 ${large_arc} 1 ${x2} ${y2}`;
  }

  // Isometric projection for exploded view diagram
  // Axes: right = (3,1) per unit, depth = (-3,1) per unit, up = (0,-1)
  const ISO_FX = 225;
  const ISO_W = 55;
  const ISO_D = 25;

  function ix(u: number, v: number, _by: number): number {
    return ISO_FX + u * ISO_W * 3 - v * ISO_D * 3;
  }

  function iy(u: number, v: number, by: number): number {
    return by + u * ISO_W + v * ISO_D;
  }

  function iso_pt(u: number, v: number, by: number): string {
    return `${ix(u, v, by).toFixed(1)},${iy(u, v, by).toFixed(1)}`;
  }

  function iso_quad(u1: number, v1: number, u2: number, v2: number, by: number): string {
    return [iso_pt(u1, v1, by), iso_pt(u2, v1, by), iso_pt(u2, v2, by), iso_pt(u1, v2, by)].join(" ");
  }

  function iso_faces(fy: number, h: number): { top: string; left: string; right: string } {
    const t = fy - h;
    return {
      top: [iso_pt(0, 0, t), iso_pt(1, 0, t), iso_pt(1, 1, t), iso_pt(0, 1, t)].join(" "),
      left: [iso_pt(0, 0, t), iso_pt(0, 0, fy), iso_pt(0, 1, fy), iso_pt(0, 1, t)].join(" "),
      right: [iso_pt(0, 0, t), iso_pt(0, 0, fy), iso_pt(1, 0, fy), iso_pt(1, 0, t)].join(" "),
    };
  }

  interface LayerData {
    t: number;
    faces: { top: string; left: string; right: string };
  }

  function make_layer(fy: number, h: number): LayerData {
    return { t: fy - h, faces: iso_faces(fy, h) };
  }

  const L1 = make_layer(140, 5); // bottom case
  const L2 = make_layer(123, 4); // circuit board
  const L3 = make_layer(107, 7); // transport deck
  const L4 = make_layer(88, 3);  // cassette door
  const L5 = make_layer(73, 5);  // top cover
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section>
  <div class="mb-4">
    <span class="text-[11px] uppercase tracking-[0.2em] text-[#a07850]">
      <span class="italic">[chp. {section}]</span>
    </span>
    <h2 class="mt-1 text-xl font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
      Capability Matrix
    </h2>
    <div class="mt-1 h-0.5 w-16 bg-[#e87a2e]"></div>
  </div>

  <div class="grid grid-cols-4 gap-4 print:break-inside-avoid">
    {#each skills as skill}
      <div class="flex flex-col items-center">
        <svg viewBox="0 0 120 58" class="w-full max-w-30">
          <!-- background arc -->
          <path
            d="M {GAUGE_CX - GAUGE_RADIUS} {GAUGE_CY} A {GAUGE_RADIUS} {GAUGE_RADIUS} 0 0 1 {GAUGE_CX + GAUGE_RADIUS} {GAUGE_CY}"
            fill="none"
            stroke="#243555"
            stroke-width={STROKE_WIDTH}
            stroke-linecap="round"
          />
          <!-- filled arc -->
          <path
            d={filled_arc_path(skill.level)}
            fill="none"
            stroke="#e87a2e"
            stroke-width={STROKE_WIDTH}
            stroke-linecap="round"
          />
        </svg>
        <span
          class="mt-1 text-center text-[11px] font-bold uppercase leading-tight tracking-wider text-[#1a2744]"
        >
          {skill.name}
        </span>
      </div>
    {/each}
  </div>

  <!-- Exploded isometric parts diagram -->
  <div class="mt-2">
    
    <svg viewBox="0 35 500 190" class="w-full">
      <!-- explosion axis -->
      <line x1="282" y1="58" x2="282" y2="222" stroke="#c96620" stroke-width="0.3" stroke-dasharray="3 2" opacity="0.2" />

      <!-- ====== Layer 1: Bottom Case ====== -->
      <g>
        <polygon points={L1.faces.right} fill="#d4be96" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L1.faces.left} fill="#dcc8a4" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L1.faces.top} fill="#eedcbe" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <!-- battery compartment -->
        <polygon points={iso_quad(0.55, 0.2, 0.92, 0.8, L1.t)} fill="none" stroke="#1a2744" stroke-width="0.4" stroke-dasharray="2 1.5" />
        <text x={ix(0.73, 0.42, L1.t)} y={iy(0.73, 0.42, L1.t)} fill="#1a2744" font-size="3.5" opacity="0.4">+ —</text>
        <!-- screw posts -->
        {#each [[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94]] as [su, sv]}
          <ellipse cx={ix(su, sv, L1.t)} cy={iy(su, sv, L1.t)} rx="3.5" ry="1.2" fill="none" stroke="#1a2744" stroke-width="0.35" />
          <line x1={ix(su, sv, L1.t) - 1.5} y1={iy(su, sv, L1.t)} x2={ix(su, sv, L1.t) + 1.5} y2={iy(su, sv, L1.t)} stroke="#1a2744" stroke-width="0.3" />
        {/each}
        <!-- rubber feet -->
        {#each [[0.12, 0.15], [0.12, 0.85], [0.88, 0.15], [0.88, 0.85]] as [fu, fv]}
          <ellipse cx={ix(fu, fv, L1.t)} cy={iy(fu, fv, L1.t)} rx="4" ry="1.3" fill="#1a2744" opacity="0.06" />
        {/each}
        <!-- leader -->
        <line x1={ix(0, 0.5, L1.t)} y1={iy(0, 0.5, L1.t)} x2="52" y2={iy(0, 0.5, L1.t)} stroke="#a07850" stroke-width="0.4" />
        <circle cx={ix(0, 0.5, L1.t)} cy={iy(0, 0.5, L1.t)} r="1.2" fill="#a07850" />
        <text x="5" y={iy(0, 0.5, L1.t) - 2} fill="#a07850" font-size="6.5">1 — BOTTOM CASE</text>
      </g>

      <!-- ====== Layer 2: Circuit Board ====== -->
      <g>
        <polygon points={L2.faces.right} fill="#d4be96" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L2.faces.left} fill="#dcc8a4" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L2.faces.top} fill="#eedcbe" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <!-- speaker cone -->
        <ellipse cx={ix(0.7, 0.5, L2.t)} cy={iy(0.7, 0.5, L2.t)} rx="25" ry="8.3" fill="none" stroke="#1a2744" stroke-width="0.6" />
        <ellipse cx={ix(0.7, 0.5, L2.t)} cy={iy(0.7, 0.5, L2.t)} rx="12" ry="4" fill="none" stroke="#1a2744" stroke-width="0.4" />
        <ellipse cx={ix(0.7, 0.5, L2.t)} cy={iy(0.7, 0.5, L2.t)} rx="4" ry="1.3" fill="#1a2744" opacity="0.15" />
        <!-- motor -->
        <polygon points={iso_quad(0.25, 0.35, 0.37, 0.65, L2.t)} fill="none" stroke="#1a2744" stroke-width="0.5" />
        <ellipse cx={ix(0.31, 0.5, L2.t)} cy={iy(0.31, 0.5, L2.t)} rx="5" ry="1.7" fill="none" stroke="#1a2744" stroke-width="0.4" />
        <!-- flywheel -->
        <ellipse cx={ix(0.42, 0.5, L2.t)} cy={iy(0.42, 0.5, L2.t)} rx="10" ry="3.3" fill="none" stroke="#1a2744" stroke-width="0.4" />
        <ellipse cx={ix(0.42, 0.5, L2.t)} cy={iy(0.42, 0.5, L2.t)} rx="3" ry="1" fill="none" stroke="#1a2744" stroke-width="0.3" />
        <!-- IC chips -->
        <polygon points={iso_quad(0.12, 0.25, 0.2, 0.4, L2.t)} fill="none" stroke="#243555" stroke-width="0.4" />
        <polygon points={iso_quad(0.12, 0.6, 0.2, 0.75, L2.t)} fill="none" stroke="#243555" stroke-width="0.4" />
        <!-- PCB traces -->
        <line x1={ix(0.08, 0.3, L2.t)} y1={iy(0.08, 0.3, L2.t)} x2={ix(0.12, 0.3, L2.t)} y2={iy(0.12, 0.3, L2.t)} stroke="#243555" stroke-width="0.35" />
        <line x1={ix(0.08, 0.3, L2.t)} y1={iy(0.08, 0.3, L2.t)} x2={ix(0.08, 0.7, L2.t)} y2={iy(0.08, 0.7, L2.t)} stroke="#243555" stroke-width="0.35" />
        <line x1={ix(0.2, 0.4, L2.t)} y1={iy(0.2, 0.4, L2.t)} x2={ix(0.25, 0.4, L2.t)} y2={iy(0.25, 0.4, L2.t)} stroke="#243555" stroke-width="0.35" />
        <line x1={ix(0.2, 0.7, L2.t)} y1={iy(0.2, 0.7, L2.t)} x2={ix(0.42, 0.65, L2.t)} y2={iy(0.42, 0.65, L2.t)} stroke="#243555" stroke-width="0.35" />
        <!-- capacitors -->
        <ellipse cx={ix(0.15, 0.15, L2.t)} cy={iy(0.15, 0.15, L2.t)} rx="3" ry="1" fill="none" stroke="#243555" stroke-width="0.35" />
        <ellipse cx={ix(0.10, 0.82, L2.t)} cy={iy(0.10, 0.82, L2.t)} rx="3" ry="1" fill="none" stroke="#243555" stroke-width="0.35" />
        <!-- leader -->
        <line x1={ix(1, 0, L2.t)} y1={iy(1, 0, L2.t)} x2={ix(1, 0, L2.t) + 15} y2={iy(1, 0, L2.t)} stroke="#a07850" stroke-width="0.4" />
        <circle cx={ix(1, 0, L2.t)} cy={iy(1, 0, L2.t)} r="1.2" fill="#a07850" />
        <text x={ix(1, 0, L2.t) + 19} y={iy(1, 0, L2.t) - 2} fill="#a07850" font-size="6.5">2 — CIRCUIT BOARD</text>
      </g>

      <!-- ====== Layer 3: Transport Deck ====== -->
      <g>
        <polygon points={L3.faces.right} fill="#d4be96" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L3.faces.left} fill="#dcc8a4" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L3.faces.top} fill="#eedcbe" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <!-- supply reel hub -->
        <ellipse cx={ix(0.25, 0.5, L3.t)} cy={iy(0.25, 0.5, L3.t)} rx="18" ry="6" fill="none" stroke="#1a2744" stroke-width="0.7" />
        <ellipse cx={ix(0.25, 0.5, L3.t)} cy={iy(0.25, 0.5, L3.t)} rx="6" ry="2" fill="none" stroke="#1a2744" stroke-width="0.5" />
        <ellipse cx={ix(0.25, 0.5, L3.t)} cy={iy(0.25, 0.5, L3.t)} rx="2" ry="0.7" fill="#1a2744" opacity="0.4" />
        <!-- take-up reel hub -->
        <ellipse cx={ix(0.62, 0.5, L3.t)} cy={iy(0.62, 0.5, L3.t)} rx="18" ry="6" fill="none" stroke="#1a2744" stroke-width="0.7" />
        <ellipse cx={ix(0.62, 0.5, L3.t)} cy={iy(0.62, 0.5, L3.t)} rx="6" ry="2" fill="none" stroke="#1a2744" stroke-width="0.5" />
        <ellipse cx={ix(0.62, 0.5, L3.t)} cy={iy(0.62, 0.5, L3.t)} rx="2" ry="0.7" fill="#1a2744" opacity="0.4" />
        <!-- tape head -->
        <polygon points={iso_quad(0.41, 0.08, 0.47, 0.2, L3.t)} fill="#1a2744" opacity="0.25" stroke="#1a2744" stroke-width="0.4" />
        <line x1={ix(0.44, 0.05, L3.t)} y1={iy(0.44, 0.05, L3.t)} x2={ix(0.44, 0.08, L3.t)} y2={iy(0.44, 0.08, L3.t)} stroke="#1a2744" stroke-width="0.5" />
        <!-- capstan -->
        <ellipse cx={ix(0.5, 0.14, L3.t)} cy={iy(0.5, 0.14, L3.t)} rx="2.5" ry="0.8" fill="#1a2744" opacity="0.5" />
        <!-- pinch roller -->
        <ellipse cx={ix(0.53, 0.14, L3.t)} cy={iy(0.53, 0.14, L3.t)} rx="5" ry="1.7" fill="none" stroke="#1a2744" stroke-width="0.4" />
        <!-- guide posts -->
        {#each [[0.32, 0.14], [0.56, 0.14]] as [gu, gv]}
          <ellipse cx={ix(gu, gv, L3.t)} cy={iy(gu, gv, L3.t)} rx="2.5" ry="0.8" fill="none" stroke="#1a2744" stroke-width="0.5" />
        {/each}
        <!-- erase head -->
        <polygon points={iso_quad(0.35, 0.1, 0.39, 0.18, L3.t)} fill="none" stroke="#1a2744" stroke-width="0.35" />
        <!-- belt path -->
        <line x1={ix(0.37, 0.5, L3.t)} y1={iy(0.37, 0.5, L3.t)} x2={ix(0.5, 0.35, L3.t)} y2={iy(0.5, 0.35, L3.t)} stroke="#1a2744" stroke-width="0.35" stroke-dasharray="1.5 1" />
        <!-- leader -->
        <line x1={ix(0, 0.5, L3.t)} y1={iy(0, 0.5, L3.t)} x2="52" y2={iy(0, 0.5, L3.t)} stroke="#a07850" stroke-width="0.4" />
        <circle cx={ix(0, 0.5, L3.t)} cy={iy(0, 0.5, L3.t)} r="1.2" fill="#a07850" />
        <text x="5" y={iy(0, 0.5, L3.t) - 2} fill="#a07850" font-size="6.5">3 — TRANSPORT DECK</text>
      </g>

      <!-- ====== Layer 4: Cassette Door ====== -->
      <g>
        <polygon points={L4.faces.right} fill="#d4be96" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L4.faces.left} fill="#dcc8a4" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L4.faces.top} fill="#eedcbe" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <!-- window opening -->
        <polygon points={iso_quad(0.08, 0.1, 0.65, 0.9, L4.t)} fill="#243555" opacity="0.12" stroke="#1a2744" stroke-width="0.5" />
        <polygon points={iso_quad(0.12, 0.15, 0.61, 0.85, L4.t)} fill="none" stroke="#1a2744" stroke-width="0.3" />
        <!-- reels visible through window -->
        <ellipse cx={ix(0.26, 0.5, L4.t)} cy={iy(0.26, 0.5, L4.t)} rx="11" ry="3.7" fill="none" stroke="#1a2744" stroke-width="0.35" opacity="0.4" />
        <ellipse cx={ix(0.26, 0.5, L4.t)} cy={iy(0.26, 0.5, L4.t)} rx="4" ry="1.3" fill="none" stroke="#1a2744" stroke-width="0.3" opacity="0.4" />
        <ellipse cx={ix(0.48, 0.5, L4.t)} cy={iy(0.48, 0.5, L4.t)} rx="11" ry="3.7" fill="none" stroke="#1a2744" stroke-width="0.35" opacity="0.4" />
        <ellipse cx={ix(0.48, 0.5, L4.t)} cy={iy(0.48, 0.5, L4.t)} rx="4" ry="1.3" fill="none" stroke="#1a2744" stroke-width="0.3" opacity="0.4" />
        <!-- hinge points -->
        <ellipse cx={ix(0, 0.15, L4.t)} cy={iy(0, 0.15, L4.t)} rx="2" ry="0.7" fill="none" stroke="#1a2744" stroke-width="0.4" />
        <ellipse cx={ix(0, 0.85, L4.t)} cy={iy(0, 0.85, L4.t)} rx="2" ry="0.7" fill="none" stroke="#1a2744" stroke-width="0.4" />
        <!-- leader -->
        <line x1={ix(1, 0, L4.t)} y1={iy(1, 0, L4.t)} x2={ix(1, 0, L4.t) + 15} y2={iy(1, 0, L4.t)} stroke="#a07850" stroke-width="0.4" />
        <circle cx={ix(1, 0, L4.t)} cy={iy(1, 0, L4.t)} r="1.2" fill="#a07850" />
        <text x={ix(1, 0, L4.t) + 19} y={iy(1, 0, L4.t) - 2} fill="#a07850" font-size="6.5">4 — CASSETTE DOOR</text>
      </g>

      <!-- ====== Layer 5: Top Cover ====== -->
      <g>
        <polygon points={L5.faces.right} fill="#d4be96" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L5.faces.left} fill="#dcc8a4" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />
        <polygon points={L5.faces.top} fill="#eedcbe" stroke="#1a2744" stroke-width="0.8" stroke-linejoin="round" />

        <!-- speaker grille (perforated dot grid) -->
        {#each Array(10) as _, col}
          {#each Array(6) as _, row}
            {@const u = 0.50 + col * 0.048}
            {@const v = 0.10 + row * 0.145}
            <ellipse cx={ix(u, v, L5.t)} cy={iy(u, v, L5.t)} rx="1.8" ry="0.6" fill="#1a2744" opacity="0.2" />
          {/each}
        {/each}

        <!-- cassette window opening -->
        <polygon points={iso_quad(0.04, 0.14, 0.44, 0.86, L5.t)} fill="#243555" opacity="0.15" stroke="#1a2744" stroke-width="0.5" />
        <!-- reels visible through window -->
        <ellipse cx={ix(0.17, 0.5, L5.t)} cy={iy(0.17, 0.5, L5.t)} rx="11" ry="3.7" fill="none" stroke="#1a2744" stroke-width="0.3" opacity="0.35" />
        <ellipse cx={ix(0.17, 0.5, L5.t)} cy={iy(0.17, 0.5, L5.t)} rx="4" ry="1.3" fill="none" stroke="#1a2744" stroke-width="0.25" opacity="0.35" />
        <ellipse cx={ix(0.32, 0.5, L5.t)} cy={iy(0.32, 0.5, L5.t)} rx="11" ry="3.7" fill="none" stroke="#1a2744" stroke-width="0.3" opacity="0.35" />
        <ellipse cx={ix(0.32, 0.5, L5.t)} cy={iy(0.32, 0.5, L5.t)} rx="4" ry="1.3" fill="none" stroke="#1a2744" stroke-width="0.25" opacity="0.35" />

        <!-- transport buttons along front edge -->
        <polygon points={iso_quad(0.04, 0.01, 0.11, 0.10, L5.t)} fill="#c0392b" opacity="0.5" stroke="#1a2744" stroke-width="0.4" />
        <polygon points={iso_quad(0.13, 0.01, 0.19, 0.10, L5.t)} fill="none" stroke="#1a2744" stroke-width="0.4" />
        <polygon points={iso_quad(0.21, 0.01, 0.27, 0.10, L5.t)} fill="none" stroke="#1a2744" stroke-width="0.4" />
        <polygon points={iso_quad(0.29, 0.01, 0.36, 0.10, L5.t)} fill="none" stroke="#1a2744" stroke-width="0.4" />
        <polygon points={iso_quad(0.38, 0.01, 0.44, 0.10, L5.t)} fill="none" stroke="#1a2744" stroke-width="0.4" />

        <!-- brand label strip -->
        <line x1={ix(0.06, 0.11, L5.t)} y1={iy(0.06, 0.11, L5.t)} x2={ix(0.26, 0.11, L5.t)} y2={iy(0.26, 0.11, L5.t)} stroke="#1a2744" stroke-width="0.5" opacity="0.3" />

        <!-- mic hole + controls along back edge -->
        <ellipse cx={ix(0.48, 0.92, L5.t)} cy={iy(0.48, 0.92, L5.t)} rx="2.5" ry="0.8" fill="none" stroke="#1a2744" stroke-width="0.35" />
        <line x1={ix(0.82, 0.92, L5.t)} y1={iy(0.82, 0.92, L5.t)} x2={ix(0.92, 0.92, L5.t)} y2={iy(0.92, 0.92, L5.t)} stroke="#1a2744" stroke-width="0.8" opacity="0.3" />
        <ellipse cx={ix(0.86, 0.92, L5.t)} cy={iy(0.86, 0.92, L5.t)} rx="2" ry="0.7" fill="#1a2744" opacity="0.2" />

        <!-- leader -->
        <line x1={ix(0, 0.5, L5.t)} y1={iy(0, 0.5, L5.t)} x2="52" y2={iy(0, 0.5, L5.t)} stroke="#a07850" stroke-width="0.4" />
        <circle cx={ix(0, 0.5, L5.t)} cy={iy(0, 0.5, L5.t)} r="1.2" fill="#a07850" />
        <text x="5" y={iy(0, 0.5, L5.t) - 2} fill="#a07850" font-size="6.5">5 — TOP COVER</text>
      </g>
    </svg>
  </div>
</section>
