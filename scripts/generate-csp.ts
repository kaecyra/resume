// Generates the nginx map that feeds `script-src` in the site's Content
// Security Policy (#239).
//
// SvelteKit inlines a hydration script into every prerendered page, and that
// script carries page-specific data, so no two pages share a body and no two
// pages share a hash. Naming every hash in one static header would put a
// couple of kilobytes on every response and would grow with each sub-variant
// added, so instead this emits `map $uri $csp_script_hashes { ... }` and
// nginx picks the one hash belonging to the page it is about to serve.
//
// Run by `npm run generate-csp` after `vite build`; the Dockerfile copies the
// result to /etc/nginx/conf.d/csp-map.conf, where it is included at http
// level alongside the site config. The output is not committed - it is
// derived from `build/` and is stale the moment the build changes.
//
// Two keys are emitted per page, `/cto-a` and `/cto-a.html`, because the `/`
// location resolves a bare route through `try_files $uri $uri.html` and $uri
// may hold either form by the time add_header evaluates the policy. Emitting
// both costs a line and removes the question.
//
// Data blocks are skipped. The test is not whether the browser executes the
// block but whether script-src checks it, and those are different sets: an
// inline `importmap` and inline `speculationrules` never execute and are both
// still checked. What script-src ignores is everything else with a type that
// is not a JavaScript MIME type essence - JSON-LD, which this build has today,
// and SvelteKit's `data-sveltekit-fetched` application/json blocks, which it
// grows the moment a route's load() fetches.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { posix, join, relative, sep } from "node:path";

export interface PageHashes {
  /** Every request path that should resolve to this page's hashes. */
  keys: string[];
  /** One `sha256-<base64>` per inline script, in document order. */
  hashes: string[];
}

const BUILD_DIR = "build";
const OUTPUT_PATH = "csp-map.conf";

const SCRIPT_ELEMENT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const SRC_ATTRIBUTE = /(^|\s)src\s*=/i;
const TYPE_ATTRIBUTE = /(^|\s)type\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
// Every inline script type whose body script-src checks: the HTML spec's
// JavaScript MIME type essences, plus the three non-JavaScript types that are
// still subject to the policy. A type attribute holding anything else - a
// JavaScript type carrying a parameter included, since that is not an essence
// match - makes the element a data block the policy never sees.
//
// Getting this set too small is the dangerous direction. A missing hash does
// not warn; the browser simply blocks the block, and for an import map that
// takes module resolution for the whole page with it. Too large only spends a
// hash nothing will match.
const CSP_CHECKED_SCRIPT_TYPES = new Set([
  "",
  "module",
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
  // Non-executable, still checked. `'inline-speculation-rules'` exists as a
  // script-src source expression precisely because inline speculation rules
  // are otherwise blocked.
  "importmap",
  "speculationrules",
]);

// Keys are rooted paths built from filenames on disk; hashes are base64. Both
// are checked before they reach the config file so a surprising filename can
// never inject an nginx directive or interpolate a variable into the policy.
const SAFE_ROUTE_KEY = /^\/[A-Za-z0-9._~\-/]*$/;
const SAFE_HASH = /^sha256-[A-Za-z0-9+/]+={0,2}$/;

/**
 * Returns the body of every inline script the browser will execute, exactly
 * as it sits between the tags. Scripts with a `src` are skipped (the browser
 * ignores their body) and so are data blocks - anything script-src does not
 * check, which is not the same set as anything the browser does not run.
 */
export function extract_inline_script_bodies(html: string): string[] {
  const bodies: string[] = [];

  for (const match of html.matchAll(SCRIPT_ELEMENT)) {
    const attributes = match[1];
    if (SRC_ATTRIBUTE.test(attributes)) {
      continue;
    }

    const type = TYPE_ATTRIBUTE.exec(attributes);
    const type_value = type ? (type[3] ?? type[4] ?? type[5] ?? "") : "";
    if (!CSP_CHECKED_SCRIPT_TYPES.has(type_value.trim().toLowerCase())) {
      continue;
    }

    bodies.push(match[2]);
  }

  return bodies;
}

