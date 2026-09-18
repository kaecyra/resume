import { HUD_PALETTE } from "./palette.js";

// These helpers implement the WCAG relative-luminance/contrast formulas
// (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance), used below to
// check background contrast against every foreground token (accent,
// secondary, text) that this palette actually defines.

function hex_to_rgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function relative_luminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast_ratio(hex_a: string, hex_b: string): number {
  const luminance_a = relative_luminance(hex_to_rgb(hex_a));
  const luminance_b = relative_luminance(hex_to_rgb(hex_b));
  const lighter = Math.max(luminance_a, luminance_b);
  const darker = Math.min(luminance_a, luminance_b);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("HUD_PALETTE", () => {
  it("uses valid 6-digit hex colors for every token", () => {
    for (const value of Object.values(HUD_PALETTE)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each(["accent", "secondary", "text"] as const)(
    "clears WCAG AA contrast (4.5:1) between background and %s",
    (token) => {
      const ratio = contrast_ratio(HUD_PALETTE.background, HUD_PALETTE[token]);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );

  // Round-2 review gap: the checks above prove each token is readable
  // against `background`, but body copy in Hero.svelte and Commits.svelte
  // is set in `secondary` against whichever surface it actually sits on
  // (`background` for the hero, `panel` for Commits) - not always
  // `background`. Check the token against the surface it's rendered on,
  // not just the page default. `meta` is deliberately excluded: it's
  // documented in palette.ts as sub-4.5:1 and decorative-label-only, never
  // body copy.
  it.each([
    ["secondary", "background"],
    ["secondary", "panel"],
  ] as const)("clears WCAG AA contrast (4.5:1) for %s text on the %s surface", (token, surface) => {
    const ratio = contrast_ratio(HUD_PALETTE[surface], HUD_PALETTE[token]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
