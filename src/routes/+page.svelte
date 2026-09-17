<script lang="ts">
  import { track_pdf_download } from "$lib/analytics.js";
  import { format_markdown } from "$lib/format.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const summary_paragraphs = $derived(data.summary.split("\n\n").filter((p) => p.trim()));
</script>

<svelte:head>
  <title>{data.og.title}</title>
  <meta name="version" content={__APP_VERSION__} />
  <meta name="description" content={data.og.description} />

  <meta property="og:type" content="website" />
  <meta property="og:title" content={data.og.title} />
  <meta property="og:description" content={data.og.description} />
  <meta property="og:image" content={data.og.image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={data.og.title} />
  {#if data.og.url}
    <meta property="og:url" content={data.og.url} />
    <link rel="canonical" href={data.og.url} />
  {/if}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.og.title} />
  <meta name="twitter:description" content={data.og.description} />
  <meta name="twitter:image" content={data.og.image} />

  <meta name="theme-color" content="#0b0b0c" />

  {@html `<script type="application/ld+json">${JSON.stringify(data.jsonld.person)}</script>`}
  {@html `<script type="application/ld+json">${JSON.stringify(data.jsonld.webpage)}</script>`}
</svelte:head>

<main id="main-content" class="landing">
  <div class="landing-content">
    <p class="landing-role">{data.title}</p>
    <h1 class="landing-name">{data.profile.name}</h1>

    {#if data.tagline}
      <p class="landing-tagline">{@html format_markdown(data.tagline.trim())}</p>
    {/if}

    {#each summary_paragraphs as paragraph}
      <p class="landing-summary">{@html format_markdown(paragraph.trim())}</p>
    {/each}

    <div class="landing-actions">
      <a class="landing-cta" href="/default">View the full resume</a>
      <a
        class="landing-download"
        href="/default.pdf"
        download="{data.profile.name} - Resume - {data.title}.pdf"
        onclick={() => track_pdf_download({ variant: "default", type: "resume", slug: "default" })}
      >
        Download PDF
      </a>
    </div>
  </div>
</main>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #0b0b0c;
    color: #f5f5f5;
    padding: 2rem 1.5rem;
  }

  .landing-content {
    max-width: 42rem;
  }

  .landing-role {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #9a9a9a;
    margin: 0 0 0.5rem;
  }

  .landing-name {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 1.5rem;
  }

  .landing-tagline {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0 0 1rem;
  }

  .landing-summary {
    font-size: 1rem;
    line-height: 1.6;
    color: #cccccc;
    margin: 0 0 1rem;
  }

  .landing-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .landing-cta {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background-color: #f5f5f5;
    color: #0b0b0c;
    font-weight: 600;
    text-decoration: none;
    border-radius: 0.25rem;
    transition: opacity 0.15s ease;
  }

  .landing-cta:hover {
    opacity: 0.85;
  }

  .landing-download {
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #f5f5f5;
    text-decoration: underline;
    transition: opacity 0.15s ease;
  }

  .landing-download:hover {
    opacity: 0.7;
  }
</style>
