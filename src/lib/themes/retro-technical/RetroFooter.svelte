<script lang="ts">
  import type { Contact } from "$lib/types.js";

  let { contact }: { contact: Contact } = $props();
</script>

<div class="border-t-2 border-retro-accent-dark bg-retro-navy px-4 py-3 md:px-8">
  <div class="flex flex-col items-center gap-1 text-center text-xs uppercase tracking-[0.2em] text-retro-muted md:flex-row md:justify-center md:gap-6">
    <span>Manufacturer Contact:</span>
    <span class="text-retro-cream">{contact.email}</span>
    <span class="hidden text-retro-accent md:inline">|</span>
    <span class="text-retro-cream">{contact.location}</span>
    {#if contact.linkedin}
      <span class="hidden text-retro-accent md:inline">|</span>
      <a href="https://{contact.linkedin}" class="text-retro-cream hover:text-white">{contact.linkedin}</a>
    {/if}
  </div>
</div>
