// Static art for the lower-page ambient flyby effect (decorative, unlabeled
// objects that occasionally cross the viewport below the hero - see
// SatelliteFlyby.svelte/SatelliteFlybys.svelte/flyby-motion.ts). Deliberately
// separate from the hero globe's satellite tracking system (orbits.ts,
// globe.ts, satellite-catalog.ts, SatelliteIcon.svelte): that system draws
// real orbital positions from live CelesTrak data, this one draws eight
// fixed, hand-picked silhouettes with no relationship to real time or
// position. Nothing here should ever import from or be imported by that
// system.

// Eight craft, chosen for recognisability at a glance rather than any
// astronomical criterion: five real or well-known spacecraft (ISS, Hubble,
// Voyager 2, JWST), one fictional one (the *Project Hail Mary* generation
// ship - a simplified, original line-art interpretation, not a copy of any
// specific published illustration), and three pieces of tumbling "space
// junk" for variety and a bit of humour.
export type FlybyKind =
  | "iss"
  | "hubble"
  | "voyager-2"
  | "jwst"
  | "hail-mary"
  | "food-can"
  | "glove"
  | "wrench";

export const FLYBY_KINDS: readonly FlybyKind[] = [
  "iss",
  "hubble",
  "voyager-2",
  "jwst",
  "hail-mary",
  "food-can",
  "glove",
  "wrench",
];

// The five real spacecraft hold a fixed attitude and only translate across
// the viewport; the three junk items tumble slowly as they cross, which is
// what actually reads as "debris" rather than "a small satellite" at this
// scale.
export const FLYBY_TUMBLES: Record<FlybyKind, boolean> = {
  iss: false,
  hubble: false,
  "voyager-2": false,
  jwst: false,
  "hail-mary": false,
  "food-can": true,
  glove: true,
  wrench: true,
};

