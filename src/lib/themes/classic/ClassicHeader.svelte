<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, title }: { profile: Profile; title?: string } = $props();
</script>

<header class="mb-6 border-b border-gray-300 pb-6">
  <div class="flex items-start gap-6">
    {#if profile.photo}
      <img
        src="/{profile.photo}"
        alt={profile.name}
        class="h-24 w-24 shrink-0 border border-gray-300 object-cover"
      />
    {/if}
    <div class="min-w-0 flex-1">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900">{profile.name}</h1>
      {#if title}
        <p class="mt-1 text-xl text-gray-500">{title}</p>
      {/if}
      <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
        <span>{profile.contact.email}</span>
        <span>{profile.contact.location}</span>
        {#if profile.contact.linkedin}
          <a href="https://{profile.contact.linkedin}" class="text-gray-600 hover:text-gray-900">{profile.contact.linkedin}</a>
        {/if}
      </div>
    </div>
  </div>
</header>
