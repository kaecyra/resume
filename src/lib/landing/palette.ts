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

// Orbit track colours for the hero globe's satellites (#203), one per
// orbit class (orbits.ts's `OrbitClass`). Deliberately new hues, off the
// page's greyscale-plus-amber scheme: the owner asked for tracks to read
// apart by regime, and amber already means "Canada" on the globe while
// green belongs to the contribution grid, so all three stay clear of both.
// Kept out of HUD_PALETTE for the same reason CONTRIBUTION_RAMP is: these
// are line colours on a moving globe, not text, and palette.test.ts's WCAG
// sweep has nothing to hold them to.
//
// Cyan, violet, magenta, spread wide in hue and all well saturated. The
// first set (a muted cyan/lavender/rose) read too alike as thin dashed
// lines. These pass the dataviz categorical checks against `background`:
// OKLCH lightness inside the dark band, chroma floor, worst adjacent pair
// Delta E 21 for normal vision and 14 under colour-vision deficiency. The
// vitals readout also names the class in words, so colour is never the
// only thing saying which orbit a track is.
export const ORBIT_CLASS_COLORS = {
  leo: "#12a4be",
  sso: "#8a6cff",
  geo: "#ea4b94",
} as const;

// The pipeline section's hardware tables (#209): the rack drawing, the port
// and status LEDs, the cable tray above the rack, and the section's own
// graph and terminal fills.
//
// These widen the palette rather than reuse it. The rack is genuinely new
// subject matter - a front elevation of real gear that has to read as metal
// - and "which grey" carries information a reader can check against a
// photograph: a mounting rail is not a cabinet wall is not an empty U.
// Collapsing twenty-odd of those onto `panel`/`panel_alt`/`edge` would
// flatten the drawing to one tone, and would bend three tokens that already
// mean something else on the page into doing a second job.
//
// Kept out of `HUD_PALETTE` for the same reason `CONTRIBUTION_RAMP` and
// `ORBIT_CLASS_COLORS` are: that object is swept by palette.test.ts's WCAG
// AA contrast check and none of these are text. Nothing below is ever read
// against another as a foreground/background pair, so what is worth
// protecting mechanically is ordering - which part catches the light, which
// cable is nearest, which way a blink runs - and palette.test.ts checks
// those instead, plus one rule specific to a widening: no new token may land
// on a colour `HUD_PALETTE` or `ELEVATION` already names, because that would
// mean the colour had a home and the rack should have used it.
//
// Two notes for anyone diffing against the mockup's own `:root` block:
//
// - `--panel-alt`, `--chip-bg` and `--green-dim` are declared there and
//   never used. They are not dead on the page - `panel_alt` and `chip_bg`
//   are Work.svelte's featured-card gradient and its stack-tag chips, and
//   `--green-dim` is `CONTRIBUTION_RAMP.level_3` in the grid - so nothing is
//   removed here. The pipeline section has no surface for them and should
//   not invent one just to spend them.
// - `--rail`, `--blue-led` and `--red` are declared there and then bypassed,
//   with the SVG hardcoding the hex instead. All three get real names below:
//   `RACK_CHASSIS.trim` (`--rail` is misnamed - it is the feet and the shelf
//   lip, not the mounting rails), `RACK_LED.status` and
//   `RACK_CHASSIS.outlet`. The last two land on values the page already uses
//   elsewhere, `ORBIT_CLASS_COLORS.leo` and `MARKER_RED`, and deliberately
//   do not import them: a Ubiquiti status LED is not a low Earth orbit
//   track and a PDU outlet is not the Canadian flag, so sharing the constant
//   would couple a rack redraw to the globe and to the hero marker.
export const RACK_CHASSIS = {
  // The cabinet shell, head on.
  cabinet: "#0c0c0e",
  // Its outline, the 42 pairs of rail holes, the gateway and cloud-key port
  // blocks, and the UPS vent - every small cut into the chassis.
  cabinet_edge: "#2a2a31",
  // The two vertical mounting rails.
  rail: "#17171b",
  // Feet, shelf lip, and the dark box on the shelf (the mockup's `--rail`).
  trim: "#1a1a1e",
  // An unoccupied U, and the shelf face.
  slot_empty: "#0a0a0c",
  // A U holding something deliberately unlabelled. Lighter than
  // `slot_empty` so the block reads as occupied rather than as a hole.
  // Nothing in the rack is drawn with it since U29-34 was described; the
  // fitting and this tone are kept for the next block that has not been.
  slot_unnamed: "#101013",
  // The brush panels, and the slot cables pass through. The face was
  // `#141418`, a few values off `slot_empty`, so three blanking plates read
  // as three holes in a column of hardware. It is a plate bolted across a U
  // and is lit like one.
  brush_face: "#44444c",
  brush_slot: "#1d1d22",
  // The power strips, their outlets (the mockup's `--red`), and the rocker
  // switches on the Pyle at the floor of the rack. The rocker was `#3d3d45`,
  // 1.65:1 against the face it is mounted on where an outlet 8px away is
  // 3.54:1 - two rows of controls on one strip, one of them half as far off
  // it as the other. It is lifted to meet the outlets rather than the
  // outlets dropped to meet it: the sockets are where the mockup put them.
  pdu_face: "#18181c",
  outlet: "#d52b1e",
  pdu_switch: "#6f6f75",
  // The two Raspberry Pi 5 cases standing on the U29 switch. A second red,
  // and deliberately not `outlet`: one is a socket, the other is the
  // plastic a machine is wearing. Not the amber accent either - that
  // already means "the node this site runs on", and these are not it.
  pi_case: "#b4372e",
  // The DGX Spark's gold, and the mesh cut into its front. Duller than the
  // page's amber for the same reason the case red is not the accent.
  spark_face: "#a98b4a",
  spark_mesh: "#6f5a2f",
  // The Lenovo the Spark stands on, and the line of light along its top
  // edge - the only thing separating two dark boxes stacked on a shelf.
  lenovo_face: "#242429",
  lenovo_top_light: "#3a3a42",
  // The UPS at the floor, and the window its two LEDs sit behind.
  ups_body: "#1d1d22",
  ups_display: "#0d0d10",
  // The patch panels: the plate, and the keystone openings cut into it. The
  // plate is deliberately not one of the light parts below. It was drawn six
  // values off `faceplate`, and at that distance u6, u8 and u12 read as three
  // more switches - a patch panel is a plate with holes in it, and a switch
  // is the thing with the lights on.
  patch_face: "#8a8a90",
  keystone: "#3a3a42",
  // The servers' front bezels, lit from above: a bright strip along the top
  // edge, the face below it, end caps in shadow at either side. `bezel_face`
  // is also the UPS's top highlight strip - the same brushed tone catching
  // the same light.
  bezel_face: "#26262c",
  bezel_top_light: "#33333b",
  bezel_end_cap: "#1b1b20",
  bezel_lock: "#5e5e68",
  bezel_rib: "#6d6d77",
  // The light parts. These are what make the drawing read as installed
  // hardware rather than as a stack of empty slots, so they sit far clear of
  // `cabinet` rather than a step away from it.
  faceplate: "#d8d8dc",
  drive_bay: "#b4b4ba",
  puck: "#c9c9cc",
} as const;

