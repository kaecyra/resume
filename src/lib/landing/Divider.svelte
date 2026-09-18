<script lang="ts">
  import type { LandingHero, LandingLink } from "$lib/types.js";

  let { hero, contact }: { hero: LandingHero; contact: LandingLink[] } = $props();

  // The divider band is a location + social-links strip, not the full
  // contact list the Contact section renders (which also includes email).
  // Filtering out mailto: links here, rather than adding a second data
  // field, keeps `contact` the single source of truth for every link.
  const social_links = $derived(contact.filter((item) => !item.url.startsWith("mailto:")));
</script>

<div id="divider" class="divider">
  <span class="divider-location">{hero.location}</span>
  <div class="divider-links">
    {#each social_links as item (item.url)}
      <a href={item.url} target="_blank" rel="noopener noreferrer" class="divider-link">{item.label}</a>
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
    background: #ededec;
    color: #0a0a0b;
  }

  .divider-location {
    font-family: "Share Tech Mono", ui-monospace, monospace;
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
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.8125rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #0a0a0b;
    border-bottom: 1px solid rgba(10, 10, 11, 0.28);
    padding-bottom: 2px;
  }

  @media (max-width: 480px) {
    .divider {
      padding: 0.875rem 1.25rem;
    }
  }
</style>
