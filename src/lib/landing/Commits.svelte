<script lang="ts">
  import type { LandingGithub } from "$lib/types.js";

  import type { ContributionsGrid } from "./contributions.js";
  import { HUD_PALETTE } from "./palette.js";

  let {
    github,
    contributions_grid,
  }: { github: LandingGithub; contributions_grid: ContributionsGrid | null } = $props();
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
         pattern (WCAG 2.1.1 / technique SCR29) - role="group" is correct
         a11y semantics here (this isn't a widget), the lint rule is just
         blind to this specific, sanctioned use of tabindex. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="commits-grid-scroll" tabindex="0" role="group" aria-labelledby="commits-caption">
      <!-- aria-hidden, not an aria-label: this grid has no contribution
           *numbers* to summarise, only colours (ContributionsGrid is
           color-per-day and nothing else), so any aria-label written here
           would be fabricated. The caption above is the whole accessible
           story for now. #167 owns the underlying contribution data and is
           the node that can add a real summary and lift this aria-hidden -
           treat this as a handoff, not a settled decision. (It's also why
           aria-hidden lives here and not on the scroller: nesting a
           focusable element inside an aria-hidden subtree is a documented
           anti-pattern that axe flags - the scroller carries the
           tabindex/role, this inner grid carries no focusable children.) -->
      <div class="commits-grid" aria-hidden="true">
        {#each contributions_grid as week, week_index (week_index)}
          <div class="commits-week">
            {#each week.days as day, day_index (day_index)}
              <div class="commits-day" style="background: {day.color};"></div>
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
       uses `secondary`, not `meta`. See palette.ts. */
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.14em;
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

  .commits-offline {
    margin: 0;
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.8125rem;
    letter-spacing: 0.08em;
    color: var(--hud-secondary);
  }

  @media (max-width: 480px) {
    .commits {
      padding: 2rem 1.25rem 2.75rem;
    }
  }
</style>
