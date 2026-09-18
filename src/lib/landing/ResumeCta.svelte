<script lang="ts">
  import { HUD_PALETTE } from "./palette.js";
  import { handle_resume_download, resume_pdf_filename } from "./resume-download.js";

  // `validate_landing_data` enforces exactly one entry in `resume_links`, so
  // this takes that single variant directly. Supporting more than one would
  // need real per-variant CTA labels here, not just a loop.
  let {
    resume_link,
    profile_name,
    resume_title,
  }: { resume_link: string; profile_name: string; resume_title: string } = $props();
</script>

<div
  class="cta"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-edge: {HUD_PALETTE.edge};"
>
  <a class="cta-link" href="/{resume_link}">Resume</a>
  <a
    class="cta-icon"
    href="/{resume_link}.pdf"
    download={resume_pdf_filename(profile_name, resume_title)}
    aria-label="Download resume PDF"
    onclick={() => handle_resume_download(resume_link)}
  >
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M12 3v12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M7 11l5 5 5-5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M4 20h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  </a>
</div>

<style>
  .cta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .cta-link {
    /* No underline on landing-page links (owner request). An anchor with no
       text-decoration declaration underlines by default, so this needs an
       explicit `none`. */
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    min-height: 52px;
    padding: 0 1.875rem;
    background: var(--hud-text);
    color: var(--hud-bg);
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: 1.0625rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    text-decoration: none;
  }

  .cta-link:hover {
    /* .cta-icon:hover (below) already responds; this control sat inert
       next to it until now (#182). Unlike the text-only links elsewhere on
       the page, .cta-link is a filled control (--hud-text background,
       --hud-bg text), so a foreground colour swap would fight the fill -
       dimming the background to --hud-secondary instead keeps --hud-bg
       text readable on top and echoes .cta-icon:hover's own move to
       --hud-secondary just below. */
    background: var(--hud-secondary);
  }

  /*
   * Shine sweep (#196): a skewed light band that crosses the button on
   * hover. rgba(255, 255, 255, ...) rather than a token - the fill it
   * crosses is already --hud-text (near-white), so this is a highlight
   * relative to that fill, not a themed colour with a token of its own.
   * The sweep is a hover-triggered transition, not a looping animation, so
   * reduced motion drops it outright below rather than just disabling a
   * loop.
   */
  .cta-link::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: -60%;
    width: 42%;
    transform: skewX(-18deg);
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
    transition: left 0.5s cubic-bezier(0.2, 0.7, 0.3, 1);
  }

  .cta-link:hover::after {
    left: 120%;
  }

  @media (prefers-reduced-motion: reduce) {
    .cta-link::after {
      display: none;
    }
  }

  .cta-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border: 1px solid var(--hud-edge);
    color: var(--hud-secondary);
  }

  .cta-icon:hover {
    color: var(--hud-text);
    border-color: var(--hud-secondary);
  }
</style>
