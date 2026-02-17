import { list_sub_variants, load_sub_variant, load_resume_data, load_variant, list_variants } from "../src/lib/data.js";

import type { SubVariantManifest } from "../src/lib/types.js";

interface ValidationError {
  path: string;
  message: string;
}

function validate(
  parent: string,
  slug: string,
  sub: SubVariantManifest,
  valid_variants: string[],
  master_ids: Record<string, Set<string>>,
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

  if (sub.employment_overrides) {
    const parent_variant = load_variant(parent);
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

function main(): void {
  const entries = list_sub_variants();
  if (entries.length === 0) {
    console.log("No sub-variants found.");
    return;
  }

  const data = load_resume_data();
  const valid_variants = list_variants();

  const master_ids: Record<string, Set<string>> = {
    skills: new Set(data.skills.map((s) => s.id)),
    domains: new Set(data.domains.map((d) => d.id)),
    field_deployments: new Set(data.field_deployments.map((fd) => fd.id)),
    employment: new Set(data.employment.map((e) => e.id)),
    languages: new Set(data.languages.map((l) => l.id)),
    courses: new Set(data.courses.map((c) => c.id)),
  };

  let total_errors = 0;

  for (const { parent, slug } of entries) {
    let sub: SubVariantManifest;
    try {
      sub = load_sub_variant(parent, slug);
    } catch (err) {
      console.error(`FAIL  ${parent}/${slug} - could not load: ${err}`);
      total_errors++;
      continue;
    }

    const errors = validate(parent, slug, sub, valid_variants, master_ids);
    if (errors.length === 0) {
      console.log(`PASS  ${parent}/${slug}`);
    } else {
      for (const error of errors) {
        console.error(`FAIL  ${parent}/${slug} - ${error.message}`);
      }
      total_errors += errors.length;
    }
  }

  console.log(`\n${entries.length} sub-variant(s) checked, ${total_errors} error(s).`);
  if (total_errors > 0) {
    process.exit(1);
  }
}

main();
