import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

import {
  list_sub_variants,
  load_and_resolve_sub_variant,
  load_sub_variant,
  load_variant,
} from "$lib/data.js";
import { load_landing_data } from "$lib/landing.js";
import { generate_qr_svg } from "$lib/qr.js";
import {
  build_og_metadata,
  build_person_context,
  build_person_jsonld,
  build_profile_page_jsonld,
  build_variant_canonical_url,
} from "$lib/seo.js";
import { get_theme_palette } from "$lib/theme-palettes.js";

import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return list_sub_variants().map((entry) => ({
    variant: entry.parent,
    subvariant: entry.slug,
  }));
};

export const load: PageServerLoad = async ({ params }) => {
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
    base_url, parent, variant_name,
  );

  const sub_variant = load_sub_variant(parent, slug);
  const parent_variant = load_variant(parent);
  const palette = get_theme_palette(parent_variant.theme);

  if (resume.online_callout && og.url) {
    resume.online_url = og.url;
    resume.online_qr_svg = await generate_qr_svg(og.url, palette.accent);
  }

  // No canonical tag and no resume-suffixed title here: sub-variants are
  // noindex, nofollow (see +page.svelte), so nothing about them is an
  // indexing decision. The Person still points at the canonical resume,
  // the same value every other route gives it - one person, one page, and
  // never this one, which is explicitly withheld from the index.
  const person_jsonld = build_person_jsonld(
    resume.profile, resume.title, build_variant_canonical_url(base_url),
    build_person_context(load_landing_data(), resume.skills),
  );
  const profile_page_jsonld = build_profile_page_jsonld(
    og.title, og.description, og.url, person_jsonld,
  );
  const theme_color = palette.background;

  return {
    resume,
    variant_name,
    variant_parent: parent,
    variant_slug: slug,
    job_url: sub_variant.job.url,
    job_company: sub_variant.job.company,
    job_title: sub_variant.job.title,
    palette,
    og,
    jsonld: { profile_page: profile_page_jsonld },
    theme_color,
  };
};
