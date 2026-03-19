<script lang="ts">
  import type { Contact } from "$lib/types.js";

  let { contact }: { contact: Contact } = $props();
</script>

<footer class="mt-8 border-t-[3px] border-clean-accent py-4">
  <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-clean-secondary">
    <span>{contact.email}</span>
    <span class="text-clean-accent">&diamond;</span>
    <span>{contact.location}</span>
    {#if contact.linkedin}
      <span class="text-clean-accent">&diamond;</span>
      <a href="https://{contact.linkedin}" class="text-clean-secondary hover:text-clean-ink">{contact.linkedin}</a>
    {/if}
  </div>
</footer>
