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
  them: the live site and the PDF pipeline keep taking these faces from
  Google Fonts, where they are already cached across the web. See
  static/fonts/README.md for provenance and licensing.
-->
<style>
  @font-face {
    font-family: "Archivo Black";
    font-style: normal;
    font-weight: 400;
    font-display: block;
    src: url("/fonts/archivo-black-latin.woff2") format("woff2");
  }

  @font-face {
    font-family: "Share Tech Mono";
    font-style: normal;
    font-weight: 400;
    font-display: block;
    src: url("/fonts/share-tech-mono-latin.woff2") format("woff2");
  }

  /* One file, a weight range rather than three fixed-weight faces: the
     subset Google serves for this family is variable along `wght`, and it
     answers 400, 500 and 700 with the same bytes. */
  @font-face {
    font-family: "IBM Plex Sans";
    font-style: normal;
    font-weight: 100 900;
    font-display: block;
    src: url("/fonts/ibm-plex-sans-latin.woff2") format("woff2");
  }
</style>
