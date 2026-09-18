import { env } from "$env/dynamic/public";

import { list_variants, load_resume_data, load_variant } from "$lib/data.js";
import { load_landing_data, validate_landing_data } from "$lib/landing.js";
import { build_og_metadata, build_person_jsonld, build_webpage_jsonld } from "$lib/seo.js";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const landing = load_landing_data();
  const errors = validate_landing_data(landing, list_variants());

  if (errors.length > 0) {
    const messages = errors.map((e) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`data/landing.yaml failed validation:\n${messages}`);
  }

  const data = load_resume_data();
  // The CTA links to this variant (validate_landing_data enforces exactly
  // one entry in resume_links), so its title is what the PDF download
  // filename uses below - the same title the variant route itself uses for
  // that file, not the landing hero's role.
  const variant = load_variant(landing.resume_links[0]);

  const base_url = env.PUBLIC_BASE_URL ?? "";
  const canonical_url = base_url || null;

  // build_og_metadata is called without url_variant, so its url is always
  // null; the landing page is not a variant route, so we supply its own
  // canonical url (the bare site root) here instead. Title and description
  // are overridden too: build_og_metadata's defaults would be byte-identical
  // to the /default variant page (same name, same title, same tagline), and
  // two indexed URLs with identical metadata is a duplicate-content signal.
  // The landing page leads with the person and what they build rather than
  // the CTO role pitch, so its title and description are sourced from
  // data/landing.yaml's hero (name, tagline) instead of the /default
  // variant's title and summary.
  const og = {
    ...build_og_metadata(
      landing.hero.name, landing.hero.role,
      landing.hero.tagline,
      base_url, "default",
    ),
    title: landing.hero.name,
    url: canonical_url,
  };

  const person_jsonld = build_person_jsonld(data.profile, landing.hero.role, canonical_url);
  const webpage_jsonld = build_webpage_jsonld(og.title, og.description, canonical_url);

  return {
    landing,
    profile_name: data.profile.name,
    resume_title: variant.title,
    og,
    jsonld: { person: person_jsonld, webpage: webpage_jsonld },
  };
};
