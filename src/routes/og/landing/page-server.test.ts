import { vi } from "vitest";

// data/landing.yaml is the real I/O boundary here, wrapped rather than
// replaced (the pattern src/routes/page-server.test.ts uses) so the
// badge-splitting test below can hand in a role this repo's own data does
// not happen to carry, while the rest reads the real file.
vi.mock("$lib/landing.js", async (import_original) => {
  const actual = await import_original<typeof import("$lib/landing.js")>();
  return { ...actual, load_landing_data: vi.fn(actual.load_landing_data) };
});

import { load_landing_data } from "$lib/landing.js";

import { load } from "./+page.server.js";

import type { LandingData } from "$lib/types.js";
import type { PageData } from "./$types";

const BASE_LANDING: LandingData = {
  hero: {
    name: "Test Person",
    role: "VP Engineering, .Example",
    location: "Somewhere",
    tagline: "I build things.",
  },
  projects: [{ id: "p1", name: "Project", blurb: "A thing.", stack: ["TypeScript"], status: "Active" }],
  appearances: [],
  resume_links: ["cto-a"],
  contact: [{ label: "Email", url: "mailto:test@example.com" }],
  github: { user: "testuser" },
  sections: ["hero", "divider", "commits", "work", "contact"],
};

function run_load(): PageData {
  return load({} as Parameters<typeof load>[0]) as PageData;
}

describe("landing OG card load", () => {
  it("takes its name from the hero, not from the resume profile", () => {
    vi.mocked(load_landing_data).mockReturnValueOnce(BASE_LANDING);

    expect(run_load().name).toBe("Test Person");
  });

  it("splits the hero role into the badge's two pieces", () => {
    vi.mocked(load_landing_data).mockReturnValueOnce(BASE_LANDING);

    expect(run_load().badge).toEqual({ tag: "VP Engineering", label: ".Example" });
  });

  it("leaves the badge label empty for a role with no company", () => {
    vi.mocked(load_landing_data).mockReturnValueOnce({
      ...BASE_LANDING,
      hero: { ...BASE_LANDING.hero, role: "Engineer" },
    });

    expect(run_load().badge).toEqual({ tag: "Engineer", label: "" });
  });
});
