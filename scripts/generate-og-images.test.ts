// Covers the one pure part of generate-og-images.ts - which cards it renders.
// The other half of that contract, the root page's og:image, is pinned in
// src/routes/page-server.test.ts; without this the landing card could stop
// being generated with every check still green and the bare domain's
// og:image a 404. Importing this module is side-effect free: the script
// guards its entry point the way build-geo.ts does.
import { list_variants } from "../src/lib/data.js";
import { LANDING_OG_SLUG } from "../src/lib/seo.js";

import { og_card_slugs } from "./generate-og-images.js";

describe("og_card_slugs", () => {
  it("leads with the landing card, which is a route rather than a variant", () => {
    expect(og_card_slugs()[0]).toBe(LANDING_OG_SLUG);
    expect(list_variants()).not.toContain(LANDING_OG_SLUG);
  });

  it("still renders every resume variant", () => {
    expect(og_card_slugs()).toEqual(expect.arrayContaining(list_variants()));
  });
});
