// Pure geometry, projection and rotation maths for the landing hero's
// wireframe globe (#178), plus the browser-only WebGL controller that wires
// them to a <canvas>. Mirrors the split in the parked hud-canvas.ts (#168):
// the maths is plain functions over plain data, tested directly in
// globe.test.ts. A real WebGL context is still not available under vitest
// (see #175), so the drawing itself - the inside of draw()'s ctx.bufferData/
// drawArrays calls and the marker element's per-frame writes - stays
// untested. start_globe's controller *decisions* (when it schedules or
// cancels a frame, what stop() releases) are pinned separately in
// globe.dom.test.ts's "start_globe controller lifecycle" describe block,
// which runs in the `dom` project against a real <canvas>, so what it
// stubs is the gl object, requestAnimationFrame, cancelAnimationFrame and
// IntersectionObserver - see SHOULD 3 in the #178 round-3 review, which is
// what corrected this comment: those decisions used to be lumped in with
// "everything that decides what to draw" and implied covered, when nothing
// asserted them at all.

import { inertial_spin, propagate_to_globe, sidereal_time, type SatelliteScene } from "./orbits.js";
import { HUD_PALETTE, ORBIT_CLASS_COLORS } from "./palette.js";

export interface GlobeLines {
  world: string[];
  canada: string[];
}

export type Vec3 = readonly [number, number, number];
export type Segment = readonly [Vec3, Vec3];

// One full turn every two minutes.
export const ROTATION_MS_PER_TURN = 120_000;

// Fixed viewing tilt: leans the northern hemisphere toward the camera.
export const TILT_DEG = 18;

// YUL - Montreal's airport, not downtown. Hero.svelte's topbar derives its
// printed coordinates from these same constants, so they can't drift apart.
export const MONTREAL_LON = -73.7481;
export const MONTREAL_LAT = 45.4657;

// Great-circle subdivision step: no chord drawn between two adjacent
// vertices spans more than this angle, so a long simplified segment (a
// straight-ish border stored as just two far-apart points) hugs the sphere
// instead of cutting a straight line through it.
export const MAX_SEGMENT_ANGLE_RAD = Math.PI / 60; // 3 degrees

// Line opacity: full-strength on the near hemisphere, faint but present on
// the far one. The far side staying visible is what makes this read as a
// wireframe rather than a solid, culled ball.
export const LINE_FRONT_ALPHA = 0.9;
export const LINE_BACK_ALPHA = 0.16;

// Marker opacity: fades out over a narrow band around the horizon (view-
// space z near 0), rather than gradually across the whole front hemisphere
// like the lines do, then is fully invisible once past it.
export const MARKER_FADE_START_Z = -0.08;
export const MARKER_FADE_END_Z = 0.08;

// The globe is drawn inset from its viewport's shorter side by this
// fraction, so the wireframe never touches the frame edge. The WebGL draw
// and the Montreal marker's DOM placement both scale by this same constant
// so they never disagree about where the sphere's edge actually is. Was 0.94 until
// #203 put satellites above the surface: 0.75 leaves the low orbits room
// to sit well out from the wireframe and puts the geostationary ring
// (orbits.ts's `display_radius`) right at the shorter side's edge. The
// hero's box is wider than it is tall (#205), so sideways the ring runs on
// until the hero's own crop takes it.
export const SPHERE_FILL_RATIO = 0.75;

// Orbit rings are drawn at this fraction of the wireframe's own depth
// alpha, so they read as a layer above the globe rather than competing
// with its coastlines.
export const RING_ALPHA_SCALE = 0.75;

// Below this opacity a satellite icon stops accepting hover.
const ICON_HOVER_MIN_ALPHA = 0.5;

// Satellite dot diameter, in CSS pixels.
export const DOT_SIZE_PX = 2.5;

function to_radians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length3(v: Vec3): number {
  return Math.sqrt(dot3(v, v));
}

