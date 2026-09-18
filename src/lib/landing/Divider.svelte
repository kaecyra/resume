<script lang="ts">
  import type { LandingHero, LandingLink } from "$lib/types.js";

  import { contact_icon, is_mailto } from "./link-format.js";
  import { HUD_PALETTE } from "./palette.js";

  let { hero, contact }: { hero: LandingHero; contact: LandingLink[] } = $props();

  // The divider band is a location + social-links strip, not the full
  // contact list the Contact section renders (which also includes email).
  // Filtering out mailto: links here, rather than adding a second data
  // field, keeps `contact` the single source of truth for every link.
  const social_links = $derived(contact.filter((item) => !is_mailto(item.url)));
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
  style="--hud-text: {HUD_PALETTE.text}; --hud-bg: {HUD_PALETTE.background}; --hud-edge: {HUD_PALETTE.edge};"
>
  <span class="divider-location">{hero.location}</span>
  <ul class="divider-links">
    {#each social_links as item (item.url)}
      {@const icon = contact_icon(item.url)}
      <li>
        <a href={item.url} target="_blank" rel="noopener noreferrer" class="divider-link">
          {#if icon}
            <img src={icon} alt="" aria-hidden="true" width="14" height="14" class="divider-link-icon" />
          {/if}
          {item.label}
        </a>
      </li>
    {/each}
  </ul>
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
    margin: 0;
    padding: 0;
    list-style: none;
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
       explicit `none`. The border-bottom this rule used to carry was a line
       drawn under the link text - visually an underline by another name, so
       it's gone too, not just the text-decoration property; the padding
       that existed only to clear that border went with it. Hover recovers
       the lost affordance as a colour change instead: --hud-edge on the
       light divider band (background #ededec) is ~10.7:1 against it, a
       clearly visible, comfortably legible shift off --hud-bg. */
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    font-size: 0.8125rem;
    color: var(--hud-bg);
    text-decoration: none;
  }

  .divider-link:hover {
    color: var(--hud-edge);
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
