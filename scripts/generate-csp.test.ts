// Covers generate-csp.ts's exported pure functions directly, plus its
// directory walk against a temporary fixture tree - the same shape
// build-geo.test.ts uses. Importing this module is side-effect free:
// generate-csp.ts guards its entry point the way the other scripts do.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  build_csp_map,
  collect_page_hashes,
  extract_inline_script_bodies,
  hash_inline_script,
  route_keys_for,
} from "./generate-csp.js";

describe("extract_inline_script_bodies", () => {
  it("returns the body of a plain inline script", () => {
    expect(extract_inline_script_bodies("<script>alert(1)</script>")).toEqual(["alert(1)"]);
  });

  it("skips scripts loaded from a src, whose bytes the browser never hashes", () => {
    const html = '<script defer src="/insights.js" data-website-id="x"></script>';
    expect(extract_inline_script_bodies(html)).toEqual([]);
  });

  it("skips a src script even when it also carries a body", () => {
    // The browser ignores the body of a script with a src, so CSP never
    // checks it against script-src and hashing it would be noise.
    expect(extract_inline_script_bodies('<script src="/a.js">ignored</script>')).toEqual([]);
  });

  it("skips application/ld+json, which is a data block and not subject to script-src", () => {
    const html = '<script type="application/ld+json">{"@type":"ProfilePage"}</script>';
    expect(extract_inline_script_bodies(html)).toEqual([]);
  });

  it("skips ld+json regardless of attribute spacing and quote style", () => {
    const html = [
      "<script type='application/ld+json'>{}</script>",
      "<script  TYPE = \"APPLICATION/LD+JSON\" >{}</script>",
      "<script type=application/ld+json>{}</script>",
    ].join("");
    expect(extract_inline_script_bodies(html)).toEqual([]);
  });

  it("keeps an inline module script, which does execute and does need a hash", () => {
    const html = '<script type="module">import "/x.js"</script>';
    expect(extract_inline_script_bodies(html)).toEqual(['import "/x.js"']);
  });

  it("keeps a script whose type is a JavaScript MIME type", () => {
    const html = '<script type="text/javascript">a</script><script type="APPLICATION/ECMASCRIPT">b</script>';
    expect(extract_inline_script_bodies(html)).toEqual(["a", "b"]);
  });

  it("keeps a present but empty type, which is executable per spec", () => {
    const html = '<script type="">a</script><script type=" ">b</script>';
    expect(extract_inline_script_bodies(html)).toEqual(["a", "b"]);
  });

  it("keeps the non-executable types script-src still checks", () => {
    // The question here is not "does the browser run this block" but "does
    // script-src check it". Neither of these executes, and both are checked:
    // an unhashed import map is blocked, taking module resolution for the
    // whole page with it, and inline speculation rules are blocked unless
    // allowed by a hash, a nonce or 'inline-speculation-rules' - which is why
    // that source expression exists at all.
    const html = [
      '<script type="importmap">{"imports":{}}</script>',
      '<script type="speculationrules">{"prerender":[]}</script>',
    ].join("");
    expect(extract_inline_script_bodies(html)).toEqual(['{"imports":{}}', '{"prerender":[]}']);
  });

  it("skips any other data block, not only ld+json", () => {
    // SvelteKit emits application/json as `data-sveltekit-fetched` the moment
    // a route's load() fetches. Hashing one is harmless in effect but makes
    // the policy claim something the browser never asked about.
    const html = [
      '<script type="application/json" data-sveltekit-fetched>{}</script>',
      '<script type="text/template">{}</script>',
    ].join("");
    expect(extract_inline_script_bodies(html)).toEqual([]);
  });

  it("skips a JavaScript type carrying parameters, which is not an essence match", () => {
    // HTML parses the attribute as an essence match, so a parameter makes the
    // block non-executable - the browser treats it as data and so must we.
    const html = '<script type="text/javascript; charset=utf-8">a</script>';
    expect(extract_inline_script_bodies(html)).toEqual([]);
  });

  it("returns the bodies of several scripts in document order", () => {
    const html = "<script>one</script><p>x</p><script>two</script>";
    expect(extract_inline_script_bodies(html)).toEqual(["one", "two"]);
  });

  it("preserves the body byte for byte, including surrounding newlines", () => {
    // The browser hashes exactly what sits between the tags. Trimming here
    // would produce a hash that never matches and silently block the page.
    const html = "<script>\n  let a = 1;\n</script>";
    expect(extract_inline_script_bodies(html)).toEqual(["\n  let a = 1;\n"]);
  });

  it("returns an empty array for markup with no scripts", () => {
    expect(extract_inline_script_bodies("<html><body>hi</body></html>")).toEqual([]);
  });
});

