<script lang="ts">
  import { page } from "$app/stores";
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100">
  <div class="text-center">
    <h1 class="text-8xl font-bold tracking-tight text-gray-900">
      {$page.status}
    </h1>
    <p class="mt-4 text-xl text-gray-500">
      {$page.error?.message}
    </p>
    <a
      href="/"
      class="mt-8 inline-block text-sm text-gray-600 underline hover:text-gray-900"
    >
      Back to home
    </a>
  </div>
</div>
