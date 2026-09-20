<script lang="ts">
  import type { PipelineCrossing } from "$lib/types.js";

  import { HUD_PALETTE, PIPELINE_INK } from "./palette.js";

  // One connector between two bands (#209). `index` is the crossing's
  // position in `PipelineData.crossings`, and it is the only thing that
  // decides which way the connector runs: the bands alternate which column
  // holds the graph, so crossing 0 leaves the left spine and lands on the
  // right, crossing 1 does the reverse, and a fourth band added to
  // `data/pipeline.yaml` keeps the pattern without anyone editing a
  // component. Keying off `crossing.after` instead would put the band
  // registry in a third place - see KNOWN_SECTIONS for how that goes.
  let { crossing, index }: { crossing: PipelineCrossing; index: number } = $props();

  const direction = $derived(index % 2 === 0 ? "out" : "back");
</script>

<div
  class="crossing crossing--{direction}"
  data-crossing={crossing.id}
  style="--ink-rule: {PIPELINE_INK.crossing_rule}; --ink-arrow: {PIPELINE_INK.crossing_arrow}; --hud-bg: {HUD_PALETTE.background}; --hud-edge: {HUD_PALETTE.edge}; --hud-accent: {HUD_PALETTE.accent}; --hud-chip-text: {HUD_PALETTE.chip_text};"
>
  <span class="x-v x-start"></span>
  <span class="x-h"></span>
  <span class="x-v x-end"></span>
  <span class="x-tip"></span>
  <span class="x-label">{crossing.label}</span>
</div>

<style>
  /* Drawn in CSS, not SVG, because both endpoints have to land on a graph
     spine and those spines move with the column width. A fixed viewBox
     cannot track that: the right-hand band's spine sits at the LEFT edge of
     the right column, not at the page edge. Everything below is derived
     from the same numbers .band-grid uses, so the joins hold at every width
     the two-column layout is alive. */
  .crossing {
    position: relative;
    height: 132px;
    --gap: 56px;
    --col: calc((100% - var(--gap)) / 2);
    --graph: min(440px, var(--col));
    --spine: calc(var(--graph) * 0.1);
    --near: var(--spine);
    --far: calc(var(--col) + var(--gap) + var(--spine));
    --turn: 66px;
    /* The arrow glyph is 8px tall; --tip reserves 12px, so its point sits
       4px clear of the bottom edge. --tip-half is the glyph's half-width,
       which is also what each rule has to back off by to centre on the
       spine - the same number in three places, named once. */
    --tip: 12px;
    --tip-half: 4px;
  }

  .x-v,
  .x-h,
  .x-tip {
    position: absolute;
  }

  .x-v {
    width: 0;
    border-left: 1px dashed var(--ink-rule);
  }

  .x-h {
    height: 0;
    border-top: 1px dashed var(--ink-rule);
    left: var(--near);
    right: calc(100% - var(--far));
    top: var(--turn);
  }

  .x-tip {
    width: 0;
    height: 0;
    border-left: var(--tip-half) solid transparent;
    border-right: var(--tip-half) solid transparent;
    border-top: 8px solid var(--ink-arrow);
    top: calc(100% - var(--tip));
  }

  .crossing--out .x-start {
    left: var(--near);
    top: 0;
    height: var(--turn);
  }

  .crossing--out .x-end {
    left: var(--far);
    top: var(--turn);
    height: calc(100% - var(--turn) - var(--tip));
  }

  .crossing--out .x-tip {
    left: calc(var(--far) - var(--tip-half));
  }

  .crossing--back .x-start {
    left: var(--far);
    top: 0;
    height: var(--turn);
  }

  .crossing--back .x-end {
    left: var(--near);
    top: var(--turn);
    height: calc(100% - var(--turn) - var(--tip));
  }

  .crossing--back .x-tip {
    left: calc(var(--near) - var(--tip-half));
  }

  /* The system monospace stack, not Share Tech Mono: #187 retired that face
     everywhere outside the hero. The label sits on the page's own ground so
     it punches a gap in the dashed rule running under it. */
  .x-label {
    position: absolute;
    top: calc(var(--turn) - 11px);
    left: calc((var(--near) + var(--far)) / 2);
    transform: translateX(-50%);
    background: var(--hud-bg);
    padding-inline: 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 22px;
    color: var(--hud-chip-text);
    white-space: nowrap;
  }

  /* Below 860px `.band-grid` collapses to a single column, so there is no
     second spine to reach and the horizontal run would be drawing a join
     that does not exist. The rules and the arrow go; the label stays, moves
     into the flow between the two bands, and keeps a short vertical rule so
     the handoff still reads as a handoff. */
  @media (max-width: 860px) {
    .crossing {
      height: auto;
    }

    .x-v,
    .x-h,
    .x-tip {
      display: none;
    }

    .x-label {
      position: static;
      left: auto;
      transform: none;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 0 0 0 4px;
      margin-block: 26px;
      background: none;
      color: var(--hud-accent);
    }

    .x-label::before {
      content: "";
      flex: none;
      width: 2px;
      height: 46px;
      background: linear-gradient(var(--hud-edge), var(--hud-accent));
    }
  }
</style>
