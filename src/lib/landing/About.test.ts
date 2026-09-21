import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { LandingAbout } from "$lib/types.js";

import About from "./About.svelte";

const ABOUT: LandingAbout = {
  heading: "Off the Clock",
  interests: ["Homelab", "Golf"],
  portrait: { src: "/assets/portrait.png", alt: "Portrait of Test Person" },
  lead: "I like building things.",
  paragraphs: ["I run a homelab.", "I play golf."],
  photos_label: "Lately",
  photos: [
    {
      id: "golf",
      src: "/landing/photos/golf.jpg",
      alt: "Golf trophy",
      caption: "Won it.",
      width: 600,
      height: 800,
    },
    { id: "car", src: "/landing/photos/car.jpg", alt: "A car", caption: "A car.", width: 800, height: 600 },
  ],
  books_label: "Worth reading",
  books: [
    {
      id: "book-a",
      title: "Book A",
      author: "Author A",
      cover: "/landing/books/a.jpg",
      cover_alt: "Cover of Book A",
      url: "https://example.com/a",
    },
    {
      id: "book-b",
      title: "Book B",
      author: "Author B",
      cover: "/landing/books/b.jpg",
      cover_alt: "Cover of Book B",
    },
  ],
};

function html_for(about: LandingAbout): string {
  return render(About, { props: { about } }).body;
}

describe("About", () => {
  it("renders the heading as the section's labelled h2", () => {
    const html = html_for(ABOUT);

    expect(html).toMatch(/<section[^>]*id="about"[^>]*aria-labelledby="about-heading"/);
    expect(html).toMatch(/<h2[^>]*id="about-heading"[^>]*>Off the Clock<\/h2>/);
  });

  it("renders every interest in the band above the section, in order", () => {
    const html = html_for(ABOUT);
    const band = html.slice(0, html.indexOf('id="about"'));

    expect(band).toMatch(/<li[^>]*>Homelab<\/li>\s*<li[^>]*>Golf<\/li>/);
  });

  it("renders the lead and then every paragraph", () => {
    const html = html_for(ABOUT);

    expect(html).toMatch(/class="about-lead[^"]*">I like building things\.</);
    const first = html.indexOf("I run a homelab.");
    const second = html.indexOf("I play golf.");
    expect(first).toBeGreaterThan(html.indexOf("I like building things."));
    expect(second).toBeGreaterThan(first);
  });

  it("renders the portrait with its alt text", () => {
    expect(html_for(ABOUT)).toMatch(
      /<img[^>]*src="\/assets\/portrait\.png"[^>]*alt="Portrait of Test Person"/,
    );
  });

  it("renders each photo with its alt text and caption under the photos label", () => {
    const html = html_for(ABOUT);

    expect(html).toContain(">Lately<");
    expect(html).toMatch(/<img[^>]*src="\/landing\/photos\/golf\.jpg"[^>]*alt="Golf trophy"/);
    expect(html).toMatch(/<figcaption[^>]*>Won it\.<\/figcaption>/);
    expect(html).toMatch(/<figcaption[^>]*>A car\.<\/figcaption>/);
  });

  it("gives each photo its own intrinsic size, so a portrait photo stays portrait", () => {
    // The strip sets one height; the width/height attributes are what let
    // the browser derive each photo's width from its own aspect ratio.
    const html = html_for(ABOUT);

    expect(html).toMatch(/<img[^>]*src="\/landing\/photos\/golf\.jpg"[^>]*width="600"[^>]*height="800"/);
    expect(html).toMatch(/<img[^>]*src="\/landing\/photos\/car\.jpg"[^>]*width="800"[^>]*height="600"/);

    // The slot's width is set from the ratio, not left to the browser: a
    // column flexbox stretches an auto-width image to its container, which
    // was only as wide as the caption, and the fixed height then cropped
    // the photo to a sliver.
    expect(html).toMatch(/class="about-item about-item-photo[^"]*"[^>]*style="--ratio: 0\.75;"/);
    expect(html).toMatch(/style="--ratio: 1\.3333/);
  });

  it("omits the photos group, label included, when there are no photos", () => {
    const html = html_for({ ...ABOUT, photos: [] });

    expect(html).not.toContain(">Lately<");
    expect(html).not.toContain("about-photos");
    expect(html).toContain("Book A");
  });

  it("links a book that has a url and leaves one without a url unlinked", () => {
    const html = html_for(ABOUT);

    const linked = html.match(/<a[^>]*href="https:\/\/example\.com\/a"[^>]*>[\s\S]*?<\/a>/)?.[0];
    expect(linked).toBeDefined();
    expect(linked).toContain('target="_blank"');
    expect(linked).toContain('rel="noopener noreferrer"');
    expect(linked).toContain('alt="Cover of Book A"');
    expect(linked).toContain("Book A");
    expect(linked).toContain("Author A");

    expect(html).toMatch(/<img[^>]*src="\/landing\/books\/b\.jpg"[^>]*alt="Cover of Book B"/);
    expect(html).not.toMatch(/<a[^>]*>[\s\S]*?Book B[\s\S]*?<\/a>/);
    expect(html).toContain("Author B");
  });

  it("omits the books group when there are no books", () => {
    const html = html_for({ ...ABOUT, books: [] });

    expect(html).not.toContain(">Worth reading<");
    expect(html).not.toContain("about-books");
  });
});

// Source-level by necessity: Svelte extracts a scoped <style> to its own
// stylesheet, so no rendered markup can show a font or colour declaration.
// See LESSONS.md (2026-09-18) and .memory/no-default-ai-styling.md.
describe("About.svelte source", () => {
  const source = readFileSync(new URL("./About.svelte", import.meta.url), "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*$/gm, "");

  it("keeps Share Tech Mono out, which #187 retired everywhere but the hero", () => {
    expect(source).not.toContain("Share Tech Mono");
  });

  it("names every colour through palette.ts rather than a hex literal", () => {
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("caps its content at the same width as the Pipelines section above it", () => {
    const pipeline = readFileSync(new URL("./Pipeline.svelte", import.meta.url), "utf8");
    const max_width = (css: string, selector: string) =>
      css.match(new RegExp(`\\${selector}\\s*\\{[^}]*max-width:\\s*([^;]+);`))?.[1];

    expect(max_width(pipeline, ".wrap")).toBeDefined();
    expect(max_width(source, ".about-wrap")).toBe(max_width(pipeline, ".wrap"));
  });

  // `border: 0` is allowed: it removes the browser's default frame on the
  // lightbox <dialog>, which is the opposite of drawing one.
  it("draws no border or coloured left rail around its blocks", () => {
    expect(source).not.toMatch(/border(-left|-top|-right|-bottom)?\s*:(?!\s*(0|none);)/);
  });
});
