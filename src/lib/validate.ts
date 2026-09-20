import { z } from "zod";

import type {
  Contact,
  Course,
  Domain,
  Employment,
  FieldDeployment,
  Highlight,
  Language,
  Profile,
  ResumeData,
  Skill,
  SubVariantManifest,
  VariantManifest,
} from "./types.js";

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

/**
 * Makes a field added to an interface without a matching schema entry a
 * compile error rather than a silent gap. Exported because three loaders
 * assert with it - a guard type that is wrong in one copy stays wrong in
 * the others, which is how `ListCoversUnion` below shipped broken.
 */
export type SchemaCoversType<RealType, InferredType> = keyof RealType extends keyof InferredType
  ? true
  : never;

/**
 * Makes a union member missing from its allowed-values list a compile
 * error. Both sides are wrapped in a tuple on purpose: a naked type
 * parameter distributes, so the conditional is evaluated once per union
 * member and the results are unioned - a missing member contributes
 * `never`, `true | never` collapses to `true`, and the assertion compiles
 * with the drift it exists to catch.
 */
export type ListCoversUnion<Union, List extends readonly Union[]> = [Union] extends [List[number]]
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

// --- resume.yaml and variant manifests (#6) ---
//
// `load_resume_data` and `load_variant` (data.ts) both did
// `yaml.load(raw) as T`. That cast is compile-time only: TypeScript emits
// nothing for it, so a resume.yaml missing `skills`, or one writing
// `employment` as a mapping where a sequence belongs, was handed to the
// renderer as if it were a valid ResumeData. The failure surfaced later and
// somewhere else - `resolve_resume` dereferences `variant.skills.map(...)`
// immediately (data.ts:35), so a malformed file became a TypeError during
// render rather than a validation error naming the bad field. #171 closed
// exactly this hole for landing.yaml and the sub-variant manifests and
// explicitly left these two files open; this is that work finished.
//
// Same construction as landing.ts, for the same reasons documented there:
// outer containers keep real zod typing so a wrong-typed collection is one
// clean error instead of a thrown exception, leaves stay `z.any()` so a
// single bad field cannot suppress the required-field and duplicate-id
// checks for every other entry in the same pass, and a `SchemaCoversType`
// assertion per interface makes a field added to types.ts without a
// matching schema update a compile error rather than a silent gap.

const ContactSchema = z.object({
  location: z.any().optional(),
  email: z.any().optional(),
  linkedin: z.any().optional(),
});
const _contact_covers: SchemaCoversType<Contact, z.infer<typeof ContactSchema>> = true;

const ProfileSchema = z.object({
  name: z.any().optional(),
  photo: z.any().optional(),
  contact: ContactSchema.optional(),
});
const _profile_covers: SchemaCoversType<Profile, z.infer<typeof ProfileSchema>> = true;

const SkillSchema = z.object({
  id: z.any().optional(),
  name: z.any().optional(),
  level: z.any().optional(),
});
const _skill_covers: SchemaCoversType<Skill, z.infer<typeof SkillSchema>> = true;

const DomainSchema = z.object({
  id: z.any().optional(),
  title: z.any().optional(),
  description: z.any().optional(),
});
const _domain_covers: SchemaCoversType<Domain, z.infer<typeof DomainSchema>> = true;

const FieldDeploymentSchema = z.object({
  id: z.any().optional(),
  category: z.any().optional(),
  title: z.any().optional(),
  venue: z.any().optional(),
  date: z.any().optional(),
  description: z.any().optional(),
});
const _field_deployment_covers: SchemaCoversType<
  FieldDeployment,
  z.infer<typeof FieldDeploymentSchema>
> = true;

const HighlightSchema = z.object({
  title: z.any().optional(),
  description: z.any().optional(),
});
const _highlight_covers: SchemaCoversType<Highlight, z.infer<typeof HighlightSchema>> = true;

const EmploymentSchema = z.object({
  id: z.any().optional(),
  title: z.any().optional(),
  company: z.any().optional(),
  location: z.any().optional(),
  start_date: z.any().optional(),
  end_date: z.any().optional(),
  description: z.any().optional(),
  summary: z.any().optional(),
  highlights: z.array(HighlightSchema, { invalid_type_error: "highlights must be an array" }).optional(),
});
const _employment_covers: SchemaCoversType<Employment, z.infer<typeof EmploymentSchema>> = true;

const LanguageSchema = z.object({
  id: z.any().optional(),
  name: z.any().optional(),
  proficiency: z.any().optional(),
  level: z.any().optional(),
});
const _language_covers: SchemaCoversType<Language, z.infer<typeof LanguageSchema>> = true;

const CourseSchema = z.object({
  id: z.any().optional(),
  title: z.any().optional(),
  institution: z.any().optional(),
  date: z.any().optional(),
});
const _course_covers: SchemaCoversType<Course, z.infer<typeof CourseSchema>> = true;

// Every collection a variant can select from, by the name it goes by in
// both documents. One list so the required-field walk, the duplicate-id
// walk and the referential check below can never cover different sets.
const RESUME_COLLECTIONS = [
  "skills",
  "domains",
  "field_deployments",
  "employment",
  "languages",
  "courses",
] as const;

