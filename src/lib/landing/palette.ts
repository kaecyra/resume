// Local HUD palette for the landing page's greyscale-plus-amber "Signal"
// design (#177). These tokens are intentionally kept out of
// `$lib/theme-palettes.ts`: that map feeds the PDF pipeline for resume
// themes, and the landing page has neither a PDF path nor a resume theme.
//
// `background`, `text`, `secondary` and `accent` are load-bearing for
// palette.test.ts's WCAG AA contrast check; `panel`, `panel_alt`, `meta`,
// `edge`, `chip_bg` and `chip_text` are additional surfaces the redesign
// needs that the contrast test doesn't (and isn't meant to fully) cover -
// `meta` is deliberately low-contrast, so it may only be used where the
// WCAG AA floor genuinely doesn't apply. As of round 3, the only remaining
// use is Hero.svelte's `.hero-topbar` (the GitHub handle and the fixed
// lat/long chrome), which sits on `--hud-bg` over `.hero-backdrop`'s radial
// gradient, not flat `panel`: measured with this file's own helper
// (palette.test.ts), that's 3.91:1 against flat `background` and ~3.53:1
// against the gradient's lightest stop (`#17171b`, Hero.svelte's
// `.hero-backdrop`) - the worst case a reader actually encounters. Both
// spans are decorative HUD flavor text a reader can skip, not content
// anyone depends on reading (the handle is also a real link in Divider, and
// the hero's actual identity is the h1). Do not add a new `meta` use for
// anything someone needs to read reliably - every prior round found exactly
// that mistake (round 1: `edge` used as text; round 2: `.hero-status`;
// round 3: `.commits-offline`, then `.commits-meta`) - route those through
// `secondary` instead, and update this list when `meta`'s remaining use
// changes.
// `edge` is a border/divider colour, not text, so legibility doesn't apply
// to it either; `chip_bg`/`chip_text` are the Work stack-tag chip surface
// (~4.9:1 contrast against each other) and, as of round 4, are covered by
// palette.test.ts's `chip_text` on `chip_bg` case.
export const HUD_PALETTE = {
  background: "#0a0a0b",
  panel: "#121214",
  panel_alt: "#151517",
  edge: "#33333a",
  text: "#ededec",
  secondary: "#a8a8ad",
  meta: "#6e6e75",
  accent: "#e87a2e",
  chip_bg: "#1d1d21",
  chip_text: "#8a8a92",
} as const;
