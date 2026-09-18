import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import yaml from "js-yaml";

import type { LandingData } from "./types.js";
import type { ValidationError } from "./validate.js";

const DATA_DIR = resolve("data");

// The section ids any component built so far can render: Hero ("hero"),
// Divider ("divider"), Commits ("commits"), Work ("work"), Contact
// ("contact"). A `sections` entry outside this set silently renders nothing
// once wired up. The resume CTA (#174's "resume" section) is no longer a
// standalone section - the redesign (#177) embeds it directly in the hero.
const KNOWN_SECTIONS = new Set(["hero", "divider", "commits", "work", "contact"]);

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

  // A missing or malformed document (an empty `data/landing.yaml` parses to
  // `undefined`) can't be checked field by field, and `landing.hero` would
  // throw before the `?.` on `hero` ever runs. Stop here rather than guard
  // every access below against a `landing` that isn't an object at all.
  if (!landing || typeof landing !== "object") {
    errors.push({ path, message: "landing.yaml must contain a document" });
    return errors;
  }

  if (
    !landing.hero?.name ||
    !landing.hero?.role ||
    !landing.hero?.location ||
    !landing.hero?.tagline ||
    !landing.hero?.status
  ) {
    errors.push({ path, message: "hero is missing required fields (name, role, location, tagline, status)" });
  }

  // `Array.isArray` guards below resolve to a real array or `null`, never
  // the original (possibly wrong-typed) field, so the `?? []` fallback in
  // each loop can only ever iterate an array - never a YAML map, which
  // `for...of` cannot iterate at all and throws on.
  const projects = Array.isArray(landing.projects) ? landing.projects : null;
  if (!projects) {
    errors.push({ path, message: "projects must be an array" });
  }

  const seen_project_ids = new Set<string>();
  for (const project of projects ?? []) {
    const project_label = project.id || "unknown";

    if (!project.id) {
      errors.push({ path, message: "project is missing an id" });
    } else if (seen_project_ids.has(project.id)) {
      errors.push({ path, message: `duplicate project id "${project.id}"` });
    } else {
      seen_project_ids.add(project.id);
    }

    if (!project.name || !project.blurb || !project.status) {
      errors.push({ path, message: `project "${project_label}" is missing name, blurb, or status` });
    }

    if (!Array.isArray(project.stack)) {
      errors.push({ path, message: `project "${project_label}" is missing a stack array` });
    }

    if (project.links !== undefined && !Array.isArray(project.links)) {
      errors.push({ path, message: `project "${project_label}" links must be an array` });
    } else {
      for (const [link_index, link] of (project.links ?? []).entries()) {
        if (!link?.label || !link?.url) {
          errors.push({ path, message: `project "${project_label}" link ${link_index} is missing label or url` });
        }
      }
    }
  }

  const contact = Array.isArray(landing.contact) ? landing.contact : null;
  if (!contact) {
    errors.push({ path, message: "contact must be an array" });
  }

  const seen_contact_urls = new Set<string>();
  for (const [index, item] of (contact ?? []).entries()) {
    if (!item?.label || !item?.url) {
      errors.push({ path, message: `contact entry ${index} is missing label or url` });
    } else if (seen_contact_urls.has(item.url)) {
      errors.push({ path, message: `duplicate contact url "${item.url}"` });
    } else {
      seen_contact_urls.add(item.url);
    }
  }

  const resume_links = Array.isArray(landing.resume_links) ? landing.resume_links : null;
  if (!resume_links || resume_links.length !== 1) {
    errors.push({
      path,
      message:
        "resume_links must contain exactly one entry (multiple public variants need per-variant CTA labels, which this data model does not support yet)",
    });
  }

  for (const variant of resume_links ?? []) {
    if (!valid_variants.includes(variant)) {
      errors.push({ path, message: `resume_links variant "${variant}" is not a valid variant` });
    }
  }

  if (!landing.github?.user) {
    errors.push({ path, message: "github.user is required" });
  }

  const sections = Array.isArray(landing.sections) ? landing.sections : null;
  if (!sections) {
    errors.push({ path, message: "sections must be an array" });
  }

  const seen_sections = new Set<string>();
  for (const section of sections ?? []) {
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
