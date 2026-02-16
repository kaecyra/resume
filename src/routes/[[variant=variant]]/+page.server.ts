import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

import { list_variants, load_resume_data, load_variant, resolve_resume } from "$lib/data.js";
import { strip_markdown } from "$lib/format.js";
import { build_person_jsonld, build_webpage_jsonld } from "$lib/seo.js";
import { get_theme_palette } from "$lib/theme-palettes.js";

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

  const base_url = env.PUBLIC_BASE_URL ?? "";
  const og_title = `${resume.profile.name} - ${resume.title}`;
  const og_description = strip_markdown(resume.tagline ?? resume.summary).slice(0, 200);
  const og_image = `${base_url}/og/${variant_name}.png`;
  const og_url = base_url
    ? (variant_name === "default" ? base_url : `${base_url}/${variant_name}`)
    : null;

  const person_jsonld = build_person_jsonld(resume.profile, resume.title, og_url);
  const webpage_jsonld = build_webpage_jsonld(og_title, og_description, og_url);
  const theme_color = get_theme_palette(resume.theme).background;

  return {
    resume,
    og: { title: og_title, description: og_description, image: og_image, url: og_url },
    jsonld: { person: person_jsonld, webpage: webpage_jsonld },
    theme_color,
  };
};
