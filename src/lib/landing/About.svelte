<script lang="ts">
  import type { LandingAbout } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let { about }: { about: LandingAbout } = $props();
</script>

<!-- The band that opens the section (#241). Same inverted treatment as
     Divider.svelte's hero band, and a `div` for the same reason: it has no
     heading of its own. It lists what the section covers, so Pipelines and
     Off the Clock read as two sections rather than one long dark run. -->
<div class="about-band" style="--hud-text: {HUD_PALETTE.text}; --hud-bg: {HUD_PALETTE.background};">
  <ul class="about-interests">
    {#each about.interests as interest (interest)}
      <li>{interest}</li>
    {/each}
  </ul>
</div>

<section
  id="about"
  class="about"
  aria-labelledby="about-heading"
  style="--hud-bg: {HUD_PALETTE.background}; --hud-text: {HUD_PALETTE.text}; --hud-secondary: {HUD_PALETTE.secondary};"
>
  <h2 id="about-heading" class="about-heading">{about.heading}</h2>

  <div class="about-body">
    <img class="about-portrait" src={about.portrait.src} alt={about.portrait.alt} width="240" height="240" />

    <div class="about-prose">
      <p class="about-lead">{about.lead}</p>
      {#each about.paragraphs as paragraph (paragraph)}
        <p>{paragraph}</p>
      {/each}
    </div>
  </div>

  <!-- One strip: photos on the left, covers pushed to the right, every
       image the same height. Each item's width comes from its own aspect
       ratio against the shared --strip-h, which is what keeps the two
       groups level without cropping a cover to fit. -->
  <div class="about-media">
    {#if about.photos.length > 0}
      <div class="about-group about-photos">
        <h3 class="about-label">{about.photos_label}</h3>
        <ul class="about-row">
          {#each about.photos as photo (photo.id)}
            <li class="about-item about-item-photo">
              <figure class="about-figure">
                <img class="about-frame" src={photo.src} alt={photo.alt} loading="lazy" />
                <figcaption class="about-caption">{photo.caption}</figcaption>
              </figure>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if about.books.length > 0}
      <div class="about-group about-books">
        <h3 class="about-label">{about.books_label}</h3>
        <ul class="about-row">
          {#each about.books as book (book.id)}
            <li class="about-item about-item-book">
              {#if book.url}
                <a class="about-book" href={book.url} target="_blank" rel="noopener noreferrer">
                  <img class="about-frame" src={book.cover} alt={book.cover_alt} loading="lazy" />
                  <span class="about-book-text">
                    <span class="about-book-title">{book.title}</span>
                    <span class="about-book-author">{book.author}</span>
                  </span>
                </a>
              {:else}
                <div class="about-book">
                  <img class="about-frame" src={book.cover} alt={book.cover_alt} loading="lazy" />
                  <span class="about-book-text">
                    <span class="about-book-title">{book.title}</span>
                    <span class="about-book-author">{book.author}</span>
                  </span>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</section>

<style>
  .about-band {
    padding: 0.875rem 2.5rem;
    background: var(--hud-text);
    color: var(--hud-bg);
  }

  .about-interests {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.75rem;
    /* Short all-caps labels, tracked the way Divider's location is. */
    font-size: 0.8125rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .about {
    padding: 5rem 2.5rem 5.5rem;
    background: var(--hud-bg);
  }

  .about-heading {
    margin: 0 0 3rem;
    font-family: "Archivo Black", Impact, sans-serif;
    font-weight: 400;
    /* Same scale as .work-heading, its neighbour below. */
    font-size: clamp(2.5rem, 8vw, 4rem);
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    color: var(--hud-text);
  }

  .about-body {
    display: grid;
    grid-template-columns: minmax(0, 15rem) minmax(0, 38rem);
    gap: 3rem;
    align-items: start;
  }

  .about-portrait {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    box-shadow: 0 24px 48px -28px rgba(0, 0, 0, 0.85);
  }

  .about-prose {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .about-prose p {
    margin: 0;
    max-width: 62ch;
    font-size: 1.0625rem;
    line-height: 1.65;
    color: var(--hud-secondary);
  }

  /* The lead line is the block's one strong contrast: a size step and full
     text colour, rather than a box drawn around the copy. */
  .about-prose .about-lead {
    font-size: clamp(1.25rem, 2.4vw, 1.5rem);
    line-height: 1.45;
    color: var(--hud-text);
  }

  .about-media {
    --strip-h: clamp(7rem, 10vw, 11rem);
    margin-top: 4.5rem;
    display: flex;
    align-items: flex-end;
    gap: 4rem;
  }

  .about-group {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* margin-left: auto rather than space-between on the parent, so the
     covers stay right-aligned when there are no photos to push them. */
  .about-books {
    margin-left: auto;
    align-items: flex-end;
  }

  .about-label {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--hud-secondary);
  }

  .about-row {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    align-items: flex-start;
    gap: 2rem;
  }

  .about-item-photo {
    width: calc(var(--strip-h) * 4 / 3);
  }

  .about-item-book {
    width: calc(var(--strip-h) * 2 / 3);
  }

  .about-figure,
  .about-book {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .about-frame {
    display: block;
    width: 100%;
    height: var(--strip-h);
    object-fit: cover;
    /* A physical shadow, black at low alpha, same convention as Work's
       raised card. No frame around the image. */
    box-shadow:
      0 20px 40px -24px rgba(0, 0, 0, 0.9),
      0 5px 14px -8px rgba(0, 0, 0, 0.7);
    transition:
      transform 0.25s ease,
      box-shadow 0.25s ease;
  }

  .about-caption {
    font-size: 0.8125rem;
    line-height: 1.35;
    color: var(--hud-secondary);
  }

  a.about-book {
    color: inherit;
    /* No underline on landing-page links (owner request, post-#187). */
    text-decoration: none;
  }

  a.about-book:hover .about-frame,
  a.about-book:focus-visible .about-frame {
    transform: translateY(-4px);
    box-shadow:
      0 28px 48px -24px rgba(0, 0, 0, 0.95),
      0 8px 18px -8px rgba(0, 0, 0, 0.75);
  }

  .about-book-title {
    display: block;
    font-family: "Archivo Black", Impact, sans-serif;
    font-size: 0.8125rem;
    line-height: 1.1;
    text-transform: uppercase;
    color: var(--hud-text);
    transition: color 0.2s ease;
  }

  a.about-book:hover .about-book-title {
    color: var(--hud-secondary);
  }

  .about-book-author {
    display: block;
    margin-top: 0.3rem;
    font-size: 0.75rem;
    color: var(--hud-secondary);
  }

  @media (prefers-reduced-motion: reduce) {
    .about-frame,
    .about-book-title {
      transition: none;
    }

    a.about-book:hover .about-frame,
    a.about-book:focus-visible .about-frame {
      transform: none;
    }
  }

  /* Below 1000px the strip no longer fits on one line: each group takes
     the full width, three across, and heights come from aspect ratios
     instead of --strip-h. */
  @media (max-width: 1000px) {
    .about-media {
      flex-direction: column;
      align-items: stretch;
      gap: 3rem;
    }

    .about-books {
      margin-left: 0;
      align-items: stretch;
    }

    .about-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.5rem;
    }

    .about-item-photo,
    .about-item-book {
      width: auto;
    }

    .about-item-photo .about-frame {
      height: auto;
      aspect-ratio: 4 / 3;
    }

    .about-item-book .about-frame {
      height: auto;
      aspect-ratio: 2 / 3;
    }
  }

  @media (max-width: 760px) {
    .about {
      padding: 3.5rem 1.25rem 4rem;
    }

    .about-band {
      padding: 0.875rem 1.25rem;
    }

    .about-heading {
      margin-bottom: 2rem;
    }

    .about-body {
      grid-template-columns: minmax(0, 1fr);
      gap: 2rem;
    }

    .about-portrait {
      max-width: 11rem;
    }

    .about-media {
      margin-top: 3rem;
    }
  }
</style>
