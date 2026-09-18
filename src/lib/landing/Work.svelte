<script lang="ts">
  import type { LandingProject } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let { projects }: { projects: LandingProject[] } = $props();

  function project_link(project: LandingProject): { label: string; url: string } | null {
    if (project.repo_url) {
      return { label: "Repo", url: project.repo_url };
    }
    if (project.links?.length) {
      return project.links[0];
    }
    return null;
  }
</script>

<div
  id="work"
  class="work"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-panel-alt: {HUD_PALETTE.panel_alt}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-accent: {HUD_PALETTE.accent};"
>
  <h2 class="work-heading">Work</h2>

  <div class="work-grid">
    {#each projects as project, index (project.id)}
      <!-- A grey, non-accent border for every card but the featured (first)
           project keeps the accent colour meaningful (it marks the one
           thing being pointed at) instead of decorating every card equally. -->
      {@const edge = index === 0 ? HUD_PALETTE.accent : HUD_PALETTE.edge}
      {@const link = project_link(project)}
      <article class="work-card" class:work-card-featured={index === 0} style="border-left-color: {edge};">
        <div class="work-card-header">
          <h3 class="work-name">
            {#if link}
              <a href={link.url} target="_blank" rel="noopener noreferrer">{project.name}</a>
            {:else}
              {project.name}
            {/if}
          </h3>
          <span class="work-status" style="color: {edge};">{project.status}</span>
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
</div>

<style>
  .work {
    padding: 5rem 2.5rem 0;
    background: var(--hud-bg);
  }

  .work-heading {
    margin: 0 0 2.5rem;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: 4rem;
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
    color: inherit;
  }

  .work-name a:hover {
    text-decoration: underline;
  }

  .work-status {
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.12em;
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
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.625rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.3125rem 0.5625rem;
    background: #1d1d21;
    color: #8a8a92;
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
