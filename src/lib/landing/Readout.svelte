<script lang="ts">
  import { onMount } from "svelte";

  import type { PipelineReadout, PipelineTone } from "$lib/types.js";

  import {
    covers_delivery_fields,
    format_delivery_readout,
    parse_trace_fields,
    DELIVERY_TRACE_URL,
    type DeliveryReadoutValue,
    type DeliveryReadoutValues,
    type DeliveryTiming,
    type DeliveryTraceFields,
  } from "./delivery-readout.js";
  import { HUD_PALETTE, PIPELINE_INK } from "./palette.js";
  import RunwayDiagram from "./RunwayDiagram.svelte";
  import { find_pop } from "./runway-catalog.js";

  // One readout, used twice (#209): band 2's basement pair and band 3's
  // four delivery values. The difference is entirely in the data - `live`
  // says whether the browser should replace the values with measurements of
  // the reader's own request.
  //
  // The section is prerendered by adapter-static, so what ships is the
  // values in data/pipeline.yaml. Everything below the markup is an
  // enhancement: with JavaScript off, with the trace blocked, or with a
  // timing entry the browser will not fill in, the static values stand.
  //
  // `follows_note` is placement, not content: it says this readout sits
  // under a note in the same column, which is the one thing its extra
  // spacing is for. The band data already knows it - `note.column ===
  // readout.column` - and step (c), which places the component, is what
  // passes it. It is deliberately not derived from `column` here: that
  // holds for band 2's pair by coincidence, and would hand 30px of air to
  // any future graph-column readout with nothing above it.
  let {
    readout,
    follows_note = false,
  }: { readout: PipelineReadout; follows_note?: boolean } = $props();

  // The only thing the measurement ever puts into component state: four
  // formatted values, or nothing. The trace response itself is read inside
  // read_trace_fields and does not survive the expression it appears in -
  // see the note there.
  let measured = $state<DeliveryReadoutValues | null>(null);

  // A tone names a role; palette.ts holds the colour. No hex lives here.
  const TONE_COLORS: Record<PipelineTone, string> = {
    default: HUD_PALETTE.text,
    muted: HUD_PALETTE.secondary,
    dim: HUD_PALETTE.chip_text,
    accent: HUD_PALETTE.accent,
    green: PIPELINE_INK.pass,
  };

  // All four values swap together or none of them does. A measured number
  // standing beside a sample one, with nothing to tell them apart, is the
  // one thing this readout must never do.
  const entries = $derived(
    readout.entries.map((entry) => {
      const live: DeliveryReadoutValue | undefined = measured?.[
        entry.id as keyof DeliveryReadoutValues
      ];

      return live ? { ...entry, value: live.value, unit: live.unit } : entry;
    }),
  );

  // The "edge" entry names a Cloudflare PoP by its IATA code - this band's
  // only one, `find_pop` takes the lowercase id `runway-catalog.ts` keys
  // its list by. Reading it off `entries` rather than `readout` or
  // `measured` directly means it tracks whichever value is currently on
  // screen: the sample until the request is measured, the reader's own
  // edge after. Undefined unless the PoP is both known and has generated
  // runway data - RunwayDiagram degrades to an empty square otherwise,
  // which would look broken rather than simply absent.
  const edge_pop = $derived.by(() => {
    const edge = entries.find((entry) => entry.id === "edge");
    if (!edge) {
      return undefined;
    }

    const pop = find_pop(edge.value.toLowerCase());
    return pop?.runways && pop.runways.length > 0 ? pop : undefined;
  });

  onMount(() => {
    if (!readout.live || !covers_delivery_fields(readout.entries.map((entry) => entry.id))) {
      return;
    }

    void measure_delivery();
  });

  async function measure_delivery(): Promise<void> {
    const timing = read_navigation_timing();
    const trace = await read_trace_fields();

    measured = format_delivery_readout(timing, trace);
  }

  function read_navigation_timing(): DeliveryTiming {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
      return {};
    }

    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!entry) {
      return {};
    }

    return {
      start_time: entry.startTime,
      response_start: entry.responseStart,
      transfer_size: entry.transferSize,
      next_hop_protocol: entry.nextHopProtocol,
    };
  }

  // The trace response carries the reader's own IP address, their user
  // agent and their TLS parameters. It is handed straight to
  // parse_trace_fields, which keeps the airport code and the country and
  // drops the rest; the body is never assigned to a variable, never stored
  // and never logged, so nothing downstream of this line can see it.
  async function read_trace_fields(): Promise<DeliveryTraceFields> {
    try {
      const response = await fetch(DELIVERY_TRACE_URL, {
        headers: { accept: "text/plain" },
        cache: "no-store",
      });
      if (!response.ok) {
        return {};
      }

      return parse_trace_fields(await response.text());
    } catch {
      // Offline, blocked by an extension, or not behind Cloudflare at all -
      // the dev server has no /cdn-cgi/trace. The static values stand.
      return {};
    }
  }
