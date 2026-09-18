<script lang="ts">
  import type { LandingData } from "$lib/types.js";

  import HudFooter from "./HudFooter.svelte";
  import HudHero from "./HudHero.svelte";
  import ProjectGrid from "./ProjectGrid.svelte";
  import ResumeCta from "./ResumeCta.svelte";

  // `validate_landing_data` guarantees `sections` only contains known ids
  // and `resume_links` holds exactly one entry, so this trusts `landing` as
  // already-valid: no fallback rendering for an unrecognized section here.
  let { landing }: { landing: LandingData } = $props();

  const resume_link = $derived(landing.resume_links[0]);
</script>

{#each landing.sections as section (section)}
  {#if section === "hero"}
    <HudHero hero={landing.hero} />
  {:else if section === "projects"}
    <ProjectGrid projects={landing.projects} />
  {:else if section === "resume"}
    <ResumeCta {resume_link} hero={landing.hero} />
  {:else if section === "contact"}
    <HudFooter contact={landing.contact} github={landing.github} />
  {/if}
{/each}
