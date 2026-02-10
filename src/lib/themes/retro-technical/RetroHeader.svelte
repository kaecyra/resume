<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, title }: { profile: Profile; title: string } = $props();
</script>

<style>
  h2 {
    font-family: var(--retro-heading-font);
  }
</style>

<section class="bg-[#1a2744] p-5">
  <div class="mb-1">
    <span class="text-[11px] uppercase tracking-[0.2em] text-[#8b9bb5]">Section 1.1</span>
    <h2 class="mt-1 text-base font-semibold uppercase tracking-[0.15em] text-[#e87a2e]">
      System Identification
    </h2>
  </div>

  <div class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">
      Designation
    </span>
    <span class="text-base text-[#f0e6d6]">{profile.name}</span>

    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">
      Function
    </span>
    <span class="text-base text-[#f0e6d6]">{title}</span>

    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">
      Location
    </span>
    <span class="text-base text-[#8b9bb5]">{profile.contact.address}</span>

    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">
      Signal
    </span>
    <span class="text-base text-[#8b9bb5]">{profile.contact.phone}</span>

    <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b9bb5]">
      Datalink
    </span>
    <span class="text-base text-[#8b9bb5]">{profile.contact.email}</span>
  </div>
</section>
