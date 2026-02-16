import { error } from "@sveltejs/kit";

import { list_variants, load_resume_data, load_variant, resolve_resume } from "$lib/data.js";
import { get_theme_palette } from "$lib/theme-palettes.js";

import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const variants = list_variants();
  return variants.map((v) => ({ variant: v }));
};

export const load: PageServerLoad = ({ params }) => {
  const variant_name = params.variant;

  let variant;
  try {
    variant = load_variant(variant_name);
  } catch {
    error(404, "Variant not found");
  }

  const data = load_resume_data();
  const resume = resolve_resume(data, variant);
  const palette = get_theme_palette(resume.theme);

  return { resume, palette };
};
