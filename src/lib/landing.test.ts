import { vi } from "vitest";
import yaml from "js-yaml";

import type { LandingData } from "./types.js";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";

import { load_landing_data, validate_landing_data } from "./landing.js";

// --- Test fixtures ---

const MOCK_LANDING_DATA: LandingData = {
  hero: {
    name: "Test Person",
    role: "Engineer",
    tagline: "I build things.",
    status: "Somewhere, currently doing stuff.",
  },
  projects: [
    {
      id: "proj-a",
      name: "Project A",
      blurb: "Does a thing.",
      repo_url: "https://github.com/example/proj-a",
      stack: ["TypeScript"],
      status: "Active",
    },
  ],
  resume_links: ["default"],
  contact: [{ label: "Email", url: "mailto:test@example.com" }],
  github: { user: "testuser" },
  sections: ["hero", "projects", "resume", "contact"],
};

function make_landing(overrides: Partial<LandingData> = {}): LandingData {
  return { ...MOCK_LANDING_DATA, ...overrides };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

describe("load_landing_data", () => {
  it("reads and parses data/landing.yaml", () => {
    vi.mocked(readFileSync).mockReturnValue(yaml.dump(MOCK_LANDING_DATA));

    const result = load_landing_data();

    expect(result).toEqual(MOCK_LANDING_DATA);
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining("landing.yaml"),
      "utf-8",
    );
  });
});

describe("validate_landing_data", () => {
  const VALID_VARIANTS = ["default", "cto-a"];

  it("returns empty array for valid landing data", () => {
    const errors = validate_landing_data(make_landing(), VALID_VARIANTS);
    expect(errors).toEqual([]);
  });

  it("detects missing hero fields", () => {
    const landing = make_landing({
      hero: { name: "", role: "Engineer", tagline: "x", status: "y" },
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({
        message: "hero is missing required fields (name, role, tagline, status)",
      }),
    );
  });

  it("detects duplicate project ids", () => {
    const landing = make_landing({
      projects: [MOCK_LANDING_DATA.projects[0], MOCK_LANDING_DATA.projects[0]],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `duplicate project id "proj-a"` }),
    );
  });

  it("detects a project missing name or blurb", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], name: "", blurb: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" is missing name or blurb` }),
    );
  });

  it("detects a project missing a stack array", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], stack: undefined as unknown as string[] }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" is missing a stack array` }),
    );
  });

  it("detects a project links field that is not an array", () => {
    const landing = make_landing({
      projects: [
        { ...MOCK_LANDING_DATA.projects[0], links: "not-an-array" as unknown as never },
      ],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" links must be an array` }),
    );
  });

  it("allows a project that omits links entirely", () => {
    const landing = make_landing({
      projects: [MOCK_LANDING_DATA.projects[0]],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toEqual([]);
  });

  it("detects empty resume_links", () => {
    const landing = make_landing({ resume_links: [] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "resume_links must contain at least one entry" }),
    );
  });

  it("detects a resume_links entry that is not a valid variant", () => {
    const landing = make_landing({ resume_links: ["ghost-variant"] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({
        message: `resume_links variant "ghost-variant" is not a valid variant`,
      }),
    );
  });

  it("detects a contact entry missing a label or url", () => {
    const landing = make_landing({
      contact: [{ label: "", url: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "contact entry 0 is missing label or url" }),
    );
  });

  it("detects missing github.user", () => {
    const landing = make_landing({ github: { user: "" } });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "github.user is required" }),
    );
  });

  it("detects duplicate sections", () => {
    const landing = make_landing({ sections: ["hero", "hero"] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `duplicate section "hero"` }),
    );
  });

  it("detects a section that nothing renders", () => {
    const landing = make_landing({ sections: ["hero", "testimonials"] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `section "testimonials" is not a known section` }),
    );
  });

  it("accumulates multiple errors from different branches", () => {
    const landing = make_landing({
      hero: { name: "", role: "", tagline: "", status: "" },
      resume_links: [],
      github: { user: "" },
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors.length).toBeGreaterThanOrEqual(3);

    const messages = errors.map((e) => e.message);
    expect(messages).toContainEqual(expect.stringContaining("hero is missing required fields"));
    expect(messages).toContainEqual(expect.stringContaining("resume_links must contain"));
    expect(messages).toContainEqual(expect.stringContaining("github.user is required"));
  });
});
