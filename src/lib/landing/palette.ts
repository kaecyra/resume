// Local HUD palette for the landing page's greyscale-plus-amber "Signal"
// design (#177). These tokens are intentionally kept out of
// `$lib/theme-palettes.ts`: that map feeds the PDF pipeline for resume
// themes, and the landing page has neither a PDF path nor a resume theme.
//
// `background`, `text`, `secondary` and `accent` are load-bearing for
// palette.test.ts's WCAG AA contrast check; `panel`, `panel_alt`, `meta`,
// `edge`, `chip_bg` and `chip_text` are additional surfaces the redesign
// needs that the contrast test doesn't (and isn't meant to) cover - `meta`
// is deliberately low-contrast, used only for small decorative labels like
// the hero coordinates, never for content that needs to be read reliably;
// `edge` is a border/divider colour, not text, so legibility doesn't apply
// to it either; `chip_bg`/`chip_text` are the Work stack-tag chip surface
// (~4.9:1 contrast against each other, checked by hand, not by this file).
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
