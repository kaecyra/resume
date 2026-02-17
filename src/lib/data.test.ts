import {
  list_variants,
  load_resume_data,
  load_variant,
  resolve_resume,
  list_sub_variants,
  load_sub_variant,
  resolve_sub_variant,
  load_and_resolve_sub_variant,
} from "./data.js";

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

describe("list_sub_variants", () => {
  it("returns sub-variants with parent and slug", () => {
    const entries = list_sub_variants();

    expect(entries).toBeInstanceOf(Array);
    expect(entries.length).toBeGreaterThan(0);

    const test_entry = entries.find((e) => e.parent === "cto-a" && e.slug === "a7f3b9c2");
    expect(test_entry).toBeDefined();
  });

  it("does not include parent variants in results", () => {
    const entries = list_sub_variants();
    const slugs = entries.map((e) => e.slug);

    expect(slugs).not.toContain("default");
    expect(slugs).not.toContain("cto-a");
    expect(slugs).not.toContain("cto-b");
  });
});

describe("load_sub_variant", () => {
  it("loads a sub-variant manifest", () => {
    const sub = load_sub_variant("cto-a", "a7f3b9c2");

    expect(sub.parent).toBe("cto-a");
    expect(sub.job.company).toBe("Acme Corp");
    expect(sub.title).toBe("VP of Engineering");
  });

  it("throws for nonexistent sub-variants", () => {
    expect(() => load_sub_variant("cto-a", "00000000")).toThrow();
  });
});

describe("resolve_sub_variant", () => {
  it("inherits parent fields when sub-variant omits them", () => {
    const data = load_resume_data();
    const parent = load_variant("cto-a");
    const sub = load_sub_variant("cto-a", "a7f3b9c2");
    const resolved = resolve_sub_variant(data, parent, sub);

    expect(resolved.title).toBe("VP of Engineering");
    expect(resolved.skills.length).toBe(parent.skills.length);
    expect(resolved.employment.length).toBe(parent.employment.length);
    expect(resolved.theme).toBe(parent.theme);
  });

  it("overrides fields present in sub-variant", () => {
    const data = load_resume_data();
    const parent = load_variant("cto-a");
    const sub = load_sub_variant("cto-a", "a7f3b9c2");
    const resolved = resolve_sub_variant(data, parent, sub);

    expect(resolved.title).toBe("VP of Engineering");
    expect(resolved.summary).not.toBe(parent.summary);
  });

  it("applies employment overrides without mutating source data", () => {
    const data = load_resume_data();
    const parent = load_variant("cto-a");
    const sub = load_sub_variant("cto-a", "a7f3b9c2");
    sub.employment_overrides = [
      { id: "monks-vpe", summary: "Custom summary for testing" },
    ];

    const original_summary = data.employment.find((e) => e.id === "monks-vpe")?.summary;
    const resolved = resolve_sub_variant(data, parent, sub);
    const overridden = resolved.employment.find((e) => e.id === "monks-vpe");

    expect(overridden?.summary).toBe("Custom summary for testing");
    expect(data.employment.find((e) => e.id === "monks-vpe")?.summary).toBe(original_summary);
  });
});

describe("load_and_resolve_sub_variant", () => {
  it("loads and resolves a sub-variant", () => {
    const resolved = load_and_resolve_sub_variant("cto-a", "a7f3b9c2");

    expect(resolved.title).toBe("VP of Engineering");
    expect(resolved.profile.name).toBe("Tim Gunter");
    expect(resolved.skills.length).toBeGreaterThan(0);
  });

  it("throws when parent field mismatches directory", () => {
    expect(() => load_and_resolve_sub_variant("default", "a7f3b9c2")).toThrow();
  });
});
