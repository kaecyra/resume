<script lang="ts">
  import { ELEVATION, HUD_PALETTE, PIPELINE_INK } from "./palette.js";

  // The `npm run dev` transcript under band 1's terminal (#209). The text
  // is verbatim in `data/pipeline.yaml`; which parts of it are coloured is
  // this component's business, and deliberately not the data model's - the
  // three tokens below are a property of shell output, not of this
  // particular transcript, and a data file listing character offsets would
  // rot the moment a line changed.
  let { code }: { code: string } = $props();

  type CodeToken = "cb-prompt" | "cb-arrow" | "cb-url";

  interface CodeSegment {
    text: string;
    // `null` where the segment is ordinary output and inherits the block's
    // own colour.
    token: CodeToken | null;
  }

  // Three things stand out of shell output: the prompt the reader typed at,
  // the arrow a dev server points with, and the URL it points at. The
  // prompt is anchored to the start of its line so `echo $HOME` stays plain
  // text. Both arrow codepoints are matched because Vite prints U+279C and
  // the mockup drew U+27A4.
  const TOKEN_PATTERN = /(?<=^[ \t]*)\$(?=[ \t]|$)|[➜➤]|https?:\/\/\S+/gm;

  function token_for(text: string): CodeToken {
    if (text === "$") {
      return "cb-prompt";
    }
    if (text.startsWith("http")) {
      return "cb-url";
    }
    return "cb-arrow";
  }

  function tokenize(transcript: string): CodeSegment[] {
    const segments: CodeSegment[] = [];
    let cursor = 0;

    for (const match of transcript.matchAll(TOKEN_PATTERN)) {
      const start = match.index;
      if (start > cursor) {
        segments.push({ text: transcript.slice(cursor, start), token: null });
      }
      segments.push({ text: match[0], token: token_for(match[0]) });
      cursor = start + match[0].length;
    }

    if (cursor < transcript.length) {
      segments.push({ text: transcript.slice(cursor), token: null });
    }

    return segments;
  }

  // A YAML block scalar always ends in a newline, which inside a `<pre>`
  // would render as a blank last line and a visible gap above the note.
  const segments = $derived(tokenize(code.replace(/\n+$/, "")));
</script>

<!-- Whitespace inside a `<pre>` is content, so the block below stays on one
     line however long it gets: a newline here would show up on the page. -->
<pre
  class="codeblock"
  style="--code-ground: {ELEVATION.void}; --code-hair: {ELEVATION.hair}; --code-text: {HUD_PALETTE.secondary}; --code-prompt: {HUD_PALETTE.accent}; --code-url: {HUD_PALETTE.text}; --code-arrow: {PIPELINE_INK.pass};"
><code>{#each segments as segment, index (index)}{#if segment.token}<span class={segment.token}>{segment.text}</span>{:else}{segment.text}{/if}{/each}</code></pre>

<style>
  /* The shallower of the section's two recesses: a plain hair of top light
     and no drop shadow, so it reads as sitting under the terminal rather
     than beside it. No border, no accent rail. */
  .codeblock {
    margin: 18px 0 0;
    background: var(--code-ground);
    border-radius: 3px;
    box-shadow: inset 0 1px 0 var(--code-hair);
    padding: 15px 16px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--code-text);
    overflow-x: auto;
  }

  .cb-prompt {
    color: var(--code-prompt);
  }

  .cb-url {
    color: var(--code-url);
  }

  .cb-arrow {
    color: var(--code-arrow);
  }
</style>
