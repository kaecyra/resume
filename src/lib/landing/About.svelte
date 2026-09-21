<script lang="ts">
  import type { LandingAbout, LandingBook, LandingPhoto } from "$lib/types.js";

  import { HUD_PALETTE } from "./palette.js";

  let { about }: { about: LandingAbout } = $props();

  // The lightbox. A native <dialog> opened with showModal() brings the
  // darkened ::backdrop, Esc to close and focus containment with it, so
  // none of that is hand-rolled here.
  let lightbox: HTMLDialogElement | undefined = $state();
  let shown_photo: LandingPhoto | null = $state(null);

  function large_src(photo: LandingPhoto): string {
    return photo.full_src ?? photo.src;
  }

  function open_photo(event: MouseEvent, photo: LandingPhoto) {
    // A modified click keeps the link's own behaviour: a new tab, a
    // download. Only a plain click becomes the lightbox.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    shown_photo = photo;
    lightbox?.showModal();
  }

  // The dialog is sized to its content, so a click that lands on the
  // <dialog> element itself, rather than on the image or caption inside
  // it, is a click on the backdrop.
  function close_on_backdrop(event: MouseEvent) {
    if (event.target === lightbox) {
      lightbox?.close();
    }
  }
</script>

{#snippet book_content(book: LandingBook)}
  <img class="about-frame" src={book.cover} alt={book.cover_alt} loading="lazy" />
  <span class="about-book-text">
    <span class="about-book-title">{book.title}</span>
    <span class="about-book-author">{book.author}</span>
  </span>
{/snippet}

<!-- The band that opens the section (#241). Same inverted treatment as
     Divider.svelte's hero band, and a `div` for the same reason: it has no
     heading of its own. It lists what the section covers, so Pipelines and
     Off the Clock read as two sections rather than one long dark run. -->
<div class="about-band" style="--hud-text: {HUD_PALETTE.text}; --hud-bg: {HUD_PALETTE.background};">
  <ul class="about-interests">
    {#each about.interests as interest, index (index)}
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
  <div class="about-wrap">
    <h2 id="about-heading" class="about-heading">{about.heading}</h2>

    <div class="about-body">
      <img class="about-portrait" src={about.portrait.src} alt={about.portrait.alt} width="240" height="240" />

      <div class="about-prose">
        <p class="about-lead">{about.lead}</p>
        {#each about.paragraphs as paragraph, index (index)}
          <p>{paragraph}</p>
        {/each}
      </div>
    </div>

    <!-- One strip: photos on the left, covers pushed to the right, every
         image the same height. Each item's width comes from its own aspect
         ratio against the shared --strip-h, which is what keeps the two
         groups level without cropping anything to fit. Photos take their
         ratio from their own width/height attributes, so a portrait photo
         stays portrait; covers share one 2:3 ratio. -->
    <div class="about-media">
      {#if about.photos.length > 0}
        <div class="about-group about-photos">
          <h3 class="about-label">{about.photos_label}</h3>
          <ul class="about-row">
            {#each about.photos as photo (photo.id)}
              <li class="about-item about-item-photo" style="--ratio: {photo.width / photo.height};">
                <figure class="about-figure">
                  <!-- A real link to the large image, so the photo still opens
                       with JS off; with JS a plain click opens the lightbox. -->
                  <a class="about-photo-link" href={large_src(photo)} onclick={(event) => open_photo(event, photo)}>
                    <img
                      class="about-frame"
                      src={photo.src}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                    />
                  </a>
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
                    {@render book_content(book)}
                  </a>
                {:else}
                  <div class="about-book">
                    {@render book_content(book)}
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <dialog
    bind:this={lightbox}
    class="about-lightbox"
    aria-label={shown_photo?.alt}
    onclick={close_on_backdrop}
    onclose={() => (shown_photo = null)}
  >
    {#if shown_photo}
      <figure class="about-lightbox-figure">
        <img class="about-lightbox-image" src={large_src(shown_photo)} alt={shown_photo.alt} />
        <figcaption class="about-caption">{shown_photo.caption}</figcaption>
      </figure>
    {/if}
  </dialog>
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
    padding-block: 5rem 5.5rem;
    background: var(--hud-bg);
  }

  /* Same measure as Pipeline.svelte's .wrap, the section above, so the two
     share a left edge. The band stays full-bleed like the hero divider. */
  .about-wrap {
    max-width: 1180px;
    margin: 0 auto;
    padding-inline: 40px;
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
    /* The cap is what keeps the whole strip - every photo and cover at this
       height, plus the gaps - inside .about-wrap's 1100px of content. Add
       items and it has to come down, or the strip overflows before the
       1100px breakpoint stacks it. */
    --strip-h: clamp(7rem, 10vw, 8rem);
    margin-top: 4.5rem;
    display: flex;
    /* Top, not bottom: the two groups' captions differ in height (a book
       has title and author), so bottom-aligning pushed the photos down. */
    align-items: flex-start;
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

  /* Width set outright from the photo's own ratio, the same way covers
     get theirs. Leaving it to the browser does not work: the figure is a
     column flexbox, which stretches an auto-width image to the figure's
     width, and that width came from the caption. */
  .about-item-photo {
    flex: none;
    width: calc(var(--strip-h) * var(--ratio));
  }

  .about-item-book {
    flex: none;
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

  .about-photo-link {
    display: block;
    cursor: zoom-in;
  }

  .about-photo-link:hover .about-frame,
  .about-photo-link:focus-visible .about-frame {
    transform: translateY(-4px);
    box-shadow:
      0 28px 48px -24px rgba(0, 0, 0, 0.95),
      0 8px 18px -8px rgba(0, 0, 0, 0.75);
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

  /* The lightbox: the image, centred and large, with its caption under it.
     No frame, no controls - Esc or a click outside closes it. The browser
     centres a modal dialog with margin: auto, but Tailwind's preflight
     zeroes every element's margin, so the centring is restated here. */
  .about-lightbox {
    position: fixed;
    inset: 0;
    margin: auto;
    width: fit-content;
    height: fit-content;
    padding: 0;
    border: 0;
    background: transparent;
    max-width: none;
    max-height: none;
    overflow: visible;
  }

  /* Black at high alpha, the same physical-shadow convention as the
     frames above; ::backdrop does not reliably inherit custom
     properties, so it takes no palette token. */
  .about-lightbox::backdrop {
    background: rgba(0, 0, 0, 0.85);
  }

  .about-lightbox-figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .about-lightbox-image {
    display: block;
    width: auto;
    height: auto;
    max-width: 92vw;
    max-height: 85vh;
  }

  @media (prefers-reduced-motion: reduce) {
    .about-frame,
    .about-book-title {
      transition: none;
    }

    a.about-book:hover .about-frame,
    a.about-book:focus-visible .about-frame,
    .about-photo-link:hover .about-frame,
    .about-photo-link:focus-visible .about-frame {
      transform: none;
    }
  }

  /* Below 1100px the strip no longer fits on one line, so the groups
     stack. Every image keeps the shared --strip-h height at every width -
     sizing covers off the column width instead made them huge on a
     mid-width screen - and a row that runs out of room wraps. */
  @media (max-width: 1100px) {
    .about-media {
      flex-direction: column;
      gap: 3rem;
    }

    .about-books {
      margin-left: 0;
      align-items: flex-start;
    }

    .about-row {
      flex-wrap: wrap;
      gap: 1.5rem;
    }
  }

  @media (max-width: 760px) {
    .about {
      padding-block: 3.5rem 4rem;
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

  /* Matches Pipeline.svelte's own narrow-screen gutter. */
  @media (max-width: 700px) {
    .about-wrap {
      padding-inline: 20px;
    }
  }
</style>
