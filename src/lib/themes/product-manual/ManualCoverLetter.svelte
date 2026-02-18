<script lang="ts">
  import type { CoverLetterProps } from "$lib/themes/index.js";
  import { format_markdown } from "$lib/format.js";

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
    <!-- Header -->
    <header>
      <div class="bg-[#c4412b] px-8 py-3">
        <span class="font-sans text-2xl font-bold uppercase tracking-[0.25em] text-white">
          {profile.name}
        </span>
        <p class="mt-0.5 font-sans text-xs uppercase tracking-[0.2em] text-white/70">
          Cover Letter
        </p>
      </div>
      <div class="bg-[#3d3d3d] px-8 py-1">
        <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-stone-400">
          Re: {job.title} at {job.company}
        </span>
      </div>
    </header>

    <!-- Contact info -->
    <div class="px-8 pt-6 pb-2">
      <div class="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div class="flex items-baseline gap-2">
          <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Sig</span>
          <span class="text-sm text-stone-700">{profile.contact.email}</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Aph</span>
          <span class="text-sm text-stone-700">{profile.contact.phone}</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Loc</span>
          <span class="text-sm text-stone-700">{profile.contact.location}</span>
        </div>
        {#if profile.contact.linkedin}
          <div class="flex items-baseline gap-2">
            <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Lnk</span>
            <span class="text-sm text-stone-700">
              <a href="https://{profile.contact.linkedin}" class="text-stone-700 underline hover:text-[#c4412b]">{profile.contact.linkedin}</a>
            </span>
          </div>
        {/if}
      </div>
    </div>

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
    </div>
  </div>
</div>
