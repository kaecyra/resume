<script lang="ts">
  import type { LandingLink } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let { contact }: { contact: LandingLink[] } = $props();
</script>

<div id="contact" class="contact" style="--hud-bg: {HUD_PALETTE.background}; --hud-accent: {HUD_PALETTE.accent};">
  <h2 class="contact-heading">Let's talk</h2>
  <div class="contact-links">
    {#each contact as item (item.url)}
      <a href={item.url} target="_blank" rel="noopener noreferrer" class="contact-link">{item.label}</a>
    {/each}
  </div>
</div>

<style>
  .contact {
    margin-top: 4.5rem;
    padding: 3.5rem 2.5rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem 2.5rem;
    background: var(--hud-accent);
    color: var(--hud-bg);
  }

  .contact-heading {
    margin: 0;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: clamp(2rem, 6vw, 3.25rem);
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    color: inherit;
  }

  .contact-links {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    text-align: right;
  }

  .contact-link {
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.9375rem;
    letter-spacing: 0.06em;
    color: inherit;
    word-break: break-word;
  }

  @media (max-width: 480px) {
    .contact {
      padding: 3rem 1.25rem;
    }

    .contact-links {
      align-items: flex-start;
      text-align: left;
    }
  }
</style>
