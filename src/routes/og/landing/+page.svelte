<script lang="ts">
  import { GLOBE_STILL_URL } from "$lib/landing/globe.js";
  import { HUD_PALETTE } from "$lib/landing/palette.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const name = $derived(data.name);
  const badge = $derived(data.badge);
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!--
  The site root's OG card: the hero's own frame at 1200x630, not the resume
  variants' headshot layout next door. Name, amber badge and globe - the
  tagline and the mono topbar the hero also carries are left off, since at
  feed-thumbnail size they are unreadable and spend the space the name
  wants.

  Everything here is static. The hero's staged word arrival, its scroll-
  linked spin-up, the live marker and the satellites all need a running
  canvas and none of them survive a screenshot, so the card composites the
  same layers the hero falls back to without JavaScript: backdrop, glow, the
  pre-rendered globe still, scrim, type.
-->
<div
  id="main-content"
  class="card"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary}; --hud-accent: {HUD_PALETTE.accent};"
>
  <div class="card-backdrop" aria-hidden="true"></div>
  <div class="card-glow" aria-hidden="true"></div>
  <img class="card-globe" src={GLOBE_STILL_URL} alt="" width="760" height="760" />
  <div class="card-scrim" aria-hidden="true"></div>

  <div class="card-identity">
    <h1 class="card-name">{name}</h1>
    <div class="card-badge">
      <span class="card-badge-tag">{badge.tag}</span>
      {#if badge.label}
        <span class="card-badge-label">{badge.label}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .card {
    position: relative;
    width: 1200px;
    height: 630px;
    overflow: hidden;
    display: flex;
    align-items: center;
    /* Deliberately not the hero's 2.5rem: a card is cropped by whatever
       feed renders it, and 40px of gutter puts the name's first stroke
       inside that risk. 76px is the hero's padding plus the 36px the name
       needs to survive a rounded-corner crop. The hero has no such
       constraint, so this is the one measurement here that is the card's
       own rather than scaled from the page. */
    padding: 0 0 0 76px;
    box-sizing: border-box;
    background: var(--hud-bg);
    color: var(--hud-text);
  }

  /* The same three bespoke gradient shades Hero.svelte's `.hero-backdrop`
     uses. Literals there and literals here: there is no token to point at,
     and inventing one for a gradient two files share would be a palette
     entry no text is ever read against. */
  .card-backdrop {
    position: absolute;
    inset: 0;
    background: radial-gradient(70% 70% at 68% 48%, #17171b 0%, #0d0d0f 55%, #09090a 100%);
  }

  /* Amber haze behind the globe (#196), derived from --hud-accent by
     color-mix rather than written out as a fresh literal, exactly as the
     hero derives it. Sized and placed for this frame: the hero's own glow
     is scaled to a 720px-tall hero. */
  .card-glow {
    position: absolute;
    right: -52px;
    top: -140px;
    width: 51rem;
    height: 51rem;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--hud-accent) 15%, transparent) 0%,
      color-mix(in srgb, var(--hud-accent) 5%, transparent) 34%,
      transparent 66%
    );
    filter: blur(12px);
  }

  /*
   * The hero's globe box (1080x960, flush right, cropped 50px off the top)
   * scaled by this card's height against the hero's 720px minimum - 945x840
   * at a 44px top crop. Scaling rather than reusing the hero's numbers is
   * what keeps the sphere the same size relative to the frame and keeps the
   * same slice of it cropped away; `overflow: hidden` on `.card` does the
   * cropping, so the box is deliberately taller than the card.
   *
   * `contain` on a square still inside a box that is wider than it is tall
   * centres the sphere at the box's height, which is where the hero's
   * canvas draws it too.
   */
  .card-globe {
    position: absolute;
    right: 0;
    top: -44px;
    width: 945px;
    height: 840px;
    max-width: none;
    object-fit: contain;
  }

  /* Hero.svelte's angled falloff, same stops: opaque over the type, gone by
     the time it reaches the globe's far side. A translucent derivation of
     --hud-bg, not a fourth grey. */
  .card-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      color-mix(in srgb, var(--hud-bg) 96%, transparent) 0%,
      color-mix(in srgb, var(--hud-bg) 80%, transparent) 32%,
      color-mix(in srgb, var(--hud-bg) 26%, transparent) 58%,
      transparent 78%
    );
  }

  .card-identity {
    position: relative;
    z-index: 1;
    /* 40rem, the hero's own identity width, so a two-word name breaks after
       the first word here exactly as it does there. The break is the
       browser's, not a hardcoded one - same as the hero. */
    max-width: 40rem;
  }

  .card-name {
    margin: 0;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    /* What the hero's own clamp resolves to at this width: 13vw of 1200px
       is 156px, over the 8.875rem ceiling. Written flat because a card is
       rendered at exactly one size and a viewport unit inside a screenshot
       is just an obscure way of writing a constant. */
    font-size: 8.875rem;
    line-height: 0.82;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--hud-text);
  }

  /* The hero's light-catching sheen (#196), guarded the same way so a
     renderer without background-clip: text keeps the flat --hud-text colour
     above instead of painting nothing at all. No staged-arrival spans here,
     so there is only one element to paint it on. */
  @supports ((-webkit-background-clip: text) or (background-clip: text)) {
    .card-name {
      background: linear-gradient(
        104deg,
        var(--hud-secondary) 0%,
        var(--hud-text) 40%,
        color-mix(in srgb, var(--hud-text) 60%, white) 72%,
        var(--hud-secondary) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }

  /* Flat amber fill, no gradient and no bloom - the hero badge's settled
     treatment. Sizes are the hero's, in px: the card never scales, so the
     badge reads against the name at exactly the ratio it does on the page.
     The mono tag is the hero's too; this card is a portrait of the hero,
     which is the one place #187 left that face standing. */
  .card-badge {
    display: inline-flex;
    align-items: baseline;
    gap: 14px;
    margin-top: 26px;
    padding: 10px 16px;
    background: var(--hud-accent);
    color: var(--hud-bg);
  }

  .card-badge-tag {
    font-family: "Share Tech Mono", ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .card-badge-label {
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    font-size: 20px;
    letter-spacing: -0.01em;
    text-transform: uppercase;
  }
</style>