function normalize3(v: Vec3): Vec3 {
  const len = length3(v);
  return [v[0] / len, v[1] / len, v[2] / len];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Projects a lon/lat pair (degrees) onto the unit sphere. lon=0/lat=0 maps
// to (0, 0, 1) - the point facing the viewer before any spin is applied.
// Latitude maps directly onto the Y axis, so spinning around Y (see
// `rotate_y`) is spinning around the globe's own polar axis.
export function lonlat_to_unit_vector(lon_deg: number, lat_deg: number): Vec3 {
  const lon = to_radians(lon_deg);
  const lat = to_radians(lat_deg);
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
}

// Spherical linear interpolation between two unit vectors, renormalized
// against floating-point drift so the result always lands back on the unit
// sphere.
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const cos_theta = clamp(dot3(a, b), -1, 1);
  const theta = Math.acos(cos_theta);
  if (theta < 1e-9) {
    return a;
  }
  const sin_theta = Math.sin(theta);
  const weight_a = Math.sin((1 - t) * theta) / sin_theta;
  const weight_b = Math.sin(t * theta) / sin_theta;
  return normalize3([
    a[0] * weight_a + b[0] * weight_b,
    a[1] * weight_a + b[1] * weight_b,
    a[2] * weight_a + b[2] * weight_b,
  ]);
}

// Subdivides the arc from `a` to `b` so no two consecutive returned points
// are more than `max_angle_rad` apart, keeping every chord close to the
// sphere's surface instead of cutting a straight line through it. Includes
// both endpoints.
export function subdivide_arc(a: Vec3, b: Vec3, max_angle_rad: number): Vec3[] {
  const theta = Math.acos(clamp(dot3(a, b), -1, 1));
  const steps = Math.max(1, Math.ceil(theta / max_angle_rad));
  const points: Vec3[] = [a];
  for (let i = 1; i < steps; i++) {
    points.push(slerp(a, b, i / steps));
  }
  points.push(b);
  return points;
}

// Parses one "lon,lat lon,lat ..." encoded ring (see scripts/build-geo.ts)
// into unit-sphere points.
export function parse_ring(ring: string): Vec3[] {
  return ring
    .trim()
    .split(" ")
    .map((pair) => {
      const [lon, lat] = pair.split(",").map(Number);
      return lonlat_to_unit_vector(lon, lat);
    });
}

// Densifies a ring's points by subdividing every consecutive pair, so
// nothing in the ring cuts a straight chord through the sphere.
export function densify_ring(points: readonly Vec3[], max_angle_rad: number = MAX_SEGMENT_ANGLE_RAD): Vec3[] {
  if (points.length < 2) {
    return [...points];
  }
  const dense: Vec3[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    dense.push(...subdivide_arc(points[i - 1], points[i], max_angle_rad).slice(1));
  }
  return dense;
}

// Converts a dense polyline into (start, end) vertex pairs for gl.LINES -
// consecutive points share a vertex, so each interior point appears twice.
export function line_segments(points: readonly Vec3[]): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push([points[i], points[i + 1]]);
  }
  return segments;
}

// Parses, densifies and pairs every ring in an encoded ring list into flat
// gl.LINES segments. This is the whole path from build-geo.ts's output to
// drawable geometry, so it's where the "every vertex on the unit sphere"
// invariant is exercised end to end.
export function build_ring_segments(rings: readonly string[]): Segment[] {
  const segments: Segment[] = [];
  for (const ring of rings) {
    segments.push(...line_segments(densify_ring(parse_ring(ring))));
  }
  return segments;
}

// Rotates around the polar (Y) axis - the globe's own spin.
export function rotate_y(v: Vec3, angle_rad: number): Vec3 {
  const cos = Math.cos(angle_rad);
  const sin = Math.sin(angle_rad);
  return [v[0] * cos + v[2] * sin, v[1], -v[0] * sin + v[2] * cos];
}

