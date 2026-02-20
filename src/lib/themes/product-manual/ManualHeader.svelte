<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, title, subtitle, badge, qr_svg }: { profile: Profile; title: string; subtitle: string; badge?: string; qr_svg?: string } = $props();

  const has_linkedin = $derived(!!profile.contact.linkedin);
</script>

<header>
  <div class="bg-[#c4412b] px-8 py-3">
    <h1 class="font-sans text-2xl font-bold uppercase tracking-[0.25em] text-white">
      {profile.name}
    </h1>
    <p class="mt-0.5 font-sans text-xs uppercase tracking-[0.2em] text-white/70">
      {title}
    </p>
  </div>
  <div class="bg-[#3d3d3d] px-8 py-1">
    <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-stone-400">
      {subtitle}
    </span>
  </div>

  <div class="px-8 pt-6 pb-4">
    <div class="flex items-stretch gap-6">
      {#if profile.photo}
        <img
          src="/{profile.photo}"
          alt={profile.name}
          class="h-32 w-32 shrink-0 border border-stone-300 object-cover"
        />
      {/if}
      <div class="min-w-0 flex-1 flex flex-col">
        {#if badge}
          <span
            class="inline-block self-start bg-[#3d3d3d] px-2.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[#f5f0e8]"
          >
            {badge}
          </span>
        {/if}

        <div class="mt-auto flex flex-col gap-1.5">
          <div class="flex items-baseline gap-2">
            <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Loc</span>
            <span class="text-sm text-stone-700">{profile.contact.location}</span>
          </div>
          {#if has_linkedin}
            <div class="flex items-baseline gap-2">
              <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Lnk</span>
              <span class="text-sm text-stone-700">
                <a
                  href="https://{profile.contact.linkedin}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-stone-700 underline hover:text-[#c4412b]"
                >{profile.contact.linkedin}</a>
              </span>
            </div>
          {/if}
          <div class="flex items-baseline gap-2">
            <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Sig</span>
            <span class="text-sm text-stone-700">{profile.contact.email}</span>
          </div>
        </div>
      </div>
    {#if qr_svg}
      <div class="qr-box hidden shrink-0 print:block" aria-hidden="true">
        {@html qr_svg}
      </div>
    {/if}
    </div>
  </div>
</header>

<style>
  .qr-box {
    width: 4rem;
    height: 4rem;
  }

  .qr-box :global(svg) {
    width: 100%;
    height: 100%;
  }

  .qr-box :global(path) {
    stroke: #c4412b !important;
  }
</style>
