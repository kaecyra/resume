<script lang="ts">
  import type { LandingLink } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let { contact }: { contact: LandingLink[] } = $props();
</script>

<section id="contact" class="contact" style="--hud-bg: {HUD_PALETTE.background}; --hud-accent: {HUD_PALETTE.accent};">
  <h2 class="contact-heading">Let's talk</h2>
  <div class="contact-links">
    {#each contact as item (item.url)}
      <!-- Same mailto: check Divider.svelte uses - target="_blank" on a
           mailto: link opens a blank tab in some browsers before handing
           off to the mail client. -->
      {@const is_mailto = item.url.startsWith("mailto:")}
      <a
        href={item.url}
        target={is_mailto ? undefined : "_blank"}
        rel={is_mailto ? undefined : "noopener noreferrer"}
        class="contact-link">{item.label}</a
      >
    {/each}
  </div>
</section>

<style>
  .contact {
    /* No outer margin here - every other landing section (Hero, Divider,
       Commits, Work) already owns its own bottom padding, so the gap above
       Contact comes from whichever section precedes it in landing.sections
       instead of assuming Contact always follows Work. */
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
