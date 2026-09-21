import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

import { list_variants, load_resume_data, load_variant, resolve_resume } from "$lib/data.js";
import { load_landing_data } from "$lib/landing.js";
import { generate_qr_svg } from "$lib/qr.js";
import {
  build_document_title,
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
  return list_variants().map((v) => ({ variant: v }));
};

export const load: PageServerLoad = async ({ params }) => {
  const variant_name = params.variant;

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

  // Every variant is one career history told for a different audience, so
  // they all canonical to a single one of them (#237) rather than competing
  // with each other in the index. This is not og.url, and must not become
  // it: og.url is the page's own address, and it is what the QR code above
  // encodes - a reader scanning the code on a printed cto-b resume has to
  // arrive at cto-b, not at whichever variant is canonical.
  const canonical_url = build_variant_canonical_url(base_url);
  const document_title = build_document_title(resume.profile.name, resume.title);

  const person_jsonld = build_person_jsonld(
    resume.profile, resume.title, canonical_url,
    build_person_context(load_landing_data(), resume.skills),
  );
  // ProfilePage.url is this page, not the canonical one: schema.org's "URL
  // of the item", and the item is the document the block is embedded in.
  // Consolidation is the <link rel="canonical"> tag's job. person.url above
  // is the opposite case - the person has one page, and it is the canonical
  // resume.
  const profile_page_jsonld = build_profile_page_jsonld(
    document_title, og.description, og.url, person_jsonld,
  );
  const theme_color = palette.background;

  return {
    resume,
    variant_name,
    palette,
    og,
    canonical_url,
    document_title,
    jsonld: { profile_page: profile_page_jsonld },
    theme_color,
  };
};
