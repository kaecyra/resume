<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

{@render children()}

<!--
  The card routes' own copies of the three faces `src/app.css` pulls from
  Google Fonts. `scripts/generate-og-images.ts` aborts every request that
  does not start with its `BASE_URL`, so that `@import` never resolves while
  a card is being screenshotted and the type fell back to the build image's
  default sans - which for the hero-derived landing card is the whole
  design. Same-origin files pass the filter.

  Declared here rather than in `src/app.css` so nothing but `/og/*` pays for
  them: the live site keeps taking these faces from Google Fonts, where they
  are already cached across the web. The PDF pipeline is *not* in that
  sentence - `scripts/generate-pdf.ts` carries the same abort filter, so its
  fonts fall back exactly the way the cards' did. Fixing that is #235, since
  it decides font delivery for the whole site rather than for these two
  routes. See static/fonts/README.md for provenance and licensing.
-->
<style>
  /* Both card routes want the same one, and a copy in each was a copy too
     many once this layout existed. */
  :global(body) {
    margin: 0;
    padding: 0;
  }

  /*
   * `swap`, not `block`, on all three. The renderer awaits
   * `document.fonts.ready` before it screenshots, so on the success path
   * the face is in either way and the display policy never applies. It
   * decides what happens when a file is missing or renamed: the FontFaceSet
   * settles as an error, `fonts.ready` resolves immediately, and a card
   * screenshotted inside `block`'s invisible-text period would ship with no
   * name on it at all while `generate-og` exits 0. `swap` degrades that to
   * a readable fallback instead.
   */
  @font-face {
    font-family: "Archivo Black";
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url("/fonts/archivo-black-latin.woff2") format("woff2");
  }

  @font-face {
    font-family: "Share Tech Mono";
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url("/fonts/share-tech-mono-latin.woff2") format("woff2");
  }

  /* One file, a weight range rather than three fixed-weight faces: the
     subset Google serves for this family is variable along `wght`, and it
     answers 400, 500 and 700 with the same bytes. */
  @font-face {
    font-family: "IBM Plex Sans";
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url("/fonts/ibm-plex-sans-latin.woff2") format("woff2");
  }
</style>
