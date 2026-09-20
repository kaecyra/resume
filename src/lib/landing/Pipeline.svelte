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
  import { build_pipeline_graphs } from "./pipeline-graph.js";
  import { reveal, type RevealPhase } from "./pipeline-motion.js";
  import { split_tagline } from "./tagline-format.js";

  let { pipeline }: { pipeline: PipelineData } = $props();

  const lede = $derived(split_tagline(pipeline.lede, pipeline.lede_emphasis));
  const closer = $derived(split_tagline(pipeline.closer, pipeline.closer_emphasis));

  // One layout per band, computed once here rather than inside Graph, so a
  // band's drawing and anything measured against it read the same numbers.
  const layouts = $derived(build_pipeline_graphs(pipeline.bands));

  // Both the note and the readout name the column they belong to, so the
  // two columns are filled by asking rather than by knowing which band is
  // which. `follows_note` is the one fact neither component can see for
  // itself: the readout only needs its top margin where the note is
  // directly above it in the same column.
  function follows_note(band: PipelineBand): boolean {
    return band.readout !== undefined && band.note.column === band.readout.column;
  }

  // One reveal phase per band, and the band is what carries it: the
  // drawing, the terminal and the rack in a band arrive together, off one
  // observer, rather than three of them racing each other down the same
  // scroll. It starts `static` - the finished state - so the server's
  // output, a browser with no JavaScript, and a reader who has asked for
  // reduced motion all get the section simply present. `reveal` moves it
  // on only where motion is welcome.
  //
  // A prop rather than a class on the band that children match: Svelte
  // scopes a component's styles to itself, so an ancestor class would need
  // a `:global()` selector inside every one of them.
  //
  // Keyed by band id and absent until the action fills it, rather than an
  // array sized from `pipeline.bands` up front: sizing it here would
  // capture the band list as it was at construction, and the id is what
  // the `{#each}` is already keyed by.
  let band_phases = $state<Record<string, RevealPhase>>({});

  function phase_of(band: PipelineBand): RevealPhase {
    return band_phases[band.id] ?? "static";
  }
</script>

<section
  id="pipeline"
  class="pipeline"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-accent: {HUD_PALETTE.accent};"
>
  <div class="wrap">
    <h2 class="section-title">{pipeline.heading}</h2>

    <!-- Set in the heading's own face, a size down and a tone quieter, so it
         reads as the title trailing off rather than as a second heading or
         as the start of the lede. Omitted entirely when the data has none. -->
    {#if pipeline.subtitle}
      <p class="section-subtitle">{pipeline.subtitle}</p>
    {/if}

    <!-- Three text nodes rather than markup in the data: the emphasis
         phrase arrives as plain text and is wrapped here, the same contract
         the hero's tagline uses. -->
    <p class="lede">
      {lede.before}{#if lede.emphasis}<strong class="lede-emphasis">{lede.emphasis}</strong
        >{/if}{lede.after}
    </p>

    {#each pipeline.bands as band, index (band.id)}
      <section
        class="band"
        class:band--flip={band.graph_side === "right"}
        use:reveal={(phase) => (band_phases[band.id] = phase)}
      >
        {#if band.label}
          <p class="band-label">
            {band.label.from}{#if band.label.to}<span class="band-label-hop">&rarr;</span
              >{band.label.to}{/if}
          </p>
        {/if}

        <div class="band-grid">
          <div class="col col-graph">
            <Graph {band} layout={layouts[index]} phase={phase_of(band)} />

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
              <!-- No phase prop: the terminal observes itself, because its
                   replay is long enough that the band's own arrival fires
                   it too early to be watched. See Terminal.svelte. -->
              <Terminal terminal={band.terminal} />
            {/if}

            {#if band.code}
              <CodeBlock code={band.code} />
            {/if}

            {#if band.rack}
              <div class="rack-row">
                <Rack phase={phase_of(band)} />
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

      <!-- The crossings are drawn between the bands, not inside them: the
           crossing after band n sits between band n and band n+1.
           validate_pipeline_data pins the list to band order and pins the
           graph sides to alternate, which is what makes Crossing's
           index-parity direction correct. -->
      {@const crossing = pipeline.crossings[index]}
      {#if crossing}
        <Crossing {crossing} {index} />
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

  /* The body face at its normal weight, not the heading's: the line is an
     aside under the title, and setting it in the display face made it read
     as a second heading rather than as the title trailing off. */
  /* The bottom margin lives here rather than on `.lede`, so the wider gap
     exists only where a subtitle does. Adjacent margins collapse to the
     larger of the two, so this is the gap, not an addition to the lede's
     own 18px. */
  .section-subtitle {
    margin: 8px 0 34px;
    font-weight: 400;
    font-size: clamp(1rem, 2.4vw, 1.35rem);
    line-height: 1.2;
    color: var(--hud-secondary);
  }

  .lede {
    margin: 18px 0 0;
    max-width: 44ch;
    font-size: clamp(1rem, 2.2vw, 1.15rem);
    color: var(--hud-secondary);
  }

  .lede-emphasis {
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

  /* The section's last line, and the only place the accent is spent on
     running text. The first sentence carries the display face and the
     accent; what follows it drops to the body face at its normal weight
     and the page's own text colour, so the stress lands once and the
     explanation underneath it reads as prose rather than as more heading. */
  .closer {
    margin: 72px 0 0;
    max-width: 40ch;
    font-weight: 400;
    font-size: clamp(1.25rem, 3.2vw, 1.75rem);
    line-height: 1.35;
    color: var(--hud-text);
    text-wrap: balance;
  }

  .closer-emphasis {
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    color: var(--hud-accent);
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
