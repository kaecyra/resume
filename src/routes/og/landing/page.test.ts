import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import { GLOBE_STILL_URL } from "$lib/landing/globe.js";
import { HUD_PALETTE } from "$lib/landing/palette.js";

import Card from "./+page.svelte";

interface CardData {
  name: string;
  badge: { tag: string; label: string };
}

const CARD: CardData = { name: "Test Person", badge: { tag: "VP Engineering", label: ".Example" } };

function card_html(data: CardData): string {
  // `umami_website_id` comes down from the root layout's load rather than
  // this page's, so every page's data type carries it. The card never reads
  // it.
  return render(Card, { props: { data: { umami_website_id: "", ...data } } }).body;
}

// The card's whole design lives in a scoped <style>, which Svelte extracts
// to a separate stylesheet - no rendered markup and no DOM assertion can
// see a font or a colour declaration. Same reason Commits.test.ts reads its
// own component's source.
const SOURCE = readFileSync(new URL("./+page.svelte", import.meta.url), "utf8");

describe("the landing OG card", () => {
  it("renders the hero's name and both badge pieces", () => {
    const html = card_html(CARD);

    expect(html).toContain("Test Person");
    expect(html).toContain("VP Engineering");
    expect(html).toContain(".Example");
  });

  it("omits the badge label entirely for a role with no company", () => {
    const html = card_html({ name: "Test Person", badge: { tag: "Engineer", label: "" } });

    expect(html).toContain("Engineer");
    expect(html).not.toContain("card-badge-label");
  });

  it("draws the globe from the pre-rendered still the hero falls back to", () => {
    expect(card_html(CARD)).toContain(GLOBE_STILL_URL);
  });

  it("is exactly the 1200x630 box the generator screenshots", () => {
    expect(SOURCE).toContain("width: 1200px");
    expect(SOURCE).toContain("height: 630px");
  });

  it("names its colours from HUD_PALETTE rather than writing them out", () => {
    const html = card_html(CARD);

    expect(html).toContain(HUD_PALETTE.background);
    expect(html).toContain(HUD_PALETTE.accent);
    // The palette's own hex values reaching the markup is the point above;
    // what must not happen is the stylesheet carrying a second, hand-typed
    // set of them that drifts when the palette moves. The backdrop
    // gradient's three bespoke shades are the documented exception, so the
    // check is against the tokens rather than against every hex literal.
    for (const value of Object.values(HUD_PALETTE)) {
      expect(SOURCE).not.toContain(`: ${value}`);
    }
  });

  it("sets the name at the size the hero's own clamp resolves to at 1200px", () => {
    // 13vw of 1200px is 156px, over the hero's 8.875rem ceiling - so the
    // card and the hero render the name identically. A change to either
    // without the other silently makes the card a different design.
    const hero = readFileSync(
      new URL("../../../lib/landing/Hero.svelte", import.meta.url),
      "utf8",
    );

    expect(hero).toContain("font-size: clamp(2.75rem, 13vw, 8.875rem)");
    expect(SOURCE).toContain("font-size: 8.875rem");
  });

  it("keeps the variant cards' headshot out of the frame", () => {
    expect(card_html(CARD)).not.toContain("headshot-illustration");
  });
});
