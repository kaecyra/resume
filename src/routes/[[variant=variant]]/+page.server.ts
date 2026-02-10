import { error } from "@sveltejs/kit";

import { list_variants, load_resume_data, load_variant, resolve_resume } from "$lib/data.js";

import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const variants = list_variants();
  return [
    { variant: undefined },
    ...variants.map((v) => ({ variant: v })),
  ];
};

export const load: PageServerLoad = ({ params }) => {
  const variant_name = params.variant ?? "default";

  let variant;
  try {
    variant = load_variant(variant_name);
  } catch {
    error(404, "Variant not found");
  }

  const data = load_resume_data();
  const resume = resolve_resume(data, variant);

  return { resume };
};
