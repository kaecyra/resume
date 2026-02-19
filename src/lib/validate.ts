import type { ResumeData, SubVariantManifest, VariantManifest } from "./types.js";

export interface ValidationError {
  path: string;
  message: string;
}

export function build_master_ids(data: ResumeData): Record<string, Set<string>> {
  return {
    skills: new Set(data.skills.map((s) => s.id)),
    domains: new Set(data.domains.map((d) => d.id)),
    field_deployments: new Set(data.field_deployments.map((fd) => fd.id)),
    employment: new Set(data.employment.map((e) => e.id)),
    languages: new Set(data.languages.map((l) => l.id)),
    courses: new Set(data.courses.map((c) => c.id)),
  };
}

export function validate_sub_variant(
  parent: string,
  slug: string,
  sub: SubVariantManifest,
  valid_variants: string[],
  master_ids: Record<string, Set<string>>,
  parent_variant: VariantManifest,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `data/variants/${parent}/${slug}.yaml`;

  if (sub.parent !== parent) {
    errors.push({ path, message: `parent field "${sub.parent}" does not match directory "${parent}"` });
  }

  if (!valid_variants.includes(sub.parent)) {
    errors.push({ path, message: `parent "${sub.parent}" is not a valid variant` });
  }

  if (!sub.job?.url || !sub.job?.company || !sub.job?.title || !sub.job?.fetched_at) {
    errors.push({ path, message: "missing required job metadata (url, company, title, fetched_at)" });
  }

  const id_fields: Array<{ field: keyof SubVariantManifest; collection: string }> = [
    { field: "skills", collection: "skills" },
    { field: "domains", collection: "domains" },
    { field: "field_deployments", collection: "field_deployments" },
    { field: "employment", collection: "employment" },
    { field: "languages", collection: "languages" },
    { field: "courses", collection: "courses" },
  ];

  for (const { field, collection } of id_fields) {
    const ids = sub[field] as string[] | undefined;
    if (!ids) continue;
    for (const id of ids) {
      if (!master_ids[collection].has(id)) {
        errors.push({ path, message: `${collection} ID "${id}" not found in master data` });
      }
    }
  }

  if (sub.cover_letter) {
    if (!sub.cover_letter.body || sub.cover_letter.body.trim().length === 0) {
      errors.push({ path, message: "cover_letter.body must be non-empty" });
    }
  }

  if (sub.employment_overrides) {
    const effective_employment = sub.employment ?? parent_variant.employment;
    for (const override of sub.employment_overrides) {
      if (!master_ids.employment.has(override.id)) {
        errors.push({ path, message: `employment_override ID "${override.id}" not found in master data` });
      } else if (!effective_employment.includes(override.id)) {
        errors.push({ path, message: `employment_override ID "${override.id}" not in active employment list` });
      }
    }
  }

  return errors;
}