// Rotates around the X axis - the fixed viewing tilt that leans the
// northern hemisphere toward the camera.
export function rotate_x(v: Vec3, angle_rad: number): Vec3 {
  const cos = Math.cos(angle_rad);
  const sin = Math.sin(angle_rad);
  return [v[0], v[1] * cos - v[2] * sin, v[1] * sin + v[2] * cos];
}

// Rotation angle for a given elapsed time: one full turn every
// `ms_per_turn`, wrapped into [0, 2*pi).
export function rotation_angle(elapsed_ms: number, ms_per_turn: number): number {
  const turns = elapsed_ms / ms_per_turn;
  return (((turns % 1) + 1) % 1) * 2 * Math.PI;
}

// Applies the current spin and the fixed viewing tilt, in that order: spin
// is the sphere's own rotation about its polar axis, tilt is a camera-side
// adjustment applied on top of it.
export function to_view_space(v: Vec3, spin_rad: number, tilt_rad: number): Vec3 {
  return rotate_x(rotate_y(v, spin_rad), tilt_rad);
}

export function tilt_radians(): number {
  return to_radians(TILT_DEG);
}

// Opacity for a wireframe line vertex at view-space depth `z` (1 = nearest
// the viewer, -1 = farthest). Interpolates linearly across the whole
// sphere so the far hemisphere stays faintly visible.
export function line_alpha(z: number): number {
  return LINE_BACK_ALPHA + (LINE_FRONT_ALPHA - LINE_BACK_ALPHA) * ((clamp(z, -1, 1) + 1) / 2);
}

// Opacity for the Montreal marker at view-space depth `z`. Unlike the
// lines, it fades out over a narrow band around the horizon and is fully
// hidden once past it, rather than staying faintly visible on the far side.
export function marker_alpha(z: number): number {
  return smoothstep(MARKER_FADE_START_Z, MARKER_FADE_END_Z, z);
}

// A satellite icon's silhouette band: how far past the globe's projected
// edge (in globe radii) an object behind the globe fades back in.
const ICON_LIMB_FADE_START = 0.98;
const ICON_LIMB_FADE_END = 1.02;

// Opacity for a satellite icon at view-space position `v`. Unlike
// marker_alpha, which only knows depth because Montreal is on the surface,
// a satellite sits above it: one behind the globe is hidden only while it
// is inside the globe's silhouette, and in plain sight once its projection
// clears the limb.
export function icon_alpha(v: Vec3): number {
  const from_centre = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  const outside = smoothstep(ICON_LIMB_FADE_START, ICON_LIMB_FADE_END, from_centre);
  return 1 - (1 - marker_alpha(v[2])) * (1 - outside);
}

export interface ScreenPoint {
  x: number;
  y: number;
  z: number;
}

// Orthographic projection from view space to canvas-space pixels, centered
// at (center_x, center_y). Y is inverted because screen space grows
// downward while view space grows upward.
export function project_to_screen(v: Vec3, radius_px: number, center_x: number, center_y: number): ScreenPoint {
  return { x: center_x + v[0] * radius_px, y: center_y - v[1] * radius_px, z: v[2] };
}

export interface MontrealMarker {
  x: number;
  y: number;
  opacity: number;
}

const MONTREAL_UNIT = lonlat_to_unit_vector(MONTREAL_LON, MONTREAL_LAT);

// Spin offset that puts the Montreal point centred and facing the viewer at
// spin_rad=0's usual position - i.e. the value `start_globe` adds to
// `rotation_angle`'s output so the very first frame opens on Montreal
// instead of an arbitrary longitude.
//
// rotate_y (see `to_view_space`) sends a unit vector's x-coordinate from
// cos(lat)*sin(lon) to cos(lat)*sin(lon + spin_rad); that's zero - dead
// centre, since tilt (rotate_x) never touches x - exactly when
// spin_rad = -lon (mod pi), and picking spin_rad = -lon specifically (not
// -lon + pi) lands the point's view-space z at +cos(lat), the near side
// rather than the far one. So the offset is simply -lon in radians, derived
// from MONTREAL_LON rather than a hand-tuned number: if the constant ever
// moves, this moves with it.
export const MONTREAL_START_SPIN_RAD = -to_radians(MONTREAL_LON);

