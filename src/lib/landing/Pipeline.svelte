<script lang="ts">
  import type { PipelineBand, PipelineData } from "$lib/types.js";

  import CodeBlock from "./CodeBlock.svelte";
  import Crossing from "./Crossing.svelte";
  import Graph from "./Graph.svelte";
  import Rack from "./Rack.svelte";
  import Readout from "./Readout.svelte";
  import Terminal from "./Terminal.svelte";
  import VendorMarks from "./VendorMarks.svelte";
  import { HUD_PALETTE } from "./palette.js";
  import { build_pipeline_graph } from "./pipeline-graph.js";
  import { split_tagline } from "./tagline-format.js";

  let { pipeline }: { pipeline: PipelineData } = $props();

  const lede = $derived(split_tagline(pipeline.lede, pipeline.lede_emphasis));
  const closer = $derived(split_tagline(pipeline.closer, pipeline.closer_emphasis));

  // One layout per band, computed once here rather than inside Graph, so a
  // band's drawing and anything measured against it read the same numbers.
  const layouts = $derived(pipeline.bands.map(build_pipeline_graph));

  // The crossings are drawn between the bands, not inside them, so they are
  // rendered by index against the band list: the crossing after band n sits
  // between band n and band n+1. `validate_pipeline_data` pins the list to
  // band order and pins the graph sides to alternate, which is what makes
  // Crossing's index-parity direction correct.
  function crossing_after(index: number) {
    return pipeline.crossings[index];
  }

  // Both the note and the readout name the column they belong to, so the
  // two columns are filled by asking rather than by knowing which band is
  // which. `follows_note` is the one fact neither component can see for
  // itself: the readout only needs its top margin where the note is
  // directly above it in the same column.
  function follows_note(band: PipelineBand): boolean {
    return band.readout !== undefined && band.note.column === band.readout.column;
  }
</script>

<section
  id="pipeline"
  class="pipeline"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary};"
>
  <div class="wrap">
    <h2 class="section-title">{pipeline.heading}</h2>

    <!-- Three text nodes rather than markup in the data: the emphasis
         phrase arrives as plain text and is wrapped here, the same contract
         the hero's tagline uses. -->
    <p class="lede">
      {lede.before}{#if lede.emphasis}<strong class="lede-emphasis">{lede.emphasis}</strong
        >{/if}{lede.after}
    </p>

    {#each pipeline.bands as band, index (band.id)}
      <section class="band" class:band--flip={band.graph_side === "right"}>
        {#if band.label}
          <p class="band-label">
            {band.label.from}{#if band.label.to}<span class="band-label-hop">&rarr;</span
              >{band.label.to}{/if}
          </p>
        {/if}

        <div class="band-grid">
          <div class="col col-graph">
            <Graph {band} layout={layouts[index]} />

            {#if band.note.column === "graph"}
              {@const note = split_tagline(band.note.text, band.note.emphasis)}
              <p class="note">
                {note.before}{#if note.emphasis}<strong>{note.emphasis}</strong>{/if}{note.after}
              </p>
            {/if}

            {#if band.readout && band.readout.column === "graph"}
              <Readout readout={band.readout} follows_note={follows_note(band)} />
            {/if}
          </div>

          <div class="col col-aside">
            {#if band.terminal}
              <Terminal terminal={band.terminal} />
            {/if}

            {#if band.code}
              <CodeBlock code={band.code} />
            {/if}

            {#if band.rack}
              <div class="rack-row">
                <Rack />
              </div>
            {/if}

            {#if band.marks}
              <VendorMarks marks={band.marks} />
            {/if}

            {#if band.note.column === "aside"}
              {@const note = split_tagline(band.note.text, band.note.emphasis)}
              <p class="note">
                {note.before}{#if note.emphasis}<strong>{note.emphasis}</strong>{/if}{note.after}
              </p>
            {/if}

            {#if band.readout && band.readout.column === "aside"}
              <Readout readout={band.readout} follows_note={follows_note(band)} />
            {/if}
          </div>
        </div>
      </section>

      {#if crossing_after(index)}
        <Crossing crossing={crossing_after(index)} {index} />
      {/if}
    {/each}

    <p class="closer">
      {closer.before}{#if closer.emphasis}<strong class="closer-emphasis">{closer.emphasis}</strong
        >{/if}{closer.after}
    </p>
  </div>
</section>

<style>
  .pipeline {
    background: var(--hud-bg);
    color: var(--hud-text);
  }

  .wrap {
    max-width: 1180px;
    margin: 0 auto;
    padding-inline: 20px;
    padding-block: 0 72px;
  }

  .section-title {
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: clamp(2.1rem, 6vw, 3.4rem);
    line-height: 1.02;
    letter-spacing: -0.01em;
    margin: 0;
    padding-block: 64px 0;
    text-wrap: balance;
  }

  .lede {
    margin: 18px 0 0;
    max-width: 44ch;
    font-size: clamp(1rem, 2.2vw, 1.15rem);
    color: var(--hud-secondary);
  }

  .lede-emphasis,
  .closer-emphasis {
    font-weight: inherit;
    color: var(--hud-text);
  }

  .band {
    padding-block: 56px 0;
  }

  .band-label {
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--hud-secondary);
    margin: 0 0 22px;
  }

  .band-label-hop {
    padding-inline: 0.5em;
  }

  /* `align-items: start` is what pairs the columns: band 3's graph is
     shorter than the readout facing it, and the difference falls below
     rather than stretching either column to meet the other. */
  .band-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 40px 56px;
    align-items: start;
  }

  .band--flip .col-graph {
    order: 2;
  }

  .band--flip .col-aside {
    order: 1;
  }

  .rack-row {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .note {
    margin: 22px 0 0;
    max-width: 46ch;
    color: var(--hud-secondary);
    font-size: 0.95rem;
  }

  .note strong {
    font-weight: 500;
    color: var(--hud-text);
  }

  .closer {
    margin: 72px 0 0;
    max-width: 40ch;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: clamp(1.25rem, 3.2vw, 1.75rem);
    line-height: 1.25;
    text-wrap: balance;
  }

  /* Below this the grid is one column and the graph leads, which is the
     order the bands read in. The flip has nothing to swap at this width. */
  @media (max-width: 860px) {
    .band-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 34px;
    }

    .band--flip .col-graph,
    .band--flip .col-aside {
      order: 0;
    }
  }
</style>
