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
// WCAG AA floor genuinely doesn't apply. The only remaining use is
// Hero.svelte's `.hero-topbar` (the GitHub handle and the fixed lat/long
// chrome), which sits on `--hud-bg` over `.hero-backdrop`'s radial
// gradient, not flat `panel`: measured with this file's own helper
// (palette.test.ts), that's 3.91:1 against flat `background` and ~3.53:1
// against the gradient's lightest stop (`#17171b`, Hero.svelte's
// `.hero-backdrop`) - the worst case a reader actually encounters. Both
// spans are decorative HUD flavor text a reader can skip, not content
// anyone depends on reading (the handle is also a real link in Divider, and
// the hero's actual identity is the h1). Do not add a new `meta` use for
// anything someone needs to read reliably - every prior misuse of `meta`
// was text someone needed to read; route those through `secondary` instead,
// and update this list when `meta`'s remaining use changes.
// `edge` is a border/divider colour, not text, so legibility doesn't apply
// to it either; `chip_bg`/`chip_text` are the Work stack-tag chip surface
// (~4.9:1 contrast against each other) and are covered by palette.test.ts's
// `chip_text` on `chip_bg` case.
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

// The contribution grid's own ramp (#192) - Commits.svelte's five
// `cell.level` buckets (0-4), darkest/emptiest to brightest. Kept separate
// from `HUD_PALETTE` rather than added to it: everywhere else on the page
// `accent` (amber) stays the one accent colour, and folding a second,
// unrelated accent ramp into the same object would make every future
// `Object.values(HUD_PALETTE)` walk (palette.test.ts's hex-format check,
// any future contrast sweep) silently start covering swatches those checks
// were never written for.
//
// Green, in GitHub's spirit - darkest-to-brightest steps reading as "more
// activity" - tuned to this page's near-black surfaces (`background`
// #0a0a0b, `panel` #121214) rather than copied from GitHub's own dark-mode
// hex values (#0e4429/#006d32/#26a641/#39d353), which assume GitHub's own
// background (#0d1117).
//
// `level_0` deliberately reuses `HUD_PALETTE.edge` instead of a new "empty
// green": a zero-contribution day should read as an unlit slot - the same
// border tone the rest of the page uses for "nothing here" - not a dark
// green that still reads as "some colour, just a low one".
//
// Not load-bearing for palette.test.ts's WCAG AA text-contrast sweep: every
// checked token there is something read as text (a caption, a label, a
// chip) at a fixed 4.5:1 floor. A ramp cell is a small coloured square
// encoding a data value, not text - WCAG's 1.4.3 text-contrast floor does
// not apply to it, and unlike `chip_text`-on-`chip_bg` there is no
// foreground/background text pairing here to hold to a ratio. What *is*
// worth protecting mechanically is the property that actually matters for
// reading the ramp - each level visibly brighter than the last, empty
// through full - so palette.test.ts checks the five levels' relative
// luminance is strictly increasing instead.
// The depth pass's elevation ladder (#196). The page's sections used to
// alternate `background`/`panel`/`panel_alt` - three greys within a few
// percent of each other, which reads as noise rather than as layering. The
// ladder replaces that with one ground plus a rung below it and shadow
// recipes above it, so hierarchy is carried by depth instead of hue.
//
// `void` is the only new surface colour: a rung *below* `background`, which
// the palette had no equivalent for. Everything raised is built from
// shadow and an inset top highlight over the existing tokens rather than
// from new greys.
//
// Not covered by palette.test.ts's WCAG AA sweep: `void` is a background
// that text sits on via the existing `text`/`secondary` tokens (both of
// which clear AA against a surface darker than `background`, since darker
// only increases their contrast), and the shadow recipes are not colours
// text is ever read against.
export const ELEVATION = {
  void: "#060607",
  hair: "rgba(237, 237, 236, 0.07)",
  hair_bright: "rgba(237, 237, 236, 0.13)",
} as const;

// The hero marker's coordinate line, painted in the Canadian flag's own
// red - lifted from static/landing/canada-flag.svg, which fills its bars
// with #d52b1e - so the flag and the label beside it read as one object
// rather than the label borrowing the page's amber accent for something
// that is not an accent.
//
// Kept out of HUD_PALETTE for the same reason CONTRIBUTION_RAMP is: that
// object is swept by palette.test.ts's WCAG AA contrast check, and this is
// decorative chrome inside an aria-hidden marker layer, riding a rotating
// globe. It carries no text-contrast obligation and nobody depends on
// reading it.
export const MARKER_RED = "#d52b1e" as const;

export const CONTRIBUTION_RAMP = {
  level_0: HUD_PALETTE.edge,
  level_1: "#164a2f",
  level_2: "#1f6b3f",
  level_3: "#2fa35c",
  level_4: "#4fd67e",
} as const;
