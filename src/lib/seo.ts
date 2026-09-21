import { list_variants } from "./data.js";
import { strip_markdown } from "./format.js";
import { split_role_badge } from "./landing/hero-format.js";

import type { LandingData, LandingHero, LandingLink, Profile, Skill } from "./types.js";

// Every public variant is the same career history told for a different
// audience, so the six of them used to sit in the sitemap self-canonicalled
// and compete with each other for one person's name (#237). They all point
// here instead, and this is the only variant the sitemap offers. The
// variants stay reachable, linkable and shareable - canonical consolidates
// the indexing signal, it does not gate access.
export const CANONICAL_VARIANT = "default";

// Appended to document titles (not to og:title - see the comment on the
// landing page's head). A proxy or crawler reading a page whose title is a
// person's name and whose h1 is the same name has been handed every signal
// for "personal profile" and none for "career document"; this is the word
// that distinguishes the two.
const RESUME_TITLE_SUFFIX = " | Resume";

// Joins a name to a role in a document title. og:title keeps its own hyphen
// (see build_og_metadata) - that one is share-card copy, not a page title.
const TITLE_SEPARATOR = " \u2014 ";

// Shared by every meta description this module builds, matching what the
// major engines actually render.
const DESCRIPTION_LIMIT = 200;

export function build_sitemap_urls(base_url: string): string[] {
  if (!list_variants().includes(CANONICAL_VARIANT)) {
    throw new Error(
      `sitemap cannot be built: the canonical variant (${CANONICAL_VARIANT}) does not exist`,
    );
  }

  const landing_url = base_url || "/";
  const canonical_url = base_url ? `${base_url}/${CANONICAL_VARIANT}` : `/${CANONICAL_VARIANT}`;

  return [landing_url, canonical_url];
}

// The canonical URL for any variant page, which is the canonical variant's
// own URL whichever variant is rendering. Deliberately separate from
// OgMetadata.url: og:url is the page's own address, and the variant route
// also feeds that value to generate_qr_svg and resume.online_url, where
// substituting the canonical would print a QR code that sends the reader to
// a different resume than the one in their hand.
export function build_variant_canonical_url(base_url: string): string | null {
  if (!base_url) {
    return null;
  }

  return `${base_url}/${CANONICAL_VARIANT}`;
}

// hero.role carries the employer after a comma ("VP Engineering, .Monks").
// split_role_badge is the hero's own tested splitter - reused rather than
// re-parsed here, and rather than adding a second YAML field that could
// drift from the string the page actually renders. Exported because the
// landing route needs the role half on its own: passing the whole string as
// a jobTitle publishes an Occupation named "VP Engineering, .Monks" beside
// an Organization named ".Monks", which states the employer twice and names
// no occupation.
export function split_hero_role(hero: LandingHero): { role: string; employer: string } {
  const { tag, label } = split_role_badge(hero.role);
  return { role: tag, employer: label };
}

export function build_landing_title(hero: LandingHero): string {
  const { role } = split_hero_role(hero);
  return `${hero.name} — ${role}${RESUME_TITLE_SUFFIX}`;
}

// The document title for a variant page, built from its parts rather than
// by suffixing og:title: og:title joins with a hyphen and keeps doing so
// for the share card, while every document title on the site joins with an
// em dash, landing page included. Suffixing og:title would have made the
// two page families read differently in the same search results.
export function build_document_title(name: string, title: string): string {
  return `${name}${TITLE_SEPARATOR}${title}${RESUME_TITLE_SUFFIX}`;
}

export function build_landing_description(hero: LandingHero): string {
  const { role, employer } = split_hero_role(hero);

  let subject = `${hero.name}, ${role}`;
  if (employer) {
    subject += ` at ${employer}`;
  }
  if (hero.location) {
    subject += ` in ${hero.location}`;
  }

  return `Resume of ${subject}. ${strip_markdown(hero.tagline)}`.slice(0, DESCRIPTION_LIMIT);
}

export interface OrganizationJsonLd {
  "@type": "Organization";
  name: string;
}

export interface OccupationJsonLd {
  "@type": "Occupation";
  name: string;
}

export interface PersonJsonLd {
  "@context": "https://schema.org";
  "@type": "Person";
  name: string;
  url?: string;
  jobTitle: string;
  hasOccupation: OccupationJsonLd;
  worksFor?: OrganizationJsonLd;
  knowsAbout?: string[];
  address?: { "@type": "PostalAddress"; addressLocality: string };
  email?: string;
  sameAs?: string[];
}

// The parts of the Person that do not live on Profile: the employer split
// out of the landing hero's role, the GitHub handle from the landing
// contact block, and the skill names from the resume. Optional throughout -
// a caller that has none of them still produces a valid Person.
export interface PersonContext {
  employer?: string | null;
  github_user?: string | null;
  skills?: string[];
}

// Composes the non-Profile half of the Person schema from the two files
// that hold it: the landing hero (employer, split out of the role string)
// and the landing contact block (GitHub handle), plus whichever skill list
// the calling page resolved - the whole set for the landing page, the
// variant's own subset for a variant page.
export function build_person_context(landing: LandingData, skills: Skill[]): PersonContext {
  const { employer } = split_hero_role(landing.hero);

  return {
    employer: employer || null,
    github_user: landing.github?.user ?? null,
    skills: skills.map((skill) => skill.name),
  };
}

