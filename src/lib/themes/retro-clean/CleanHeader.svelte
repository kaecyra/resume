<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, title, qr_svg }: { profile: Profile; title: string; qr_svg?: string } = $props();
</script>

<style>
  .qr-box :global(svg) {
    width: 100%;
    height: 100%;
  }

  .qr-box :global(path) {
    stroke: var(--color-clean-secondary) !important;
  }
</style>

<header class="pt-8 pb-4 print:pt-8">
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0 flex-1">
      <h1 class="text-4xl font-semibold uppercase tracking-wide text-clean-ink md:text-5xl" style="font-family: var(--retro-heading-font);">
        {profile.name}
      </h1>
      <p class="mt-1 text-xl uppercase tracking-[0.12em] text-clean-accent" style="font-family: var(--retro-heading-font);">
        {title}
      </p>
      <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-clean-secondary">
        <span>{profile.contact.email}</span>
        <span>{profile.contact.location}</span>
        {#if profile.contact.linkedin}
          <a href="https://{profile.contact.linkedin}" class="text-clean-secondary hover:text-clean-ink">{profile.contact.linkedin}</a>
        {/if}
      </div>
    </div>

    {#if profile.photo}
      <img
        src="/{profile.photo}"
        alt={profile.name}
        class="hidden h-28 w-28 shrink-0 border-2 border-clean-accent object-cover md:block print:block print:h-24 print:w-24"
      />
    {/if}

    {#if qr_svg}
      <div class="qr-box hidden h-20 w-20 shrink-0 p-1 print:block" aria-hidden="true">
        {@html qr_svg}
      </div>
    {/if}
  </div>

  <div class="mt-5 h-[3px] bg-clean-accent"></div>
</header>
