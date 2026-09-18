<script lang="ts">
  import type { LandingGithub } from "$lib/types.js";

  import type { ContributionsGrid } from "./contributions.js";
  import { HUD_PALETTE } from "./palette.js";

  let {
    github,
    contributions_grid,
  }: { github: LandingGithub; contributions_grid: ContributionsGrid | null } = $props();
</script>

<div
  id="commits"
  class="commits"
  style="--hud-panel: {HUD_PALETTE.panel}; --hud-text: {HUD_PALETTE.text}; --hud-meta: {HUD_PALETTE.meta};"
>
  <div class="commits-head">
    <h2 class="commits-heading">Commits</h2>
    <span class="commits-meta">@{github.user}, last 12 months</span>
  </div>

  {#if contributions_grid}
    <div class="commits-grid-scroll">
      <div class="commits-grid">
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
</div>

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
    font-size: 2.75rem;
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    color: var(--hud-text);
  }

  .commits-meta {
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.14em;
    color: var(--hud-meta);
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
    color: var(--hud-meta);
  }

  @media (max-width: 480px) {
    .commits {
      padding: 2rem 1.25rem 2.75rem;
    }
  }
</style>
