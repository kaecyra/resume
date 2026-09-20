<script lang="ts">
  // Mount point and timer loop for the lower-page ambient flyby effect.
  // Mounted once, as a sibling right after <Hero> in LandingSections.svelte -
  // see this component's own root markup below for how that placement keeps
  // it out of the hero entirely, with no scroll/IntersectionObserver logic
  // needed to enforce it.
  import { onMount } from "svelte";

  import { browser } from "$app/environment";

  import { flight_end_y_vh, next_spawn_delay_ms, random_flyby_plan, type FlybyPlan } from "./flyby-motion.js";
  import SatelliteFlyby from "./SatelliteFlyby.svelte";

  interface ActiveFlyby extends FlybyPlan {
    id: number;
    end_y_vh: number;
  }

  // $state.raw, not $state: entries are replaced wholesale (a new array on
  // every spawn/removal), never mutated in place, so a deep proxy would only
  // tax reads for nothing - same reasoning Hero.svelte gives for
  // satellite_flagships.
  let active: ActiveFlyby[] = $state.raw([]);
  let next_id = 0;

  // Parallax drift, in vh, applied to the whole flyby layer as the reader
  // scrolls (see .flyby-layer's transform below). Negative of scroll
  // fraction - the layer creeps up as the reader scrolls down - and capped
  // small (see MAX_PARALLAX_VH) so it reads as depth behind the sticky
  // layer's own near-viewport plane, not as a second thing competing with
  // each flight's own drift.
  let scroll_offset_vh = $state(0);

  function remove(id: number) {
    active = active.filter((flyby) => flyby.id !== id);
  }

  // Guarded twice, matching Hero.svelte's onMount: `browser` stays a cheap,
  // explicit second guard even though onMount's body never runs during
  // SSR/prerendering.
  onMount(() => {
    if (!browser) {
      return;
    }

    // Hard off under reduced motion, matching pipeline-motion.ts's
    // `reveal()` convention (#209): this is motion the page introduces on
    // its own timer, not something a reader triggered, and unlike `reveal`
    // there is no finished/static state for a flyby to fall back to - the
    // only "reduced" version of "an object flies across the screen" is not
    // spawning one. Checked once at mount, not bidirectionally (Hero.svelte's
    // globe does react to the preference changing mid-session, but that
    // guards a single already-running animation; this guards a timer loop
    // that would otherwise need its own teardown/rebuild on every toggle for
    // a case - the preference flipping mid-visit - that isn't worth that
    // machinery here).
    const motion_query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion_query.matches) {
      return;
    }

    let timeout_id: ReturnType<typeof setTimeout> | undefined;
    let running = true;
    let tab_visible = document.visibilityState === "visible";

    // Fraction of the document scrolled through, 0-1 - same shape as
    // +page.svelte's own scroll_progress() for the spine fill, kept as a
    // separate copy rather than a shared import: the two have no reason to
    // change together, and this one only ever feeds a capped parallax
    // offset, not a 0-100 fill height.
    const MAX_PARALLAX_VH = 12;

    function scroll_fraction(): number {
      const scrollable_height = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable_height <= 0) {
        return 0;
      }
      return Math.max(0, Math.min(1, window.scrollY / scrollable_height));
    }

    function update_scroll_offset() {
      scroll_offset_vh = -scroll_fraction() * MAX_PARALLAX_VH;
    }

    function spawn() {
      const plan = random_flyby_plan();
      const id = next_id;
      next_id += 1;
      active = [...active, { ...plan, id, end_y_vh: flight_end_y_vh(plan) }];
    }

    // Recursive setTimeout, not setInterval: each gap has to be freshly
    // randomized (next_spawn_delay_ms), which setInterval's fixed period
    // can't express.
    function schedule() {
      if (!running || !tab_visible) {
        return;
      }
      timeout_id = setTimeout(() => {
        spawn();
        schedule();
      }, next_spawn_delay_ms());
    }

    function stop_schedule() {
      clearTimeout(timeout_id);
      timeout_id = undefined;
    }

    // Pauses the spawn timer while the tab is hidden, matching globe.ts's
    // schedule()/stop_frame() pattern for its rAF loop - a background tab
    // gets no new flybys queued up to all land at once the moment it comes
    // back.
    function on_visibility_change() {
      tab_visible = document.visibilityState === "visible";
      if (tab_visible) {
        schedule();
      } else {
        stop_schedule();
      }
    }
    document.addEventListener("visibilitychange", on_visibility_change);

    update_scroll_offset();
    window.addEventListener("scroll", update_scroll_offset, { passive: true });

    schedule();

    return () => {
      running = false;
      stop_schedule();
      document.removeEventListener("visibilitychange", on_visibility_change);
      window.removeEventListener("scroll", update_scroll_offset);
    };
  });
</script>

<!--
  A zero-height sticky sentinel, not a fixed-position overlay measured off
  the hero's height in JS. `.landing` (+page.svelte) is a flex column with
  every section - Hero included - as a direct sibling child, and this
  component renders as one more sibling in that same stack, placed right
  after <Hero> (see LandingSections.svelte). Because this element's own box
  has zero height, its static flow position sits exactly at Hero's bottom
  edge; `position: sticky` then keeps it pinned to the viewport's top for as
  long as that static position - and the rest of `.landing`, its containing
  block - remains between the viewport's top and bottom while scrolling.
  Concretely: it does nothing while Hero is still on screen (its static
  position hasn't reached the viewport top yet), starts sticking the instant
  Hero scrolls out of view, and keeps sticking all the way to the bottom of
  the page. No IntersectionObserver, no measured offset, and it can never
  render over Hero, because it never has a flow position anywhere inside it.
-->
<div class="flyby-scope" aria-hidden="true">
  <div class="flyby-layer" style="--flyby-scroll-offset: {scroll_offset_vh}vh;">
    {#each active as flyby (flyby.id)}
      <SatelliteFlyby
        kind={flyby.kind}
        mirrored={flyby.mirrored}
        start_y_vh={flyby.start_y_vh}
        end_y_vh={flyby.end_y_vh}
        duration_ms={flyby.duration_ms}
        on_finished={() => remove(flyby.id)}
      />
    {/each}
  </div>
</div>

<style>
  .flyby-scope {
    position: sticky;
    top: 0;
    height: 0;
    overflow: visible;
    /* Above +page.svelte's .grain (z-index: 3) - the highest chrome the
       page had before this - so a flyby reads as being on top of the grain
       texture rather than textured over. Nothing else on the page sets a
       higher z-index, so this is simply "above everything". */
    z-index: 4;
    pointer-events: none;
  }

  .flyby-layer {
    position: absolute;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    pointer-events: none;
    transform: translateY(var(--flyby-scroll-offset));
    /* Smooths the step between scroll events, same recipe as +page.svelte's
       .spine-fill. Not gated behind prefers-reduced-motion: this whole
       component never mounts a spawn loop under reduced motion (see the
       onMount guard above), so there is never a flyby on screen for this
       transition to animate in that case - nothing to turn off. */
    transition: transform 0.12s linear;
  }
</style>
