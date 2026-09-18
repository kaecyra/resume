<script lang="ts">
  import HudFrame from "./HudFrame.svelte";
  import { handle_resume_download, resume_pdf_filename, resume_pdf_href } from "./resume-download.js";

  // `validate_landing_data` enforces exactly one entry in `resume_links`, so
  // this takes that single variant directly. Supporting more than one would
  // need real per-variant CTA labels here, not just a loop.
  let {
    resume_link,
    profile_name,
    resume_title,
  }: { resume_link: string; profile_name: string; resume_title: string } = $props();
</script>

<HudFrame label="Resume" id="resume">
  <div class="hud-cta">
    <p class="hud-cta-copy">Full resume, tailored by role.</p>
    <div class="hud-cta-links">
      <a class="hud-cta-link" href="/{resume_link}">Resume</a>
      <a
        class="hud-cta-link hud-cta-link-icon"
        href={resume_pdf_href(resume_link)}
        download={resume_pdf_filename(profile_name, resume_title)}
        aria-label="Download resume PDF"
        onclick={() => handle_resume_download(resume_link)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path
            d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path d="M14 2v5h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <path
            d="M8.5 9.5h2.5M8.5 13h7M8.5 16.5h7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
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

  .hud-cta-link-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
  }
</style>
