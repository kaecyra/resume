<script lang="ts">
  import type { PipelineTerminal, PipelineTurnSpeaker } from "$lib/types.js";

  import { ELEVATION, HUD_PALETTE, PIPELINE_INK } from "./palette.js";

  // Band 1's agent session (#209). It shows no readable text on purpose: a
  // real transcript would date within a week and would say nothing the note
  // beside it does not already say. What is left is the shape of the
  // exchange - who spoke, how long their turn ran - carried entirely by the
  // bar widths in `data/pipeline.yaml`. Nothing about the conversation is
  // written here, so editing the data changes the drawing.
  let { terminal }: { terminal: PipelineTerminal } = $props();

  // `>` is the reader at their own prompt, the bullet (U+2022) an agent
  // replying, the tick (U+2713) a tool that came back clean. The codepoints
  // are named here because neighbouring dingbats are hard to tell apart in
  // a diff.
  const SPEAKER_GLYPHS: Record<PipelineTurnSpeaker, string> = {
    you: ">",
    agent: "•",
    tool: "✓",
  };

  const SPEAKER_GLYPH_INK: Record<PipelineTurnSpeaker, string> = {
    you: HUD_PALETTE.accent,
    agent: HUD_PALETTE.secondary,
    tool: PIPELINE_INK.pass,
  };

  // The reader's own turn is the brightest of the three and the agent and
  // the tool sit below it, so the transcript reads as the person speaking
  // loudest in their own terminal.
  const SPEAKER_BAR_INK: Record<PipelineTurnSpeaker, string> = {
    you: HUD_PALETTE.edge,
    agent: PIPELINE_INK.agent_bar,
    tool: PIPELINE_INK.tool_bar,
  };
</script>

<!-- Decorative in full: resolution 1 of the plan hides the section's
     drawings from assistive technology, and this one has nothing but a
     shell path to announce. The band's note is what carries the meaning. -->
<div
  class="terminal"
  aria-hidden="true"
  style="--term-ground: {ELEVATION.void}; --term-hair: {ELEVATION.hair}; --term-hair-bright: {ELEVATION.hair_bright}; --term-chrome: {HUD_PALETTE.panel}; --dot-ink: {HUD_PALETTE.edge}; --path-ink: {HUD_PALETTE.chip_text}; --term-cursor: {HUD_PALETTE.accent};"
>
  <div class="term-bar">
    <span class="term-dot"></span><span class="term-dot"></span><span class="term-dot"></span>
    <span class="term-path">{terminal.path}</span>
  </div>
  <div class="term-body">
    {#each terminal.turns as turn, index (index)}
      <div
        class="turn"
        style="--glyph-ink: {SPEAKER_GLYPH_INK[turn.speaker]}; --bar-ink: {SPEAKER_BAR_INK[turn.speaker]};"
      >
        <span class="glyph">{SPEAKER_GLYPHS[turn.speaker]}</span>
        <span class="lines">
          {#each turn.bars ?? [] as bar, bar_index (bar_index)}
            <span class="ln" style="width: {bar}%"></span>
          {/each}
          {#if turn.cursor}
            <span class="cursor"></span>
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  /* Recessed into the page - void ground and a hair of top light - rather
     than a card floating on it. No ring border, no coloured accent rail:
     see .memory/no-default-ai-styling.md. The drop shadow is plain black at
     low alpha, written here the way every other shadow recipe on this page
     is, because a token for one shadow would be the only one of its kind. */
  .terminal {
    background: var(--term-ground);
    border-radius: 3px;
    box-shadow:
      inset 0 1px 0 var(--term-hair-bright),
      0 18px 40px -24px #000;
    padding: 0 0 20px;
    overflow: hidden;
  }

  .term-bar {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 14px 13px;
    background: var(--term-chrome);
    box-shadow: inset 0 -1px 0 var(--term-hair);
  }

  .term-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--dot-ink);
  }

  .term-path {
    margin-left: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: var(--path-ink);
    letter-spacing: 0.02em;
  }

  .term-body {
    padding: 18px 16px 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .turn {
    display: flex;
    gap: 10px;
  }

  .glyph {
    flex: none;
    width: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 13px;
    padding-top: 1px;
    color: var(--glyph-ink);
  }

  .lines {
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 100%;
  }

  .ln {
    height: 7px;
    border-radius: 2px;
    background: var(--bar-ink);
  }

  .cursor {
    width: 8px;
    height: 13px;
    background: var(--term-cursor);
    border-radius: 1px;
    animation: blink 1.1s steps(2, start) infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  /* The blink is this component's own motion and stops on its own. The
     scroll-driven replay of the whole transcript is a separate step and
     brings its own reduced-motion branch. */
  @media (prefers-reduced-motion: reduce) {
    .cursor {
      animation: none;
    }
  }
</style>
