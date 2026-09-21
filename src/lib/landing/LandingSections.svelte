<script lang="ts">
  import type { ContributionGridModel } from "$lib/github.js";
  import type { LandingData, PipelineData } from "$lib/types.js";

  import About from "./About.svelte";
  import Appearances from "./Appearances.svelte";
  import Commits from "./Commits.svelte";
  import Contact from "./Contact.svelte";
  import Divider from "./Divider.svelte";
  import Hero from "./Hero.svelte";
  import Pipeline from "./Pipeline.svelte";
  import SatelliteFlybys from "./SatelliteFlybys.svelte";
  import Work from "./Work.svelte";

  // `validate_landing_data` guarantees `sections` only contains known ids
  // and `resume_links` holds exactly one entry, so this trusts `landing` as
  // already-valid: no fallback rendering for an unrecognized section here.
  // `profile_name`/`resume_title` come from the loader (resume.yaml and the
  // linked variant), not from `landing`, so the PDF download offers the
  // same filename the variant route itself uses for that file.
  // `contributions_grid` is #167's data source (src/lib/github.ts); it
  // arrives as `null` when data/generated/github.json is absent (no
  // GH_CONTRIB_PAT/GITHUB_TOKEN at build time), and Commits renders an
  // explicit offline state for that case.
  // `pipeline` is #209's data source (data/pipeline.yaml, loaded and
  // validated by src/lib/pipeline.ts); like `contributions_grid` it does
  // not live on `landing`, so it is threaded through as its own prop.
  // `<SatelliteFlybys>` below (the lower-page ambient flyby effect) takes no
  // props and is not itself a "section" in `landing.sections` - it's a
  // decorative sibling rendered alongside `hero`, self-contained, so it
  // needs no entry threaded through this component's own props.
  let {
    landing,
    profile_name,
    resume_title,
    contributions_grid,
    pipeline,
  }: {
    landing: LandingData;
    profile_name: string;
    resume_title: string;
    contributions_grid: ContributionGridModel | null;
    pipeline: PipelineData;
  } = $props();

  const resume_link = $derived(landing.resume_links[0]);
</script>

{#each landing.sections as section (section)}
  {#if section === "hero"}
    <Hero hero={landing.hero} github={landing.github} {resume_link} {profile_name} {resume_title} />
    <SatelliteFlybys />
  {:else if section === "divider"}
    <Divider hero={landing.hero} contact={landing.contact} />
  {:else if section === "commits"}
    <Commits github={landing.github} {contributions_grid} />
  {:else if section === "pipeline"}
    <Pipeline {pipeline} />
  {:else if section === "about"}
    <!-- validate_landing_data requires `about` whenever `sections` names
         it; the guard only keeps an unvalidated document from crashing. -->
    {#if landing.about}
      <About about={landing.about} />
    {/if}
  {:else if section === "work"}
    <Work projects={landing.projects} />
  {:else if section === "appearances"}
    <Appearances appearances={landing.appearances} />
  {:else if section === "contact"}
    <Contact contact={landing.contact} />
  {/if}
{/each}
