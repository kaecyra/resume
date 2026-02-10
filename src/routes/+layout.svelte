<script>
  import "../app.css";

  let { children } = $props();
</script>

{@render children()}

<footer class="py-2 text-center text-xs text-gray-400 print:hidden">
  v{__APP_VERSION__}
</footer>
