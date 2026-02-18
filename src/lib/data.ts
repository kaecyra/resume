import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import yaml from "js-yaml";

import type {
  ResumeData,
  VariantManifest,
  ResolvedResume,
  SubVariantManifest,
  SubVariantEntry,
} from "./types.js";

const DATA_DIR = resolve("data");

const VARIANTS_DIR = resolve(DATA_DIR, "variants");

export function list_variants(): string[] {
  return readdirSync(VARIANTS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));
}

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

  const domains = (variant.domains ?? [])
    .map((id) => data.domains.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => d !== undefined);

  const field_deployments = (variant.field_deployments ?? [])
    .map((id) => data.field_deployments.find((fd) => fd.id === id))
    .filter((fd): fd is NonNullable<typeof fd> => fd !== undefined);

  const courses = variant.courses
    .map((id) => data.courses.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  return {
    theme: variant.theme,
    profile: data.profile,
    title: variant.title,
    summary: variant.summary,
    tagline: variant.tagline,
    online_callout: variant.online_callout,
    skills,
    domains,
    field_deployments,
    employment,
    languages,
    courses,
  };
}

export function list_sub_variants(): SubVariantEntry[] {
  const entries: SubVariantEntry[] = [];
  for (const name of readdirSync(VARIANTS_DIR)) {
    const dir_path = resolve(VARIANTS_DIR, name);
    if (!statSync(dir_path).isDirectory()) continue;
    for (const file of readdirSync(dir_path)) {
      if (!file.endsWith(".yaml")) continue;
      entries.push({ parent: name, slug: file.replace(/\.yaml$/, "") });
    }
  }
  return entries;
}

export function load_sub_variant(parent: string, slug: string): SubVariantManifest {
  const raw = readFileSync(resolve(VARIANTS_DIR, parent, `${slug}.yaml`), "utf-8");
  return yaml.load(raw) as SubVariantManifest;
}

export function resolve_sub_variant(
  data: ResumeData,
  parent_variant: VariantManifest,
  sub_variant: SubVariantManifest,
): ResolvedResume {
  const merged: VariantManifest = {
    ...parent_variant,
    title: sub_variant.title ?? parent_variant.title,
    summary: sub_variant.summary ?? parent_variant.summary,
    tagline: sub_variant.tagline ?? parent_variant.tagline,
    online_callout: sub_variant.online_callout ?? parent_variant.online_callout,
    skills: sub_variant.skills ?? parent_variant.skills,
    domains: sub_variant.domains ?? parent_variant.domains,
    field_deployments: sub_variant.field_deployments ?? parent_variant.field_deployments,
    employment: sub_variant.employment ?? parent_variant.employment,
    languages: sub_variant.languages ?? parent_variant.languages,
    courses: sub_variant.courses ?? parent_variant.courses,
  };

  const resolved = resolve_resume(data, merged);

  if (sub_variant.employment_overrides) {
    for (const override of sub_variant.employment_overrides) {
      const index = resolved.employment.findIndex((e) => e.id === override.id);
      if (index === -1) continue;
      resolved.employment[index] = {
        ...resolved.employment[index],
        ...(override.summary !== undefined && { summary: override.summary }),
        ...(override.highlights !== undefined && { highlights: override.highlights }),
      };
    }
  }

  return resolved;
}

export function has_active_cover_letter(sub: SubVariantManifest): boolean {
  return !!sub.cover_letter && sub.cover_letter_enabled !== false;
}

export function load_and_resolve_sub_variant(parent: string, slug: string): ResolvedResume {
  const sub_variant = load_sub_variant(parent, slug);
  if (sub_variant.parent !== parent) {
    throw new Error(
      `Sub-variant parent mismatch: expected "${parent}", got "${sub_variant.parent}"`,
    );
  }
  const data = load_resume_data();
  const parent_variant = load_variant(parent);
  return resolve_sub_variant(data, parent_variant, sub_variant);
}