describe("hash_inline_script", () => {
  it("hashes the empty body to the known sha256 of the empty string", () => {
    expect(hash_inline_script("")).toBe("sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=");
  });

  it("produces the sha256 the browser computes for a known body", () => {
    expect(hash_inline_script("alert(1)")).toBe(
      "sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI=",
    );
  });

  it("hashes UTF-8 bytes, not code units", () => {
    // The pages carry an em dash in the JSON-LD title and typographic
    // quotes elsewhere; hashing as latin1 would match nothing.
    expect(hash_inline_script("é\n")).toBe("sha256-7dOoY4cqBCOesprUvBL8iSs9SuV8x+eGo2l4FvjhQcI=");
  });
});

describe("route_keys_for", () => {
  it("maps the index page to both the bare root and its file path", () => {
    expect(route_keys_for("index.html")).toEqual(["/", "/index.html"]);
  });

  it("maps a top-level page to its extensionless route and its file path", () => {
    // Two keys because try_files serves /cto-a from cto-a.html, and $uri
    // may hold either form by the time add_header runs. Emitting both
    // removes the question.
    expect(route_keys_for("cto-a.html")).toEqual(["/cto-a", "/cto-a.html"]);
  });

  it("maps a nested page, preserving its directories", () => {
    expect(route_keys_for("default/413033b0/letter.html")).toEqual([
      "/default/413033b0/letter",
      "/default/413033b0/letter.html",
    ]);
  });

  it("maps a nested index page to its directory and its file path", () => {
    expect(route_keys_for("og/index.html")).toEqual(["/og/", "/og/index.html"]);
  });
});

describe("build_csp_map", () => {
  it("emits a map over $uri with an empty default", () => {
    const conf = build_csp_map([{ keys: ["/a", "/a.html"], hashes: ["sha256-AAA="] }]);
    expect(conf).toContain("map $uri $csp_script_hashes {");
    expect(conf).toContain('default "";');
    expect(conf.trimEnd().endsWith("}")).toBe(true);
  });

  it("emits every route key for a page, each quoted", () => {
    const conf = build_csp_map([{ keys: ["/a", "/a.html"], hashes: ["sha256-AAA="] }]);
    expect(conf).toContain("\"/a\" \"'sha256-AAA='\";");
    expect(conf).toContain("\"/a.html\" \"'sha256-AAA='\";");
  });

  it("joins a page's several hashes with a space, as script-src expects", () => {
    const conf = build_csp_map([{ keys: ["/a"], hashes: ["sha256-AAA=", "sha256-BBB="] }]);
    expect(conf).toContain("\"/a\" \"'sha256-AAA=' 'sha256-BBB='\";");
  });

  it("omits pages with no inline scripts, which the empty default already covers", () => {
    const conf = build_csp_map([
      { keys: ["/a"], hashes: [] },
      { keys: ["/b"], hashes: ["sha256-BBB="] },
    ]);
    expect(conf).not.toContain('"/a"');
    expect(conf).toContain('"/b"');
  });

  it("sorts entries so an unchanged build produces an unchanged file", () => {
    const conf = build_csp_map([
      { keys: ["/z"], hashes: ["sha256-ZZZ="] },
      { keys: ["/a"], hashes: ["sha256-AAA="] },
    ]);
    expect(conf.indexOf('"/a"')).toBeLessThan(conf.indexOf('"/z"'));
  });

  it("rejects a hash outside the base64 alphabet rather than writing it into nginx config", () => {
    // A value carrying a quote or a $ would either break the config or
    // interpolate an nginx variable into the policy.
    expect(() => build_csp_map([{ keys: ["/a"], hashes: ['sha256-a"$b'] }])).toThrow();
  });

  it("rejects a route key that is not a rooted path", () => {
    expect(() => build_csp_map([{ keys: ["a b"], hashes: ["sha256-AAA="] }])).toThrow();
  });

  it("throws when there are no pages at all, rather than emitting a map that blocks every page", () => {
    expect(() => build_csp_map([])).toThrow();
  });

  it("throws when pages were found but none yielded a hash", () => {
    // The shape a markup change produces: every page is still walked, so the
    // empty-input guard above never fires, but nothing matched and the map
    // would be nothing but its empty default - leaving every page to ship
    // script-src 'self' and every hydration script blocked, silently.
    expect(() => build_csp_map([{ keys: ["/a"], hashes: [] }])).toThrow();
  });
});

describe("collect_page_hashes", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "csp-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("walks nested directories and hashes each page's inline scripts", () => {
    mkdirSync(join(dir, "og"), { recursive: true });
    writeFileSync(join(dir, "index.html"), "<script>alert(1)</script>");
    writeFileSync(join(dir, "og", "landing.html"), "<script>alert(1)</script>");

    expect(collect_page_hashes(dir)).toEqual([
      { keys: ["/", "/index.html"], hashes: ["sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI="] },
      {
        keys: ["/og/landing", "/og/landing.html"],
        hashes: ["sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI="],
      },
    ]);
  });

  it("ignores non-HTML files", () => {
    writeFileSync(join(dir, "index.html"), "<p>no scripts</p>");
    writeFileSync(join(dir, "app.js"), "alert(1)");

    expect(collect_page_hashes(dir)).toEqual([{ keys: ["/", "/index.html"], hashes: [] }]);
  });
});
