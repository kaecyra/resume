<script lang="ts">
  import type { LandingGithub, LandingLink } from "$lib/types.js";

  import HudFrame from "./HudFrame.svelte";

  let { contact, github }: { contact: LandingLink[]; github: LandingGithub } = $props();
</script>

<HudFrame label="Contact" id="contact">
  <div class="hud-footer">
    <ul class="hud-footer-contacts">
      {#each contact as item (item.url)}
        <li><a href={item.url} target="_blank" rel="noopener noreferrer">{item.label}</a></li>
      {/each}
    </ul>
    <p class="hud-footer-github">
      GitHub:
      <a href="https://github.com/{github.user}" target="_blank" rel="noopener noreferrer">@{github.user}</a>
    </p>
  </div>
</HudFrame>

<style>
  .hud-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.8rem;
  }

  .hud-footer-contacts {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .hud-footer-contacts a,
  .hud-footer-github a {
    color: var(--hud-text);
  }

  .hud-footer-contacts a:hover,
  .hud-footer-github a:hover {
    color: var(--hud-accent);
  }

  .hud-footer-github {
    margin: 0;
    color: var(--hud-secondary);
  }
</style>