// The indicators. Three of these are the states one port cycles through as
// it blinks, so their order is the thing that matters: `off` reads as no
// link at all, `link` as a port sitting connected, `active` as the flash of
// traffic on it.
//
// `healthy` is the section's own green, not `CONTRIBUTION_RAMP.level_4`.
// The ramp's green belongs to the contribution grid, where it encodes a
// count on a scale; here green means one binary thing, "this is fine", on
// the NVR's LED, the UPS display, the server bezels and - via
// `PIPELINE_INK.pass` - a step of the graph that passed. The two land on the
// same hex because both were tuned against the same near-black surface, but
// they are separate tokens so either can move without dragging the other.
export const RACK_LED = {
  off: "#2f2f37",
  link: "#93c5d8",
  active: "#dff1f8",
  // The chassis status LED on the Ubiquiti gear (the mockup's `--blue-led`).
  status: "#12a4be",
  healthy: "#4fd67e",
} as const;

// The ceiling tray the rack is fed from: a steel basket, and three cable
// bundles running along it and dropping into the top of the cabinet.
//
// The bundle blues are the only hue in the drawing that is not grey, amber
// or an LED, and they are there for the obvious reason - a rack is fed with
// blue patch cable. Each bundle is painted three times, casing then core
// then seam, and depth is carried entirely by the cores: the three casings
// sit within a hair of each other, so it is the core brightening far to
// near that says which bundle is in front. The seam is the thin line offset
// above each centreline; the mockup labels it a highlight, but its value is
// darker than every casing, which is what makes it read as the fold in the
// jacket instead of a specular edge, so it is named for what it does.
export const CABLE_TRAY = {
  // The basket's top and bottom rails and its cut end.
  basket_rail: "#43434d",
  // The two intermediate longitudinal wires.
  basket_wire: "#34343d",
  // The rungs, welded in front of the bundles.
  basket_rung: "#4c4c57",
  // The velcro lacing, two straps per drop.
  strap: "#242a2e",
  bundle_far: "#0f2734",
  bundle_mid: "#112c3b",
  bundle_near: "#122c3a",
  core_far: "#1b4257",
  core_mid: "#1f4c63",
  core_near: "#21506a",
  seam: "#0b1f2a",
} as const;

// What the section draws with that is not hardware: the graph strokes the
// existing tokens do not cover, the crossings between bands, and the
// terminal's turn bars.
//
// The terminal's drop shadow is not here. It is plain black at low alpha,
// written into the component's own `box-shadow` the way every other shadow
// recipe on this page is (Work.svelte, Hero.svelte); a token for it would be
// the only one of its kind.
export const PIPELINE_INK = {
  // A step that passed - the CI node and the healthcheck node. The same
  // green as a healthy device in the rack, so a reader learns it once.
  pass: RACK_LED.healthy,
  // The trunk while the branch is out, drawn dotted. It has to recede behind
  // the live trunk, so it sits below `edge`, already the dimmest line tone
  // the page uses. Happens to share a value with `RACK_CHASSIS.bezel_face`
  // and is declared separately anyway: a graph stroke and a sheet of bezel
  // metal have nothing to do with each other and either can move alone.
  dormant: "#26262c",
  // A crossing: a dashed rule between two bands, ending in an arrow. The tip
  // is where the eye is meant to land, so it is the brighter of the two.
  crossing_rule: "#3d3d45",
  crossing_arrow: "#57575f",
  // The terminal's turn bars. The reader's own turn uses `HUD_PALETTE.edge`;
  // the agent's reply and the tool output sit below it, so the transcript
  // reads as the person speaking loudest in their own terminal. `tool_bar`
  // is faintly green-tinted rather than a fourth neutral grey.
  agent_bar: "#232329",
  tool_bar: "#1e2a22",
} as const;
