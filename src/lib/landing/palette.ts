// Local HUD palette for the landing page's dark terminal aesthetic.
// These tokens are intentionally kept out of `$lib/theme-palettes.ts`: that map
// feeds the PDF pipeline for resume themes, and the landing page has neither
// a PDF path nor a resume theme.
export const HUD_PALETTE = {
  background: "#1a2744",
  accent: "#e87a2e",
  text: "#f0e6d6",
  secondary: "#8b9bb5",
} as const;
