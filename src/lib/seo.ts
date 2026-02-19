import { list_variants } from "./data.js";
import { strip_markdown } from "./format.js";

import type { Profile } from "./types.js";

export function build_variant_urls(base_url: string): string[] {
  const variants = list_variants();
  const urls: string[] = [];

  for (const variant of variants) {
    if (variant === "default") {
      urls.push(base_url || "/");
    } else {
      urls.push(base_url ? `${base_url}/${variant}` : `/${variant}`);
    }
  }

  return urls;
}

export interface PersonJsonLd {
  "@context": "https://schema.org";
  "@type": "Person";
  name: string;
  url?: string;
  jobTitle: string;
  address?: { "@type": "PostalAddress"; addressLocality: string };
  email?: string;
  sameAs?: string[];
}

export function build_person_jsonld(
  profile: Profile,
  job_title: string,
  base_url: string | null,
): PersonJsonLd {
  const person: PersonJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: job_title,
  };

  if (base_url) {
    person.url = base_url;
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
  if (same_as.length > 0) {
    person.sameAs = same_as;
  }

  return person;
}

export interface WebPageJsonLd {
  "@context": "https://schema.org";
  "@type": "WebPage";
  name: string;
  description: string;
  url?: string;
}

export function build_webpage_jsonld(
  title: string,
  description: string,
  url: string | null,
): WebPageJsonLd {
  const page: WebPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
  };

  if (url) {
    page.url = url;
  }

  return page;
}

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
    url = url_variant === "default" ? base_url : `${base_url}/${url_variant}`;
  }

  return {
    title: `${profile_name} - ${resume_title}`,
    description: strip_markdown(tagline_or_summary).slice(0, 200),
    image: `${base_url}/og/${image_variant}.png`,
    url,
  };
}
