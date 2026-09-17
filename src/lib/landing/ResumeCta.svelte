<script lang="ts">
  import HudFrame from "./HudFrame.svelte";

  // `resume_links` holds the variant slugs the landing page is allowed to
  // link to publicly (see data/landing.yaml). Every other variant stays
  // unlisted and reachable only by direct link - do not render a link here
  // for anything outside this list.
  let { resume_links }: { resume_links: string[] } = $props();
</script>

<HudFrame label="Resume" id="resume">
  <div class="hud-cta">
    <p class="hud-cta-copy">Full resume, tailored by role.</p>
    <div class="hud-cta-links">
      {#each resume_links as variant (variant)}
        <a class="hud-cta-link" href="/{variant}">View the full resume</a>
      {/each}
    </div>
  </div>
</HudFrame>

<style>
  .hud-cta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .hud-cta-copy {
    margin: 0;
    font-size: 0.9rem;
    color: var(--hud-text);
  }

  .hud-cta-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .hud-cta-link {
    display: inline-block;
    border: 1px solid var(--hud-accent);
    color: var(--hud-accent);
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .hud-cta-link:hover {
    background: color-mix(in srgb, var(--hud-accent) 15%, transparent);
  }
</style>
