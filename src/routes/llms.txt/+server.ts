import { env } from "$env/dynamic/public";

import { list_variants, load_variant } from "$lib/data.js";
import { load_landing_data } from "$lib/landing.js";
import { build_llms_txt } from "$lib/seo.js";

export const prerender = true;

export function GET() {
  const base_url = env.PUBLIC_BASE_URL ?? "";
  const landing = load_landing_data();

  const variants = list_variants().map((slug) => {
    const variant = load_variant(slug);
    return { slug, title: variant.title, summary: variant.summary };
  });

  // The email lives in the landing contact block as a mailto: link, which
  // is also where the page itself reads it from - not lifted out of
  // data/resume.yaml, whose address can be REDACTED in a fork.
  const mailto = landing.contact.find((link) => link.url.startsWith("mailto:"));
  const email = mailto?.url.slice("mailto:".length);

  const text = build_llms_txt({
    hero: landing.hero,
    base_url,
    email,
    links: landing.contact,
    variants,
  });

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
