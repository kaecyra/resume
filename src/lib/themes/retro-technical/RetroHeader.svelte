<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, heading, title, subtitle, qr_svg }: { profile: Profile; heading: string; title: string; subtitle: string; qr_svg?: string } = $props();

  const initials = $derived(
    profile.name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
  );
</script>

<style>
  .retro-heading {
    font-family: var(--retro-heading-font);
  }

  .qr-box :global(svg) {
    width: 100%;
    height: 100%;
  }

  .qr-box :global(path) {
    stroke: var(--color-retro-muted) !important;
  }
</style>

<!-- Title bar -->
<div class="relative flex flex-col bg-retro-navy px-4 py-4 md:flex-row md:items-center md:gap-6 md:px-8 md:py-5 print:flex-row print:items-center print:gap-6 print:px-8 print:py-5">
  <div class="min-w-0 md:flex-1 print:flex-1">
    <h1 class="retro-heading text-lg uppercase tracking-[0.15em] text-retro-accent">
      {heading}

      <div class="mt-1 flex flex-wrap items-center gap-2 text-lg md:flex-nowrap md:gap-4 md:text-2xl">
        {#if qr_svg}
          <div
            class="hidden h-16 w-16 shrink-0 items-center justify-center border-2 border-double border-retro-accent bg-retro-navy-light md:flex print:hidden"
          >
            <span class="retro-heading pl-0.5 text-xl text-retro-accent">{initials}</span>
          </div>
          <div class="qr-box hidden h-16 w-16 shrink-0 items-center justify-center p-1 print:flex">
            {@html qr_svg}
          </div>
        {:else}
          <div
            class="hidden h-16 w-16 shrink-0 items-center justify-center border-2 border-double border-retro-accent bg-retro-navy-light md:flex print:flex"
          >
            <span class="retro-heading pl-0.5 text-xl text-retro-accent">{initials}</span>
          </div>
        {/if}
        <div>
          <span class="block font-bold text-retro-cream">{profile.name}</span>
          <span class="block text-retro-cream">{title}</span>
        </div>
      </div>
    </h1>
  </div>

  {#if profile.photo}
    <img
      src="/{profile.photo}"
      alt={profile.name}
      class="mx-auto mt-4 h-52 w-52 border-2 border-retro-accent object-cover md:absolute md:right-8 md:top-8 md:z-10 md:mt-0 md:mx-0 print:absolute print:right-8 print:top-8 print:z-10 print:mx-0 print:h-40 print:w-40"
    />
  {/if}
</div>

<!-- Subtitle bar -->
<div class="border-b-2 border-retro-accent-dark bg-retro-navy-light px-4 py-2 md:px-8">
  <span class="text-xs uppercase tracking-[0.25em] text-retro-muted">
    {subtitle}
  </span>
</div>

<!-- Contact info -->
<div class="flex gap-4 bg-retro-paper px-4 py-2 text-[11px] tracking-wide text-retro-navy/60 md:px-8">
  <span class="uppercase">{profile.contact.location}</span>
  {#if profile.contact.linkedin}
    <a href="https://{profile.contact.linkedin}" class="text-retro-navy/60 hover:text-retro-navy">{profile.contact.linkedin}</a>
  {/if}
</div>
