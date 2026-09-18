<script lang="ts">
  import type { LandingProject } from "$lib/types.js";

  import HudFrame from "./HudFrame.svelte";

  let { projects }: { projects: LandingProject[] } = $props();
</script>

<HudFrame label="Projects" id="projects">
  <div class="hud-project-grid">
    {#each projects as project (project.id)}
      <article class="hud-project-card">
        <div class="hud-project-card-header">
          <h2 class="hud-project-name">{project.name}</h2>
          <span class="hud-project-status">{project.status}</span>
        </div>

        <p class="hud-project-blurb">{project.blurb}</p>

        {#if project.stack?.length}
          <ul class="hud-project-stack">
            {#each project.stack as tag}
              <li>{tag}</li>
            {/each}
          </ul>
        {/if}

        {#if project.repo_url || (project.links?.length ?? 0) > 0}
          <div class="hud-project-links">
            {#if project.repo_url}
              <a href={project.repo_url} target="_blank" rel="noopener noreferrer">Repo</a>
            {/if}
            {#each project.links ?? [] as link}
              <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
            {/each}
          </div>
        {/if}
      </article>
    {/each}
  </div>
</HudFrame>

<style>
  .hud-project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
    gap: 1rem;
  }

  .hud-project-card {
    min-width: 0;
    border: 1px solid color-mix(in srgb, var(--hud-accent) 35%, transparent);
    background: color-mix(in srgb, var(--hud-bg) 85%, black);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .hud-project-card-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .hud-project-name {
    margin: 0;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--hud-accent);
  }

  .hud-project-status {
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--hud-secondary);
    overflow-wrap: break-word;
  }

  .hud-project-blurb {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--hud-text);
    overflow-wrap: break-word;
  }

  .hud-project-stack {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .hud-project-stack li {
    font-size: 0.65rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--hud-secondary);
    border: 1px solid color-mix(in srgb, var(--hud-secondary) 45%, transparent);
    padding: 0.15rem 0.4rem;
  }

  .hud-project-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: auto;
    padding-top: 0.25rem;
  }

  .hud-project-links a {
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--hud-accent);
    word-break: break-word;
  }

  .hud-project-links a:hover {
    text-decoration: underline;
  }

  /* Second dark surface independent of HudFrame's own background - see the
     print note in HudFrame.svelte for why this needs its own override. */
  @media print {
    .hud-project-card {
      background: transparent;
      border-color: #1a2744;
    }

    .hud-project-name,
    .hud-project-status,
    .hud-project-blurb,
    .hud-project-stack li,
    .hud-project-links a {
      color: #1a2744;
    }

    .hud-project-stack li {
      border-color: #1a2744;
    }
  }
</style>
