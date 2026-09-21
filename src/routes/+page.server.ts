import { env } from "$env/dynamic/public";

import { list_variants, load_resume_data, load_variant } from "$lib/data.js";
import { build_contribution_grid, load_github_contribution_data } from "$lib/github.js";
import { load_landing_data, validate_landing_data } from "$lib/landing.js";
import { load_pipeline_data, validate_pipeline_data } from "$lib/pipeline.js";
import {
  build_landing_description,
  build_landing_title,
  build_og_metadata,
  build_person_context,
  build_person_jsonld,
  build_profile_page_jsonld,
  LANDING_OG_SLUG,
  split_hero_role,
} from "$lib/seo.js";

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
  // title and summary. The image is its own for the same reason: the
  // landing page used to borrow the linked variant's card, which is the
  // headshot-and-title layout every variant page shares and looks nothing
  // like this page. LANDING_OG_SLUG names the card built from the hero's
  // own frame instead (src/routes/og/landing), which is also the PNG
  // scripts/generate-og-images.ts writes alongside the per-variant ones.
  const og = {
    ...build_og_metadata(
      landing.hero.name, landing.hero.role,
      landing.hero.tagline,
      base_url, LANDING_OG_SLUG,
    ),
    title: landing.hero.name,
    description: build_landing_description(landing.hero),
    url: canonical_url,
  };

  // The document title and og:title deliberately differ (#237). The tab,
  // the search result and any proxy classifying this page by its title all
  // read document_title, which names the role and the word "resume" - a
  // page whose title is only a person's name reads as a personal profile,
  // which is how the site came to be blocked as social media in the first
  // place. og:title stays the bare name because the OG card (#233) already
  // renders the name and the role badge as artwork, and a feed thumbnail
  // repeating them in its caption is noise.
  const document_title = build_landing_title(landing.hero);

  // The role half of hero.role, not the whole string: the employer belongs
  // in worksFor (build_person_context puts it there), and an Occupation
  // named "VP Engineering, .Monks" beside an Organization named ".Monks"
  // states the employer twice and names no occupation.
  const person_jsonld = build_person_jsonld(
    data.profile, split_hero_role(landing.hero).role, canonical_url,
    build_person_context(landing, data.skills),
  );
  const profile_page_jsonld = build_profile_page_jsonld(
    document_title, og.description, canonical_url, person_jsonld,
  );

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
    document_title,
    jsonld: { profile_page: profile_page_jsonld },
  };
};
