<script lang="ts">
  import type { LandingProject } from "$lib/types.js";

  import { ELEVATION, HUD_PALETTE } from "./palette.js";
  import { project_link } from "./work-format.js";

  let { projects }: { projects: LandingProject[] } = $props();
</script>

<section
  id="work"
  class="work"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-panel: {HUD_PALETTE.panel}; --hud-panel-alt: {HUD_PALETTE.panel_alt}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-chip-bg: {HUD_PALETTE.chip_bg}; --hud-chip-text: {HUD_PALETTE.chip_text}; --hud-void: {ELEVATION.void}; --hud-hair: {ELEVATION.hair}; --hud-hair-bright: {ELEVATION.hair_bright};"
>
  <h2 class="work-heading">Work</h2>

  <div class="work-grid">
    {#each projects as project, index (project.id)}
      <!-- The featured (first) project carries the page's amber accent
           (rail + status colour); every other status reads in `secondary` -
           the accent stays meaningful by marking only the one thing being
           pointed at, rather than decorating every status equally. -->
      {@const status_color = index === 0 ? HUD_PALETTE.accent : HUD_PALETTE.secondary}
      {@const link = project_link(project)}
      <!-- Elevation ladder (#197): the featured card is raised (diagonal
           surface gradient, inset highlight, drop shadow, amber rail); every
           other card is recessed into ELEVATION.void and rises to the same
           raised treatment on hover/focus, via the work-card-secondary
           modifier below - not a second, independent look. -->
      <article
        class="work-card"
        class:work-card-featured={index === 0}
        class:work-card-secondary={index !== 0}
        style={index === 0 ? `border-left-color: ${HUD_PALETTE.accent};` : undefined}
      >
        <div class="work-card-header">
          <h3 class="work-name">
            {#if link}
              <a href={link} target="_blank" rel="noopener noreferrer">{project.name}</a>
            {:else}
              {project.name}
            {/if}
          </h3>
          <span class="work-status" style="color: {status_color};">{project.status}</span>
        </div>

        <p class="work-blurb">{project.blurb}</p>

        {#if project.stack?.length}
          <ul class="work-stack">
            {#each project.stack as tag}
              <li>{tag}</li>
            {/each}
          </ul>
        {/if}
      </article>
    {/each}
  </div>
</section>

<style>
  .work {
    padding: 5rem 2.5rem 0;
    background: var(--hud-bg);
  }

  .work-heading {
    margin: 0 0 2.5rem;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    /* Scales like .commits-heading and .contact-heading, its neighbouring
       display headings, keeping 4rem (the old fixed size) as the ceiling. */
    font-size: clamp(2.5rem, 8vw, 4rem);
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    color: var(--hud-text);
  }

  .work-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
    padding-bottom: 4.5rem;
  }

  .work-card {
    min-width: 0;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    transition:
      transform 0.25s ease,
      background 0.25s ease,
      box-shadow 0.25s ease,
      border-color 0.25s ease;
  }

  .work-card-featured {
    grid-column: 1 / -1;
    /* Subtle diagonal surface gradient built from the existing grey rungs
       (panel_alt through to bg), not a new colour - the featured card reads
       as a lit surface rather than the flat panel_alt fill every card used
       before this pass. */
    background: linear-gradient(135deg, var(--hud-panel-alt), var(--hud-panel) 55%, var(--hud-bg));
    /* Colour set inline per-article (see the accent status colour above,
       and the pre-#197 pattern this keeps), not here - only the featured
       card gets a rail at all, so there is nothing for a shared
       --hud-accent section token to add. */
    border-left: 3px solid;
    /* Genuinely raised: an inset top highlight (the elevation ladder's
       brighter hairline) plus a real drop shadow throws the card up off the
       page. The shadow colour is black at low alpha - a physical shadow,
       not a palette accent, same convention as Hero.svelte's text-shadow -
       so ELEVATION/HUD_PALETTE stay the only colour tokens in this file. */
    box-shadow:
      inset 0 1px 0 var(--hud-hair-bright),
      0 24px 48px -28px rgba(0, 0, 0, 0.85),
      0 6px 16px -8px rgba(0, 0, 0, 0.7);
  }

  .work-card-secondary {
    /* Recessed: sits a rung below the page ground (ELEVATION.void) with an
       inset shadow reading as a sunken surface, lit only by a faint
       hairline top edge - the opposite of the featured card's raised
       gradient. */
    background: var(--hud-void);
    border-top: 1px solid var(--hud-hair);
    box-shadow: inset 0 14px 28px -22px rgba(0, 0, 0, 0.9);
  }

  .work-card-secondary:hover,
  .work-card-secondary:focus-within {
    /* Rises to the featured card's raised recipe (bright inset highlight +
       real drop shadow) without borrowing its amber rail or gradient - the
       amber accent stays budgeted to the one featured card (#197). Applies
       on :focus-within (not :focus) so tabbing to the project link inside
       the card lifts it too, not only a pointer hover. */
    transform: translateY(-3px);
    background: var(--hud-panel);
    border-top-color: var(--hud-hair-bright);
    box-shadow:
      inset 0 1px 0 var(--hud-hair-bright),
      0 20px 40px -24px rgba(0, 0, 0, 0.85),
      0 5px 14px -8px rgba(0, 0, 0, 0.7);
  }

  .work-card-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .work-name {
    margin: 0;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: 1.875rem;
    line-height: 1;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--hud-text);
  }

  .work-name a {
    /* No underline on landing-page links (owner request, post-#187) - this
       was the underline's own hover state (swapping its colour), so it goes
       too rather than being left dead. */
    color: inherit;
    text-decoration: none;
  }

  .work-name a:hover {
    /* Colour-change hover to replace the underline's lost affordance.
       --hud-secondary is already exposed on this section (used by
       .work-blurb) and gave ~7.7:1 against the old flat --hud-panel-alt
       card fill; the elevation pass (#197) only ever puts this text on
       backgrounds at or darker than that (the featured gradient tops out at
       panel_alt, the recessed cards sit on the darker still --hud-void), so
       contrast only improves and the original AA measurement still holds. */
    color: var(--hud-secondary);
  }

  .work-status {
    /* Inherits the body face (IBM Plex Sans) from .landing in +page.svelte
       - mono retired here (#187). Status text is multi-word mixed-case
       phrasing ("Not yet public", "In development"), not a short all-caps
       label, so the 0.12em tracking tuned for mono is dropped rather than
       carried over. */
    font-size: 0.6875rem;
    white-space: nowrap;
  }

  .work-blurb {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--hud-secondary);
    overflow-wrap: break-word;
  }

  .work-stack {
    margin: auto 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .work-stack li {
    /* Inherits the body face (IBM Plex Sans) from .landing in +page.svelte
       - mono retired here (#187). Each tag is a single short word (e.g.
       "TypeScript") rendered as a chip/badge, so the uppercase + tracking
       treatment tuned for the mono face is still a normal, font-agnostic
       badge convention here and stays. */
    font-size: 0.625rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.3125rem 0.5625rem;
    background: var(--hud-chip-bg);
    color: var(--hud-chip-text);
  }

  @media (max-width: 700px) {
    .work {
      padding: 3.5rem 1.25rem 0;
    }

    .work-grid {
      grid-template-columns: 1fr;
      padding-bottom: 3rem;
    }

    .work-card-featured {
      grid-column: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .work-card-secondary {
      transition: none;
    }

    .work-card-secondary:hover,
    .work-card-secondary:focus-within {
      /* The lift is motion (translateY); the background/shadow/border
         swap is a state change, not motion, so it stays instant instead of
         being dropped entirely - same split Commits.svelte uses for its
         own reduced-motion block. */
      transform: none;
    }
  }
</style>
