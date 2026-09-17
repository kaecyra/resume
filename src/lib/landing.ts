import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import yaml from "js-yaml";

import type { LandingData } from "./types.js";
import type { ValidationError } from "./validate.js";

const DATA_DIR = resolve("data");

// The section ids any component built so far can render: HudHero ("hero"),
// ProjectGrid ("projects"), ResumeCta ("resume"), HudFooter ("contact"). A
// `sections` entry outside this set silently renders nothing once wired up.
const KNOWN_SECTIONS = new Set(["hero", "projects", "resume", "contact"]);

export function load_landing_data(): LandingData {
  const raw = readFileSync(resolve(DATA_DIR, "landing.yaml"), "utf-8");
  return yaml.load(raw) as LandingData;
}

export function validate_landing_data(
  landing: LandingData,
  valid_variants: string[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = "data/landing.yaml";

  if (!landing.hero?.name || !landing.hero?.role || !landing.hero?.tagline || !landing.hero?.status) {
    errors.push({ path, message: "hero is missing required fields (name, role, tagline, status)" });
  }

  if (!Array.isArray(landing.projects)) {
    errors.push({ path, message: "projects must be an array" });
  }

  const seen_project_ids = new Set<string>();
  for (const project of landing.projects ?? []) {
    const project_label = project.id || "unknown";

    if (!project.id) {
      errors.push({ path, message: "project is missing an id" });
    } else if (seen_project_ids.has(project.id)) {
      errors.push({ path, message: `duplicate project id "${project.id}"` });
    } else {
      seen_project_ids.add(project.id);
    }

    if (!project.name || !project.blurb) {
      errors.push({ path, message: `project "${project_label}" is missing name or blurb` });
    }

    if (!Array.isArray(project.stack)) {
      errors.push({ path, message: `project "${project_label}" is missing a stack array` });
    }

    if (project.links !== undefined && !Array.isArray(project.links)) {
      errors.push({ path, message: `project "${project_label}" links must be an array` });
    }
  }

  if (!Array.isArray(landing.contact)) {
    errors.push({ path, message: "contact must be an array" });
  }

  for (const [index, item] of (landing.contact ?? []).entries()) {
    if (!item?.label || !item?.url) {
      errors.push({ path, message: `contact entry ${index} is missing label or url` });
    }
  }

  if (!Array.isArray(landing.resume_links) || landing.resume_links.length !== 1) {
    errors.push({
      path,
      message:
        "resume_links must contain exactly one entry (multiple public variants need per-variant CTA labels, which this data model does not support yet)",
    });
  }

  for (const variant of landing.resume_links ?? []) {
    if (!valid_variants.includes(variant)) {
      errors.push({ path, message: `resume_links variant "${variant}" is not a valid variant` });
    }
  }

  if (!landing.github?.user) {
    errors.push({ path, message: "github.user is required" });
  }

  if (!Array.isArray(landing.sections)) {
    errors.push({ path, message: "sections must be an array" });
  }

  const seen_sections = new Set<string>();
  for (const section of landing.sections ?? []) {
    if (seen_sections.has(section)) {
      errors.push({ path, message: `duplicate section "${section}"` });
    }
    seen_sections.add(section);

    if (!KNOWN_SECTIONS.has(section)) {
      errors.push({ path, message: `section "${section}" is not a known section` });
    }
  }

  return errors;
}
