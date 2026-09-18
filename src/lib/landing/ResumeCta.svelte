<script lang="ts">
  import type { LandingHero } from "$lib/types.js";

  import HudFrame from "./HudFrame.svelte";
  import { handle_resume_download, resume_pdf_filename, resume_pdf_href } from "./resume-download.js";

  // `validate_landing_data` enforces exactly one entry in `resume_links`, so
  // this takes that single variant directly. Supporting more than one would
  // need real per-variant CTA labels here, not just a loop.
  let { resume_link, hero }: { resume_link: string; hero: LandingHero } = $props();
</script>

<HudFrame label="Resume" id="resume">
  <div class="hud-cta">
    <p class="hud-cta-copy">Full resume, tailored by role.</p>
    <div class="hud-cta-links">
      <a class="hud-cta-link" href="/{resume_link}">View the full resume</a>
      <a
        class="hud-cta-link"
        href={resume_pdf_href(resume_link)}
        download={resume_pdf_filename(hero)}
        onclick={() => handle_resume_download(resume_link)}
      >
        Download PDF
      </a>
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
