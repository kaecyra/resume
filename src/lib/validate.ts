import { z } from "zod";

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

// --- Schema ---
//
// `validate_sub_variant` is referential validation, not the field-presence
// walk `validate_landing_data` in ./landing.ts is: it checks a sub-variant's
// IDs against another document's master data, not whether every field
// SubVariantManifest declares is present. That's a genuinely different job
// and stays hand-written below. But the ID-list fields (`skills`, `domains`,
// ... and `employment_overrides`) share the exact defect #171 exists to
// close off: `sub[field] as string[] | undefined` casts straight past a
// wrong runtime shape, and `for (const id of ids)` throws instead of
// producing a validation error when a sub-variant YAML file writes one of
// these as a mapping instead of a sequence. `SubVariantManifestSchema` below
// replaces that cast for exactly those fields, and - via the same
// `SchemaCoversType` compile-time assertion `landing.ts` uses - guarantees a
// field added to `SubVariantManifest` later shows up here too, rather than
// silently falling back to an unchecked cast the way `skills` originally
// did.

type SchemaCoversType<RealType, InferredType> = keyof RealType extends keyof InferredType
  ? true
  : never;

const SubVariantJobSchema = z.object({
  url: z.any().optional(),
  company: z.any().optional(),
  title: z.any().optional(),
  fetched_at: z.any().optional(),
});

const EmploymentOverrideSchema = z.object({
  id: z.any().optional(),
  summary: z.any().optional(),
  highlights: z.any().optional(),
});

const CoverLetterSchema = z.object({
  greeting: z.any().optional(),
  body: z.any().optional(),
  closing: z.any().optional(),
});

const SubVariantManifestSchema = z.object({
  parent: z.any().optional(),
  job: SubVariantJobSchema.optional(),
  title: z.any().optional(),
  summary: z.any().optional(),
  tagline: z.any().optional(),
  online_callout: z.any().optional(),
  skills: z.array(z.any(), { invalid_type_error: "skills must be an array" }).optional(),
  domains: z.array(z.any(), { invalid_type_error: "domains must be an array" }).optional(),
  field_deployments: z
    .array(z.any(), { invalid_type_error: "field_deployments must be an array" })
    .optional(),
  employment: z.array(z.any(), { invalid_type_error: "employment must be an array" }).optional(),
  languages: z.array(z.any(), { invalid_type_error: "languages must be an array" }).optional(),
  courses: z.array(z.any(), { invalid_type_error: "courses must be an array" }).optional(),
  employment_overrides: z
    .array(EmploymentOverrideSchema, { invalid_type_error: "employment_overrides must be an array" })
    .optional(),
  cover_letter: CoverLetterSchema.optional(),
  cover_letter_enabled: z.any().optional(),
});
const _sub_variant_schema_covers_type: SchemaCoversType<
  SubVariantManifest,
  z.infer<typeof SubVariantManifestSchema>
> = true;

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

  // Only the wrong-shape case reaches here as an error; a well-shaped
  // `shape.data` is used below in place of the raw, unvalidated casts the
  // id-list and employment-overrides checks used to rely on.
  const shape = SubVariantManifestSchema.safeParse(sub);
  if (!shape.success) {
    for (const issue of shape.error.issues) {
      errors.push({ path, message: issue.message });
    }
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
    const ids = shape.success ? shape.data[field] : undefined;
    if (!ids) continue;
    for (const id of ids) {
      if (!master_ids[collection].has(id)) {
        errors.push({ path, message: `${collection} ID "${id}" not found in master data` });
      }
    }
  }

  if (sub.cover_letter) {
    const body = sub.cover_letter.body;
    if (typeof body !== "string" || body.trim().length === 0) {
      errors.push({ path, message: "cover_letter.body must be non-empty" });
    }
  }

  const overrides = shape.success ? shape.data.employment_overrides : undefined;
  if (overrides) {
    const effective_employment = sub.employment ?? parent_variant.employment;
    for (const override of overrides) {
      if (!master_ids.employment.has(override.id)) {
        errors.push({ path, message: `employment_override ID "${override.id}" not found in master data` });
      } else if (!effective_employment.includes(override.id)) {
        errors.push({ path, message: `employment_override ID "${override.id}" not in active employment list` });
      }
    }
  }

  return errors;
}
