<script lang="ts">
  import type { LandingData } from "$lib/types.js";

  import Commits from "./Commits.svelte";
  import Contact from "./Contact.svelte";
  import type { ContributionsGrid } from "./contributions.js";
  import Divider from "./Divider.svelte";
  import Hero from "./Hero.svelte";
  import Work from "./Work.svelte";

  // `validate_landing_data` guarantees `sections` only contains known ids
  // and `resume_links` holds exactly one entry, so this trusts `landing` as
  // already-valid: no fallback rendering for an unrecognized section here.
  // `profile_name`/`resume_title` come from the loader (resume.yaml and the
  // linked variant), not from `landing`, so the PDF download offers the
  // same filename the variant route itself uses for that file.
  // `contributions_grid` is #167's data source (out of scope here); it
  // arrives as `null` until that node lands, and Commits renders an
  // explicit offline state for that case.
  let {
    landing,
    profile_name,
    resume_title,
    contributions_grid,
  }: {
    landing: LandingData;
    profile_name: string;
    resume_title: string;
    contributions_grid: ContributionsGrid | null;
  } = $props();

  const resume_link = $derived(landing.resume_links[0]);
</script>

{#each landing.sections as section (section)}
  {#if section === "hero"}
    <Hero hero={landing.hero} github={landing.github} {resume_link} {profile_name} {resume_title} />
  {:else if section === "divider"}
    <Divider hero={landing.hero} contact={landing.contact} />
  {:else if section === "commits"}
    <Commits github={landing.github} {contributions_grid} />
  {:else if section === "work"}
    <Work projects={landing.projects} />
  {:else if section === "contact"}
    <Contact contact={landing.contact} />
  {/if}
{/each}
