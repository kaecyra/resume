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
    location: "Somewhere, QC",
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
  appearances: [
    {
      id: "appearance-a",
      event: "Test Conference 2026",
      what: "Did a thing there",
      date: "January 2026",
      blurb: "Talked about the thing.",
    },
  ],
  resume_links: ["default"],
  contact: [{ label: "Email", url: "mailto:test@example.com" }],
  github: { user: "testuser" },
  sections: ["hero", "divider", "commits", "work", "contact"],
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

  it("reports one error and does not throw for an empty document", () => {
    const errors = validate_landing_data(undefined as unknown as LandingData, VALID_VARIANTS);
    expect(errors).toEqual([
      expect.objectContaining({ message: expect.stringContaining("must contain a document") }),
    ]);
  });

  it("does not throw when projects is a map instead of an array", () => {
    const landing = make_landing({ projects: { odette: {} } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "projects must be an array" }),
    );
  });

  it("does not throw when contact is a map instead of an array", () => {
    const landing = make_landing({ contact: { email: "test@example.com" } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "contact must be an array" }),
    );
  });

  it("does not throw when resume_links is a map instead of an array", () => {
    const landing = make_landing({ resume_links: { variant: "default" } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("resume_links must contain exactly one entry") }),
    );
  });

  it("does not throw when sections is a map instead of an array", () => {
    const landing = make_landing({ sections: { hero: true } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "sections must be an array" }),
    );
  });

  it.each(["name", "role", "location", "tagline", "status"] as const)(
    "detects a missing hero %s",
    (field) => {
      const landing = make_landing({
        hero: { ...MOCK_LANDING_DATA.hero, [field]: "" },
      });
      expect(validate_landing_data(landing, VALID_VARIANTS)).toContainEqual(
        expect.objectContaining({
          message: "hero is missing required fields (name, role, location, tagline, status)",
        }),
      );
    },
  );

  it("detects a missing projects array", () => {
    const landing = make_landing({ projects: undefined as unknown as never });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "projects must be an array" }),
    );
  });

  it("detects a project missing an id", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], id: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "project is missing an id" }),
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
      expect.objectContaining({ message: `project "proj-a" is missing name, blurb, or status` }),
    );
  });

  it("detects a project missing status", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], status: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" is missing name, blurb, or status` }),
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

  it("detects a project link entry missing label or url", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], links: [{ label: "", url: "" }] }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" link 0 is missing label or url` }),
    );
  });

  it("validates clean when a project's links array is empty", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], links: [] }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toEqual([]);
  });

  it("detects empty resume_links", () => {
    const landing = make_landing({ resume_links: [] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("resume_links must contain exactly one entry") }),
    );
  });

  it("detects resume_links with more than one entry", () => {
    const landing = make_landing({ resume_links: ["default", "cto-a"] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("resume_links must contain exactly one entry") }),
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

  it("does not throw when appearances is a map instead of an array", () => {
    const landing = make_landing({ appearances: { gtc: {} } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "appearances must be an array" }),
    );
  });

  it("detects a missing appearances array", () => {
    const landing = make_landing({ appearances: undefined as unknown as never });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "appearances must be an array" }),
    );
  });

  it("detects an appearance missing an id", () => {
    const landing = make_landing({
      appearances: [{ ...MOCK_LANDING_DATA.appearances[0], id: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "appearance is missing an id" }),
    );
  });

  it("detects duplicate appearance ids", () => {
    const landing = make_landing({
      appearances: [MOCK_LANDING_DATA.appearances[0], MOCK_LANDING_DATA.appearances[0]],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `duplicate appearance id "appearance-a"` }),
    );
  });

  it("detects an appearance missing event, what, date, or blurb", () => {
    const landing = make_landing({
      appearances: [{ ...MOCK_LANDING_DATA.appearances[0], event: "", what: "", date: "", blurb: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({
        message: `appearance "appearance-a" is missing event, what, date, or blurb`,
      }),
    );
  });

  it("detects a missing contact array", () => {
    const landing = make_landing({ contact: undefined as unknown as never });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "contact must be an array" }),
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

  it("detects a duplicate contact url", () => {
    const landing = make_landing({
      contact: [
        { label: "Email", url: "mailto:test@example.com" },
        { label: "Also email", url: "mailto:test@example.com" },
      ],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `duplicate contact url "mailto:test@example.com"` }),
    );
  });

  it("detects missing github.user", () => {
    const landing = make_landing({ github: { user: "" } });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "github.user is required" }),
    );
  });

  it("detects a missing sections array", () => {
    const landing = make_landing({ sections: undefined as unknown as never });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "sections must be an array" }),
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
      hero: { name: "", role: "", location: "", tagline: "", status: "" },
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
