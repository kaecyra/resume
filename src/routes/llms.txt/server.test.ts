import { vi } from "vitest";

// The environment and data/landing.yaml are the real I/O boundaries.
// load_landing_data is wrapped rather than replaced (the pattern
// src/routes/page-server.test.ts uses) so the contact-block cases below can
// hand in shapes this repo's own data does not carry, while everything else
// - the variant reads, build_llms_txt itself - runs for real.
const { mock_env } = vi.hoisted(() => ({
  mock_env: { PUBLIC_BASE_URL: "https://example.com" } as { PUBLIC_BASE_URL?: string },
}));

vi.mock("$env/dynamic/public", () => ({ env: mock_env }));

vi.mock("$lib/landing.js", async (import_original) => {
  const actual = await import_original<typeof import("$lib/landing.js")>();
  return { ...actual, load_landing_data: vi.fn(actual.load_landing_data) };
});

import { list_variants } from "$lib/data.js";
import { load_landing_data } from "$lib/landing.js";
import { CANONICAL_VARIANT } from "$lib/seo.js";

import { GET } from "./+server.js";

import type { LandingData, LandingLink } from "$lib/types.js";

const BASE_LANDING: LandingData = {
  hero: {
    name: "Test Person",
    role: "VP Engineering, Acme",
    location: "Somewhere",
    tagline: "I build things.",
  },
  projects: [{ id: "p1", name: "Project", blurb: "A thing.", stack: ["TypeScript"], status: "Active" }],
  appearances: [],
  resume_links: ["default"],
  contact: [
    { label: "Email", url: "mailto:test@example.com" },
    { label: "@handle", url: "https://github.com/handle" },
  ],
  github: { user: "handle" },
  sections: ["hero", "divider", "commits", "work", "contact"],
};

function with_contact(contact: LandingLink[]): LandingData {
  return { ...BASE_LANDING, contact };
}

async function run_get(): Promise<string> {
  vi.mocked(load_landing_data).mockReturnValueOnce(BASE_LANDING);
  return await GET().text();
}

describe("llms.txt route", () => {
  it("serves plain text", () => {
    vi.mocked(load_landing_data).mockReturnValueOnce(BASE_LANDING);

    expect(GET().headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("publishes the address from the contact block's mailto link", async () => {
    expect(await run_get()).toContain("- Email: test@example.com");
  });

  it("drops mailto query parameters from the published address", async () => {
    vi.mocked(load_landing_data).mockReturnValueOnce(
      with_contact([{ label: "Email", url: "mailto:test@example.com?subject=Hello%20there" }]),
    );

    const text = await GET().text();

    expect(text).toContain("- Email: test@example.com");
    expect(text).not.toContain("subject=");
  });

  it("omits the email line entirely when the contact block carries no mailto link", async () => {
    vi.mocked(load_landing_data).mockReturnValueOnce(
      with_contact([{ label: "@handle", url: "https://github.com/handle" }]),
    );

    const text = await GET().text();

    expect(text).not.toContain("Email:");
    expect(text).toContain("- @handle: https://github.com/handle");
  });

  it("lists every real variant against the configured base URL", async () => {
    const text = await run_get();

    // Derived, not typed in: variants come and go, and this asserts that
    // whatever exists is listed - see ENGINEERING.md rule 17.
    expect(text).toContain(`https://example.com/${CANONICAL_VARIANT}`);
    expect(text).toContain(`https://example.com/${CANONICAL_VARIANT}.pdf`);
    for (const slug of list_variants()) {
      expect(text).toContain(`https://example.com/${slug}`);
    }
  });
});
