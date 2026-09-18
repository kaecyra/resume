<script lang="ts">
  import { onMount } from "svelte";

  import { browser } from "$app/environment";
  import type { ContributionCell, ContributionGridModel } from "$lib/github.js";
  import type { LandingGithub } from "$lib/types.js";

  import { derive_month_labels, format_day_summary, format_resting_summary } from "./contributions.js";
  import { CONTRIBUTION_RAMP, HUD_PALETTE } from "./palette.js";

  let {
    github,
    contributions_grid,
  }: { github: LandingGithub; contributions_grid: ContributionGridModel | null } = $props();

  // `ContributionGridModel` (src/lib/github.ts) carries each real day's
  // ramp bucket as `level: number` (0-4), not a colour - the ramp's own
  // maths (which quartile a count falls into) lives there, out of this
  // component. This is the one place that turns a level into a colour, so
  // there is exactly one ramp definition to keep in sync with the green
  // `CONTRIBUTION_RAMP` tokens (palette.ts). Index 0 is a day with zero
  // contributions (still a real day - rendered, just at the empty end of
  // the ramp); indices 1-4 step up to the calendar's own max (see
  // bucket_level in github.ts for why the top bucket is relative to the
  // calendar's max, not an absolute count).
  const LEVEL_COLORS = [
    CONTRIBUTION_RAMP.level_0,
    CONTRIBUTION_RAMP.level_1,
    CONTRIBUTION_RAMP.level_2,
    CONTRIBUTION_RAMP.level_3,
    CONTRIBUTION_RAMP.level_4,
  ];

  const week_count = $derived(contributions_grid?.weeks.length ?? 0);
  const month_labels = $derived(contributions_grid ? derive_month_labels(contributions_grid.weeks) : []);

  // Drives the info rail below the grid. `null` is the resting state (see
  // the rail's own render below for why that shows the total rather than
  // being empty) - set from a real day's mouseenter/focus, cleared on
  // mouseleave/blur, so hover and focus behave identically (#192 requires
  // both, not a mouse-only affordance).
  let active_cell: ContributionCell | null = $state(null);

  const rail_text = $derived(
    active_cell ? format_day_summary(active_cell) : format_resting_summary(contributions_grid?.total_count ?? 0),
  );

  function activate(cell: ContributionCell) {
    active_cell = cell;
  }

  function deactivate() {
    active_cell = null;
  }

  // Whether the scroller still needs to announce itself as a scrollable
  // region. Starts `true` - the safe, conservative default for SSR and for
  // any visitor without JS, where there is no way to measure real layout -
  // and onMount narrows it to the actual overflow once the grid has a real
  // box to measure. #192 made the grid fluid (see `.commits-grid`'s
  // `minmax(6px, 1fr)` columns below): most viewports never overflow at
  // all now, so most visitors lose the tabindex/role/aria-labelledby entirely
  // once JS runs, and only a narrow viewport - where 6px columns still don't
  // fit - keeps them.
  let scroller_overflowing = $state(true);
  let scroll_el: HTMLDivElement | undefined = $state();

  onMount(() => {
    if (!browser || !scroll_el) {
      return;
    }

    function measure() {
      if (!scroll_el) {
        return;
      }
      scroller_overflowing = scroll_el.scrollWidth > scroll_el.clientWidth;
    }

    measure();
    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  });
</script>

<section
  id="commits"
  class="commits"
  style="--hud-panel: {HUD_PALETTE.panel}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --commits-glow: {CONTRIBUTION_RAMP.level_4};"
