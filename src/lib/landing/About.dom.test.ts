// A `*.dom.test.ts` file (see vite.config.ts): the lightbox is client-side
// behaviour, which svelte/server never runs, so About.test.ts cannot reach
// it. This mounts the real component and drives it with clicks.
import { fireEvent, render } from "@testing-library/svelte";

import type { LandingAbout } from "$lib/types.js";

import About from "./About.svelte";

const ABOUT: LandingAbout = {
  heading: "Off the Clock",
  interests: ["Dogs"],
  portrait: { src: "/assets/portrait.png", alt: "Portrait" },
  lead: "I like building things.",
  paragraphs: [],
  photos_label: "Lately",
  photos: [
    {
      id: "dog",
      src: "/landing/photos/dog.jpg",
      full_src: "/landing/photos/dog-full.jpg",
      alt: "A dog on a couch",
      caption: "The dog.",
      width: 600,
      height: 800,
    },
    {
      id: "car",
      src: "/landing/photos/car.jpg",
      alt: "A car",
      caption: "The car.",
      width: 800,
      height: 600,
    },
  ],
  books_label: "",
  books: [],
};

function mount(about: LandingAbout = ABOUT) {
  const view = render(About, { props: { about } });
  const dialog = view.container.ownerDocument.querySelector("dialog");
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error("About rendered no <dialog> for the lightbox");
  }
  return { ...view, dialog };
}

describe("About lists", () => {
  it("renders identical paragraphs and interests without a duplicate-key error", () => {
    // Keyed by text, two identical entries made Svelte throw
    // each_key_duplicate; nothing in validation rules them out.
    const { container } = mount({
      ...ABOUT,
      interests: ["Dogs", "Dogs"],
      paragraphs: ["Same line.", "Same line."],
    });

    expect(container.querySelectorAll(".about-interests li")).toHaveLength(2);
    expect(container.textContent?.match(/Same line\./g)).toHaveLength(2);
  });
});

describe("About lightbox", () => {
  it("links each thumbnail to its large image, so it still works without JS", () => {
    const { getByRole } = mount();

    expect(getByRole("link", { name: /A dog on a couch/ }).getAttribute("href")).toBe(
      "/landing/photos/dog-full.jpg",
    );
    // No full_src: the thumbnail itself is the large image.
    expect(getByRole("link", { name: /A car/ }).getAttribute("href")).toBe("/landing/photos/car.jpg");
  });

  it("starts closed", () => {
    const { dialog } = mount();

    expect(dialog.open).toBe(false);
  });

  it("opens on a thumbnail click, showing the large image and its caption", async () => {
    const { getByRole, dialog } = mount();

    await fireEvent.click(getByRole("link", { name: /A dog on a couch/ }));

    expect(dialog.open).toBe(true);
    const image = dialog.querySelector("img") as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/landing/photos/dog-full.jpg");
    expect(image.getAttribute("alt")).toBe("A dog on a couch");
    expect(dialog.textContent).toContain("The dog.");
  });

  it("closes on a click on the backdrop", async () => {
    const { getByRole, dialog } = mount();
    await fireEvent.click(getByRole("link", { name: /A dog on a couch/ }));

    // A click on the backdrop reaches the <dialog> element itself.
    await fireEvent.click(dialog);

    expect(dialog.open).toBe(false);
  });

  it("stays open on a click on the image", async () => {
    const { getByRole, dialog } = mount();
    await fireEvent.click(getByRole("link", { name: /A dog on a couch/ }));

    await fireEvent.click(dialog.querySelector("img") as HTMLImageElement);

    expect(dialog.open).toBe(true);
  });

  it("shows the photo that was clicked, not the first one", async () => {
    const { getByRole, dialog } = mount();

    await fireEvent.click(getByRole("link", { name: /A car/ }));

    expect(dialog.querySelector("img")?.getAttribute("src")).toBe("/landing/photos/car.jpg");
    expect(dialog.textContent).toContain("The car.");
  });
});
