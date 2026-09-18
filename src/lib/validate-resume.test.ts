import {
  build_master_ids,
  format_validation_errors,
  validate_resume_data,
  validate_variant,
} from "./validate.js";
import type { ResumeData } from "./types.js";

// Inline fixtures, per ENGINEERING.md rule 17: a test here must never start
// failing because someone edited data/resume.yaml. A baseline built once,
// then structuredClone + mutate per case, so each test states exactly the
// one thing it broke.
const BASE: ResumeData = {
  profile: { name: "Test Person", photo: "photo.jpg", contact: { location: "Here", email: "a@b.c" } },
  skills: [{ id: "skill-a", name: "Skill A", level: 4 }],
  domains: [{ id: "domain-a", title: "Domain A", description: "d" }],
  field_deployments: [
    { id: "fd-a", category: "Open Source", title: "FD A", venue: "v", date: null, description: "d" },
  ],
  employment: [
    {
      id: "job-a",
      title: "Engineer",
      company: "Co",
      location: null,
      start_date: "2020-01",
      end_date: null,
      description: null,
      summary: null,
      highlights: [],
    },
  ],
  languages: [{ id: "lang-a", name: "English", proficiency: "Native", level: 5 }],
  courses: [{ id: "course-a", title: "Course A", institution: "Inst", date: "2019" }],
};

function resume(mutate: (data: ResumeData) => void): ResumeData {
  const copy = structuredClone(BASE);
  mutate(copy);
  return copy;
}

describe("validate_resume_data", () => {
  it("accepts a well-formed document", () => {
    expect(validate_resume_data(BASE)).toEqual([]);
  });

  it("reports a collection written as a mapping instead of a sequence, rather than throwing", () => {
    // The shape that used to sail through `yaml.load(raw) as ResumeData` and
    // become a TypeError inside resolve_resume's .map().
    const errors = validate_resume_data({ ...BASE, skills: { "skill-a": "Skill A" } });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("skills must be an array");
  });

  it("reports a missing collection by name", () => {
    const { courses: _courses, ...without_courses } = BASE;
    const errors = validate_resume_data(without_courses);

    expect(errors.map((e) => e.message)).toContain("courses is required");
  });

  it("reports a missing required field on one entry, naming the collection and index", () => {
    const errors = validate_resume_data(
      resume((d) => {
        d.employment[0].company = "";
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('employment[0] is missing required field "company"');
  });

  it("reports a duplicate id, which .find() would otherwise make unreachable", () => {
    // resolve_resume resolves by .find(), so a repeated id means the second
    // entry can never render and the first silently wins.
    const errors = validate_resume_data(
      resume((d) => {
        d.skills.push({ id: "skill-a", name: "Different Skill", level: 1 });
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('skills[1] repeats id "skill-a"');
  });

  it("reports a profile missing its contact email", () => {
    const errors = validate_resume_data(
      resume((d) => {
        d.profile.contact.email = "";
      }),
    );

    expect(errors.map((e) => e.message)).toContain(
      "profile is missing required fields (name, contact.email)",
    );
  });

  it("collects every problem in one pass rather than stopping at the first", () => {
    const errors = validate_resume_data(
      resume((d) => {
        d.skills[0].name = "";
        d.languages[0].id = "";
        d.courses[0].title = "";
      }),
    );

    expect(errors).toHaveLength(3);
  });
});

describe("validate_variant", () => {
  const MASTER = build_master_ids(BASE);

  const VALID_VARIANT = {
    theme: "retro",
    title: "Engineer",
    summary: "A summary",
    skills: ["skill-a"],
    domains: ["domain-a"],
    field_deployments: ["fd-a"],
    employment: ["job-a"],
    languages: ["lang-a"],
    courses: ["course-a"],
  };

  it("accepts a variant whose ids all exist in the master document", () => {
    expect(validate_variant("default", VALID_VARIANT, MASTER)).toEqual([]);
  });

  it("reports an id that is not in the master document", () => {
    // This is the defect #6 exists for: resolve_resume drops the miss with
    // .filter(), so today a typo here shortens the resume silently.
    const errors = validate_variant(
      "default",
      { ...VALID_VARIANT, skills: ["skill-a", "skill-typo"] },
      MASTER,
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('skills ID "skill-typo" not found in master data');
    expect(errors[0].path).toBe("data/variants/default.yaml");
  });

  it("reports a missing required list, which resolve_resume reads without a fallback", () => {
    const { employment: _employment, ...without } = VALID_VARIANT;
    const errors = validate_variant("default", without, MASTER);

    expect(errors.map((e) => e.message)).toContain("employment is required");
  });

  it("reports missing theme, title and summary", () => {
    const errors = validate_variant(
      "default",
      { ...VALID_VARIANT, theme: "", title: "", summary: "" },
      MASTER,
    );

    expect(errors.map((e) => e.message)).toEqual(
      expect.arrayContaining(["theme is required", "title is required", "summary is required"]),
    );
  });

  it("treats the optional id lists as optional, not as missing", () => {
    const { domains: _domains, field_deployments: _fd, ...without_optional } = VALID_VARIANT;

    expect(validate_variant("default", without_optional, MASTER)).toEqual([]);
  });

  it("reports an id list written as a mapping instead of a sequence", () => {
    const errors = validate_variant("default", { ...VALID_VARIANT, skills: { a: "b" } }, MASTER);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("skills must be an array");
  });
});

describe("format_validation_errors", () => {
  it("renders one indented line per error, so a thrown loader message stays readable", () => {
    const rendered = format_validation_errors([
      { path: "data/resume.yaml", message: "courses is required" },
      { path: "data/resume.yaml", message: 'skills[1] repeats id "skill-a"' },
    ]);

    expect(rendered).toBe(
      '  data/resume.yaml: courses is required\n  data/resume.yaml: skills[1] repeats id "skill-a"',
    );
  });
});
