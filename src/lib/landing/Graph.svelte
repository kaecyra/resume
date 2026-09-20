<script lang="ts">
  import type { PipelineBand } from "$lib/types.js";

  import {
    PIPELINE_ARROW_TIP,
    detail_lines,
    type PipelineGraphLayout,
  } from "./pipeline-graph.js";
  import { VENDOR_MARK_PATHS } from "./vendor-marks.js";

  // The drawing for one band. Every coordinate, path string and ink comes
  // from `pipeline-graph.ts`; this file spends them and owns neither. It
  // does not import palette.ts at all, which is what keeps that true: a
  // colour cannot be chosen here because there is nothing here to choose
  // from. The text comes from the band, because a label is content and
  // the layout module only knows where to put it - `layout.nodes` is built
  // by mapping `band.nodes`, so the two stay parallel by index.
  let { band, layout }: { band: PipelineBand; layout: PipelineGraphLayout } = $props();

  // The arrow marker is defined per band rather than once for the page: a
  // band renders on its own in tests and in the phone layout, and a marker
  // reference that points outside its own SVG resolves to nothing.
  const tip_id = $derived(`pipeline-tip-${layout.id}`);
</script>

<!-- Resolution 1: the drawing is decorative and hidden, and the ordered
     list below it is what a screen reader gets. The mockup's role="img"
     plus a single prose aria-label is dropped - it read the graph out as
     one sentence and lost the sequence, which is the whole point of it. -->
<svg class="graph-svg" viewBox={layout.view_box} aria-hidden="true">
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
  </defs>

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

  {#each layout.nodes as placed, index (placed.id)}
    {@const source = band.nodes[index]}
    <g class="node">
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
