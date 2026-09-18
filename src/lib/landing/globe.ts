// Pure geometry, projection and rotation maths for the landing hero's
// wireframe globe (#178), plus the browser-only WebGL controller that wires
// them to a <canvas>. Mirrors the split in the parked hud-canvas.ts (#168):
// the maths is plain functions over plain data, tested directly in
// globe.test.ts. A real WebGL context is still not available under vitest
// (see #175), so the drawing itself - and only the drawing itself - stays
// untested; everything that decides *what* to draw does not.

import { HUD_PALETTE } from "./palette.js";

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

// Montreal, matching the coordinates already printed in Hero.svelte's
// topbar ("45.50N 73.57W").
export const MONTREAL_LON = -73.57;
export const MONTREAL_LAT = 45.5;

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

// The globe is drawn inset from its square viewport by this fraction, so
// the wireframe never touches the frame edge. The WebGL draw and the
// Montreal marker's DOM placement both scale by this same constant so they
// never disagree about where the sphere's edge actually is.
export const SPHERE_FILL_RATIO = 0.94;

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

function smoothstep(edge0: number, edge1: number, x: number): number {
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
// sphere circular on a non-square viewport.
export function transform_segments(
  segments: readonly Segment[],
  spin_rad: number,
  tilt_rad: number,
  aspect_x: number,
  aspect_y: number,
): { positions: Float32Array; depths: Float32Array } {
  const vertex_count = segments.length * 2;
  const positions = new Float32Array(vertex_count * 2);
  const depths = new Float32Array(vertex_count);
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

// Builds the per-vertex RGBA color buffer for a transformed frame: vertices
// before `world_vertex_count` are colored `world_rgb`, the rest
// `canada_rgb` - alpha comes from `line_alpha` at that vertex's depth.
export function build_color_buffer(
  depths: Float32Array,
  world_vertex_count: number,
  world_rgb: readonly [number, number, number],
  canada_rgb: readonly [number, number, number],
): Float32Array {
  const colors = new Float32Array(depths.length * 4);
  for (let i = 0; i < depths.length; i++) {
    const rgb = i < world_vertex_count ? world_rgb : canada_rgb;
    const alpha = line_alpha(depths[i]);
    colors[i * 4] = rgb[0];
    colors[i * 4 + 1] = rgb[1];
    colors[i * 4 + 2] = rgb[2];
    colors[i * 4 + 3] = alpha;
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
  varying vec4 v_color;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
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
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    return null;
  }
  gl.attachShader(program, vertex_shader);
  gl.attachShader(program, fragment_shader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
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
  const { canvas, lines, marker_el } = options;
  const gl = (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) {
    return null;
  }

  const program = create_program(gl);
  if (!program) {
    return null;
  }

  const world_segments = build_ring_segments(lines.world);
  const canada_segments = build_ring_segments(lines.canada);
  const all_segments = [...world_segments, ...canada_segments];
  const world_vertex_count = world_segments.length * 2;
  const world_rgb = hex_to_rgb01(HUD_PALETTE.secondary);
  const canada_rgb = hex_to_rgb01(HUD_PALETTE.accent);

  const position_buffer = gl.createBuffer();
  const color_buffer = gl.createBuffer();
  const position_location = gl.getAttribLocation(program, "a_position");
  const color_location = gl.getAttribLocation(program, "a_color");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const tilt = tilt_radians();
  const start_ms = performance.now();

  function size_canvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }
  size_canvas();
  window.addEventListener("resize", size_canvas);

  function draw(spin_rad: number) {
    const rect = canvas.getBoundingClientRect();
    const min_dimension = Math.min(rect.width, rect.height) || 1;
    const aspect_x = rect.width > 0 ? (min_dimension / rect.width) * SPHERE_FILL_RATIO : SPHERE_FILL_RATIO;
    const aspect_y = rect.height > 0 ? (min_dimension / rect.height) * SPHERE_FILL_RATIO : SPHERE_FILL_RATIO;

    const { positions, depths } = transform_segments(all_segments, spin_rad, tilt, aspect_x, aspect_y);
    const colors = build_color_buffer(depths, world_vertex_count, world_rgb, canada_rgb);

    gl!.clear(gl!.COLOR_BUFFER_BIT);

    gl!.useProgram(program);

    gl!.bindBuffer(gl!.ARRAY_BUFFER, position_buffer);
    gl!.bufferData(gl!.ARRAY_BUFFER, positions, gl!.DYNAMIC_DRAW);
    gl!.enableVertexAttribArray(position_location);
    gl!.vertexAttribPointer(position_location, 2, gl!.FLOAT, false, 0, 0);

    gl!.bindBuffer(gl!.ARRAY_BUFFER, color_buffer);
    gl!.bufferData(gl!.ARRAY_BUFFER, colors, gl!.DYNAMIC_DRAW);
    gl!.enableVertexAttribArray(color_location);
    gl!.vertexAttribPointer(color_location, 4, gl!.FLOAT, false, 0, 0);

    gl!.drawArrays(gl!.LINES, 0, depths.length);

    if (marker_el) {
      const radius_px = (min_dimension / 2) * SPHERE_FILL_RATIO;
      const marker = montreal_marker(spin_rad, tilt, radius_px, rect.width / 2, rect.height / 2);
      marker_el.style.transform = `translate(${marker.x}px, ${marker.y}px) translate(-50%, -50%)`;
      marker_el.style.opacity = String(marker.opacity);
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
    draw(rotation_angle(ts - start_ms, ROTATION_MS_PER_TURN));
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
    },
  };
}
