import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import yaml from "js-yaml";

import type { LandingData } from "./types.js";

const DATA_DIR = resolve("data");

export interface LandingValidationError {
  path: string;
  message: string;
}

export function load_landing_data(): LandingData {
  const raw = readFileSync(resolve(DATA_DIR, "landing.yaml"), "utf-8");
  return yaml.load(raw) as LandingData;
}

export function validate_landing_data(
  landing: LandingData,
  valid_variants: string[],
): LandingValidationError[] {
  const errors: LandingValidationError[] = [];
  const path = "data/landing.yaml";

  if (!landing.hero?.name || !landing.hero?.role || !landing.hero?.tagline || !landing.hero?.status) {
    errors.push({ path, message: "hero is missing required fields (name, role, tagline, status)" });
  }

  const seen_project_ids = new Set<string>();
  for (const project of landing.projects ?? []) {
    if (seen_project_ids.has(project.id)) {
      errors.push({ path, message: `duplicate project id "${project.id}"` });
    }
    seen_project_ids.add(project.id);

    if (!project.name || !project.blurb) {
      errors.push({ path, message: `project "${project.id}" is missing name or blurb` });
    }
  }

  if (!landing.resume_links || landing.resume_links.length === 0) {
    errors.push({ path, message: "resume_links must contain at least one entry" });
  }

  for (const variant of landing.resume_links ?? []) {
    if (!valid_variants.includes(variant)) {
      errors.push({ path, message: `resume_links variant "${variant}" is not a valid variant` });
    }
  }

  if (!landing.github?.user) {
    errors.push({ path, message: "github.user is required" });
  }

  const seen_sections = new Set<string>();
  for (const section of landing.sections ?? []) {
    if (seen_sections.has(section)) {
      errors.push({ path, message: `duplicate section "${section}"` });
    }
    seen_sections.add(section);
  }

  return errors;
}
