import { list_variants, load_resume_data, load_variant, resolve_resume } from "./data.js";

describe("list_variants", () => {
  it("returns an array containing 'default'", () => {
    const variants = list_variants();

    expect(variants).toBeInstanceOf(Array);
    expect(variants).toContain("default");
  });
});

describe("load_resume_data", () => {
  it("loads and parses resume.yaml", () => {
    const data = load_resume_data();

    expect(data.profile).toBeDefined();
    expect(data.profile.name).toBe("Tim Gunter");
    expect(data.skills).toBeInstanceOf(Array);
    expect(data.skills.length).toBeGreaterThan(0);
    expect(data.employment).toBeInstanceOf(Array);
    expect(data.employment.length).toBeGreaterThan(0);
    expect(data.languages).toBeInstanceOf(Array);
    expect(data.courses).toBeInstanceOf(Array);
  });

  it("parses skill entries with id, name, and level", () => {
    const data = load_resume_data();
    const skill = data.skills[0];

    expect(skill.id).toBeDefined();
    expect(skill.name).toBeDefined();
    expect(typeof skill.level).toBe("number");
  });

  it("parses employment entries with required fields", () => {
    const data = load_resume_data();
    const job = data.employment[0];

    expect(job.id).toBeDefined();
    expect(job.title).toBeDefined();
    expect(job.company).toBeDefined();
    expect(job.start_date).toBeDefined();
    expect(job.highlights).toBeInstanceOf(Array);
  });
});

describe("load_variant", () => {
  it("throws for nonexistent variant names", () => {
    expect(() => load_variant("nonexistent")).toThrow();
  });

  it("loads and parses the default variant", () => {
    const variant = load_variant("default");

    expect(variant.theme).toBe("classic");
    expect(variant.title).toBeDefined();
    expect(variant.summary).toBeDefined();
    expect(variant.skills).toBeInstanceOf(Array);
    expect(variant.skills.length).toBeGreaterThan(0);
    expect(variant.employment).toBeInstanceOf(Array);
    expect(variant.employment.length).toBeGreaterThan(0);
  });
});

describe("resolve_resume", () => {
  it("resolves data with variant manifest", () => {
    const data = load_resume_data();
    const variant = load_variant("default");
    const resolved = resolve_resume(data, variant);

    expect(resolved.theme).toBe(variant.theme);
    expect(resolved.profile.name).toBe("Tim Gunter");
    expect(resolved.title).toBe(variant.title);
    expect(resolved.summary).toBe(variant.summary);
    expect(resolved.skills.length).toBe(variant.skills.length);
    expect(resolved.employment.length).toBe(variant.employment.length);
    expect(resolved.languages.length).toBe(variant.languages.length);
    expect(resolved.courses.length).toBe(variant.courses.length);
  });

  it("preserves variant ordering", () => {
    const data = load_resume_data();
    const variant = load_variant("default");
    const resolved = resolve_resume(data, variant);

    for (let i = 0; i < resolved.skills.length; i++) {
      expect(resolved.skills[i].id).toBe(variant.skills[i]);
    }

    for (let i = 0; i < resolved.employment.length; i++) {
      expect(resolved.employment[i].id).toBe(variant.employment[i]);
    }
  });

  it("skips unknown ids without error", () => {
    const data = load_resume_data();
    const variant: Parameters<typeof resolve_resume>[1] = {
      theme: "classic",
      title: "Test",
      summary: "Test summary",
      skills: ["nonexistent", "strategy"],
      employment: [],
      languages: [],
      courses: [],
    };

    const resolved = resolve_resume(data, variant);
    expect(resolved.skills).toHaveLength(1);
    expect(resolved.skills[0].id).toBe("strategy");
  });
});
