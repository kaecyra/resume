import type { SubVariantManifest, VariantManifest } from "./types.js";
import { validate_sub_variant, build_master_ids, type ValidationError } from "./validate.js";

const MASTER_IDS: Record<string, Set<string>> = {
  skills: new Set(["skill-a", "skill-b"]),
  domains: new Set(["domain-a"]),
  field_deployments: new Set(["fd-a"]),
  employment: new Set(["emp-a", "emp-b"]),
  languages: new Set(["lang-a"]),
  courses: new Set(["course-a"]),
};

const VALID_VARIANTS = ["cto"];

const PARENT_VARIANT: VariantManifest = {
  theme: "default",
  title: "CTO",
  summary: "A summary.",
  skills: ["skill-a"],
  employment: ["emp-a", "emp-b"],
  languages: ["lang-a"],
  courses: ["course-a"],
};

function make_sub(overrides: Partial<SubVariantManifest> = {}): SubVariantManifest {
  return {
    parent: "cto",
    job: {
      url: "https://example.com/job",
      company: "Acme Corp",
      title: "CTO",
      fetched_at: "2026-02-19T00:00:00Z",
    },
    ...overrides,
  };
}

describe("validate_sub_variant", () => {
  it("returns empty array for a valid sub-variant", () => {
    const errors = validate_sub_variant("cto", "abcd1234", make_sub(), VALID_VARIANTS, MASTER_IDS, PARENT_VARIANT);
    expect(errors).toEqual([]);
  });

  it("detects parent field mismatch", () => {
    const sub = make_sub({ parent: "vpe" });
    const errors = validate_sub_variant("cto", "abcd1234", sub, ["cto", "vpe"], MASTER_IDS, PARENT_VARIANT);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `parent field "vpe" does not match directory "cto"` }),
    );
  });

  it("detects parent not a valid variant", () => {
    const sub = make_sub({ parent: "bogus" });
    const errors = validate_sub_variant("bogus", "abcd1234", sub, VALID_VARIANTS, MASTER_IDS, PARENT_VARIANT);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `parent "bogus" is not a valid variant` }),
    );
  });

  it("detects missing job metadata", () => {
    const sub = make_sub({ job: { url: "", company: "Acme", title: "CTO", fetched_at: "2026-02-19T00:00:00Z" } });
    const errors = validate_sub_variant("cto", "abcd1234", sub, VALID_VARIANTS, MASTER_IDS, PARENT_VARIANT);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "missing required job metadata (url, company, title, fetched_at)" }),
    );
  });

  it("detects invalid ID in a collection", () => {
    const sub = make_sub({ skills: ["skill-a", "nonexistent"] });
    const errors = validate_sub_variant("cto", "abcd1234", sub, VALID_VARIANTS, MASTER_IDS, PARENT_VARIANT);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `skills ID "nonexistent" not found in master data` }),
    );
  });

  it("detects empty cover letter body", () => {
    const sub = make_sub({ cover_letter: { body: "   " } });
    const errors = validate_sub_variant("cto", "abcd1234", sub, VALID_VARIANTS, MASTER_IDS, PARENT_VARIANT);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "cover_letter.body must be non-empty" }),
    );
  });

  it("detects employment override ID not in master data", () => {
    const sub = make_sub({ employment_overrides: [{ id: "emp-ghost" }] });
    const errors = validate_sub_variant("cto", "abcd1234", sub, VALID_VARIANTS, MASTER_IDS, PARENT_VARIANT);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `employment_override ID "emp-ghost" not found in master data` }),
    );
  });

  it("detects employment override ID not in active employment list", () => {
    const sub = make_sub({
      employment: ["emp-a"],
      employment_overrides: [{ id: "emp-b" }],
    });
    const errors = validate_sub_variant("cto", "abcd1234", sub, VALID_VARIANTS, MASTER_IDS, PARENT_VARIANT);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `employment_override ID "emp-b" not in active employment list` }),
    );
  });

  it("accumulates multiple errors from different branches", () => {
    const sub = make_sub({
      parent: "bogus",
      job: { url: "", company: "", title: "", fetched_at: "" },
      skills: ["nonexistent"],
      cover_letter: { body: "" },
    });
    const errors = validate_sub_variant("bogus", "abcd1234", sub, VALID_VARIANTS, MASTER_IDS, PARENT_VARIANT);
    expect(errors.length).toBeGreaterThanOrEqual(4);

    const messages = errors.map((e: ValidationError) => e.message);
    expect(messages).toContainEqual(expect.stringContaining("not a valid variant"));
    expect(messages).toContainEqual(expect.stringContaining("missing required job metadata"));
    expect(messages).toContainEqual(expect.stringContaining("not found in master data"));
    expect(messages).toContainEqual(expect.stringContaining("cover_letter.body must be non-empty"));
  });
});

describe("build_master_ids", () => {
  it("builds ID sets from resume data", () => {
    const result = build_master_ids({
      profile: { name: "Test", photo: "", contact: { location: "", email: "" } },
      skills: [{ id: "s1", name: "Skill", level: 5 }],
      domains: [{ id: "d1", title: "Domain", description: "" }],
      field_deployments: [{ id: "fd1", category: "cat", title: "FD", venue: "v", date: null, description: "" }],
      employment: [{ id: "e1", title: "Dev", company: "Co", location: null, start_date: "2020-01", end_date: null, description: null, summary: null, highlights: [] }],
      languages: [{ id: "l1", name: "English", proficiency: "Native", level: 5 }],
      courses: [{ id: "c1", title: "Course", institution: "Uni", date: "2020-01" }],
    });

    expect(result.skills.has("s1")).toBe(true);
    expect(result.domains.has("d1")).toBe(true);
    expect(result.field_deployments.has("fd1")).toBe(true);
    expect(result.employment.has("e1")).toBe(true);
    expect(result.languages.has("l1")).toBe(true);
    expect(result.courses.has("c1")).toBe(true);
  });
});
