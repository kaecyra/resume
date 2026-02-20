<script lang="ts">
  import { onMount } from "svelte";

  import { track_letter_view, track_pdf_download } from "$lib/analytics.js";
  import { get_cover_letter_theme, get_theme_favicon } from "$lib/themes/index.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const CoverLetterTheme = $derived(get_cover_letter_theme(data.theme));
  const theme_favicon = $derived(get_theme_favicon(data.theme));

  onMount(() => {
    track_letter_view({
      variant: data.variant_parent,
      slug: data.variant_slug,
      company: data.job.company,
      title: data.job.title,
    });
  });
</script>

<svelte:head>
  <title>{data.profile.name} - Cover Letter - {data.job.title} @ {data.job.company}</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="version" content={__APP_VERSION__} />
  <meta name="theme-color" content={data.theme_color} />

  {#if theme_favicon}
    <link rel="icon" type="image/svg+xml" href={theme_favicon} />
  {/if}

  {@html `<style>body { background-color: ${data.palette.page_background}; }</style>`}
</svelte:head>

<div class="resume-tools" style="max-width: {data.palette.content_width};">
  <a
    class="resume-tools-link"
    href={data.job.url}
    target="_blank"
    rel="noopener noreferrer"
    style="color: {data.palette.secondary}; font-weight: normal; text-transform: lowercase;"
  >
    {data.job.url}
  </a>
  <a
    class="resume-tools-link"
    href="/{data.variant_name}-letter.pdf"
    download="{data.profile.name} - Letter - {data.job.title} @ {data.job.company}.pdf"
    style="color: {data.palette.accent};"
    onclick={() => track_pdf_download({
      variant: data.variant_parent,
      type: "letter",
      slug: data.variant_slug,
      company: data.job.company,
      title: data.job.title,
    })}
  >
    Download PDF
  </a>
</div>

<CoverLetterTheme profile={data.profile} job={data.job} cover_letter={data.cover_letter} />

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
