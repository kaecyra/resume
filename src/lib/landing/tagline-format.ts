/**
 * Splits a tagline around the phrase the hero should emphasise, so the
 * component can wrap that phrase in its own element without ever putting
 * markup in the YAML (see LandingHero.tagline_emphasis in types.ts for why
 * the data stays plain text).
 *
 * Pure so it can be tested without rendering: takes the two strings, hands
 * back the three pieces in render order.
 *
 * Only the first occurrence is emphasised. A phrase appearing twice in one
 * tagline is far more likely to be an accident than an intent to highlight
 * both, and highlighting every match would make the emphasis read as a
 * find-and-replace artifact rather than a deliberate stress.
 */
export interface TaglineParts {
  before: string;
  emphasis: string;
  after: string;
}

export function split_tagline(tagline: string, emphasis: string | undefined): TaglineParts {
  if (!emphasis) {
    return { before: tagline, emphasis: "", after: "" };
  }

  const start = tagline.indexOf(emphasis);
  if (start === -1) {
    // validate_landing_data rejects this case, so reaching it means the
    // data bypassed validation. Render the tagline intact rather than
    // dropping text on the floor.
    return { before: tagline, emphasis: "", after: "" };
  }

  return {
    before: tagline.slice(0, start),
    emphasis,
    after: tagline.slice(start + emphasis.length),
  };
}
