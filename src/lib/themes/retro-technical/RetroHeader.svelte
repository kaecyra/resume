<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, title }: { profile: Profile; title: string } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section class="bg-retro-navy p-5 print:break-inside-avoid">
  <div class="mb-1">
    <span class="text-[11px] uppercase tracking-[0.2em] text-retro-muted">Section 1.1</span>
    <h2 class="mt-1 text-base font-semibold uppercase tracking-[0.15em] text-retro-accent">
      System Identification
    </h2>
  </div>

  <div class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">
      Designation
    </span>
    <span class="text-base text-retro-cream">{profile.name}</span>

    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">
      Function
    </span>
    <span class="text-base text-retro-cream">{title}</span>

    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">
      Location
    </span>
    <span class="text-base text-retro-muted">{profile.contact.location}</span>

    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">
      Signal
    </span>
    <span class="text-base text-retro-muted">{profile.contact.phone}</span>

    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-retro-muted">
      Datalink
    </span>
    <span class="text-base text-retro-muted">{profile.contact.email}</span>
  </div>
</section>
