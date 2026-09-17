<script lang="ts">
  import { track_pdf_download } from "$lib/analytics.js";
  import { format_markdown } from "$lib/format.js";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
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

  <meta name="theme-color" content="#1a2744" />

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
  :global(body) {
    background-color: var(--color-retro-navy);
  }

  .landing {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-retro-navy);
    color: var(--color-retro-cream);
    padding: 2rem 1.5rem;
  }

  .landing-content {
    width: 100%;
    max-width: 42rem;
    min-width: 0;
  }

  .landing-role {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-retro-muted);
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
    color: var(--color-retro-accent);
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
    background-color: var(--color-retro-accent);
    color: var(--color-retro-navy);
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
    color: var(--color-retro-accent);
    text-decoration: underline;
    transition: opacity 0.15s ease;
  }

  .landing-download:hover {
    opacity: 0.7;
  }
</style>
