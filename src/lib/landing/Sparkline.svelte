<script lang="ts">
  import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, type BasementSparkline } from "./basement-history.js";
  import { HUD_PALETTE, PIPELINE_INK } from "./palette.js";

  // One basement value's last 24 hours (#242), drawn under it in the
  // readout. Everything about the line is decided in basement-history.ts;
  // this only puts it on the page. The drawing is decoration for a sighted
  // reader - the same content goes to everyone else as the summary.
  let { sparkline }: { sparkline: BasementSparkline } = $props();
</script>

<span class="spark" style="--spark-label: {HUD_PALETTE.chip_text};">
  <!-- A line and a dot, nothing else: no axis, no fill under the curve, no
       frame (see .memory/no-default-ai-styling.md). -->
  <svg
    class="spark-line"
    viewBox="0 0 {SPARKLINE_WIDTH} {SPARKLINE_HEIGHT}"
    aria-hidden="true"
  >
    <path
      d={sparkline.path}
      fill="none"
      stroke={HUD_PALETTE.chip_text}
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
    <circle cx={sparkline.end.x} cy={sparkline.end.y} r="2.5" fill={PIPELINE_INK.live} />
  </svg>
  <span class="spark-range" aria-hidden="true">
    <span>{sparkline.high}</span>
    <span>{sparkline.low}</span>
  </span>
  <span class="sr-only">{sparkline.summary}</span>
</span>

<style>
  .spark {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .spark-line {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    max-width: 180px;
    height: auto;
  }

  /* High over low, beside the line's right end - the body face, small, in
     the label colour, so the pair reads as annotation, not as values. */
  .spark-range {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    font-size: 10px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: var(--spark-label);
  }
</style>
