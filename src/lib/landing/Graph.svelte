<script lang="ts">
  import type { PipelineBand } from "$lib/types.js";

  import {
    PIPELINE_ARROW_TIP,
    detail_lines,
    type PipelineGraphLayout,
  } from "./pipeline-graph.js";
  import { node_delays, type RevealPhase } from "./pipeline-motion.js";
  import { VENDOR_MARK_PATHS } from "./vendor-marks.js";

  // The drawing for one band. Every coordinate, path string and ink comes
  // from `pipeline-graph.ts`; this file spends them and owns neither. It
  // does not import palette.ts at all, which is what keeps that true: a
  // colour cannot be chosen here because there is nothing here to choose
  // from. The text comes from the band, because a label is content and
  // the layout module only knows where to put it - `layout.nodes` is built
  // by mapping `band.nodes`, so the two stay parallel by index.
  let {
    band,
    layout,
    phase = "static",
  }: { band: PipelineBand; layout: PipelineGraphLayout; phase?: RevealPhase } = $props();

  // The arrow marker is defined per band rather than once for the page: a
  // band renders on its own in tests and in the phone layout, and a marker
  // reference that points outside its own SVG resolves to nothing. The clip
  // is per band for the same reason.
  const tip_id = $derived(`pipeline-tip-${layout.id}`);

  // Resolution 3: the draw-in is a clip opening downward, not the stroke's
  // own dash. Band 1's trunk is dotted and band 3's tunnel stretch dashed,
  // both decoratively, and animating `stroke-dashoffset` would drag those
  // patterns along with it. A clip leaves every dash where the drawing put
  // it, and behaves the same over the solid lines.
  const clip_id = $derived(`pipeline-clip-${layout.id}`);

  const delays = $derived(node_delays(band.nodes.length));
</script>

<!-- Resolution 1: the drawing is decorative and hidden, and the ordered
     list below it is what a screen reader gets. The mockup's role="img"
     plus a single prose aria-label is dropped - it read the graph out as
     one sentence and lost the sequence, which is the whole point of it. -->
<svg
  class="graph-svg"
  class:is-armed={phase === "armed"}
  class:is-revealed={phase === "revealed"}
  viewBox={layout.view_box}
  aria-hidden="true"
  style="--clip-height: {layout.height}px;"
>
  <defs>
    <marker
      id={tip_id}
      viewBox={PIPELINE_ARROW_TIP.view_box}
      refX={PIPELINE_ARROW_TIP.ref_x}
      refY={PIPELINE_ARROW_TIP.ref_y}
      markerWidth={PIPELINE_ARROW_TIP.width}
      markerHeight={PIPELINE_ARROW_TIP.height}
      orient="auto"
    >
      <path d={PIPELINE_ARROW_TIP.d} fill={PIPELINE_ARROW_TIP.ink} />
    </marker>

    <clipPath id={clip_id}>
      <rect class="clip-rect" x="0" y="0" width={layout.width} height={layout.height} />
    </clipPath>
  </defs>

  <!-- The lines are clipped; the nodes are not. They light on their own
       stagger, and gating them on the clip as well would run each one off
       two clocks at once. -->
  <g clip-path="url(#{clip_id})">
    {#each layout.segments as segment (segment.id)}
      <path
        class="segment"
        d={segment.d}
        stroke={segment.ink}
        stroke-width={segment.width}
        stroke-dasharray={segment.dash}
        stroke-linecap={segment.linecap}
      />
    {/each}

    {#if layout.tail}
      <path
        class="tail"
        d={layout.tail.d}
        stroke={layout.tail.ink}
        stroke-width={layout.tail.width}
        marker-end="url(#{tip_id})"
      />
    {/if}
  </g>

  {#each layout.nodes as placed, index (placed.id)}
    {@const source = band.nodes[index]}
    <g class="node" style="--node-delay: {delays[index]}ms;">
      {#if placed.halo_radius !== null}
        <circle
          class="halo"
          cx={placed.x}
          cy={placed.y}
          r={placed.halo_radius}
          fill="none"
          stroke={placed.ink}
          stroke-width={placed.halo_width}
          opacity={placed.halo_opacity}
        />
      {/if}

      {#if placed.stroke === null}
        <circle cx={placed.x} cy={placed.y} r={placed.radius} fill={placed.ink} />
      {:else}
        <circle
          cx={placed.x}
          cy={placed.y}
          r={placed.radius}
          fill={placed.fill}
          stroke={placed.stroke}
          stroke-width={placed.stroke_width}
        />
      {/if}

      {#if placed.tick}
        <path
          class="tick"
          d={placed.tick.d}
          fill="none"
          stroke={placed.tick.stroke}
          stroke-width={placed.tick.width}
          stroke-linecap={placed.tick.linecap}
          stroke-linejoin={placed.tick.linejoin}
        />
      {/if}

      {#if placed.mark}
        <g
          class="mark"
          transform="translate({placed.mark.x},{placed.mark.y}) scale({placed.mark.scale})"
          fill={placed.mark.ink}
        >
          <path d={VENDOR_MARK_PATHS[placed.mark.id]} />
        </g>
      {/if}

      <text
        class="label"
        class:is-emphasis={placed.emphasis}
        class:is-reader={placed.style === "reader"}
        x={placed.label_x}
        y={placed.label_y}
        fill={placed.label_ink}
      >
        {source.label}
      </text>

      {#each detail_lines(source) as text, line (line)}
        <text
          class="detail"
          x={placed.label_x}
          y={placed.detail_ys[line]}
          fill={placed.detail_ink}
        >
          {text}
        </text>
      {/each}
    </g>
  {/each}
</svg>

<ol class="graph-key">
  {#each band.nodes as source (source.id)}
    {@const lines = detail_lines(source)}
    <li>{source.label}{#if lines.length}{" — "}{lines.join(" ")}{/if}</li>
  {/each}
</ol>

<style>
  .graph-svg {
    width: 100%;
    max-width: 440px;
    height: auto;
    display: block;
  }

  .segment,
  .tail {
    fill: none;
  }

  /* The three states the reveal moves through. Nothing here fires unless a
     `phase` prop says so, and `phase` only leaves "static" where
     `pipeline-motion.ts` has confirmed motion is welcome - so the server's
     output, a page with scripting off, and a reader who asked for reduced
     motion all get the finished drawing with no rule below applying to it.

     The clip rect carries a `height` attribute as well, which is what those
     readers see. `is-armed` takes it to nothing for the frame between the
     action mounting and the band arriving; `is-revealed` plays it back
     open. In SVG a CSS pixel is a user unit, so --clip-height matches the
     attribute exactly. */
  .is-armed .clip-rect {
    height: 0;
  }

  .is-revealed .clip-rect {
    animation: graph-draw 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes graph-draw {
    from {
      height: 0;
    }
    to {
      height: var(--clip-height);
    }
  }

  .is-armed .node {
    opacity: 0;
  }

  .is-revealed .node {
    animation: node-light 200ms linear var(--node-delay) both;
  }

  @keyframes node-light {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .label {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 13px;
  }

  .label.is-emphasis {
    font-weight: 500;
  }

  /* The one label set in the display face: the reader's own node, which the
     mockup ends the section on. */
  .label.is-reader {
    font-family: "Archivo Black", Impact, sans-serif;
    font-size: 18px;
    font-weight: 400;
  }

  .detail {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 11.5px;
  }

  /* The drawing's parallel text. Present for a screen reader, absent from
     the page - not `display: none`, which would take it out of the
     accessibility tree along with the pixels. */
  .graph-key {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
</style>
