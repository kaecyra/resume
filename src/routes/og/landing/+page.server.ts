import { load_landing_data } from "$lib/landing.js";
import { split_role_badge } from "$lib/landing/hero-format.js";

import type { PageServerLoad } from "./$types";

export const prerender = true;

// A static segment, so it wins over the sibling `[variant=variant]` route
// (whose matcher would happily accept "landing") without that matcher
// needing to know this card exists. The card is the site root's own, built
// from data/landing.yaml rather than from a resume variant - see
// src/routes/+page.server.ts, which points og:image at the PNG this page
// is screenshotted into.
export const load: PageServerLoad = () => {
  const landing = load_landing_data();

  // Same split the hero's badge uses, so "VP Engineering, .Monks" reads as
  // one mono tag plus one display-font label on the card exactly as it does
  // on the page. Validation is the root route's job (it throws on a
  // malformed landing.yaml before anything renders); repeating it here
  // would only decide the same thing twice.
  return {
    name: landing.hero.name,
    badge: split_role_badge(landing.hero.role),
  };
};
