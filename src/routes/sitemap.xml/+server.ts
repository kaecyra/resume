import { env } from "$env/dynamic/public";

import { build_variant_urls } from "$lib/seo.js";

export const prerender = true;

export function GET() {
  const base_url = env.PUBLIC_BASE_URL ?? "";
  const urls = build_variant_urls(base_url);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
