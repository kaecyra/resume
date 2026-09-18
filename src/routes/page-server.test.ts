import { vi } from "vitest";

// $env/dynamic/public is the real I/O boundary here (environment variables);
// everything else (data.ts, seo.ts, landing.ts) runs for real so this
// exercises the landing page's actual load wiring, not a re-implementation
// of it. `load_landing_data` is wrapped (not replaced) so every test but
// the malformed-document one below still reads the real data/landing.yaml.
const { mock_env } = vi.hoisted(() => ({
  mock_env: { PUBLIC_BASE_URL: "https://example.com" } as { PUBLIC_BASE_URL?: string },
}));

vi.mock("$env/dynamic/public", () => ({ env: mock_env }));

vi.mock("$lib/landing.js", async (import_original) => {
  const actual = await import_original<typeof import("$lib/landing.js")>();
  return { ...actual, load_landing_data: vi.fn(actual.load_landing_data) };
});

import { load_landing_data } from "$lib/landing.js";

import { load } from "./+page.server.js";

import type { LandingData } from "$lib/types.js";
import type { PageData } from "./$types";

async function run_load(): Promise<PageData> {
  return (await load({} as Parameters<typeof load>[0])) as PageData;
}

describe("landing page load", () => {
  it("sets the canonical URL to the bare base URL, not to /default", async () => {
    mock_env.PUBLIC_BASE_URL = "https://example.com";

    const result = await run_load();

    expect(result.og.url).toBe("https://example.com");
    expect(result.og.url).not.toBe("https://example.com/default");
  });

  it("omits the canonical URL when no base URL is configured", async () => {
    mock_env.PUBLIC_BASE_URL = undefined;

    const result = await run_load();

    expect(result.og.url).toBeNull();
  });

  it("does not compose its title as \"name - role\", unlike every variant page", async () => {
    const result = await run_load();

    expect(result.og.title).not.toContain(" - ");
  });

  it("does not reuse the default variant's tagline for its description", async () => {
    const result = await run_load();

    expect(result.og.description).not.toContain("bullshit");
  });
});

describe("landing data wiring", () => {
  beforeEach(() => {
    vi.mocked(load_landing_data).mockClear();
  });

  it("returns the validated landing document for a well-formed data/landing.yaml", async () => {
    const result = await run_load();

    expect(result.landing.sections).toEqual(["hero", "projects", "resume", "contact"]);
    expect(result.landing.resume_links).toEqual(["default"]);
  });

  it("sources the PDF filename pieces from resume.yaml and the linked variant, not from landing.hero", async () => {
    const result = await run_load();

    // The default variant's title is "Chief Technology Officer" (see
    // data/variants/default.yaml) - distinct from landing.hero.role, which
    // proves this isn't accidentally reading the hero block instead.
    expect(result.resume_title).toBe("Chief Technology Officer");
    expect(result.resume_title).not.toBe(result.landing.hero.role);
    expect(result.profile_name).toBe(result.landing.hero.name);
  });

  it("throws an error listing every validation message for a malformed document", async () => {
    const bad_landing: LandingData = {
      hero: { name: "", role: "", tagline: "", status: "" },
      projects: [],
      resume_links: [],
      contact: [],
      github: { user: "" },
      sections: ["hero", "made-up-section"],
    };
    vi.mocked(load_landing_data).mockReturnValueOnce(bad_landing);

    const caught: unknown = await run_load().then(
      () => undefined,
      (err: unknown) => err,
    );

    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    expect(message).toContain("hero is missing required fields (name, role, tagline, status)");
    expect(message).toContain("resume_links must contain exactly one entry");
    expect(message).toContain("github.user is required");
    expect(message).toContain('section "made-up-section" is not a known section');
  });
});
