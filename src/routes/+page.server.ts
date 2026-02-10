import { load_resume_data, load_variant, resolve_resume } from "$lib/data.js";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const data = load_resume_data();
  const variant = load_variant("default");
  const resume = resolve_resume(data, variant);

  return { resume };
};
