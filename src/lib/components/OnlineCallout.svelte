<script lang="ts">
  let { url, text, qr_svg }: { url: string; text: string; qr_svg?: string } = $props();
</script>

<div class="hidden print:flex print:items-center print:gap-3 my-4 text-left text-xs opacity-70" style="font: inherit; background: none;">
  {#if qr_svg}
    <div class="qr-container shrink-0" aria-hidden="true">
      {@html qr_svg}
    </div>
  {/if}
  <div>
    <span>{text} </span>
    <a href={url} class="underline">{url}</a>
  </div>
</div>

<style>
  .qr-container {
    width: 4rem;
    height: 4rem;
  }

  .qr-container :global(svg) {
    width: 100%;
    height: 100%;
  }
</style>
