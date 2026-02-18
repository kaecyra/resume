<script lang="ts">
  import type { CoverLetterProps } from "$lib/themes/index.js";
  import { format_markdown } from "$lib/format.js";

  let { profile, job, cover_letter }: CoverLetterProps = $props();

  const greeting = $derived(cover_letter.greeting ?? "Dear Hiring Manager,");
  const closing = $derived(cover_letter.closing ?? "Sincerely,");
  const paragraphs = $derived(cover_letter.body.split("\n\n").filter((p) => p.trim()));
</script>

<div class="mx-auto max-w-4xl px-8 pb-8 text-gray-800 print:max-w-none print:px-12 print:py-8">
  <header class="mb-8 border-b border-gray-300 pb-6">
    <h1 class="text-4xl font-bold tracking-tight text-gray-900">{profile.name}</h1>
    <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
      <span>{profile.contact.email}</span>
      <span>{profile.contact.phone}</span>
      <span>{profile.contact.location}</span>
    </div>
  </header>

  <div class="mb-6 text-sm text-gray-600">
    <p>Re: {job.title} at {job.company}</p>
  </div>

  <p class="mb-4 text-sm leading-relaxed text-gray-700">{greeting}</p>

  {#each paragraphs as paragraph}
    <p class="mb-4 text-sm leading-relaxed text-gray-700">{@html format_markdown(paragraph.trim())}</p>
  {/each}

  <div class="mt-8">
    <p class="text-sm text-gray-700">{closing}</p>
    <p class="mt-4 text-sm font-semibold text-gray-900">{profile.name}</p>
  </div>
</div>
