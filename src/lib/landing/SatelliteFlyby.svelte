<script lang="ts">
  // One instance of the lower-page ambient flyby effect: purely
  // presentational, no timers or randomness of its own - SatelliteFlybys.svelte
  // owns the spawn decision (flyby-motion.ts) and this just plays it out as
  // CSS. `on_finished` is how the parent finds out the crossing is over and
  // removes this instance; it fires from the crossing animation's own
  // `animationend`, not from a timer, so a paused/throttled background tab
  // (rAF and CSS animation both stall together there) can never fire this
  // early.
  import { FLYBY_ART, FLYBY_TUMBLES, type FlybyKind } from "./flyby-shapes.js";
  import { HUD_PALETTE } from "./palette.js";

  let {
    kind,
    mirrored,
    start_y_vh,
    end_y_vh,
    duration_ms,
    on_finished,
  }: {
    kind: FlybyKind;
    mirrored: boolean;
    start_y_vh: number;
    end_y_vh: number;
    duration_ms: number;
    on_finished: () => void;
  } = $props();

  const tumbles = $derived(FLYBY_TUMBLES[kind]);
</script>

<div
  class="flyby"
  class:flyby-mirrored={mirrored}
  style="--flyby-start-y: {start_y_vh}vh; --flyby-end-y: {end_y_vh}vh; --flyby-duration: {duration_ms}ms; color: {HUD_PALETTE.secondary};"
  onanimationend={on_finished}
>
  <!-- The craft's nose has to lead whichever way it's actually travelling
       (flyby-shapes.ts draws every craft nose-right); .flyby-mirrored below
       reverses the crossing animation itself, and this flips the art to
       match. Kept on its own element from .flyby-spin's tumble rotation:
       an infinite `rotate()` and a static `scaleX(-1)` can't both live in
       one `transform` declaration without the rotation overwriting the
       flip on every frame. -->
  <div class="flyby-mirror">
    <!-- Only the tumbling junk kinds (flyby-shapes.ts's FLYBY_TUMBLES) get
         this rotation; the five real spacecraft hold a fixed attitude. -->
    <div class="flyby-spin" class:flyby-tumbles={tumbles}>
      <svg
        class="flyby-art"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <!-- FLYBY_ART's values are static literals defined in
             flyby-shapes.ts, never user- or network-supplied, so this is the
             same trust boundary +page.svelte's own {@html} uses for its
             jsonld/style tags. Each craft's fb-bold/fb-thin elements (see
             flyby-shapes.ts's header comment) get their stroke-width below,
             via :global() since {@html} content isn't scoped. -->
        {@html FLYBY_ART[kind]}
      </svg>
    </div>
  </div>
</div>

<style>
  .flyby {
    position: absolute;
    left: -12vw;
    top: var(--flyby-start-y);
    width: 80px;
    height: 80px;
    pointer-events: none;
    animation: flyby-cross var(--flyby-duration) linear forwards;
  }

  /* Reverses the crossing itself (right-to-left instead of left-to-right) -
     see .flyby-mirrored .flyby-perspective below for flipping the art to
     match. */
  .flyby-mirrored {
    animation-direction: reverse;
  }

  @keyframes flyby-cross {
    from {
      left: -12vw;
      top: var(--flyby-start-y);
    }

    to {
      left: 112vw;
      top: var(--flyby-end-y);
    }
  }

  .flyby-mirror {
    width: 100%;
    height: 100%;
  }

  .flyby-mirrored .flyby-mirror {
    transform: scaleX(-1);
  }

  .flyby-spin {
    width: 100%;
    height: 100%;
  }

  .flyby-tumbles {
    animation: flyby-tumble var(--flyby-duration) linear infinite;
  }

  @keyframes flyby-tumble {
    to {
      transform: rotate(360deg);
    }
  }

  /* Stroke widths are in the SVG's own viewBox units, so doubling .flyby's
     rendered size (above) would double these on screen too unless halved to
     match - kept thin at the new, larger size rather than getting bolder
     along with it. */
  .flyby-art {
    display: block;
    width: 100%;
    height: 100%;
    stroke-width: 0.8;
  }

  /* fb-bold/fb-thin (flyby-shapes.ts) mark a form's near vs receding edge -
     the fake-3D "box" technique the art's header comment explains. :global()
     because {@html}-injected content isn't reached by scoped styles. */
  .flyby-art :global(.fb-bold) {
    stroke-width: 1.1;
  }

  .flyby-art :global(.fb-thin) {
    stroke-width: 0.5;
  }

  @media (max-width: 700px) {
    .flyby {
      width: 56px;
      height: 56px;
    }
  }

  /* No explicit prefers-reduced-motion override here (unlike Hero.svelte's
     .hero-name-line-text or Work.svelte's own block): SatelliteFlybys.svelte
     never mounts an instance of this component at all under reduced motion,
     so there is no animation on the page for this block to turn off - an
     override here would be dead code guarding against a state that
     structurally can't occur. */
</style>
