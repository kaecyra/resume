<script lang="ts">
  import type { ContributionGridModel } from "$lib/github.js";
  import type { LandingGithub } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let {
    github,
    contributions_grid,
  }: { github: LandingGithub; contributions_grid: ContributionGridModel | null } = $props();

  // `ContributionGridModel` (src/lib/github.ts) carries each real day's
  // ramp bucket as `level: number` (0-4), not a colour - the ramp's own
  // maths (which quartile a count falls into) lives there, out of this
  // component. This is the one place that turns a level into a colour, so
  // there is exactly one ramp definition to keep in sync with the "Signal"
  // amber accent. Index 0 is a day with zero contributions (still a real
  // day - rendered, just at the empty end of the ramp); indices 1-4 step
  // `accent` up through increasing opacity to full strength at the
  // calendar's own max (see bucket_level in github.ts for why the top
  // bucket is relative to the calendar's max, not an absolute count).
  const LEVEL_COLORS = [
    HUD_PALETTE.edge,
    `${HUD_PALETTE.accent}40`,
    `${HUD_PALETTE.accent}80`,
    `${HUD_PALETTE.accent}bf`,
    HUD_PALETTE.accent,
  ];
</script>

<section
  id="commits"
  class="commits"
  style="--hud-panel: {HUD_PALETTE.panel}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary};"
>
  <div class="commits-head">
    <h2 class="commits-heading">Commits</h2>
    <span id="commits-caption" class="commits-meta">@{github.user}, last 12 months</span>
  </div>

  {#if contributions_grid}
    <!-- overflow-x: auto below makes this a scrollable region; without
         something focusable inside it, a keyboard-only user can't reach or
         pan it (WCAG 2.1.1). tabindex/role/aria-labelledby go here, on the
         scroller, not on the grid - see the grid's own comment for why the
         grid itself carries aria-hidden instead. Naming this group from the
         caption above (rather than writing a second, separate label) keeps
         there being exactly one accessible description of what this is.
         svelte-ignore below: svelte's a11y_no_noninteractive_tabindex rule
         has no exception for the "make a scrollable region reachable"
         pattern (WCAG 2.1.1 / technique SCR29); role="group" is correct
         a11y semantics here (this isn't a widget) and the lint rule
         doesn't recognize this pattern. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="commits-grid-scroll" tabindex="0" role="group" aria-labelledby="commits-caption">
      <!-- aria-hidden, not an aria-label: a per-day summary here would just
           restate the calendar visually ("mostly empty, a cluster in
           October"), which isn't information distinct from the grid itself,
           and a single aggregate number is already the caption above's job
           if it ever gets one. The caption is the whole accessible story for
           this grid. (It's also why aria-hidden lives here and not on the
           scroller: nesting a focusable element inside an aria-hidden
           subtree is a documented anti-pattern that axe flags - the
           scroller carries the tabindex/role, this inner grid carries no
           focusable children.) -->
      <div class="commits-grid" aria-hidden="true">
        {#each contributions_grid.weeks as week, week_index (week_index)}
          <div class="commits-week">
            {#each week as cell, day_index (day_index)}
              {#if cell}
                <div class="commits-day" style="background: {LEVEL_COLORS[cell.level]};"></div>
              {:else}
                <!-- A null slot pads the first/last week when the calendar
                     doesn't start on a Sunday or end on a Saturday (see
                     build_contribution_grid in github.ts) - it holds the
                     column's width without drawing a day that doesn't exist. -->
                <div class="commits-day commits-day-pad"></div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="commits-offline">Commit history is offline for this build.</p>
  {/if}
</section>

<style>
  .commits {
    padding: 2.5rem 2.5rem 3.5rem;
    background: var(--hud-panel);
  }

  .commits-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.5rem 1.5rem;
    margin-bottom: 1.25rem;
  }

  .commits-heading {
    margin: 0;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: clamp(1.75rem, 8vw, 2.75rem);
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    color: var(--hud-text);
  }

  .commits-meta {
    /* This caption is the grid's sole label (which account, what period),
       so it's content someone needs to read, not a decorative tag - it
       uses `secondary`, not `meta`. See palette.ts.
       Inherits the body face (IBM Plex Sans) from .landing in +page.svelte
       - mono retired here (#187). Renders mixed-case running text
       ("@kaecyra, last 12 months"), so the 0.14em tracking tuned for
       all-caps mono legibility is dropped rather than carried over. */
    font-size: 0.75rem;
    color: var(--hud-secondary);
  }

  .commits-grid-scroll {
    max-width: 100%;
    overflow-x: auto;
  }

  .commits-grid {
    display: flex;
    gap: 3px;
    width: fit-content;
  }

  .commits-week {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .commits-day {
    width: 14px;
    height: 14px;
  }

  .commits-day-pad {
    visibility: hidden;
  }

  .commits-offline {
    /* Inherits the body face (IBM Plex Sans) from .landing in +page.svelte
       - mono retired here (#187). This is a full sentence, not a label, so
       the 0.08em tracking tuned for mono is dropped: positive
       letter-spacing on running prose reads as loose rather than
       deliberate, and gets worse the longer the line. */
    margin: 0;
    font-size: 0.8125rem;
    color: var(--hud-secondary);
  }

  @media (max-width: 480px) {
    .commits {
      padding: 2rem 1.25rem 2.75rem;
    }
  }
</style>
