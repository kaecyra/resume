import type { Employment, Skill, Course, Language } from "./types.js";
import {
  format_headline,
  format_about,
  format_experience,
  format_skills,
  format_certifications,
  format_languages,
  render_section,
} from "./linkedin.js";

describe("format_headline", () => {
  it("formats title only when no tagline", () => {
    const result = format_headline("Software Engineer");
    expect(result.title).toBe("Headline");
    expect(result.content).toBe("Software Engineer");
    expect(result.char_limit).toBe(220);
  });

  it("formats title with tagline separated by pipe", () => {
    const result = format_headline("CTO", "I build things");
    expect(result.content).toBe("CTO | I build things");
  });

  it("strips markdown from tagline", () => {
    const result = format_headline("CTO", "**Bold** leadership");
    expect(result.content).toBe("CTO | Bold leadership");
  });

  it("trims whitespace from tagline", () => {
    const result = format_headline("CTO", "  Leading teams\n");
    expect(result.content).toBe("CTO | Leading teams");
  });
});

describe("format_about", () => {
  it("returns stripped markdown summary", () => {
    const result = format_about("I am a **bold** engineer with [skills](http://example.com).");
    expect(result.title).toBe("About");
    expect(result.content).toBe("I am a bold engineer with skills.");
    expect(result.char_limit).toBe(2600);
  });

  it("trims whitespace", () => {
    const result = format_about("  Hello world  \n");
    expect(result.content).toBe("Hello world");
  });
});

describe("format_experience", () => {
  const base_job: Employment = {
    id: "test-job",
    title: "Engineer",
    company: "Acme Corp",
    location: "Remote",
    start_date: "2020-01",
    end_date: "2023-06",
    description: null,
    summary: "Built **great** things.",
    highlights: [
      { title: "Led migration", description: "Moved to **cloud**." },
      { description: "Improved performance by 50%." },
    ],
  };

  it("formats job title and company", () => {
    const result = format_experience([base_job]);
    expect(result.content).toContain("Engineer at Acme Corp");
  });

  it("includes location", () => {
    const result = format_experience([base_job]);
    expect(result.content).toContain("Remote");
  });

  it("formats date range", () => {
    const result = format_experience([base_job]);
    expect(result.content).toContain("Jan 2020 - Jun 2023");
  });

  it("strips markdown from summary", () => {
    const result = format_experience([base_job]);
    expect(result.content).toContain("Built great things.");
  });

  it("formats highlights as bullet list", () => {
    const result = format_experience([base_job]);
    expect(result.content).toContain("- Led migration: Moved to cloud.");
    expect(result.content).toContain("- Improved performance by 50%.");
  });

  it("omits location when null", () => {
    const job = { ...base_job, location: null };
    const result = format_experience([job]);
    const lines = result.content.split("\n");
    expect(lines[1]).toBe("Jan 2020 - Jun 2023");
  });

  it("shows Present for null end_date", () => {
    const job = { ...base_job, end_date: null };
    const result = format_experience([job]);
    expect(result.content).toContain("Jan 2020 - Present");
  });

  it("separates multiple jobs with dividers", () => {
    const job_2: Employment = {
      ...base_job,
      id: "job-2",
      title: "Senior Engineer",
      company: "Other Corp",
    };
    const result = format_experience([base_job, job_2]);
    expect(result.content).toContain("---");
  });

  it("has no char_limit", () => {
    const result = format_experience([base_job]);
    expect(result.char_limit).toBeUndefined();
  });
});

describe("format_skills", () => {
  it("formats skills as comma-separated names", () => {
    const skills: Skill[] = [
      { id: "ts", name: "TypeScript", level: 5 },
      { id: "py", name: "Python", level: 4 },
      { id: "go", name: "Go", level: 3 },
    ];
    const result = format_skills(skills);
    expect(result.title).toBe("Skills");
    expect(result.content).toBe("TypeScript, Python, Go");
  });

  it("handles single skill", () => {
    const skills: Skill[] = [{ id: "ts", name: "TypeScript", level: 5 }];
    const result = format_skills(skills);
    expect(result.content).toBe("TypeScript");
  });
});

describe("format_certifications", () => {
  it("formats courses with title, institution, and date", () => {
    const courses: Course[] = [
      { id: "csm", title: "Certified ScrumMaster", institution: "Scrum Alliance", date: "2019-03" },
    ];
    const result = format_certifications(courses);
    expect(result.title).toBe("Licenses & Certifications");
    expect(result.content).toContain("Certified ScrumMaster");
    expect(result.content).toContain("Scrum Alliance");
    expect(result.content).toContain("Mar 2019");
  });

  it("separates multiple courses with blank lines", () => {
    const courses: Course[] = [
      { id: "csm", title: "CSM", institution: "SA", date: "2019-03" },
      { id: "cspo", title: "CSPO", institution: "SA", date: "2020-01" },
    ];
    const result = format_certifications(courses);
    expect(result.content).toContain("CSM\nSA\nMar 2019\n\nCSPO\nSA\nJan 2020");
  });
});

describe("format_languages", () => {
  it("formats languages with proficiency", () => {
    const languages: Language[] = [
      { id: "english", name: "English", proficiency: "Native", level: 5 },
      { id: "french", name: "French", proficiency: "Conversational", level: 2 },
    ];
    const result = format_languages(languages);
    expect(result.title).toBe("Languages");
    expect(result.content).toBe("English (Native)\nFrench (Conversational)");
  });

  it("filters out the engineer joke entry", () => {
    const languages: Language[] = [
      { id: "english", name: "English", proficiency: "Native", level: 5 },
      { id: "engineer", name: "Engineer", proficiency: "Native", level: 5 },
    ];
    const result = format_languages(languages);
    expect(result.content).toBe("English (Native)");
  });
});

describe("render_section", () => {
  it("renders section with title and content", () => {
    const output = render_section({ title: "Skills", content: "TypeScript, Python" });
    expect(output).toContain("Skills");
    expect(output).toContain("TypeScript, Python");
    expect(output).toContain("====");
  });

  it("shows character count when limit is set", () => {
    const output = render_section({ title: "Headline", content: "Hello", char_limit: 220 });
    expect(output).toContain("[5/220 characters - OK]");
  });

  it("shows OVER when content exceeds limit", () => {
    const output = render_section({ title: "Test", content: "Hello World", char_limit: 5 });
    expect(output).toContain("[11/5 characters - OVER]");
  });

  it("omits character count when no limit", () => {
    const output = render_section({ title: "Test", content: "Hello" });
    expect(output).not.toContain("characters");
  });
});
