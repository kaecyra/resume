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

// The real I/O boundary for the GitHub contribution grid is the
// gitignored data/generated/github.json read inside
// load_github_contribution_data (src/lib/github.ts's own readFileSync) -
// wrapping it the same way load_landing_data is wrapped above means the
// two tests below control whether that file is "present" deterministically,
// rather than depending on whether it happens to exist on the machine
// running the suite. build_contribution_grid stays real and unmocked, so
// the "present" case still exercises the actual grid-building logic, not a
// hand-typed fixture of that shape.
vi.mock("$lib/github.js", async (import_original) => {
  const actual = await import_original<typeof import("$lib/github.js")>();
  return { ...actual, load_github_contribution_data: vi.fn(actual.load_github_contribution_data) };
});

import { load_resume_data, load_variant } from "$lib/data.js";
import { load_github_contribution_data } from "$lib/github.js";
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
    vi.mocked(load_github_contribution_data).mockClear();
  });

  it("returns the validated landing document for a well-formed data/landing.yaml", async () => {
    const result = await run_load();

    expect(result.landing.sections).toEqual(["hero", "divider", "commits", "work", "appearances", "contact"]);
    expect(result.landing.resume_links).toEqual(["default"]);
  });

  // #167/#184 fetch and bucket the real GitHub contribution calendar at
  // build time, writing data/generated/github.json - gitignored, so a
  // contributor or a CI run without GH_CONTRIB_PAT/GITHUB_TOKEN never has
  // it. This asserted `contributions_grid === null` unconditionally until
  // #192 caught it: it happened to pass because CI has no token, not
  // because the loader was exercised both ways - a test that can't fail on
  // the thing it claims to check. Split into the two real outcomes below,
  // both driven by mocking load_github_contribution_data (see the vi.mock
  // above) rather than by whether the file happens to exist.
  it("passes a null contributions_grid when the generated GitHub data file is absent - the offline case Commits.svelte renders for", async () => {
    vi.mocked(load_github_contribution_data).mockReturnValueOnce(null);

    const result = await run_load();

    expect(result.contributions_grid).toBeNull();
  });

  it("builds a real contributions_grid from the generated GitHub data file when it is present", async () => {
    vi.mocked(load_github_contribution_data).mockReturnValueOnce({
      generated_at: "2026-09-18T00:00:00.000Z",
      total_count: 5,
      days: [
        { date: "2026-09-17", count: 0 },
        { date: "2026-09-18", count: 5 },
      ],
    });

    const result = await run_load();

    // Asserts the real day-by-day shape build_contribution_grid (unmocked,
    // src/lib/github.ts) produces from this fixture - not just "is not
    // null" - so a broken wiring that swaps in an empty or malformed grid
    // still fails this test.
    expect(result.contributions_grid?.total_count).toBe(5);
    const real_days = result.contributions_grid?.weeks.flat().filter((cell) => cell !== null);
    expect(real_days).toEqual([
      { date: "2026-09-17", count: 0, level: 0 },
      { date: "2026-09-18", count: 5, level: 4 },
    ]);
  });

  it("sources the PDF filename pieces from resume.yaml and the linked variant, not from landing.hero", async () => {
    // data/landing.yaml's hero.name and data/resume.yaml's profile.name are
    // both "Tim Gunter" today, so comparing profile_name against
    // result.landing.hero.name (as this test used to) would pass whichever
    // of the two +page.server.ts actually reads it from - an assertion that
    // can't fail is not a guard. Overriding load_landing_data here gives
    // hero.name a value distinct from the real resume.yaml profile name, so
    // the two sources can't coincide by accident.
    const distinguishable_landing: LandingData = {
      hero: {
        name: "Distinguishable Landing Hero",
        role: "Independent",
        location: "Nowhere",
        tagline: "A landing tagline unlike any variant summary or tagline.",
      },
      projects: [{ id: "p1", name: "Project", blurb: "A thing.", stack: ["TypeScript"], status: "Active" }],
      appearances: [],
      resume_links: ["default"],
      contact: [{ label: "Email", url: "mailto:test@example.com" }],
      github: { user: "testuser" },
      sections: ["hero", "divider", "commits", "work", "contact"],
    };
    vi.mocked(load_landing_data).mockReturnValueOnce(distinguishable_landing);

    const result = await run_load();

    // Compare against the linked variant's own title rather than a literal,
    // so retitling data/variants/default.yaml doesn't break this test; the
    // `not.toBe(hero.role)` below is what actually catches a reversion to
    // sourcing this from the hero block instead of the variant.
    const variant_title = load_variant("default").title;
    expect(result.resume_title).toBe(variant_title);
    expect(result.resume_title).not.toBe(distinguishable_landing.hero.role);

    const real_profile_name = load_resume_data().profile.name;
    expect(result.profile_name).toBe(real_profile_name);
    expect(result.profile_name).not.toBe(distinguishable_landing.hero.name);
  });

  it("sources og.title and og.description from landing.hero, not from resume.yaml's profile name or the linked variant's title/summary", async () => {
    mock_env.PUBLIC_BASE_URL = "https://example.com";

    const distinguishable_landing: LandingData = {
      hero: {
        name: "Distinguishable Landing Hero",
        role: "Independent",
        location: "Nowhere",
        tagline: "A landing tagline unlike any variant summary or tagline.",
      },
      projects: [{ id: "p1", name: "Project", blurb: "A thing.", stack: ["TypeScript"], status: "Active" }],
      appearances: [],
      resume_links: ["default"],
      contact: [{ label: "Email", url: "mailto:test@example.com" }],
      github: { user: "testuser" },
      sections: ["hero", "divider", "commits", "work", "contact"],
    };
    vi.mocked(load_landing_data).mockReturnValueOnce(distinguishable_landing);

    const result = await run_load();

    const real_profile_name = load_resume_data().profile.name;
    const variant = load_variant("default");

    expect(result.og.title).toBe(distinguishable_landing.hero.name);
    expect(result.og.title).not.toBe(real_profile_name);
    expect(result.og.title).not.toBe(variant.title);

    expect(result.og.description).toBe(distinguishable_landing.hero.tagline);
    expect(result.og.description).not.toBe(variant.summary);
    expect(result.og.description).not.toBe(variant.tagline);
  });

  it("derives the OG image from the linked resume variant, not a hardcoded default", async () => {
    mock_env.PUBLIC_BASE_URL = "https://example.com";
    const linked_to_cto_a: LandingData = {
      hero: { name: "Test Person", role: "Engineer", location: "Somewhere", tagline: "I build things." },
      projects: [{ id: "p1", name: "Project", blurb: "A thing.", stack: ["TypeScript"], status: "Active" }],
      appearances: [],
      resume_links: ["cto-a"],
      contact: [{ label: "Email", url: "mailto:test@example.com" }],
      github: { user: "testuser" },
      sections: ["hero", "divider", "commits", "work", "contact"],
    };
    vi.mocked(load_landing_data).mockReturnValueOnce(linked_to_cto_a);

    const result = await run_load();

    expect(result.og.image).toBe("https://example.com/og/cto-a.png");
  });

  it("throws an error listing every validation message for a malformed document", async () => {
    const bad_landing: LandingData = {
      hero: { name: "", role: "", location: "", tagline: "" },
      projects: [],
      appearances: [],
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
    expect(message).toContain("hero is missing required fields (name, role, location, tagline)");
    expect(message).toContain("resume_links must contain exactly one entry");
    expect(message).toContain("github.user is required");
    expect(message).toContain('section "made-up-section" is not a known section');
  });
});
