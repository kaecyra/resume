<script lang="ts">
  import "../app.css";

  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
  {#if data.umami_website_id}
    <script
      defer
      src="/insights.js"
      data-website-id={data.umami_website_id}
    ></script>
  {/if}
</svelte:head>

<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-lg print:hidden"
>
  Skip to content
</a>

{@render children()}

<footer data-global-version class="py-2 text-center text-xs text-gray-400 print:hidden">
  v{__APP_VERSION__}
</footer>
