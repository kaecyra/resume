import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

import { list_variants, load_resume_data, load_variant, resolve_resume } from "$lib/data.js";
import { generate_qr_svg } from "$lib/qr.js";
import { build_og_metadata, build_person_jsonld, build_webpage_jsonld } from "$lib/seo.js";
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

export const load: PageServerLoad = async ({ params }) => {
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
  const og = build_og_metadata(
    resume.profile.name, resume.title,
    resume.tagline ?? resume.summary,
    base_url, variant_name, variant_name,
  );

  const palette = get_theme_palette(resume.theme);

  if (resume.online_callout && og.url) {
    resume.online_url = og.url;
    resume.online_qr_svg = await generate_qr_svg(og.url, palette.accent);
  }

  const person_jsonld = build_person_jsonld(resume.profile, resume.title, og.url);
  const webpage_jsonld = build_webpage_jsonld(og.title, og.description, og.url);
  const theme_color = palette.background;

  return {
    resume,
    variant_name,
    palette,
    og,
    jsonld: { person: person_jsonld, webpage: webpage_jsonld },
    theme_color,
  };
};
