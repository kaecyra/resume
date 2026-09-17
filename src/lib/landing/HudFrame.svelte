<script lang="ts">
  import type { Snippet } from "svelte";

  import { HUD_PALETTE } from "./palette.js";

  let {
    label,
    id,
    children,
  }: { label: string; id?: string; children: Snippet } = $props();
</script>

<section
  {id}
  aria-label={label}
  class="hud-frame"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-accent: {HUD_PALETTE.accent}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary};"
>
  <div class="hud-frame-label" aria-hidden="true">[ {label} ]</div>
  <div class="hud-frame-body">
    {@render children()}
  </div>
</section>

<style>
  .hud-frame {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    background-color: var(--hud-bg);
    background-image: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.025) 0px,
      rgba(255, 255, 255, 0.025) 1px,
      transparent 1px,
      transparent 3px
    );
    color: var(--hud-text);
    border: 1px solid color-mix(in srgb, var(--hud-accent) 45%, transparent);
    padding: 1.25rem;
    font-family: "Share Tech Mono", ui-monospace, monospace;
  }

  .hud-frame::before,
  .hud-frame::after {
    content: "";
    position: absolute;
    width: 0.75rem;
    height: 0.75rem;
    pointer-events: none;
  }

  .hud-frame::before {
    top: -1px;
    left: -1px;
    border-top: 2px solid var(--hud-accent);
    border-left: 2px solid var(--hud-accent);
  }

  .hud-frame::after {
    bottom: -1px;
    right: -1px;
    border-bottom: 2px solid var(--hud-accent);
    border-right: 2px solid var(--hud-accent);
  }

  .hud-frame-label {
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--hud-accent);
    margin-bottom: 0.75rem;
  }

  .hud-frame-body {
    position: relative;
  }

  @media (min-width: 768px) {
    .hud-frame {
      padding: 2rem;
    }
  }

  /*
   * src/app.css applies print-color-adjust: exact to * inside @media print
   * for the resume themes and PDF pipeline, and that rule reaches this
   * component too. Without an override here, the dark background and the
   * scanline texture print as-is: wasted ink, and the section label and
   * corner brackets print in accent orange on top of a solid dark fill.
   * Override to a plain, printable look instead of fixing the global rule,
   * which is outside this node's globs.
   */
  @media print {
    .hud-frame {
      background-color: transparent;
      background-image: none;
      color: #1a2744;
      border-color: #1a2744;
    }

    .hud-frame::before,
    .hud-frame::after {
      border-color: #1a2744;
    }

    .hud-frame-label {
      color: #1a2744;
    }
  }
</style>