// First attempt at this art (kept in git history) drew each craft as a flat
// broadside silhouette and faked five viewing angles with a shared CSS
// scale/skew transform per craft. That read as warped rather than 3D - a
// skewed 2D outline has no foreshortening or volume, it just looks bent.
// The reference that replaced it (a technical pencil-sketch style: see the
// design conversation) gets its "3D" from two things a flat silhouette
// doesn't have - drawn once, not faked per angle:
//
//  - Volume: most solid parts are drawn as two offset, connected outlines
//    (a bold near face plus a thin parallel "receding" edge/top), the same
//    cheap fake-3D box a technical sketch uses instead of true perspective
//    projection. `class="fb-bold"` marks the near/primary edge of a form,
//    `class="fb-thin"` the receding one - see SatelliteFlyby.svelte's
//    stroke-width rules for the two.
//  - Shading: short parallel hatch strokes on each craft's shadowed face,
//    generated with a small `hatch(x1, y1, x2, y2, count, len, angle)`
//    helper (not shipped - a one-off script) and baked into the markup
//    below as literal `<line>` elements, the same way a `pill(cx, yTop,
//    yBottom, r)` helper generated the glove's rounded fingers. Nothing
//    below is computed at render time; every string is a static literal.
//
// Every craft is drawn nose/forward-mass to the right, matching
// SatelliteFlyby.svelte's mirroring convention (the unmirrored crossing
// travels left-to-right, so the art's own "front" has to lead that way).
export const FLYBY_ART: Record<FlybyKind, string> = {
  iss: `
    <path class="fb-bold" d="M6 34 L54 30" />
    <path class="fb-bold" d="M8 24 L20 22 L20 30 L8 32 Z" />
    <path class="fb-thin" d="M8 24 L11 20 L23 18 L20 22" />
    <path class="fb-thin" d="M20 22 L23 18 L23 26 L20 30" />
    <path class="fb-bold" d="M8 38 L20 36 L20 44 L8 46 Z" />
    <path class="fb-thin" d="M8 38 L11 34 L23 32 L20 36" />
    <path class="fb-bold" d="M26 28 L44 25 L44 37 L26 40 Z" />
    <path class="fb-thin" d="M26 28 L29 24 L47 21 L44 25" />
    <path class="fb-thin" d="M44 25 L47 21 L47 33 L44 37" />
    <line class="fb-thin" x1="25.9" y1="27.9" x2="30.1" y2="32.1" />
    <line class="fb-thin" x1="29.4" y1="27.3" x2="33.6" y2="31.5" />
    <line class="fb-thin" x1="32.9" y1="26.6" x2="37.1" y2="30.9" />
    <line class="fb-thin" x1="36.4" y1="26.0" x2="40.6" y2="30.2" />
    <line class="fb-thin" x1="39.9" y1="25.4" x2="44.1" y2="29.6" />
    <path d="M16 20 L15 11" />
    <path d="M16 40 L15 49" />
    <path class="fb-bold" d="M48 24 L58 22 L60 26 L50 28 Z" />
  `,
  hubble: `
    <path class="fb-bold" d="M40 20 L58 24 L58 40 L40 44 Z" />
    <path class="fb-thin" d="M40 20 L44 15 L60 19 L58 24" />
    <path class="fb-bold" d="M14 18 L40 20 L40 44 L14 46 Z" />
    <path class="fb-thin" d="M14 18 L18 13 L44 15 L40 20" />
    <path d="M22 18.5 L22 45.5 M28 19 L28 45 M34 19.5 L34 44.5" />
    <line class="fb-thin" x1="15.0" y1="29.7" x2="17.0" y2="34.3" />
    <line class="fb-thin" x1="19.4" y1="30.1" x2="21.4" y2="34.7" />
    <line class="fb-thin" x1="23.8" y1="30.5" x2="25.8" y2="35.1" />
    <line class="fb-thin" x1="28.2" y1="30.9" x2="30.2" y2="35.5" />
    <line class="fb-thin" x1="32.6" y1="31.3" x2="34.6" y2="35.9" />
    <line class="fb-thin" x1="37.0" y1="31.7" x2="39.0" y2="36.3" />
    <path class="fb-bold" d="M6 26 L14 24 L14 40 L6 42 Z" />
    <path d="M6 30 L14 28 M6 34 L14 32 M6 38 L14 36" />
    <path d="M20 18.5 L16 8 L26 9 L22 18" />
    <path class="fb-bold" d="M24 16 L44 12 L44 6 L22 9 Z" />
    <path d="M27 15.4 L28 6.8 M31 14.7 L32.5 6.1 M35 14 L37 5.4 M39 13.3 L41.5 4.6" />
    <path class="fb-bold" d="M22 48 L44 52 L44 58 L24 54 Z" />
    <path d="M27 48.9 L28.5 57.5 M31 49.6 L33 58 M35 50.3 L38 58.6 M39 51 L42.5 59.3" />
  `,
  "voyager-2": `
    <ellipse class="fb-bold" cx="44" cy="26" rx="16" ry="7" />
    <ellipse class="fb-thin" cx="44" cy="26" rx="10" ry="4.3" />
    <path d="M44 22 L44 12" />
    <circle cx="44" cy="10" r="2.2" />
    <path class="fb-bold" d="M30 30 L36 32 L36 38 L30 36 Z" />
    <path d="M30 34 L14 44 M14 44 L11 42 L10 47" />
    <path d="M32 37 L30 50 M30 50 L27 49 L26 54" />
    <path d="M34 33 L48 40 M48 40 L51 39 L52 44" />
    <path d="M24 27 L8 20 M8 20 L6 23 L9 25" />
    <line class="fb-thin" x1="20.1" y1="22.0" x2="19.9" y2="26.0" />
    <line class="fb-thin" x1="24.1" y1="24.7" x2="23.9" y2="28.7" />
    <line class="fb-thin" x1="28.1" y1="27.3" x2="27.9" y2="31.3" />
    <line class="fb-thin" x1="32.1" y1="30.0" x2="31.9" y2="34.0" />
  `,
  jwst: `
    <path class="fb-bold" d="M44 18 L54 24 L54 36 L44 42 L36 36 L36 24 Z" />
    <path class="fb-thin" d="M44 18 L44 42 M36 24 L54 36 M54 24 L36 36" />
    <path d="M40 21 L48 25 M40 39 L48 35" />
    <path class="fb-bold" d="M10 26 L34 28 L34 34 L10 32 Z" />
    <path class="fb-bold" d="M6 22 L30 24 L30 30 L6 28 Z" opacity="0.85" />
    <path class="fb-bold" d="M4 18 L26 20 L26 26 L4 24 Z" opacity="0.7" />
    <path d="M10 26 L6 18 M34 28 L26 20 M10 32 L6 28 M34 34 L26 26" />
    <line class="fb-thin" x1="7.3" y1="20.1" x2="8.7" y2="23.9" />
    <line class="fb-thin" x1="12.3" y1="20.6" x2="13.7" y2="24.4" />
    <line class="fb-thin" x1="17.3" y1="21.1" x2="18.7" y2="24.9" />
    <line class="fb-thin" x1="22.3" y1="21.6" x2="23.7" y2="25.4" />
    <line class="fb-thin" x1="27.3" y1="22.1" x2="28.7" y2="25.9" />
  `,
  "hail-mary": `
    <circle class="fb-bold" cx="44" cy="30" r="11" />
    <path d="M36 24 L38 36 M40 21 L42 38 M46 20 L47 39" />
    <path class="fb-bold" d="M34 30 L14 24 L12 27 L30 33 Z" />
    <path class="fb-bold" d="M33 34 L15 40 L14 43 L31 38 Z" opacity="0.85" />
    <path class="fb-thin" d="M14 24 L12 27 M15 40 L14 43" />
    <line class="fb-thin" x1="15.7" y1="25.0" x2="16.3" y2="29.0" />
    <line class="fb-thin" x1="19.7" y1="26.7" x2="20.3" y2="30.7" />
    <line class="fb-thin" x1="23.7" y1="28.3" x2="24.3" y2="32.3" />
    <line class="fb-thin" x1="27.7" y1="30.0" x2="28.3" y2="34.0" />
    <path d="M22 26 L20 20 M25 37 L23 44" />
  `,
  "food-can": `
    <ellipse class="fb-thin" cx="24" cy="20" rx="17" ry="6" />
    <path class="fb-bold" d="M8 20 L8 44" />
    <path class="fb-bold" d="M40 20 L40 44" />
    <path class="fb-bold" d="M8 44 A17 6 0 0 0 40 44" />
    <path d="M8 28 A17 6 0 0 0 40 28 M8 36 A17 6 0 0 0 40 36" />
    <line class="fb-thin" x1="10.6" y1="27.5" x2="11.4" y2="32.5" />
    <line class="fb-thin" x1="15.8" y1="29.5" x2="16.6" y2="34.5" />
    <line class="fb-thin" x1="21.0" y1="31.5" x2="21.8" y2="36.5" />
    <line class="fb-thin" x1="26.2" y1="33.5" x2="27.0" y2="38.5" />
    <line class="fb-thin" x1="31.4" y1="35.5" x2="32.2" y2="40.5" />
    <line class="fb-thin" x1="36.6" y1="37.5" x2="37.4" y2="42.5" />
    <path class="fb-bold" d="M12 20 L16 8 L21 18 L26 6 L31 17 L35 9 L40 20" />
    <path d="M16 8 L21 18 M26 6 L31 17" />
  `,
  glove: `
    <path class="fb-bold" d="M15.0 30.0 A4 4 0 0 1 23.0 30.0 L23.0 38.0 A4 4 0 0 1 15.0 38.0 Z" />
    <path class="fb-bold" d="M22.6 23.4 A4.4 4.4 0 0 1 31.4 23.4 L31.4 37.6 A4.4 4.4 0 0 1 22.6 37.6 Z" />
    <path class="fb-bold" d="M30.6 21.4 A4.4 4.4 0 0 1 39.4 21.4 L39.4 37.6 A4.4 4.4 0 0 1 30.6 37.6 Z" />
    <path class="fb-bold" d="M39.0 26.0 A4 4 0 0 1 47.0 26.0 L47.0 38.0 A4 4 0 0 1 39.0 38.0 Z" />
    <path class="fb-bold" d="M10 40 Q7 34 12 31 Q17 29 19 34 L19 46 Q19 50 13 50 Q9 49 9 44 Z" />
    <path class="fb-bold" d="M12 38 L40 38 Q48 38 48 46 L48 52 Q48 60 30 60 Q13 60 13 52 L13 44 Q13 40 12 38 Z" />
    <path d="M19 42 L19 56 M27 42 L27 58 M35 42 L35 58 M43 42 L43 56" />
    <ellipse class="fb-thin" cx="30" cy="58" rx="16" ry="4.5" />
    <line class="fb-thin" x1="16.5" y1="42.1" x2="15.5" y2="45.9" />
    <line class="fb-thin" x1="19.9" y1="46.1" x2="18.8" y2="49.9" />
    <line class="fb-thin" x1="23.2" y1="50.1" x2="22.1" y2="53.9" />
    <line class="fb-thin" x1="26.5" y1="54.1" x2="25.5" y2="57.9" />
  `,
  wrench: `
    <path class="fb-bold" d="M46 26 L52 20 L58 22 L60 28 L56 34 L50 33 Z" />
    <path class="fb-bold" d="M46 30 L18 36 L18 44 L46 38 Z" />
    <path d="M18 40 L46 34" />
    <path class="fb-bold" d="M6 32 L11 28 L17 30 L18 36 L15 42 L9 40 Z" />
    <line class="fb-thin" x1="22.9" y1="32.6" x2="25.1" y2="35.4" />
    <line class="fb-thin" x1="28.9" y1="31.6" x2="31.1" y2="34.4" />
    <line class="fb-thin" x1="34.9" y1="30.6" x2="37.1" y2="33.4" />
    <line class="fb-thin" x1="40.9" y1="29.6" x2="43.1" y2="32.4" />
  `,
};
