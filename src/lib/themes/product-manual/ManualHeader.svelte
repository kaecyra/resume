<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, title }: { profile: Profile; title: string } = $props();

  const has_linkedin = $derived(!!profile.contact.linkedin);
</script>

<header>
  <div class="bg-[#c4412b] px-8 py-3">
    <span class="font-sans text-2xl font-bold uppercase tracking-[0.25em] text-white">
      {profile.name}
    </span>
    <p class="mt-0.5 font-sans text-xs uppercase tracking-[0.2em] text-white/70">
      {title}
    </p>
  </div>
  <div class="bg-[#3d3d3d] px-8 py-1">
    <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-stone-400">
      Technical Specifications
    </span>
  </div>

  <div class="px-8 pt-6 pb-4">
    <div class="flex items-start gap-6">
      {#if profile.photo}
        <img
          src={profile.photo}
          alt={profile.name}
          class="h-32 w-32 shrink-0 border border-stone-300 object-cover"
        />
      {/if}
      <div class="min-w-0 flex-1">
        <span
          class="inline-block bg-[#3d3d3d] px-2.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[#f5f0e8]"
        >
          Status: Deployed
        </span>

        <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div class="flex items-baseline gap-2">
            <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Loc</span>
            <span class="text-sm text-stone-700">{profile.contact.location}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Aph</span>
            <span class="text-sm text-stone-700">{profile.contact.phone}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="inline-block w-10 shrink-0 bg-stone-200 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Sig</span>
            <span class="text-sm text-stone-700">{profile.contact.email}</span>
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
        </div>
      </div>
    </div>
  </div>
</header>
