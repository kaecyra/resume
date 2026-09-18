<script lang="ts">
  import type { LandingHero, LandingLink } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let { hero, contact }: { hero: LandingHero; contact: LandingLink[] } = $props();

  // The divider band is a location + social-links strip, not the full
  // contact list the Contact section renders (which also includes email).
  // Filtering out mailto: links here, rather than adding a second data
  // field, keeps `contact` the single source of truth for every link.
  const social_links = $derived(contact.filter((item) => !item.url.startsWith("mailto:")));

  // The icon is derived from the URL, not the label - same reasoning as
  // filtering social_links above: `contact` stays the single source of
  // truth, with no extra "which icon" field to keep in sync by hand. Email
  // has no icon (mailto: never reaches this list). Returns null rather than
  // a fallback icon so an unrecognised provider degrades to text-only,
  // matching the {#if icon} guard below.
  function contact_icon(url: string): string | null {
    if (url.includes("github.com")) return "/landing/github-mark.svg";
    if (url.includes("linkedin.com")) return "/landing/linkedin-mark.svg";
    return null;
  }
</script>

<!-- Deliberately a `div`, not a `section`: Divider has no heading of its own
     to give a landmark an accessible name (the alternative, a hand-written
     aria-label, would just restate "location and social links" without
     giving a screen-reader user anything to jump to that the surrounding
     Hero/Commits landmarks don't already cover), and it is a pure
     navigation band rather than a region of page content, so it is
     intentionally left out of the landmark structure fixed for
     Contact/Commits/Work. -->
<div
  id="divider"
  class="divider"
  style="--hud-text: {HUD_PALETTE.text}; --hud-bg: {HUD_PALETTE.background};"
>
  <span class="divider-location">{hero.location}</span>
  <div class="divider-links">
    {#each social_links as item (item.url)}
      {@const icon = contact_icon(item.url)}
      <a href={item.url} target="_blank" rel="noopener noreferrer" class="divider-link">
        {#if icon}
          <img src={icon} alt="" aria-hidden="true" width="14" height="14" class="divider-link-icon" />
        {/if}
        {item.label}
      </a>
    {/each}
  </div>
</div>

<style>
  .divider {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem 2rem;
    padding: 0.875rem 2.5rem;
    /* Inverted band: this is the only place in the redesign where the
       palette's text token is used as a background and its background
       token as the foreground colour. That's deliberate, not a mix-up. */
    background: var(--hud-text);
    color: var(--hud-bg);
  }

  .divider-location {
    /* Inherits the body face (IBM Plex Sans) from .landing in
       +page.svelte - the mono face is retired here (#187), but this is
       still a short all-caps label, so the uppercase/tracking treatment
       tuned for it reads fine on a proportional face too and stays. */
    font-size: 0.8125rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .divider-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.75rem;
  }

  .divider-link {
    /* Inherits the body face (IBM Plex Sans) from .landing in
       +page.svelte. Unlike .divider-location above, this now renders a
       literal handle/label (#187: "@kaecyra", "guntertim") - text-transform:
       uppercase would visibly shout it in caps, which is wrong once the
       casing is meaningful, and the wide tracking that made sense for
       all-caps mono legibility just looks loose on mixed-case text, so both
       are dropped rather than carried over. */
    /* No underline on landing-page links (owner request). An anchor with no
       text-decoration declaration underlines by default, so this needs an
       explicit `none` even though nothing here ever set `underline`. No
       hover rule existed before this either, so this link still has no
       hover response - the border-bottom above is its only affordance,
       resting or hover. */
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    font-size: 0.8125rem;
    color: var(--hud-bg);
    text-decoration: none;
    /* Translucent derivation of --hud-bg, not a fresh literal - color-mix
       keeps it tied to the token instead of drifting if the token changes. */
    border-bottom: 1px solid color-mix(in srgb, var(--hud-bg) 28%, transparent);
    padding-bottom: 2px;
  }

  .divider-link-icon {
    display: block;
    flex: none;
  }

  @media (max-width: 480px) {
    .divider {
      padding: 0.875rem 1.25rem;
    }
  }
</style>
