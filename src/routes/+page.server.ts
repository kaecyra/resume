import { env } from "$env/dynamic/public";

import { load_resume_data, load_variant } from "$lib/data.js";
import { build_og_metadata, build_person_jsonld, build_webpage_jsonld } from "$lib/seo.js";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const data = load_resume_data();
  const variant = load_variant("default");

  const base_url = env.PUBLIC_BASE_URL ?? "";
  const canonical_url = base_url || null;

  const default_og = build_og_metadata(
    data.profile.name, variant.title,
    variant.tagline ?? variant.summary,
    base_url, "default",
  );
  const og = { ...default_og, url: canonical_url };

  const person_jsonld = build_person_jsonld(data.profile, variant.title, canonical_url);
  const webpage_jsonld = build_webpage_jsonld(og.title, og.description, canonical_url);

  return {
    profile: data.profile,
    title: variant.title,
    tagline: variant.tagline,
    summary: variant.summary,
    og,
    jsonld: { person: person_jsonld, webpage: webpage_jsonld },
  };
};
