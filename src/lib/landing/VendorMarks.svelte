<script lang="ts">
  import type { PipelineMarkEntry } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";
  import { VENDOR_MARK_PATHS } from "./vendor-marks.js";

  // The monochrome row under the rack (#209): what the hardware above it is
  // actually running. A list rather than the mockup's bare spans, because
  // the labels are real readable content and "list, five items" is what a
  // reader of them should get; the drawings beside them are decorative and
  // stay out of the accessibility tree.
  let { marks }: { marks: PipelineMarkEntry[] } = $props();
</script>

<!-- The list carries the row's top margin, so a band with no marks must not
     render one: an empty <ul> would leave 38px of space under the rack. -->
{#if marks.length}
  <ul class="marks" style="--mark-ink: {HUD_PALETTE.chip_text}; --mark-lit: {HUD_PALETTE.accent};">
    {#each marks as mark (mark.id)}
      <li class="mark{mark.lit ? ' is-lit' : ''}">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={VENDOR_MARK_PATHS[mark.id]} />
        </svg>
        <span class="mark-label">{mark.label}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .marks {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px 30px;
    margin: 38px 0 0;
    padding: 0;
    list-style: none;
  }

  .mark {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    width: 54px;
  }

  /* `currentColor` on the path is what makes one rule light a mark: the
     drawings are inline for exactly this reason, since an <img> pointing at
     a file in static/ could not be recoloured. */
  .mark svg {
    width: 26px;
    height: 26px;
    display: block;
    color: var(--mark-ink);
  }

  .mark.is-lit svg {
    color: var(--mark-lit);
  }

  .mark-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mark-ink);
    text-align: center;
  }
</style>