// Spin for a given elapsed time, phase-shifted by MONTREAL_START_SPIN_RAD:
// the same rotation_angle the globe always used, just starting from
// Montreal centred (elapsed=0) instead of spin=0. Speed and direction are
// unchanged - rotation_angle still does all of that - this only moves where
// the clock starts. Split out as its own pure function (rather than left
// inline in start_globe's frame()) so the phase shift itself is directly
// testable, the same way every other piece of this module's maths is.
export function globe_spin_at(elapsed_ms: number, ms_per_turn: number): number {
  return rotation_angle(elapsed_ms, ms_per_turn) + MONTREAL_START_SPIN_RAD;
}

// Where the Montreal marker sits on screen, and how visible it is, at a
// given spin angle. A pure function of the same rotation the shader uses,
// so the DOM flag/label and the canvas can never disagree about where
// Montreal currently is.
export function montreal_marker(
  spin_rad: number,
  tilt_rad: number,
  radius_px: number,
  center_x: number,
  center_y: number,
): MontrealMarker {
  const view = to_view_space(MONTREAL_UNIT, spin_rad, tilt_rad);
  const screen = project_to_screen(view, radius_px, center_x, center_y);
  return { x: screen.x, y: screen.y, opacity: marker_alpha(view[2]) };
}

// Transforms every segment endpoint into clip-space xy (still on the unit
// sphere's projection, before the caller's fill-ratio/aspect scaling) plus
// its view-space depth. `aspect_x`/`aspect_y` let the caller keep the
// sphere circular on a non-square viewport. `out`, when given, is written
// into and returned in place of allocating fresh arrays - the geometry's
// vertex count is static per draw call, so a per-frame caller (start_globe)
// can allocate once and reuse the same buffers every frame instead of
// allocating ~200 KB of short-lived Float32Arrays 60 times a second.
export function transform_segments(
  segments: readonly Segment[],
  spin_rad: number,
  tilt_rad: number,
  aspect_x: number,
  aspect_y: number,
  out?: { positions: Float32Array; depths: Float32Array },
): { positions: Float32Array; depths: Float32Array } {
  const vertex_count = segments.length * 2;
  const positions = out?.positions ?? new Float32Array(vertex_count * 2);
  const depths = out?.depths ?? new Float32Array(vertex_count);
  let p = 0;
  let d = 0;
  for (const [a, b] of segments) {
    for (const point of [a, b]) {
      const view = to_view_space(point, spin_rad, tilt_rad);
      positions[p++] = view[0] * aspect_x;
      positions[p++] = view[1] * aspect_y;
      depths[d++] = view[2];
    }
  }
  return { positions, depths };
}

// One contiguous run of vertices in the line buffer that shares a color.
// `alpha_scale` multiplies the depth alpha, so a band can sit quieter than
// the wireframe (orbit rings) without its own fade curve.
export interface ColorBand {
  vertex_count: number;
  rgb: readonly [number, number, number];
  alpha_scale: number;
}

// Builds the per-vertex RGBA color buffer for a transformed frame: each
// band colors the next `vertex_count` vertices, in order, with alpha from
// `line_alpha` at that vertex's depth times the band's `alpha_scale`.
// `out` behaves the same way as in `transform_segments`: reuse a
// caller-owned buffer instead of allocating a fresh one every call.
export function build_color_buffer(
  depths: Float32Array,
  bands: readonly ColorBand[],
  out?: Float32Array,
): Float32Array {
  const colors = out ?? new Float32Array(depths.length * 4);
  let i = 0;
  for (const band of bands) {
    const end = Math.min(depths.length, i + band.vertex_count);
    for (; i < end; i++) {
      colors[i * 4] = band.rgb[0];
      colors[i * 4 + 1] = band.rgb[1];
      colors[i * 4 + 2] = band.rgb[2];
      colors[i * 4 + 3] = line_alpha(depths[i]) * band.alpha_scale;
    }
  }
  return colors;
}

