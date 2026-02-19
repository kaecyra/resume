import { vi } from "vitest";
import yaml from "js-yaml";

import type {
  ResumeData,
  VariantManifest,
  SubVariantManifest,
} from "./types.js";

vi.mock("node:fs", () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

import { readdirSync, readFileSync, statSync } from "node:fs";

import {
  list_variants,
  resolve_resume,
  list_sub_variants,
  resolve_sub_variant,
  load_and_resolve_sub_variant,
} from "./data.js";

// --- Test fixtures ---

const MOCK_RESUME_DATA: ResumeData = {
  profile: {
    name: "Test Person",
    photo: "photo.jpg",
    contact: { location: "Anywhere", phone: "555-0100", email: "test@example.com" },
  },
  skills: [
    { id: "typescript", name: "TypeScript", level: 5 },
    { id: "strategy", name: "Strategy", level: 4 },
  ],
  domains: [{ id: "web", title: "Web", description: "Web dev" }],
  field_deployments: [
    { id: "fd-1", category: "Tech", title: "Talk", venue: "Conf", date: "2024-01-01", description: "A talk" },
  ],
  employment: [
    {
      id: "job-alpha",
      title: "Engineer",
      company: "Alpha Inc",
      location: "Remote",
      start_date: "2020-01",
      end_date: "2023-06",
      description: null,
      summary: "Built things",
      highlights: [{ title: "Feature X", description: "Launched it" }],
    },
    {
      id: "job-beta",
      title: "Lead",
      company: "Beta Corp",
      location: "NYC",
      start_date: "2023-07",
      end_date: null,
      description: null,
      summary: "Led team",
      highlights: [{ description: "Grew team" }],
    },
  ],
  languages: [{ id: "en", name: "English", proficiency: "Native", level: 5 }],
  courses: [{ id: "course-1", title: "CS101", institution: "University", date: "2019" }],
};

const MOCK_DEFAULT_VARIANT: VariantManifest = {
  theme: "classic",
  title: "Software Engineer",
  summary: "A software engineer.",
  skills: ["typescript", "strategy"],
  employment: ["job-alpha", "job-beta"],
  languages: ["en"],
  courses: ["course-1"],
};

const MOCK_PARENT_VARIANT: VariantManifest = {
  theme: "retro",
  title: "CTO",
  summary: "Technical leader.",
  tagline: "Leading with code",
  skills: ["typescript", "strategy"],
  employment: ["job-alpha", "job-beta"],
  languages: ["en"],
  courses: ["course-1"],
};

const MOCK_SUB_VARIANT: SubVariantManifest = {
  parent: "test-parent",
  job: {
    url: "https://example.com/job",
    company: "Acme Corp",
    title: "VP of Engineering",
    fetched_at: "2025-01-01T00:00:00Z",
  },
  title: "VP of Engineering",
  summary: "Custom summary for Acme Corp.",
};

// --- Helpers ---

function mock_read_file(path_map: Record<string, unknown>) {
  vi.mocked(readFileSync).mockImplementation((file_path: any) => {
    const p = String(file_path);
    for (const [suffix, data] of Object.entries(path_map)) {
      if (p.endsWith(suffix)) {
        return yaml.dump(data);
      }
    }
    throw new Error(`ENOENT: no such file or directory, open '${p}'`);
  });
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

describe("list_variants", () => {
  it("returns variant names from yaml filenames", () => {
    vi.mocked(readdirSync).mockReturnValue(
      ["default.yaml", "cto-a.yaml", "cto-b.yaml"] as any,
    );

    const variants = list_variants();

    expect(variants).toEqual(["default", "cto-a", "cto-b"]);
  });

  it("filters out non-yaml files", () => {
    vi.mocked(readdirSync).mockReturnValue(
      ["default.yaml", "README.md", ".gitkeep"] as any,
    );

    const variants = list_variants();

    expect(variants).toEqual(["default"]);
  });
});

describe("resolve_resume", () => {
  it("resolves data with variant manifest", () => {
    const resolved = resolve_resume(MOCK_RESUME_DATA, MOCK_DEFAULT_VARIANT);

    expect(resolved.theme).toBe("classic");
    expect(resolved.profile.name).toBe("Test Person");
    expect(resolved.title).toBe("Software Engineer");
    expect(resolved.summary).toBe("A software engineer.");
    expect(resolved.skills).toHaveLength(2);
    expect(resolved.employment).toHaveLength(2);
    expect(resolved.languages).toHaveLength(1);
    expect(resolved.courses).toHaveLength(1);
  });

  it("preserves variant ordering", () => {
    const resolved = resolve_resume(MOCK_RESUME_DATA, MOCK_DEFAULT_VARIANT);

    for (let i = 0; i < resolved.skills.length; i++) {
      expect(resolved.skills[i].id).toBe(MOCK_DEFAULT_VARIANT.skills[i]);
    }

    for (let i = 0; i < resolved.employment.length; i++) {
      expect(resolved.employment[i].id).toBe(MOCK_DEFAULT_VARIANT.employment[i]);
    }
  });

  it("skips unknown ids without error", () => {
    const variant: VariantManifest = {
      theme: "classic",
      title: "Test",
      summary: "Test summary",
      skills: ["nonexistent", "strategy"],
      employment: [],
      languages: [],
      courses: [],
    };

    const resolved = resolve_resume(MOCK_RESUME_DATA, variant);

    expect(resolved.skills).toHaveLength(1);
    expect(resolved.skills[0].id).toBe("strategy");
  });
});

describe("list_sub_variants", () => {
  it("returns sub-variants with parent and slug", () => {
    vi.mocked(readdirSync)
      .mockReturnValueOnce(["default.yaml", "test-parent"] as any)
      .mockReturnValueOnce(["abc12345.yaml"] as any);
    vi.mocked(statSync)
      .mockReturnValueOnce({ isDirectory: () => false } as any)
      .mockReturnValueOnce({ isDirectory: () => true } as any);

    const entries = list_sub_variants();

    expect(entries).toEqual([{ parent: "test-parent", slug: "abc12345" }]);
  });

  it("does not include parent variant yaml files as slugs", () => {
    vi.mocked(readdirSync)
      .mockReturnValueOnce(["default.yaml", "cto-a.yaml", "my-variant"] as any)
      .mockReturnValueOnce(["sub1.yaml"] as any);
    vi.mocked(statSync)
      .mockReturnValueOnce({ isDirectory: () => false } as any)
      .mockReturnValueOnce({ isDirectory: () => false } as any)
      .mockReturnValueOnce({ isDirectory: () => true } as any);

    const entries = list_sub_variants();
    const slugs = entries.map((e) => e.slug);

    expect(slugs).not.toContain("default");
    expect(slugs).not.toContain("cto-a");
    expect(slugs).toEqual(["sub1"]);
  });
});

describe("resolve_sub_variant", () => {
  it("inherits parent fields when sub-variant omits them", () => {
    const sub: SubVariantManifest = {
      parent: "test-parent",
      job: { url: "https://example.com", company: "Acme", title: "VP", fetched_at: "2025-01-01T00:00:00Z" },
      title: "VP of Engineering",
    };

    const resolved = resolve_sub_variant(MOCK_RESUME_DATA, MOCK_PARENT_VARIANT, sub);

    expect(resolved.title).toBe("VP of Engineering");
    expect(resolved.skills).toHaveLength(MOCK_PARENT_VARIANT.skills.length);
    expect(resolved.employment).toHaveLength(MOCK_PARENT_VARIANT.employment.length);
    expect(resolved.theme).toBe(MOCK_PARENT_VARIANT.theme);
  });

  it("overrides fields present in sub-variant", () => {
    const sub: SubVariantManifest = {
      parent: "test-parent",
      job: { url: "https://example.com", company: "Acme", title: "VP", fetched_at: "2025-01-01T00:00:00Z" },
      title: "VP of Engineering",
      summary: "Custom summary.",
    };

    const resolved = resolve_sub_variant(MOCK_RESUME_DATA, MOCK_PARENT_VARIANT, sub);

    expect(resolved.title).toBe("VP of Engineering");
    expect(resolved.summary).toBe("Custom summary.");
    expect(resolved.summary).not.toBe(MOCK_PARENT_VARIANT.summary);
  });

  it("applies employment overrides without mutating source data", () => {
    const sub: SubVariantManifest = {
      parent: "test-parent",
      job: { url: "https://example.com", company: "Acme", title: "VP", fetched_at: "2025-01-01T00:00:00Z" },
      employment_overrides: [
        { id: "job-alpha", summary: "Custom summary for testing" },
      ],
    };

    const original_summary = MOCK_RESUME_DATA.employment.find((e) => e.id === "job-alpha")?.summary;
    const resolved = resolve_sub_variant(MOCK_RESUME_DATA, MOCK_PARENT_VARIANT, sub);
    const overridden = resolved.employment.find((e) => e.id === "job-alpha");

    expect(overridden?.summary).toBe("Custom summary for testing");
    expect(MOCK_RESUME_DATA.employment.find((e) => e.id === "job-alpha")?.summary).toBe(original_summary);
  });
});

describe("load_and_resolve_sub_variant", () => {
  it("loads and resolves a sub-variant", () => {
    mock_read_file({
      "abc12345.yaml": MOCK_SUB_VARIANT,
      "resume.yaml": MOCK_RESUME_DATA,
      "test-parent.yaml": MOCK_PARENT_VARIANT,
    });

    const resolved = load_and_resolve_sub_variant("test-parent", "abc12345");

    expect(resolved.title).toBe("VP of Engineering");
    expect(resolved.profile.name).toBe("Test Person");
    expect(resolved.skills.length).toBeGreaterThan(0);
  });

  it("throws when parent field mismatches directory", () => {
    const mismatched_sub: SubVariantManifest = {
      ...MOCK_SUB_VARIANT,
      parent: "wrong-parent",
    };
    mock_read_file({ "abc12345.yaml": mismatched_sub });

    expect(() => load_and_resolve_sub_variant("test-parent", "abc12345")).toThrow(
      /parent mismatch/,
    );
  });
});