/** Hashes a script body the way a browser does: sha256 over its UTF-8 bytes. */
export function hash_inline_script(body: string): string {
  return `sha256-${createHash("sha256").update(body, "utf-8").digest("base64")}`;
}

/**
 * Turns a path relative to the build directory into the request paths that
 * serve it - the extensionless route nginx resolves through try_files, and
 * the file path itself.
 */
export function route_keys_for(relative_path: string): string[] {
  const path = `/${relative_path.split(sep).join(posix.sep)}`;

  if (path.endsWith("/index.html")) {
    return [path.slice(0, -"index.html".length), path];
  }

  return [path.slice(0, -".html".length), path];
}

/** Renders the nginx map. Throws rather than emitting anything nginx would misread. */
export function build_csp_map(pages: PageHashes[]): string {
  if (pages.length === 0) {
    throw new Error(
      `no HTML pages found in ${BUILD_DIR}/ - every page would fall through to the ` +
        `empty default and its inline script would be blocked`,
    );
  }

  const lines: string[] = [];

  for (const page of pages) {
    if (page.hashes.length === 0) {
      continue;
    }

    for (const hash of page.hashes) {
      if (!SAFE_HASH.test(hash)) {
        throw new Error(`refusing to write hash with unexpected characters: ${hash}`);
      }
    }

    const value = page.hashes.map((hash) => `'${hash}'`).join(" ");

    for (const key of page.keys) {
      if (!SAFE_ROUTE_KEY.test(key)) {
        throw new Error(`refusing to write route key with unexpected characters: ${key}`);
      }
      lines.push(`    "${key}" "${value}";`);
    }
  }

  // Pages were walked but nothing matched - the shape a SvelteKit markup
  // change produces, and the one this whole file exists to survive. The map
  // would be its empty default and nothing else, so every page would ship
  // `script-src 'self'`, every hydration script would be blocked, and the
  // build would say so nowhere: the walk succeeded, the file was written, the
  // exit code was zero. Fail the build instead.
  if (lines.length === 0) {
    throw new Error(
      `${pages.length} HTML pages found but none carried an inline script - the ` +
        `markup this script matches has probably changed, and every page would ` +
        `be served a policy that blocks its own hydration`,
    );
  }

  lines.sort();

  return [
    "# Generated by scripts/generate-csp.ts - do not edit, do not commit.",
    "# Maps a request path to the sha256 of that page's inline scripts, which",
    "# nginx.conf splices into script-src. Pages with no inline script fall",
    "# through to the empty default.",
    "map $uri $csp_script_hashes {",
    '    default "";',
    "",
    ...lines,
    "}",
    "",
  ].join("\n");
}

/** Walks the build output and hashes every page's inline scripts. */
export function collect_page_hashes(build_dir: string): PageHashes[] {
  return html_files(build_dir)
    .map((file) => ({
      keys: route_keys_for(relative(build_dir, file)),
      hashes: extract_inline_script_bodies(readFileSync(file, "utf-8")).map(hash_inline_script),
    }))
    .sort((a, b) => a.keys[1].localeCompare(b.keys[1]));
}

function html_files(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...html_files(path));
    } else if (entry.name.endsWith(".html")) {
      found.push(path);
    }
  }

  return found;
}

function main(): void {
  const pages = collect_page_hashes(BUILD_DIR);
  const conf = build_csp_map(pages);

  writeFileSync(OUTPUT_PATH, conf);

  const hashed = pages.filter((page) => page.hashes.length > 0).length;
  console.log(`csp: ${hashed}/${pages.length} pages with inline scripts -> ${OUTPUT_PATH}`);
}

// Guards the side-effecting entry point the way build-geo.ts does, so
// importing this module - from generate-csp.test.ts, or transitively - never
// writes the config. Matches the shape this script runs under:
// `tsx scripts/generate-csp.ts` (npm run generate-csp).
if (process.argv[1]?.endsWith("generate-csp.ts")) {
  main();
}