// Parses a "#rrggbb" hex color into 0-1 floats for a WebGL color buffer.
export function hex_to_rgb01(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export const GLOBE_LINES_URL = "/landing/globe-lines.json";

// The still fallback (see scripts/build-geo.ts) - a pre-rendered SVG of the
// same projection at the same tilt, shown by Hero.svelte until the canvas
// confirms it's actually animating. Covers the reduced-motion, no-WebGL and
// no-JS cases: reduced-motion and no-WebGL never flip `canvas_animating` to
// true, and no-JS never runs the script that would.
export const GLOBE_STILL_URL = "/landing/globe-still.svg";

// Fetches and parses the committed geometry payload (see
// scripts/build-geo.ts). A thin passthrough to `fetch`/`JSON.parse` with no
// logic of its own to test - only ever called from browser-only code.
export async function load_globe_lines(url: string = GLOBE_LINES_URL): Promise<GlobeLines> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load globe geometry: ${response.status}`);
  }
  return (await response.json()) as GlobeLines;
}

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform float u_point_size;
  varying vec4 v_color;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    gl_PointSize = u_point_size;
    v_color = a_color;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    gl_FragColor = v_color;
  }
`;

function compile_shader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function create_program(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertex_shader = compile_shader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragment_shader = compile_shader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  if (!vertex_shader || !fragment_shader) {
    if (vertex_shader) gl.deleteShader(vertex_shader);
    if (fragment_shader) gl.deleteShader(fragment_shader);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex_shader);
    gl.deleteShader(fragment_shader);
    return null;
  }
  gl.attachShader(program, vertex_shader);
  gl.attachShader(program, fragment_shader);
  gl.linkProgram(program);
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS) as boolean;

  // Once linking is done (successfully or not), the shaders are no longer
  // needed as separate objects - gl.deleteShader here just flags them for
  // deletion, which actually happens once they're detached (below, on
  // failure) or the program itself is deleted (on stop() - see
  // start_globe). This is the standard release point after a successful
  // link that the previous version of this function skipped entirely.
  gl.deleteShader(vertex_shader);
  gl.deleteShader(fragment_shader);

  if (!linked) {
    gl.detachShader(program, vertex_shader);
    gl.detachShader(program, fragment_shader);
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export interface GlobeController {
  stop: () => void;
}

export interface StartGlobeOptions {
  canvas: HTMLCanvasElement;
  lines: GlobeLines;
  marker_el?: HTMLElement | null;
  // Satellites (#203): rings and dots drawn in the same WebGL pass, and a
  // DOM icon per flagship, keyed by NORAD id, placed and faded every frame
  // the way the Montreal marker is. Both optional - without them the globe
  // is exactly what it was before.
  satellites?: SatelliteScene | null;
  satellite_icon_els?: ReadonlyMap<number, HTMLElement>;
}

// Wires the pure geometry/projection/rotation helpers above to a live
// WebGL <canvas>: builds the static per-vertex geometry once, then runs a
// requestAnimationFrame loop that re-transforms it every frame for the
// current spin angle and re-positions the Montreal marker DOM element from
// the same rotation. Cancels the pending frame (rather than merely
// skipping the draw) when the hero scrolls out of view or the tab is
// hidden. Returns null - starting nothing, scheduling nothing - when a
// WebGL context can't be obtained, leaving the hero's static gradient
// backdrop as the only visible layer.
//
// Must only be called from browser-only code (Hero.svelte's onMount); it
// touches window/document/canvas context directly and has no SSR guard of
// its own.
export function start_globe(options: StartGlobeOptions): GlobeController | null {
  const { canvas, lines, marker_el, satellites, satellite_icon_els } = options;
  const gl = (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) {
    return null;
  }
  // TypeScript can't carry the `!gl` narrowing above into the nested
  // function declarations below (size_canvas, draw, frame, ...), so without
  // this binding every `gl` use inside them would need a `!` assertion.
  // One non-null binding here fixes that properly: closures see `ctx`'s
  // non-null type directly.
  const ctx: WebGLRenderingContext = gl;

  const program = create_program(ctx);
  if (!program) {
    // Symmetric with the success path's teardown (see stop(), below): a
    // failed link still leaves a live context sitting on the canvas with
    // nothing to release it, which counts against the same browser-wide
    // WebGL context budget as a context that started drawing successfully.
    ctx.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }

  const world_segments = build_ring_segments(lines.world);
  const canada_segments = build_ring_segments(lines.canada);
  const geo_ring = satellites?.geo_ring ?? [];
  // Grouped by orbit class so each class is one contiguous color band.
  const leo_rings = (satellites?.rings ?? []).filter((r) => r.orbit_class === "leo").flatMap((r) => r.segments);
  const sso_rings = (satellites?.rings ?? []).filter((r) => r.orbit_class === "sso").flatMap((r) => r.segments);
  const orbit_rings = [...leo_rings, ...sso_rings];
  // Two groups, because they spin differently: Earth-fixed geometry turns
  // with the globe's own spin, while orbit rings live on inertial axes and
  // are drawn with `inertial_spin` (see orbits.ts). The geostationary ring
  // is symmetric about the polar axis, so it rides with the Earth-fixed
  // group.
  const earth_segments = [...world_segments, ...canada_segments, ...geo_ring];
  const earth_vertex_count = earth_segments.length * 2;
  const vertex_count = earth_vertex_count + orbit_rings.length * 2;

  const secondary_rgb = hex_to_rgb01(HUD_PALETTE.secondary);
  const accent_rgb = hex_to_rgb01(HUD_PALETTE.accent);
  const text_rgb = hex_to_rgb01(HUD_PALETTE.text);
  const color_bands: ColorBand[] = [
    { vertex_count: world_segments.length * 2, rgb: secondary_rgb, alpha_scale: 1 },
    { vertex_count: canada_segments.length * 2, rgb: accent_rgb, alpha_scale: 1 },
    { vertex_count: geo_ring.length * 2, rgb: hex_to_rgb01(ORBIT_CLASS_COLORS.geo), alpha_scale: RING_ALPHA_SCALE },
    { vertex_count: leo_rings.length * 2, rgb: hex_to_rgb01(ORBIT_CLASS_COLORS.leo), alpha_scale: RING_ALPHA_SCALE },
    { vertex_count: sso_rings.length * 2, rgb: hex_to_rgb01(ORBIT_CLASS_COLORS.sso), alpha_scale: RING_ALPHA_SCALE },
  ];

  // The geometry is static once built, so its transformed buffers are
  // allocated exactly once here and written in place every frame (see
  // `draw`) instead of allocating fresh Float32Arrays 60 times a second.
  const positions = new Float32Array(vertex_count * 2);
  const depths = new Float32Array(vertex_count);
  const colors = new Float32Array(vertex_count * 4);
  // Views onto the same buffers, one per spin group.
  const earth_out = {
    positions: positions.subarray(0, earth_vertex_count * 2),
    depths: depths.subarray(0, earth_vertex_count),
  };
  const orbit_out = {
    positions: positions.subarray(earth_vertex_count * 2),
    depths: depths.subarray(earth_vertex_count),
  };

  // Satellite dots: moving, so re-propagated every frame, but their count
  // is fixed, so their buffers are allocated once here too.
  const dots = satellites?.dots ?? [];
  const dot_positions = new Float32Array(dots.length * 2);
  const dot_colors = new Float32Array(dots.length * 4);

  const position_buffer = ctx.createBuffer();
  const color_buffer = ctx.createBuffer();
  const position_location = ctx.getAttribLocation(program, "a_position");
  const color_location = ctx.getAttribLocation(program, "a_color");
  const point_size_location = ctx.getUniformLocation(program, "u_point_size");

  ctx.enable(ctx.BLEND);
  ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);
  ctx.clearColor(0, 0, 0, 0);

  const tilt = tilt_radians();
  const start_ms = performance.now();

  // Cached from the canvas's own getBoundingClientRect() - only size_canvas
  // (called on mount and on resize, which already has a listener) touches
  // layout. draw() runs every frame and reads these instead of calling
  // getBoundingClientRect() itself, which would force a synchronous
  // style/layout flush on every single frame.
  let cached_width = 0;
  let cached_height = 0;

  function size_canvas() {
    const rect = canvas.getBoundingClientRect();
    cached_width = rect.width;
    cached_height = rect.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.viewport(0, 0, canvas.width, canvas.height);
    ctx.useProgram(program);
    ctx.uniform1f(point_size_location, DOT_SIZE_PX * dpr);
  }
  size_canvas();
  window.addEventListener("resize", size_canvas);

  function draw(spin_rad: number) {
    const min_dimension = Math.min(cached_width, cached_height) || 1;
    const aspect_x = cached_width > 0 ? (min_dimension / cached_width) * SPHERE_FILL_RATIO : SPHERE_FILL_RATIO;
    const aspect_y = cached_height > 0 ? (min_dimension / cached_height) * SPHERE_FILL_RATIO : SPHERE_FILL_RATIO;

    // Satellites are propagated at the real current time, not the globe's
    // animation clock: the globe's spin is sped up, the satellites are not.
    const now = new Date();
    const orbit_spin = inertial_spin(spin_rad, sidereal_time(now));

    transform_segments(earth_segments, spin_rad, tilt, aspect_x, aspect_y, earth_out);
    transform_segments(orbit_rings, orbit_spin, tilt, aspect_x, aspect_y, orbit_out);
    build_color_buffer(depths, color_bands, colors);

    ctx.clear(ctx.COLOR_BUFFER_BIT);

    ctx.useProgram(program);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, position_buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, positions, ctx.DYNAMIC_DRAW);
    ctx.enableVertexAttribArray(position_location);
    ctx.vertexAttribPointer(position_location, 2, ctx.FLOAT, false, 0, 0);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, color_buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, colors, ctx.DYNAMIC_DRAW);
    ctx.enableVertexAttribArray(color_location);
    ctx.vertexAttribPointer(color_location, 4, ctx.FLOAT, false, 0, 0);

    ctx.drawArrays(ctx.LINES, 0, depths.length);

    if (dots.length > 0) {
      for (let i = 0; i < dots.length; i++) {
        const position = propagate_to_globe(dots[i].satrec, now);
        const view = position ? to_view_space(position, orbit_spin, tilt) : null;
        const rgb = dots[i].canadian ? accent_rgb : text_rgb;
        dot_positions[i * 2] = view ? view[0] * aspect_x : 0;
        dot_positions[i * 2 + 1] = view ? view[1] * aspect_y : 0;
        dot_colors[i * 4] = rgb[0];
        dot_colors[i * 4 + 1] = rgb[1];
        dot_colors[i * 4 + 2] = rgb[2];
        dot_colors[i * 4 + 3] = view ? line_alpha(view[2]) : 0;
      }

      ctx.bindBuffer(ctx.ARRAY_BUFFER, position_buffer);
      ctx.bufferData(ctx.ARRAY_BUFFER, dot_positions, ctx.DYNAMIC_DRAW);
      ctx.vertexAttribPointer(position_location, 2, ctx.FLOAT, false, 0, 0);

      ctx.bindBuffer(ctx.ARRAY_BUFFER, color_buffer);
      ctx.bufferData(ctx.ARRAY_BUFFER, dot_colors, ctx.DYNAMIC_DRAW);
      ctx.vertexAttribPointer(color_location, 4, ctx.FLOAT, false, 0, 0);

      ctx.drawArrays(ctx.POINTS, 0, dots.length);
    }

    const radius_px = (min_dimension / 2) * SPHERE_FILL_RATIO;
    const center_x = cached_width / 2;
    const center_y = cached_height / 2;

    if (marker_el) {
      const marker = montreal_marker(spin_rad, tilt, radius_px, center_x, center_y);
      marker_el.style.transform = `translate(${marker.x}px, ${marker.y}px) translate(-50%, -50%)`;
      marker_el.style.opacity = String(marker.opacity);
    }

    for (const flagship of satellites?.flagships ?? []) {
      const icon_el = satellite_icon_els?.get(flagship.norad_id);
      if (!icon_el) {
        continue;
      }
      const position = propagate_to_globe(flagship.satrec, now);
      if (!position) {
        icon_el.style.opacity = "0";
        icon_el.style.pointerEvents = "none";
        continue;
      }
      const view = to_view_space(position, orbit_spin, tilt);
      const screen = project_to_screen(view, radius_px, center_x, center_y);
      icon_el.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -50%)`;
      const alpha = icon_alpha(view);
      icon_el.style.opacity = String(alpha);
      // An icon faded out behind the globe must not catch hover.
      icon_el.style.pointerEvents = alpha > ICON_HOVER_MIN_ALPHA ? "auto" : "none";
    }
  }

  let raf_id: number | null = null;
  let running = true;
  let hero_visible = true;
  let tab_visible = document.visibilityState === "visible";

  function frame(ts: DOMHighResTimeStamp) {
    raf_id = null;
    if (!running || !hero_visible || !tab_visible) {
      return;
    }
    draw(globe_spin_at(ts - start_ms, ROTATION_MS_PER_TURN));
    raf_id = requestAnimationFrame(frame);
  }

  function stop_frame() {
    if (raf_id !== null) {
      cancelAnimationFrame(raf_id);
      raf_id = null;
    }
  }

  function schedule() {
    if (raf_id === null && running && hero_visible && tab_visible) {
      raf_id = requestAnimationFrame(frame);
    }
  }

  const intersection_observer = new IntersectionObserver((entries) => {
    hero_visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (hero_visible) {
      schedule();
    } else {
      stop_frame();
    }
  });
  intersection_observer.observe(canvas);

  function on_visibility_change() {
    tab_visible = document.visibilityState === "visible";
    if (tab_visible) {
      schedule();
    } else {
      stop_frame();
    }
  }
  document.addEventListener("visibilitychange", on_visibility_change);

  schedule();

  return {
    stop: () => {
      running = false;
      stop_frame();
      intersection_observer.disconnect();
      document.removeEventListener("visibilitychange", on_visibility_change);
      window.removeEventListener("resize", size_canvas);

      // Symmetric with setup: release the GPU-side handles, not just the
      // JS-side ones above. The landing page is one route among several
      // under client-side routing, so every navigation away and back
      // creates a fresh context; browsers cap live WebGL contexts at
      // roughly 8-16 and drop the oldest one when that's exceeded, and
      // relying on GC to eventually reclaim these is not timed to that.
      // Left unreleased, enough round trips silently exhaust the budget:
      // getContext("webgl") starts returning null, start_globe returns
      // null, and the globe just stops appearing with no error anywhere.
      ctx.deleteBuffer(position_buffer);
      ctx.deleteBuffer(color_buffer);
      ctx.deleteProgram(program);
      ctx.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
