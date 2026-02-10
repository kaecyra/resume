<script lang="ts">
  import type { Profile } from "$lib/types.js";

  let { profile, title }: { profile: Profile; title: string } = $props();
</script>

<header class="mb-6 border-b border-gray-300 pb-6">
  <h1 class="text-4xl font-bold tracking-tight text-gray-900">{profile.name}</h1>
  <p class="mt-1 text-xl text-gray-500">{title}</p>
  <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
    <span>{profile.contact.email}</span>
    <span>{profile.contact.phone}</span>
    <span>{profile.contact.address}</span>
  </div>
</header>
