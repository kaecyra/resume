import { vi } from "vitest";

// Two real I/O boundaries are replaced here and nothing else: the
// environment (PUBLIC_BASE_URL, which decides whether any absolute URL is
// built at all) and QR rendering, which is the thing under test - the
// loader's own data/YAML reads run for real, so this exercises the actual
// wiring rather than a re-implementation of it.
const { mock_env } = vi.hoisted(() => ({
  mock_env: { PUBLIC_BASE_URL: "https://example.com" } as { PUBLIC_BASE_URL?: string },
}));

vi.mock("$env/dynamic/public", () => ({ env: mock_env }));

vi.mock("$lib/qr.js", () => ({
  generate_qr_svg: vi.fn(async () => "<svg></svg>"),
}));

import { list_variants } from "$lib/data.js";
import { generate_qr_svg } from "$lib/qr.js";
import { CANONICAL_VARIANT } from "$lib/seo.js";

import { load } from "./+page.server.js";

import type { PageData } from "./$types";

// Whichever variant is not the canonical one, rather than a slug typed in
// here: variants are audience framings that come and go, and naming one
// would make this file fail when someone retires that framing (see
// ENGINEERING.md rule 17 - a test must not break because a data file was
// added or removed). What these tests are about is "a variant that is not
// the canonical one", which is exactly what this expresses.
const OTHER_VARIANT = list_variants().find((slug) => slug !== CANONICAL_VARIANT);

if (!OTHER_VARIANT) {
  // Every case below contrasts a variant with the canonical one, so with
  // only the canonical variant on disk they would all pass while asserting
  // nothing. Fail loudly instead of silently.
  throw new Error("no non-canonical variant exists: these tests cannot assert what they are for");
}

async function run_load(variant: string): Promise<PageData> {
  return (await load({ params: { variant } } as unknown as Parameters<typeof load>[0])) as PageData;
}

beforeEach(() => {
  vi.mocked(generate_qr_svg).mockClear();
  mock_env.PUBLIC_BASE_URL = "https://example.com";
});

// #237 split the canonical URL away from og.url, and the two are computed
// four lines apart in the loader. Collapsing them into one value is the
// obvious-looking cleanup for whoever reads that code next, and it is
// exactly what must never happen: the QR code is printed into a PDF, so a
// reader scanning the code on a printed variant has to arrive at that
// variant, not at whichever one is canonical. That
// failure is silent, offline, and invisible to every other test in the
// suite, which asserts on values it constructs itself rather than on what
// this loader passes to the QR renderer.
describe("variant route load - the printed QR code", () => {
  it("encodes the variant's own URL, not the canonical one", async () => {
    const data = await run_load(OTHER_VARIANT);

    const own_url = `https://example.com/${OTHER_VARIANT}`;
    expect(generate_qr_svg).toHaveBeenCalledWith(own_url, expect.any(String));
    expect(data.resume.online_url).toBe(own_url);
    expect(data.canonical_url).toBe(`https://example.com/${CANONICAL_VARIANT}`);
    expect(data.resume.online_url).not.toBe(data.canonical_url);
  });

  it("encodes the canonical variant's own URL when that is the page being rendered", async () => {
    const data = await run_load(CANONICAL_VARIANT);

    expect(generate_qr_svg).toHaveBeenCalledWith(
      `https://example.com/${CANONICAL_VARIANT}`,
      expect.any(String),
    );
    expect(data.og.url).toBe(data.canonical_url);
  });

  it("renders no QR code at all when no base URL is configured", async () => {
    mock_env.PUBLIC_BASE_URL = undefined;

    const data = await run_load(OTHER_VARIANT);

    expect(generate_qr_svg).not.toHaveBeenCalled();
    expect(data.resume.online_qr_svg).toBeUndefined();
    expect(data.canonical_url).toBeNull();
  });
});

describe("variant route load - head data", () => {
  it("publishes the page's own URL on the ProfilePage and the canonical one on the Person", async () => {
    const data = await run_load(OTHER_VARIANT);

    expect(data.jsonld.profile_page.url).toBe(`https://example.com/${OTHER_VARIANT}`);
    expect(data.jsonld.profile_page.mainEntity.url).toBe(`https://example.com/${CANONICAL_VARIANT}`);
  });

  it("titles the document with an em dash and the resume suffix, leaving og:title alone", async () => {
    const data = await run_load(OTHER_VARIANT);

    expect(data.document_title).toBe(`${data.resume.profile.name} — ${data.resume.title} | Resume`);
    expect(data.og.title).toBe(`${data.resume.profile.name} - ${data.resume.title}`);
  });
});