const ResumeDataSchema = z.object({
  profile: ProfileSchema.optional(),
  skills: z.array(SkillSchema, { invalid_type_error: "skills must be an array" }).optional(),
  domains: z.array(DomainSchema, { invalid_type_error: "domains must be an array" }).optional(),
  field_deployments: z
    .array(FieldDeploymentSchema, { invalid_type_error: "field_deployments must be an array" })
    .optional(),
  employment: z
    .array(EmploymentSchema, { invalid_type_error: "employment must be an array" })
    .optional(),
  languages: z.array(LanguageSchema, { invalid_type_error: "languages must be an array" }).optional(),
  courses: z.array(CourseSchema, { invalid_type_error: "courses must be an array" }).optional(),
});
const _resume_covers: SchemaCoversType<ResumeData, z.infer<typeof ResumeDataSchema>> = true;

const VariantManifestSchema = z.object({
  theme: z.any().optional(),
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
});
const _variant_covers: SchemaCoversType<VariantManifest, z.infer<typeof VariantManifestSchema>> =
  true;

// Required on every entry of each collection. `description` is deliberately
// absent for employment: Employment declares it `string | null`, and
// existing data leans on that.
const REQUIRED_ENTRY_FIELDS: Record<string, string[]> = {
  skills: ["id", "name"],
  domains: ["id", "title"],
  field_deployments: ["id", "category", "title"],
  employment: ["id", "title", "company", "start_date"],
  languages: ["id", "name"],
  courses: ["id", "title"],
};

/**
 * Validates data/resume.yaml - the master document every variant selects
 * from. Returns an empty array when the document is sound.
 */
export function validate_resume_data(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = "data/resume.yaml";

  const shape = ResumeDataSchema.safeParse(data);
  if (!shape.success) {
    for (const issue of shape.error.issues) {
      errors.push({ path, message: `${issue.path.join(".") || "document"}: ${issue.message}` });
    }
    // Every check below reads through shape.data, so there is nothing
    // further to say about a document that is not even the right shape.
    return errors;
  }

  const parsed = shape.data;

  if (!parsed.profile?.name || !parsed.profile?.contact?.email) {
    errors.push({ path, message: "profile is missing required fields (name, contact.email)" });
  }

  for (const collection of RESUME_COLLECTIONS) {
    const entries = parsed[collection];
    if (!entries) {
      errors.push({ path, message: `${collection} is required` });
      continue;
    }

    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      const where = `${collection}[${index}]`;

      for (const field of REQUIRED_ENTRY_FIELDS[collection]) {
        if (!(entry as Record<string, unknown>)[field]) {
          errors.push({ path, message: `${where} is missing required field "${field}"` });
        }
      }

      const id = (entry as { id?: unknown }).id;
      if (typeof id === "string") {
        // A duplicate id is worse than a missing one: resolve_resume picks
        // entries with .find(), so the second entry is unreachable and the
        // resume silently renders the first every time.
        if (seen.has(id)) {
          errors.push({ path, message: `${where} repeats id "${id}"` });
        }
        seen.add(id);
      }
    });
  }

  return errors;
}

/**
 * Validates one variant manifest, including every ID it selects against the
 * master document's own ids.
 */
export function validate_variant(
  name: string,
  variant: unknown,
  master_ids: Record<string, Set<string>>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `data/variants/${name}.yaml`;

  const shape = VariantManifestSchema.safeParse(variant);
  if (!shape.success) {
    for (const issue of shape.error.issues) {
      errors.push({ path, message: `${issue.path.join(".") || "document"}: ${issue.message}` });
    }
    return errors;
  }

  const parsed = shape.data;

  for (const field of ["theme", "title", "summary"] as const) {
    if (!parsed[field]) {
      errors.push({ path, message: `${field} is required` });
    }
  }

  // Required on VariantManifest, unlike their optional counterparts on
  // SubVariantManifest - resolve_resume reads these without a `?? []`
  // fallback (data.ts:35), so a missing one throws rather than rendering an
  // empty section.
  for (const field of ["skills", "employment", "languages", "courses"] as const) {
    if (!parsed[field]) {
      errors.push({ path, message: `${field} is required` });
    }
  }

  // The check #6 is really about. resolve_resume resolves each id with
  // .find() and drops the misses with .filter() (data.ts:36-37), so a typo
  // here does not fail - it silently shortens the resume, and the only
  // symptom is a section quietly missing an entry nobody notices.
  for (const collection of RESUME_COLLECTIONS) {
    const ids = parsed[collection];
    if (!ids) continue;
    for (const id of ids) {
      if (!master_ids[collection].has(id)) {
        errors.push({ path, message: `${collection} ID "${id}" not found in master data` });
      }
    }
  }

  return errors;
}

/**
 * Renders validation errors as one multi-line message. Used by the loaders,
 * which have nowhere to return a list to.
 */
export function format_validation_errors(errors: ValidationError[]): string {
  return errors.map((error) => `  ${error.path}: ${error.message}`).join("\n");
}
