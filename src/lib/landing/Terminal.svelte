<script lang="ts">
  import type { PipelineTerminal, PipelineTurnSpeaker } from "$lib/types.js";

  import { ELEVATION, HUD_PALETTE, PIPELINE_INK } from "./palette.js";
  import { reveal, terminal_replay_delays, type RevealPhase } from "./pipeline-motion.js";

  // Band 1's agent session (#209). It shows no readable text on purpose: a
  // real transcript would date within a week and would say nothing the note
  // beside it does not already say. What is left is the shape of the
  // exchange - who spoke, how long their turn ran - carried entirely by the
  // bar widths in `data/pipeline.yaml`. Nothing about the conversation is
  // written here, so editing the data changes the drawing.
  let { terminal }: { terminal: PipelineTerminal } = $props();

  // The replay walks one clock across the whole transcript, so a bar's
  // delay depends on every turn before it. `terminal_replay_delays` is
  // parallel to `terminal.turns` by index, the same contract the graph's
  // layout keeps with its band's nodes.
  const replay = $derived(terminal_replay_delays(terminal.turns));

  // The terminal watches itself rather than taking its band's phase, as
  // Crossing.svelte does. The band is the wrong clock for this one: it is
  // over a thousand pixels tall, so a quarter of it is on screen while the
  // terminal is still at the bottom edge of the viewport - and unlike the
  // graph's sweep, which keeps travelling down into view, a transcript that
  // starts there has finished replaying before the reader reaches it.
  let phase = $state<RevealPhase>("static");

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
  class:is-armed={phase === "armed"}
  class:is-revealed={phase === "revealed"}
  aria-hidden="true"
  use:reveal={(next) => (phase = next)}
  style="--term-ground: {ELEVATION.void}; --term-hair: {ELEVATION.hair}; --term-hair-bright: {ELEVATION.hair_bright}; --term-chrome: {HUD_PALETTE.panel}; --dot-ink: {HUD_PALETTE.edge}; --path-ink: {HUD_PALETTE.chip_text}; --term-cursor: {HUD_PALETTE.accent};"
>
  <div class="term-bar">
    <span class="term-dot"></span><span class="term-dot"></span><span class="term-dot"></span>
    <span class="term-path">{terminal.path}</span>
  </div>
  <div class="term-body">
    {#each terminal.turns as turn, index}
      <div
        class="turn"
        style="--glyph-ink: {SPEAKER_GLYPH_INK[turn.speaker]}; --bar-ink: {SPEAKER_BAR_INK[turn.speaker]};"
      >
        <span class="glyph">{SPEAKER_GLYPHS[turn.speaker]}</span>
        <span class="lines">
          {#each turn.bars ?? [] as bar, line}
            <span class="ln" style="width: {bar}%; --bar-delay: {replay[index].bars[line]}ms"
            ></span>
          {/each}
          {#if turn.cursor}
            <span class="cursor" style="--cursor-delay: {replay[index].cursor}ms"></span>
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
    /* Each bar wipes open from the prompt side rather than fading in
       place, because what the drawing depicts is a turn being written. The
       width stays the data's, and the transform is what moves. */
    transform-origin: left center;
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

  /* The replay. As in Graph.svelte, none of this applies unless the band's
     `phase` prop has left "static", and it only leaves "static" where
     `pipeline-motion.ts` has confirmed motion is welcome - so the reduced
     motion branch, the no-script branch and the server's own output are
     all the finished transcript, with the blink below as their only
     movement. */
  .is-armed .ln {
    transform: scaleX(0);
  }

  .is-revealed .ln {
    animation: bar-wipe 140ms ease-out var(--bar-delay) both;
  }

  @keyframes bar-wipe {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }

  /* The cursor arrives with its turn and blinks from then on, so the blink
     carries the same delay: an invisible cursor blinking is a cursor
     keeping time nobody can see. */
  .is-armed .cursor {
    opacity: 0;
    animation: none;
  }

  .is-revealed .cursor {
    animation:
      cursor-arrive 160ms linear var(--cursor-delay) both,
      blink 1.1s steps(2, start) var(--cursor-delay) infinite;
  }

  @keyframes cursor-arrive {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* The blink is this component's own motion and stops on its own. The
     replay above never starts under reduced motion, because the phase it
     keys off never leaves "static" there. */
  @media (prefers-reduced-motion: reduce) {
    .cursor {
      animation: none;
    }
  }
</style>
