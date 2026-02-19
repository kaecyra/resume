<script lang="ts">
  import type { CoverLetterProps } from "$lib/themes/index.js";
  import { format_markdown } from "$lib/format.js";
  import AiDisclosure from "$lib/components/AiDisclosure.svelte";
  import ManualHeader from "./ManualHeader.svelte";

  let { profile, job, cover_letter }: CoverLetterProps = $props();

  const greeting = $derived(cover_letter.greeting ?? "Dear Hiring Manager,");
  const closing = $derived(cover_letter.closing ?? "Sincerely,");
  const paragraphs = $derived(cover_letter.body.split("\n\n").filter((p) => p.trim()));
</script>

<div class="min-h-screen bg-[#8a9aa4] pb-10 print:min-h-0 print:py-0">
  <div
    class="mx-auto max-w-4xl border border-[#c5bfb3] bg-[#f5f0e8] shadow-xl print:max-w-none print:border-none print:shadow-none"
    style="font-family: 'Share Tech Mono', ui-monospace, monospace;"
  >
    <ManualHeader {profile} title="Cover Letter" subtitle="Re: {job.title} at {job.company}" />

    <!-- Letter body -->
    <div class="px-8 pb-8 pt-4">
      <div class="mb-3 border-b border-stone-300 pb-1">
        <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">
          Correspondence:
        </h2>
      </div>

      <p class="mb-4 text-sm leading-relaxed text-stone-700">{greeting}</p>

      {#each paragraphs as paragraph}
        <p class="mb-4 text-sm leading-relaxed text-stone-700">{@html format_markdown(paragraph.trim())}</p>
      {/each}

      <div class="mt-8">
        <p class="text-sm text-stone-700">{closing}</p>
        <p class="mt-4 text-sm font-bold text-stone-900">{profile.name}</p>
      </div>

      <AiDisclosure />
    </div>
  </div>
</div>
