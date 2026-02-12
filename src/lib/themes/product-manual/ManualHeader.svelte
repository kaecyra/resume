<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, title }: { profile: Profile; title: string } = $props();
</script>

<header>
  <div class="bg-[#c4412b] px-8 py-3">
    <span class="font-sans text-2xl font-bold uppercase tracking-[0.25em] text-white">
      Technical
    </span>
  </div>
  <div class="bg-[#3d3d3d] px-8 py-1">
    <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-stone-400">
      Specifications
    </span>
  </div>

  <div class="px-8 pt-6 pb-4">
    <p class="text-[10px] uppercase tracking-[0.2em] text-stone-400">
      Technical Specifications:
    </p>
    <h1 class="mt-1 font-sans text-xl font-bold uppercase tracking-wide text-stone-800">
      {profile.name}
      <span class="mx-1 text-stone-400">|</span>
      <span class="text-stone-600">{title}</span>
    </h1>

    <div class="mt-3 flex items-center gap-3">
      <span
        class="inline-block bg-[#3d3d3d] px-2.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[#f5f0e8]"
      >
        Status: Deployed
      </span>
    </div>

    <div class="mt-5 grid grid-cols-3 gap-x-6 gap-y-2 border-t border-stone-300 pt-4">
      <div class="border-b border-stone-300 pb-1.5">
        <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-stone-400">Loc</span>
        <p class="mt-0.5 text-xs text-stone-700">{profile.contact.location}</p>
      </div>
      <div class="border-b border-stone-300 pb-1.5">
        <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-stone-400">Aph</span>
        <p class="mt-0.5 text-xs text-stone-700">{profile.contact.phone}</p>
      </div>
      <div class="border-b border-stone-300 pb-1.5">
        <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-stone-400">Sig</span>
        <p class="mt-0.5 text-xs text-stone-700">{profile.contact.email}</p>
      </div>
    </div>
  </div>
</header>
