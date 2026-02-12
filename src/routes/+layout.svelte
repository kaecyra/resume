<script lang="ts">
  import "../app.css";

  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
  {#if data.umami_url && data.umami_website_id}
    <script
      defer
      src="{data.umami_url}/insights.js"
      data-website-id={data.umami_website_id}
    ></script>
  {/if}
</svelte:head>

{@render children()}

<footer class="py-2 text-center text-xs text-gray-400 print:hidden">
  v{__APP_VERSION__}
</footer>
