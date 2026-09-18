<script lang="ts">
  import type { LandingProject } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";
  import { project_link } from "./work-format.js";

  let { projects }: { projects: LandingProject[] } = $props();
</script>

<section
  id="work"
  class="work"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-panel-alt: {HUD_PALETTE.panel_alt}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-chip-bg: {HUD_PALETTE.chip_bg}; --hud-chip-text: {HUD_PALETTE.chip_text};"
>
  <h2 class="work-heading">Work</h2>

  <div class="work-grid">
    {#each projects as project, index (project.id)}
      <!-- A grey, non-accent border for every card but the featured (first)
           project keeps the accent colour meaningful (it marks the one
           thing being pointed at) instead of decorating every card equally. -->
      {@const edge = index === 0 ? HUD_PALETTE.accent : HUD_PALETTE.edge}
      <!-- `edge` is a border/divider colour (see palette.ts), not text - on
           the #151517 card background it fails contrast for every
           non-featured card. The status text uses `edge` on the featured
           card (where edge is accent, matching the border) and `secondary`
           everywhere else, so the accent stays meaningful while every
           status stays readable. -->
      {@const status_color = index === 0 ? edge : HUD_PALETTE.secondary}
      {@const link = project_link(project)}
      <article class="work-card" class:work-card-featured={index === 0} style="border-left-color: {edge};">
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

  .work-card-featured {
    grid-column: 1 / -1;
  }

  .work-card {
    min-width: 0;
    background: var(--hud-panel-alt);
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    border-left: 3px solid;
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
       too rather than being left dead. Nothing replaces it: this link had
       no other hover treatment, so it now has none - see LandingSections
       test file / task report for the full inventory. */
    color: inherit;
    text-decoration: none;
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
</style>
