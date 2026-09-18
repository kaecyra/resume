<script lang="ts">
  import type { LandingAppearance } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let { appearances }: { appearances: LandingAppearance[] } = $props();
</script>

<section
  id="appearances"
  class="appearances"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary};"
>
  <h2 class="appearances-heading">Appearances</h2>

  <ul class="appearances-list">
    {#each appearances as appearance (appearance.id)}
      <li class="appearances-row">
        <span class="appearances-event">{appearance.event}</span>
        <span class="appearances-what">{appearance.what}</span>
        <span class="appearances-date">{appearance.date}</span>
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
    /* Same scale as .work-heading, its neighbouring display heading. */
    font-size: clamp(2.5rem, 8vw, 4rem);
    line-height: 0.9;
    letter-spacing: -0.03em;
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
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 1.5rem;
    padding: 1rem 0;
    border-top: 1px solid var(--hud-secondary);
  }

  .appearances-row:last-child {
    border-bottom: 1px solid var(--hud-secondary);
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
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.8125rem;
    letter-spacing: 0.08em;
    color: var(--hud-secondary);
    flex: 2 1 16rem;
  }

  .appearances-date {
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.8125rem;
    letter-spacing: 0.08em;
    color: var(--hud-secondary);
    white-space: nowrap;
    margin-left: auto;
  }

  @media (max-width: 700px) {
    .appearances {
      padding: 3.5rem 1.25rem;
    }

    .appearances-row {
      flex-direction: column;
      gap: 0.25rem;
      align-items: flex-start;
    }

    .appearances-date {
      margin-left: 0;
    }
  }
</style>
