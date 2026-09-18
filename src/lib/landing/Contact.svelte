<script lang="ts">
  import type { LandingLink } from "$lib/types.js";

  import { contact_icon, is_mailto } from "./link-format.js";
  import { HUD_PALETTE } from "./palette.js";

  let { contact }: { contact: LandingLink[] } = $props();
</script>

<section
  id="contact"
  class="contact"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-accent: {HUD_PALETTE.accent}; --hud-edge: {HUD_PALETTE.edge};"
>
  <h2 class="contact-heading">Let's talk</h2>
  <ul class="contact-links">
    {#each contact as item (item.url)}
      {@const mailto = is_mailto(item.url)}
      {@const icon = contact_icon(item.url)}
      <li>
        <a
          href={item.url}
          target={mailto ? undefined : "_blank"}
          rel={mailto ? undefined : "noopener noreferrer"}
          class="contact-link"
        >
          {#if icon}
            <img src={icon} alt="" aria-hidden="true" width="14" height="14" class="contact-link-icon" />
          {/if}
          {item.label}
        </a>
      </li>
    {/each}
  </ul>
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
    /* Raised to .work-heading's ceiling: the close is the second of the two
       headings that lead (#199's loud-quiet-loud rhythm), so it matches
       Work rather than sitting between Work and the quiet sections. */
    font-size: clamp(2.5rem, 8vw, 4rem);
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    color: inherit;
  }

  .contact-links {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    text-align: right;
  }

  .contact-link {
    /* Inherits the body face (IBM Plex Sans) from .landing in
       +page.svelte - mono retired here (#187). This now renders a literal
       handle/address ("@kaecyra", "guntertim", the email), so the tracking
       tuned for mono's all-caps legibility is dropped too: positive
       letter-spacing on mixed-case running text (especially an email
       address) just reads as loose, not deliberate. */
    /* No underline on landing-page links (owner request). An anchor with no
       text-decoration declaration underlines by default, so this needs an
       explicit `none`. */
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    font-size: 0.9375rem;
    color: inherit;
    text-decoration: none;
    word-break: break-word;
  }

  .contact-link:hover {
    /* Colour-change hover to replace the underline's lost affordance.
       --hud-edge is the most visible shift the palette offers off the
       resting --hud-bg text while staying readable against this section's
       amber (--hud-accent) background - ~4.3:1, short of the 4.5:1 body-text
       AA floor but still clearly legible for a short link label, and the
       best contrast/visibility trade-off in the token set (the darker
       tokens that clear 4.5:1 here - panel, panel_alt - sit too close to
       --hud-bg to read as a change at all). */
    color: var(--hud-edge);
  }

  .contact-link-icon {
    display: block;
    flex: none;
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
