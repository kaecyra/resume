import { list_sub_variants, load_sub_variant, load_resume_data, load_variant, list_variants } from "../src/lib/data.js";
import { validate_sub_variant, build_master_ids } from "../src/lib/validate.js";

import type { SubVariantManifest, VariantManifest } from "../src/lib/types.js";

function main(): void {
  const entries = list_sub_variants();
  if (entries.length === 0) {
    console.log("No sub-variants found.");
    return;
  }

  const data = load_resume_data();
  const valid_variants = list_variants();
  const master_ids = build_master_ids(data);

  const parent_cache = new Map<string, VariantManifest>();
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

    if (!parent_cache.has(parent)) {
      parent_cache.set(parent, load_variant(parent));
    }
    const parent_variant = parent_cache.get(parent)!;

    const errors = validate_sub_variant(parent, slug, sub, valid_variants, master_ids, parent_variant);
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
