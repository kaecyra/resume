import { env } from "$env/dynamic/public";

import { list_variants, load_resume_data, load_variant } from "$lib/data.js";
import { build_contribution_grid, load_github_contribution_data } from "$lib/github.js";
import { load_landing_data, validate_landing_data } from "$lib/landing.js";
import { load_pipeline_data, validate_pipeline_data } from "$lib/pipeline.js";
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

  // The "pipeline" section's content is its own document (#209): three
  // graphs, a terminal, a rack and two readouts, which would have swamped
  // landing.yaml's six other sections. Validated and thrown on separately
  // so the error names the file the mistake is actually in.
  const pipeline = load_pipeline_data();
  const pipeline_errors = validate_pipeline_data(pipeline);

  if (pipeline_errors.length > 0) {
    const messages = pipeline_errors.map((e) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`data/pipeline.yaml failed validation:\n${messages}`);
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
  // to the linked variant's own page (same name, same title, same tagline),
  // and two indexed URLs with identical metadata is a duplicate-content
  // signal. The landing page leads with the person and what they build
  // rather than the role pitch, so its title and description are sourced
  // from data/landing.yaml's hero (name, tagline) instead of the variant's
  // title and summary. The OG image itself does reuse the linked variant's
  // generated card (scripts/generate-og-images.ts renders one PNG per
  // variant via list_variants()), since the landing page has no OG image of
  // its own.
  const og = {
    ...build_og_metadata(
      landing.hero.name, landing.hero.role,
      landing.hero.tagline,
      base_url, landing.resume_links[0],
    ),
    title: landing.hero.name,
    url: canonical_url,
  };

  const person_jsonld = build_person_jsonld(data.profile, landing.hero.role, canonical_url);
  const webpage_jsonld = build_webpage_jsonld(og.title, og.description, canonical_url);

  // data/generated/github.json is gitignored and only exists when
  // `npm run fetch-github` has run with a token (CI, or a contributor's own
  // local run). Its absence - the normal case for a local build without
  // GITHUB_TOKEN - resolves to `null` here rather than throwing, so the
  // build still succeeds; whatever renders this is responsible for the
  // offline state (see src/lib/landing/Commits.svelte).
  const contribution_data = load_github_contribution_data();
  const contributions_grid = contribution_data ? build_contribution_grid(contribution_data) : null;

  return {
    landing,
    profile_name: data.profile.name,
    resume_title: variant.title,
    contributions_grid,
    pipeline,
    og,
    jsonld: { person: person_jsonld, webpage: webpage_jsonld },
  };
};