export function build_person_jsonld(
  profile: Profile,
  job_title: string,
  base_url: string | null,
  context: PersonContext = {},
): PersonJsonLd {
  const person: PersonJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: job_title,
    hasOccupation: { "@type": "Occupation", name: job_title },
  };

  if (base_url) {
    person.url = base_url;
  }

  if (context.employer) {
    person.worksFor = { "@type": "Organization", name: context.employer };
  }

  if (context.skills && context.skills.length > 0) {
    person.knowsAbout = context.skills;
  }

  if (profile.contact.location) {
    person.address = {
      "@type": "PostalAddress",
      addressLocality: profile.contact.location,
    };
  }

  if (profile.contact.email && !profile.contact.email.includes("REDACTED")) {
    person.email = profile.contact.email;
  }

  const same_as: string[] = [];
  if (profile.contact.linkedin) {
    same_as.push(`https://${profile.contact.linkedin}`);
  }
  if (context.github_user) {
    same_as.push(`https://github.com/${context.github_user}`);
  }
  if (same_as.length > 0) {
    person.sameAs = same_as;
  }

  return person;
}

export interface ProfilePageJsonLd {
  "@context": "https://schema.org";
  "@type": "ProfilePage";
  name: string;
  description: string;
  url?: string;
  mainEntity: PersonJsonLd;
}

// ProfilePage rather than the bare WebPage this replaced: it is the type
// that tells a consumer the page is *about* the person nested in
// mainEntity, which is what an answer engine needs to quote the resume as a
// statement about someone rather than as unattributed page text. The nested
// Person keeps its own @context - repeating it is legal JSON-LD, and
// stripping it would mean one builder returning two shapes.
export function build_profile_page_jsonld(
  title: string,
  description: string,
  url: string | null,
  person: PersonJsonLd,
): ProfilePageJsonLd {
  const page: ProfilePageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: title,
    description,
    mainEntity: person,
  };

  if (url) {
    page.url = url;
  }

  return page;
}

// The site root's own OG card (src/routes/og/landing), which is neither a
// resume variant nor named after one. Shared so the meta tag the root page
// emits and the PNG scripts/generate-og-images.ts writes cannot drift apart
// into a card that exists and a card nothing points at.
export const LANDING_OG_SLUG = "landing";

export interface OgMetadata {
  title: string;
  description: string;
  image: string;
  url: string | null;
}

export function build_og_metadata(
  profile_name: string,
  resume_title: string,
  tagline_or_summary: string,
  base_url: string,
  image_variant: string,
  url_variant?: string,
): OgMetadata {
  let url: string | null = null;
  if (url_variant !== undefined && base_url) {
    url = `${base_url}/${url_variant}`;
  }

  return {
    title: `${profile_name} - ${resume_title}`,
    description: strip_markdown(tagline_or_summary).slice(0, DESCRIPTION_LIMIT),
    image: `${base_url}/og/${image_variant}.png`,
    url,
  };
}

export interface LlmsTxtVariant {
  slug: string;
  title: string;
  summary: string;
}

export interface LlmsTxtInput {
  hero: LandingHero;
  base_url: string;
  email?: string;
  links: LandingLink[];
  variants: LlmsTxtVariant[];
}

// /llms.txt: the same facts the pages carry, in the one flat text file an
// answer engine can read without executing anything. Built from the same
// YAML the pages read (see src/routes/llms.txt/+server.ts) so it cannot
// drift out of agreement with them the way a hand-written copy would.
export function build_llms_txt(input: LlmsTxtInput): string {
  const { hero, base_url, email, links, variants } = input;
  const url = (path: string) => (base_url ? `${base_url}/${path}` : `/${path}`);
  // strip_markdown collapses whitespace, which is what keeps a multi-line
  // YAML summary from ending its own list item mid-bullet. Not truncated
  // the way a meta description is: nothing renders this in a fixed box, and
  // a summary cut mid-word is worse to quote than a long one.
  const blurb = strip_markdown;

  const canonical = variants.find((variant) => variant.slug === CANONICAL_VARIANT);
  const others = variants.filter((variant) => variant.slug !== CANONICAL_VARIANT);

  const lines: string[] = [
    `# ${build_landing_title(hero)}`,
    "",
    `> ${build_landing_description(hero)}`,
    "",
    "## Resume",
    "",
  ];

  if (canonical) {
    lines.push(
      `- [${canonical.title}](${url(CANONICAL_VARIANT)}): the canonical resume. ${blurb(canonical.summary)}`,
      `- [PDF](${url(`${CANONICAL_VARIANT}.pdf`)}): the same resume as a download.`,
    );
  }

  if (others.length > 0) {
    lines.push("", "## Other framings", "");
    lines.push(
      "The same career history written for a different audience. All canonical to the resume above.",
      "",
    );
    for (const variant of others) {
      lines.push(`- [${variant.title}](${url(variant.slug)}): ${blurb(variant.summary)}`);
    }
  }

  lines.push("", "## Contact", "");
  if (email) {
    lines.push(`- Email: ${email}`);
  }
  for (const link of links) {
    if (link.url.startsWith("mailto:")) {
      continue;
    }
    lines.push(`- ${link.label}: ${link.url}`);
  }

  return `${lines.join("\n")}\n`;
}
