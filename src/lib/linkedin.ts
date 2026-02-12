import type { Employment, Skill, Course, Language } from "./types.js";
import { strip_markdown, format_date, format_date_range } from "./format.js";

export interface LinkedInSection {
  title: string;
  content: string;
  char_limit?: number;
}

export function format_headline(title: string, tagline?: string): LinkedInSection {
  const parts = [title];
  if (tagline) {
    parts.push(strip_markdown(tagline.trim()));
  }
  const content = parts.join(" | ");
  return { title: "Headline", content, char_limit: 220 };
}

export function format_about(summary: string): LinkedInSection {
  const content = strip_markdown(summary.trim());
  return { title: "About", content, char_limit: 2600 };
}

export function format_experience(employment: Employment[]): LinkedInSection {
  const entries = employment.map((job) => {
    const lines: string[] = [];
    lines.push(`${job.title} at ${job.company}`);
    if (job.location) {
      lines.push(job.location);
    }
    lines.push(format_date_range(job.start_date, job.end_date));
    if (job.summary) {
      lines.push("");
      lines.push(strip_markdown(job.summary.trim()));
    }
    if (job.highlights.length > 0) {
      lines.push("");
      for (const highlight of job.highlights) {
        const prefix = highlight.title ? `${strip_markdown(highlight.title)}: ` : "";
        lines.push(`- ${prefix}${strip_markdown(highlight.description)}`);
      }
    }
    return lines.join("\n");
  });

  const content = entries.join("\n\n---\n\n");
  return { title: "Experience", content };
}

export function format_skills(skills: Skill[]): LinkedInSection {
  const content = skills.map((s) => s.name).join(", ");
  return { title: "Skills", content };
}

export function format_certifications(courses: Course[]): LinkedInSection {
  const entries = courses.map((c) => {
    return `${c.title}\n${c.institution}\n${format_date(c.date)}`;
  });

  const content = entries.join("\n\n");
  return { title: "Licenses & Certifications", content };
}

export function format_languages(languages: Language[]): LinkedInSection {
  const filtered = languages.filter((l) => l.id !== "engineer");
  const entries = filtered.map((l) => `${l.name} (${l.proficiency})`);
  const content = entries.join("\n");
  return { title: "Languages", content };
}

export function render_section(section: LinkedInSection): string {
  const divider = "=".repeat(60);
  const lines: string[] = [divider, `  ${section.title}`, divider, "", section.content, ""];
  if (section.char_limit !== undefined) {
    const count = section.content.length;
    const status = count <= section.char_limit ? "OK" : "OVER";
    lines.push(`[${count}/${section.char_limit} characters - ${status}]`);
  }
  return lines.join("\n");
}