>
  <div class="commits-head">
    <h2 class="commits-heading">Commits</h2>
    <span id="commits-caption" class="commits-meta">@{github.user}, last 12 months</span>
  </div>

  {#if contributions_grid}
    <!-- overflow-x: auto below makes this a scrollable region only once the
         grid's fluid columns (see .commits-grid) hit their 6px floor and
         genuinely don't fit; without something focusable inside it at that
         point, a keyboard-only user couldn't reach or pan it (WCAG 2.1.1).
         tabindex/role/aria-labelledby are conditional on scroller_overflowing
         (set above) precisely so this region stops announcing itself as
         scrollable once it no longer is (#192) - naming this group from the
         caption above (rather than writing a second, separate label) keeps
         there being exactly one accessible description of what this is.
         svelte-ignore below: svelte's a11y_no_noninteractive_tabindex rule
         has no exception for the "make a scrollable region reachable"
         pattern (WCAG 2.1.1 / technique SCR29); role="group" is correct
         a11y semantics here (this isn't a widget) and the lint rule
         doesn't recognize this pattern. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="commits-grid-scroll"
      bind:this={scroll_el}
      tabindex={scroller_overflowing ? 0 : undefined}
      role={scroller_overflowing ? "group" : undefined}
      aria-labelledby={scroller_overflowing ? "commits-caption" : undefined}
    >
      <div class="commits-months" style="--week-count: {week_count};">
        {#each month_labels as month (month.week_index)}
          <span class="commits-month" style="grid-column: {month.week_index + 1};">{month.label}</span>
        {/each}
      </div>

      <!-- No aria-hidden here (unlike the pre-#192 grid): every real day is
           now a focusable button with its own aria-label carrying that
           day's count and date, so the grid is no longer a decorative echo
           of the caption above - it's the accessible source of per-day
           detail. Hiding a subtree that contains focusable descendants is
           a documented anti-pattern (axe: aria-hidden-focus) as well as
           being wrong here now that there's real distinct information
           inside it. Padding slots (see the `else` branch below) are the
           only children still marked aria-hidden - they aren't days. -->
      <div class="commits-grid" style="--week-count: {week_count};">
        {#each contributions_grid.weeks as week, week_index (week_index)}
          <div class="commits-week">
            {#each week as cell, day_index (day_index)}
              {#if cell}
                <button
                  type="button"
                  class="commits-day"
                  style="background: {LEVEL_COLORS[cell.level]};"
                  aria-label={format_day_summary(cell)}
                  onmouseenter={() => activate(cell)}
                  onmouseleave={deactivate}
                  onfocus={() => activate(cell)}
                  onblur={deactivate}
                ></button>
              {:else}
                <!-- A null slot pads the first/last week when the calendar
                     doesn't start on a Sunday or end on a Saturday (see
                     build_contribution_grid in github.ts) - it holds the
                     column's width without drawing a day that doesn't
                     exist, so it's aria-hidden rather than a button. -->
                <div class="commits-day commits-day-pad" aria-hidden="true"></div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <!-- No aria-live here: every button above already carries its own
         aria-label with the same wording, read the moment a screen-reader
         user focuses it - an aria-live region on top would announce that
         same sentence a second time. This paragraph is the sighted/visual
         half of the same information (and the resting default for a mouse
         user who hasn't touched a day yet), not a second accessible
         channel. Always rendered (never conditionally shown) with a
         reserved min-height in the stylesheet below, so switching between
         the resting total and a day's figures changes text only - no
         layout shift (#192). -->
    <p class="commits-rail">{rail_text}</p>
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
    /* This caption names the account and period, so it's content someone
       needs to read, not a decorative tag - it uses `secondary`, not
       `meta`. See palette.ts.
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

  .commits-months {
    display: grid;
    /* Same column template as .commits-grid below, so a label at
       grid-column N lines up with week N's cells - a shared --week-count
       and identical minmax/gap values are what keep the two grids in
       lockstep, not a shared DOM parent. */
    grid-template-columns: repeat(var(--week-count), minmax(6px, 1fr));
    gap: 3px;
    margin-bottom: 0.35rem;
  }

  .commits-month {
    font-size: 0.6875rem;
    line-height: 1;
    color: var(--hud-secondary);
    /* Short as these labels are ("Sep", "Oct"), a 6px-floor column is still
       narrower than the text - nowrap lets a label spill rightward across
       the following empty columns rather than wrap or clip, same as
       GitHub's own month row. */
    white-space: nowrap;
  }

  .commits-grid {
    display: grid;
    /* Fluid, not fit-content: each week gets an equal fraction of the
       section's full width (#192's "full width" requirement), with a 6px
       floor so a day never shrinks past legible. Below that floor the grid
       overflows its .commits-grid-scroll ancestor and that ancestor's own
       overflow-x: auto (below) takes over - the same condition
       scroller_overflowing (above) measures to decide whether to keep
       announcing the region as scrollable. */
    grid-template-columns: repeat(var(--week-count), minmax(6px, 1fr));
    gap: 3px;
  }

  .commits-week {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .commits-day {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    border: none;
    padding: 0;
    border-radius: 2px;
    cursor: pointer;
  }

  .commits-day:hover,
  .commits-day:focus-visible {
    /* Glow, not just a colour swap: an outer ring in --commits-glow (the
       ramp's own brightest step, set from CONTRIBUTION_RAMP.level_4 on the
       section above - never a literal hex here, palette.ts stays the one
       place colour is defined) plus a soft blur reads as "lit up" against
       the near-black panel behind it, at any ramp level including 0. */
    outline: none;
    box-shadow:
      0 0 0 1px var(--commits-glow),
      0 0 6px 1px var(--commits-glow);
  }

  .commits-day-pad {
    visibility: hidden;
  }

  .commits-rail {
    margin: 0.85rem 0 0;
    /* Two lines' worth of height, reserved unconditionally: the longest
       realistic sentence ("365 commits on 31 December 2026") still fits on
       one line at most viewport widths, but a narrow phone can wrap it -
       reserving for two lines up front means that wrap never changes the
       rail's height, so swapping between the resting total and a day's
       figures never shifts anything below it (#192). */
    min-height: calc(1.4em * 2);
    line-height: 1.4;
    font-size: 0.8125rem;
    color: var(--hud-secondary);
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
