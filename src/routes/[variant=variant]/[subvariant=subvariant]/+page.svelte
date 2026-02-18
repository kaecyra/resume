<script lang="ts">
  import { get_theme, get_theme_favicon } from "$lib/themes/index.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const Theme = $derived(get_theme(data.resume.theme));
  const theme_favicon = $derived(get_theme_favicon(data.resume.theme));
</script>

<svelte:head>
  <title>{data.og.title}</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="version" content={__APP_VERSION__} />
  <meta name="description" content={data.og.description} />

  <meta property="og:type" content="website" />
  <meta property="og:title" content={data.og.title} />
  <meta property="og:description" content={data.og.description} />
  <meta property="og:image" content={data.og.image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={data.og.title} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.og.title} />
  <meta name="twitter:description" content={data.og.description} />
  <meta name="twitter:image" content={data.og.image} />

  <meta name="theme-color" content={data.theme_color} />

  {#if theme_favicon}
    <link rel="icon" type="image/svg+xml" href={theme_favicon} />
  {/if}

  {@html `<script type="application/ld+json">${JSON.stringify(data.jsonld.person)}</script>`}
  {@html `<script type="application/ld+json">${JSON.stringify(data.jsonld.webpage)}</script>`}
  {@html `<style>body { background-color: ${data.palette.page_background}; }</style>`}
</svelte:head>

<div class="resume-tools" style="max-width: {data.palette.content_width};">
  <a
    class="resume-tools-link"
    href={data.job_url}
    target="_blank"
    rel="noopener noreferrer"
    style="color: {data.palette.secondary};"
  >
    {data.job_url}
  </a>
  {#if data.has_cover_letter}
    <a
      class="resume-tools-link"
      href="/{data.variant_name}/letter"
      style="color: {data.palette.accent};"
    >
      View Cover Letter
    </a>
  {/if}
  <a
    class="resume-tools-link"
    href="/{data.variant_name}.pdf"
    download
    style="color: {data.palette.accent};"
  >
    Download PDF
  </a>
</div>

<Theme resume={data.resume} />

<style>
  .resume-tools {
    display: flex;
    justify-content: space-between;
    margin: 0 auto;
    padding: 0.5rem 0;
  }

  .resume-tools-link {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-decoration: none;
    transition: opacity 0.15s ease;
  }

  .resume-tools-link:hover {
    opacity: 0.7;
  }

  @media print {
    .resume-tools {
      display: none;
    }
  }
</style>
