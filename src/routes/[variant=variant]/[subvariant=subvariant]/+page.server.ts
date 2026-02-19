import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

import {
  list_sub_variants,
  load_and_resolve_sub_variant,
  load_sub_variant,
  load_variant,
} from "$lib/data.js";
import { build_og_metadata, build_person_jsonld, build_webpage_jsonld } from "$lib/seo.js";
import { get_theme_palette } from "$lib/theme-palettes.js";

import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return list_sub_variants().map((entry) => ({
    variant: entry.parent,
    subvariant: entry.slug,
  }));
};

export const load: PageServerLoad = ({ params }) => {
  const { variant: parent, subvariant: slug } = params;

  let resume;
  try {
    resume = load_and_resolve_sub_variant(parent, slug);
  } catch {
    error(404, "Sub-variant not found");
  }

  const variant_name = `${parent}/${slug}`;
  const base_url = env.PUBLIC_BASE_URL ?? "";
  const og = build_og_metadata(
    resume.profile.name, resume.title,
    resume.tagline ?? resume.summary,
    base_url, parent,
  );

  const person_jsonld = build_person_jsonld(resume.profile, resume.title, og.url);
  const webpage_jsonld = build_webpage_jsonld(og.title, og.description, og.url);

  const sub_variant = load_sub_variant(parent, slug);
  const parent_variant = load_variant(parent);
  const palette = get_theme_palette(parent_variant.theme);
  const theme_color = palette.background;

  return {
    resume,
    variant_name,
    job_url: sub_variant.job.url,
    palette,
    og,
    jsonld: { person: person_jsonld, webpage: webpage_jsonld },
    theme_color,
  };
};
