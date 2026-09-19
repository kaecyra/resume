<script lang="ts">
  import type { LandingAppearance } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let { appearances }: { appearances: LandingAppearance[] } = $props();

  // Tracks which rows are expanded, keyed by appearance id. A record
  // (rather than one shared "open index") lets more than one row be open at
  // once - there is nothing accordion-like being asked for here, just each
  // row independently disclosing its own blurb.
  let expanded_ids: Record<string, boolean> = $state({});

  function toggle(id: string) {
    expanded_ids = { ...expanded_ids, [id]: !expanded_ids[id] };
  }

  function panel_id(id: string): string {
    return `appearances-panel-${id}`;
  }
</script>

<section
  id="appearances"
  class="appearances"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-accent: {HUD_PALETTE.accent};"
>
  <h2 class="appearances-heading">Appearances</h2>

  <ul class="appearances-list">
    {#each appearances as appearance (appearance.id)}
      {@const expanded = Boolean(expanded_ids[appearance.id])}
      <li class="appearances-row" class:appearances-row-open={expanded}>
        <button
          type="button"
          class="appearances-toggle"
          aria-expanded={expanded}
          aria-controls={panel_id(appearance.id)}
          onclick={() => toggle(appearance.id)}
        >
          <span class="appearances-event">{appearance.event}</span>
          <span class="appearances-what">{appearance.what}</span>
          <span class="appearances-date">
            {appearance.date}
            <span class="appearances-chevron" aria-hidden="true"></span>
          </span>
        </button>

        <!-- aria-hidden while collapsed: the grid-template-rows animation
             (below) keeps this in the DOM at all times rather than toggling
             display, so without this a screen reader could still read the
             blurb of a row that looks closed. aria-expanded on the button
             above is the disclosure state; this just keeps what a sighted
             user sees in sync with what gets announced. -->
        <div
          id={panel_id(appearance.id)}
          class="appearances-panel"
          aria-hidden={expanded ? undefined : "true"}
        >
          <div class="appearances-panel-inner">
            <p class="appearances-blurb">{appearance.blurb}</p>
          </div>
        </div>
      </li>
    {/each}
  </ul>
</section>

<style>
  .appearances {
    padding: 5rem 2.5rem;
    background: var(--hud-bg);
  }

  .appearances-heading {
    margin: 0 0 2.5rem;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    /* Demoted below .work-heading (clamp 2.5rem-4rem) and .contact-heading
       (clamp 2rem-3.25rem): Work and Contact are this page's loud beats,
       Appearances sits quiet between them in the loud-quiet-loud rhythm
       (#198), so its heading is a smaller waypoint rather than a third
       equally loud peak. */
    font-size: clamp(1.375rem, 4vw, 1.75rem);
    line-height: 1;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--hud-text);
  }

  .appearances-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .appearances-row {
    position: relative;
    border-top: 1px solid var(--hud-secondary);
  }

  .appearances-row:last-child {
    border-bottom: 1px solid var(--hud-secondary);
  }

  /* The amber rail: a 2px bar pinned to the row's left edge, scaled to
     zero height at rest and unfurled from the top on hover, focus and the
     open state. transform, not width/opacity, so reduced-motion (below)
     can drop the animation and still land on the same on/off result. */
  .appearances-row::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 2px;
    background: var(--hud-accent);
    transform: scaleY(0);
    transform-origin: 50% 0;
    transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
  }

  .appearances-row:hover::before,
  .appearances-row:focus-within::before,
  .appearances-row-open::before {
    transform: scaleY(1);
  }

  .appearances-toggle {
    all: unset;
    box-sizing: border-box;
    display: flex;
    width: 100%;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 1.5rem;
    padding: 1rem 0 1rem 0;
    cursor: pointer;
    /* Rides the rail: the row's content nudges right as the rail unfurls,
       so the two read as one movement rather than a bar appearing beside
       static text. */
    transition: padding-left 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
  }

  .appearances-row:hover .appearances-toggle,
  .appearances-row:focus-within .appearances-toggle,
  .appearances-row-open .appearances-toggle {
    padding-left: 1.125rem;
  }

  .appearances-event {
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    color: var(--hud-text);
    flex: 1 1 12rem;
  }

  .appearances-what {
    /* Inherits the body face (IBM Plex Sans) from .landing in +page.svelte
       - mono retired here (#187). Mixed-case descriptive text ("LiveVision
       talk"), not a short all-caps label, so the 0.08em tracking tuned for
       mono is dropped rather than carried over. */
    font-size: 0.8125rem;
    color: var(--hud-secondary);
    flex: 2 1 16rem;
  }

  .appearances-date {
    /* Same reasoning as .appearances-what above: mixed-case text ("March
       2026"), mono retired (#187), tracking dropped with it. tabular-nums
       keeps the digits on a fixed advance without a second typeface. */
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    color: var(--hud-secondary);
    white-space: nowrap;
    margin-left: auto;
  }

  .appearances-chevron {
    display: inline-block;
    width: 0.5rem;
    height: 0.5rem;
    border-right: 1.5px solid var(--hud-secondary);
    border-bottom: 1.5px solid var(--hud-secondary);
    transform: rotate(45deg);
    transition:
      transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1),
      border-color 0.3s;
  }

  .appearances-row-open .appearances-chevron {
    transform: rotate(-135deg);
    border-color: var(--hud-accent);
  }

  /* The expand: grid-template-rows animates from 0fr to 1fr rather than a
     fixed pixel height, so the panel opens to fit its actual blurb length
     (two blurbs of different lengths in landing.yaml) without measuring
     anything in script. The inner wrapper carries overflow: hidden because
     a 0fr row still has real content height inside it, which would
     otherwise show through before the row has grown. */
  .appearances-panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.35s cubic-bezier(0.2, 0.7, 0.3, 1);
  }

  .appearances-row-open .appearances-panel {
    grid-template-rows: 1fr;
  }

  .appearances-panel-inner {
    overflow: hidden;
  }

  .appearances-blurb {
    margin: 0;
    padding: 0 0 1.5rem 1.125rem;
    max-width: 64ch;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--hud-secondary);
  }

  @media (max-width: 700px) {
    .appearances {
      padding: 3.5rem 1.25rem;
    }

    .appearances-toggle {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    /* The desktop flex-basis values (12rem / 16rem) are widths in a row,
       but once the toggle stacks into a column they become heights, which
       pads each row with hundreds of pixels of empty space. */
    .appearances-event,
    .appearances-what {
      flex: none;
    }

    .appearances-date {
      margin-left: 0;
    }

    .appearances-blurb {
      padding-left: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .appearances-row::before,
    .appearances-toggle,
    .appearances-chevron,
    .appearances-panel {
      transition: none;
    }
  }
</style>
