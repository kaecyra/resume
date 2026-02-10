import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import yaml from "js-yaml";

import type { ResumeData, VariantManifest, ResolvedResume } from "./types.js";

const DATA_DIR = resolve("data");

export function load_resume_data(): ResumeData {
  const raw = readFileSync(resolve(DATA_DIR, "resume.yaml"), "utf-8");
  return yaml.load(raw) as ResumeData;
}

export function load_variant(name: string): VariantManifest {
  const raw = readFileSync(resolve(DATA_DIR, "variants", `${name}.yaml`), "utf-8");
  return yaml.load(raw) as VariantManifest;
}

export function resolve_resume(data: ResumeData, variant: VariantManifest): ResolvedResume {
  const skills = variant.skills
    .map((id) => data.skills.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  const employment = variant.employment
    .map((id) => data.employment.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

  const languages = variant.languages
    .map((id) => data.languages.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined);

  const courses = variant.courses
    .map((id) => data.courses.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  return {
    profile: data.profile,
    title: variant.title,
    summary: variant.summary,
    skills,
    employment,
    languages,
    courses,
  };
}
