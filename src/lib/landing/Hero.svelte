<script lang="ts">
  import type { LandingGithub, LandingHero } from "$lib/types.js";

  import { split_role_badge } from "./hero-format.js";
  import { HUD_PALETTE } from "./palette.js";
  import ResumeCta from "./ResumeCta.svelte";

  let {
    hero,
    github,
    resume_link,
    profile_name,
    resume_title,
  }: {
    hero: LandingHero;
    github: LandingGithub;
    resume_link: string;
    profile_name: string;
    resume_title: string;
  } = $props();

  const role = $derived(split_role_badge(hero.role));
</script>

<section
  id="hero"
  class="hero"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-meta: {HUD_PALETTE.meta}; --hud-accent: {HUD_PALETTE.accent};"
>
  <div class="hero-backdrop" aria-hidden="true"></div>

  <!--
    The static gradient lives on .hero-backdrop above. This element is the
    empty mount point #168 (the rotating globe) fills with its canvas - id
    and position are the contract between the two nodes, so don't rename or
    remove #hero-globe-mount without checking with that node.
  -->
  <div id="hero-globe-mount" class="hero-visual" aria-hidden="true"></div>

  <div class="hero-scrim" aria-hidden="true"></div>

  <div class="hero-topbar">
    <span>{github.user}</span>
    <!-- Fixed presentational chrome (Montreal), not content - not worth a
         second one-off schema field on `hero`. -->
    <span>45.50&deg;N 73.57&deg;W</span>
  </div>

  <div class="hero-identity">
    <h1 class="hero-name">{hero.name}</h1>
    <div class="hero-badge">
      <span class="hero-badge-tag">{role.tag}</span>
      {#if role.label}
        <span class="hero-badge-label">{role.label}</span>
      {/if}
    </div>
  </div>

  <div class="hero-foot">
    <p class="hero-tagline">{hero.tagline}</p>
    <p class="hero-status">{hero.status}</p>
    <ResumeCta {resume_link} {profile_name} {resume_title} />
  </div>
</section>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2rem;
    min-height: 720px;
    padding: 4rem 2.5rem 2.75rem;
    background: var(--hud-bg);
    color: var(--hud-text);
  }

  .hero-backdrop {
    position: absolute;
    inset: 0;
    /* These three stops are bespoke gradient shades, not a translated
       HUD_PALETTE token - there's no token to point at, so they stay
       literals. Not a missed spot in the token-literal sweep. */
    background: radial-gradient(70% 70% at 68% 48%, #17171b 0%, #0d0d0f 55%, #09090a 100%);
  }

  .hero-visual {
    position: absolute;
    right: -40px;
    top: 50%;
    transform: translateY(-50%);
    width: 760px;
    height: 760px;
    max-width: none;
  }

  .hero-scrim {
    position: absolute;
    inset: 0;
    /* Translucent derivation of --hud-bg (HUD_PALETTE.background), not a
       fresh literal - color-mix keeps it tied to the token instead of
       drifting if the token changes. Same pattern as Divider.svelte. The
       64% stop is fully transparent already, so it needs no colour
       component. */
    background: linear-gradient(
      to right,
      color-mix(in srgb, var(--hud-bg) 97%, transparent) 0%,
      color-mix(in srgb, var(--hud-bg) 84%, transparent) 36%,
      transparent 64%
    );
  }

  .hero-topbar,
  .hero-identity,
  .hero-foot {
    position: relative;
    z-index: 1;
  }

  .hero-topbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    row-gap: 0.5rem;
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--hud-meta);
  }

  .hero-identity {
    max-width: 40rem;
  }

  .hero-name {
    margin: 0;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: clamp(2.75rem, 13vw, 8.875rem);
    line-height: 0.82;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--hud-text);
    /* Natural word wrap - deliberately not the prototype's hardcoded
       Tim<br>Gunter break. */
  }

  .hero-badge {
    display: inline-flex;
    align-items: baseline;
    gap: 0.875rem;
    margin-top: 1.625rem;
    padding: 0.625rem 1rem;
    background: var(--hud-accent);
    color: var(--hud-bg);
  }

  .hero-badge-tag {
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .hero-badge-label {
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
    text-transform: uppercase;
  }

  .hero-foot {
    max-width: 37.5rem;
  }

  .hero-tagline {
    margin: 0 0 0.875rem;
    font-size: 1.1875rem;
    line-height: 1.5;
    color: var(--hud-secondary);
  }

  .hero-status {
    margin: 0 0 1.75rem;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--hud-secondary);
  }

  @media (max-width: 640px) {
    .hero {
      min-height: auto;
      padding: 3rem 1.25rem 2.25rem;
      gap: 3rem;
    }
  }
</style>