</script>

<dl
  class="readout"
  class:readout-after-note={follows_note}
  style="--readout-label: {HUD_PALETTE.chip_text}; --readout-unit: {HUD_PALETTE.secondary};"
>
  {#each entries as entry (entry.id)}
    <div style="--readout-value: {TONE_COLORS[entry.tone ?? 'default']};">
      <dt>{entry.label}</dt>
      <dd>{entry.value}{#if entry.unit}<small>{entry.unit}</small>{/if}</dd>
    </div>
  {/each}
</dl>

{#if edge_pop}
  <!-- #226's runway diagram, wired in: the edge value above is an
       airport, and this is what its runways actually look like. -->
  <figure class="edge-airport" style="color: {HUD_PALETTE.chip_text};">
    <RunwayDiagram pop={edge_pop} />
    <figcaption>{edge_pop.iata}&nbsp;&middot;&nbsp;{edge_pop.city}</figcaption>
  </figure>
{/if}

<style>
  /* Typographic, not a panel: scale and space carry it (see
     .memory/no-default-ai-styling.md). No surface, no rule, no rail. */
  .readout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px 34px;
    margin: 0;
  }

  /* The value reads above its label while the <dt> still precedes its <dd>
     in the document, which is the order anything reading the markup wants. */
  .readout div {
    display: flex;
    flex-direction: column-reverse;
    gap: 4px;
    min-width: 0;
  }

  .readout dt {
    /* Inherits the body face (IBM Plex Sans) from .landing in +page.svelte
       - mono retired outside the hero (#187). All-caps at this size wants
       tracking to stay legible. */
    font-size: 11px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--readout-label);
  }

  .readout dd {
    margin: 0;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: clamp(1.6rem, 4.4vw, 2.1rem);
    line-height: 1;
    letter-spacing: -0.01em;
    /* These numbers change between readers, and two of them change after
       the page has measured the request - fixed advances stop the column
       jumping when they do. */
    font-variant-numeric: tabular-nums;
    color: var(--readout-value);
  }

  .readout dd small {
    /* Back to the body face: the unit is a word beside a number, not part
       of the display-face gesture. */
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    font-size: 0.85rem;
    font-weight: 400;
    letter-spacing: 0;
    margin-left: 4px;
    color: var(--readout-unit);
  }

  /* A readout set under a note needs the air between the two. Band 2's
     basement pair is the case that has it today. */
  .readout-after-note {
    margin-block: 30px 0;
  }

  /* Centered like Rack's standalone visual (.rack-row), sized to read as
     its own figure rather than a small supporting icon. No panel around it
     (see .memory/no-default-ai-styling.md). */
  .edge-airport {
    margin: 28px auto 0;
    max-width: 320px;
    text-align: center;
  }

  .edge-airport figcaption {
    margin-top: 10px;
    font-size: 11px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  @media (max-width: 720px) {
    .readout {
      gap: 24px 24px;
    }
  }
</style>
