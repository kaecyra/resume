<script lang="ts">
  import { onMount } from "svelte";

  import type { PipelineReadout, PipelineTone } from "$lib/types.js";

  import {
    BASEMENT_HISTORY_URL,
    format_basement_sparkline,
    parse_basement_history,
    type BasementSparkline,
  } from "./basement-history.js";
  import {
    BASEMENT_FIELD_IDS,
    BASEMENT_METRICS_URL,
    covers_basement_fields,
    format_basement_readout,
    parse_basement_metrics,
    type BasementMetrics,
  } from "./basement-readout.js";
  import {
    covers_delivery_fields,
    format_delivery_readout,
    parse_trace_fields,
    DELIVERY_TRACE_URL,
    type DeliveryTiming,
    type DeliveryTraceFields,
  } from "./delivery-readout.js";
  import { HUD_PALETTE, PIPELINE_INK } from "./palette.js";
  import RunwayDiagram from "./RunwayDiagram.svelte";
  import { find_pop } from "./runway-catalog.js";
  import Sparkline from "./Sparkline.svelte";

  // One readout, used twice (#209): band 2's basement pair and band 3's
  // four delivery values. The difference is entirely in the data - `live`
  // names which source, if either, replaces the values with a live reading:
  // `delivery` measures the reader's own request once, on mount; `basement`
  // polls the mechanical room's sensor on an interval and carries its own
  // LIVE/OFFLINE badge, since unlike delivery it has no fixed number of
  // fields that either all measure or none do - a stale reading is a valid,
  // renderable state of its own.
  //
  // The section is prerendered by adapter-static, so what ships is the
  // values in data/pipeline.yaml - "-" for band 2, since there is no sample
  // reading honest enough to print in advance. Everything below the markup
  // is an enhancement: with JavaScript off, with the trace or the metrics
  // endpoint blocked, or with a timing entry the browser will not fill in,
  // the static values stand.
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

  // Both live sources format to this same shape (see DeliveryReadoutValue
  // and BasementReadoutValue) - named neutrally here rather than after
  // either one, since this state holds whichever source the readout uses.
  type ReadoutValue = { value: string; unit?: string };

  // The only thing a measurement ever puts into component state: the
  // formatted values keyed by entry id, or nothing. Delivery fills four
  // keys in one shot; basement fills two, and may overwrite this more than
  // once as later polls come in. The trace response itself is read inside
  // read_trace_fields and does not survive the expression it appears in -
  // see the note there.
  let measured = $state<Record<string, ReadoutValue> | null>(null);

  // How often the basement reading is re-fetched once shown. The value
  // behind it only changes every five minutes (docker-entrypoint.sh's own
  // poll cadence), so this is about the page feeling alive, not about
  // catching every update.
  const BASEMENT_POLL_INTERVAL_MS = 30_000;

  // The last metrics file body that actually parsed to a complete reading.
  // Not `$state`: nothing reads it directly, only what `poll_basement`
  // derives from it each tick. Kept even across a failed or malformed poll,
  // so a network blip does not itself erase a reading that is still fresh -
  // format_basement_readout, not fetch success, is what decides freshness.
  let last_basement_metrics: BasementMetrics = {};

  // Whether the current reading is within the freshness window - drives the
  // LIVE/OFFLINE badge. Recomputed on every poll tick, not only a successful
  // one: a poller that has silently stopped writing still has to age out to
  // OFFLINE on its own once 30 minutes pass, rather than freezing on the
  // last number it ever saw.
  let basement_fresh = $state(false);

  // `false` at prerender time (onMount never runs there) and stays `false`
  // for a reader with no JavaScript, so the honest "-"/OFFLINE baseline in
  // data/pipeline.yaml is what they see, same as always. A JS-capable
  // reader flips it the instant onMount's basement branch runs.
  let basement_hydrated = $state(false);

  // Whether the first poll (success or failure) has resolved. Together with
  // `basement_hydrated`, this is what lets the readout stay invisible for
  // one fetch's worth of time rather than showing the "-" baseline only to
  // immediately replace it - the swap this section exists to avoid.
  let basement_ready = $state(false);

  // How often the 24-hour history behind the sparklines is re-read. The
  // poller rewrites it once per cycle, so this matches that cycle.
  const HISTORY_POLL_INTERVAL_MS = 5 * 60_000;

  // Each basement field's sparkline, keyed by entry id, from the last
  // history file that could be read. Drawn only beside a fresh reading: a
  // line ending in a "now" dot next to an OFFLINE hyphen would claim a
  // current value the readout itself has just declined to show.
  let sparklines = $state<Record<string, BasementSparkline>>({});

  const basement_pending = $derived(
    readout.live === "basement" && basement_hydrated && !basement_ready,
  );

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
      const live = measured?.[entry.id];

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
    const ids = readout.entries.map((entry) => entry.id);

    if (readout.live === "delivery" && covers_delivery_fields(ids)) {
      void measure_delivery();
      return;
    }

    if (readout.live === "basement" && covers_basement_fields(ids)) {
      basement_hydrated = true;
      void poll_basement();
      void poll_history();
      const interval = setInterval(() => void poll_basement(), BASEMENT_POLL_INTERVAL_MS);
      const history_interval = setInterval(() => void poll_history(), HISTORY_POLL_INTERVAL_MS);
      return () => {
        clearInterval(interval);
        clearInterval(history_interval);
      };
    }
  });

  async function measure_delivery(): Promise<void> {
    const timing = read_navigation_timing();
    const trace = await read_trace_fields();

    measured = format_delivery_readout(timing, trace);
  }

  // Polled on BASEMENT_POLL_INTERVAL_MS. A successful fetch with a complete
  // reading replaces the cache; anything else (network error, non-200, a
  // malformed or partial body) leaves it as it was. Either way, freshness is
  // then recomputed against the current time - never skipped - so a poller
  // that has stopped updating the file still reads as OFFLINE once the
  // cached reading ages past the freshness window, rather than staying LIVE
  // forever on the last number it ever saw.
  async function poll_basement(): Promise<void> {
    try {
      const response = await fetch(BASEMENT_METRICS_URL, { cache: "no-store" });
      if (response.ok) {
        const parsed = parse_basement_metrics(await response.text());
        if (
          parsed.temperature !== undefined &&
          parsed.humidity !== undefined &&
          parsed.updated_at !== undefined
        ) {
          last_basement_metrics = parsed;
        }
      }
    } catch {
      // Offline, or the container's background poller has not written a
      // first reading yet. last_basement_metrics is untouched; the
      // recompute below still runs.
    }

    const reading = format_basement_readout(last_basement_metrics, Date.now());
    measured = reading.values;
    basement_fresh = reading.fresh;
    basement_ready = true;
  }

  // Polled on HISTORY_POLL_INTERVAL_MS. A fetch that fails or answers with
  // anything but a readable file keeps the sparklines already drawn, the
  // same way a failed value poll keeps the cached reading: whether they
  // show at all is decided by basement_fresh, not by this.
  async function poll_history(): Promise<void> {
    try {
      const response = await fetch(BASEMENT_HISTORY_URL, { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const history = parse_basement_history(await response.text());
      const now = Date.now();
      const drawn: Record<string, BasementSparkline> = {};
      for (const field of BASEMENT_FIELD_IDS) {
        const sparkline = format_basement_sparkline(field, history[field] ?? [], now);
        if (sparkline) {
          drawn[field] = sparkline;
        }
      }
      sparklines = drawn;
    } catch {
      // Offline, or no history written yet. Nothing is drawn that was not
      // already.
    }
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
  class:readout-pending={basement_pending}
  style="--readout-label: {HUD_PALETTE.chip_text}; --readout-unit: {HUD_PALETTE.secondary};"
>
  {#each entries as entry (entry.id)}
    <div style="--readout-value: {TONE_COLORS[entry.tone ?? 'default']};">
      <dt>{entry.label}</dt>
      <dd>{entry.value}{#if entry.unit}<small>{entry.unit}</small>{/if}</dd>
      {#if basement_fresh && sparklines[entry.id]}
        <dd class="readout-spark"><Sparkline sparkline={sparklines[entry.id]} /></dd>
      {/if}
    </div>
  {/each}
</dl>

{#if readout.live === "basement"}
  <p
    class="live-badge"
    class:readout-pending={basement_pending}
    style="color: {basement_fresh ? PIPELINE_INK.live : HUD_PALETTE.chip_text};"
  >
    <!-- A drawn LED, same idiom as the rack's own (RACK_LED, Rack.svelte) -
         fill, not a CSS background, so a status dot never reads as the
         panel/surface treatment .memory/no-default-ai-styling.md rejects. -->
    <svg class="live-dot" width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="4" fill={basement_fresh ? PIPELINE_INK.live : HUD_PALETTE.chip_text} />
    </svg>
    {basement_fresh ? "LIVE" : "OFFLINE"}
  </p>
{/if}

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

  /* The sparkline is a second <dd> after the value, which column-reverse
     would put on top. `order` sends it to the bottom instead, under the
     label, and the margin gives it air from the label. */
  .readout dd.readout-spark {
    order: -1;
    margin-top: 8px;
    font-size: inherit;
  }

  /* A readout set under a note needs the air between the two. Band 2's
     basement pair is the case that has it today. */
  .readout-after-note {
    margin-block: 30px 0;
  }

  /* Invisible rather than absent: the space stays reserved, so a reading
     landing a beat after mount never shifts anything below it. Only ever
     applied once JavaScript has confirmed it can update this element again
     shortly - see basement_pending - so a reader with none never sees it. */
  .readout,
  .live-badge {
    transition: opacity 150ms ease;
  }

  .readout-pending {
    opacity: 0;
  }

  /* The mechanical room readout's freshness badge - a status LED, same
     motif as the rack's own (see RACK_LED, palette.ts), not a panel. */
  .live-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 14px 0 0;
    font-size: 11px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .live-dot {
    flex-shrink: 0;
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
