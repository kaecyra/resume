<script lang="ts">
  let { url, text }: { url: string; text: string } = $props();
</script>

<div class="hidden print:block my-4 text-left text-xs opacity-70" style="font: inherit; background: none;">
  <span>{text} </span>
  <a href={url} class="underline">{url}</a>
</div>
