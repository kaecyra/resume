import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import puppeteer from "puppeteer";

import { list_variants } from "../src/lib/data.js";
import { LANDING_OG_SLUG } from "../src/lib/seo.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// The site root's card first, then one per resume variant. The root's is a
// route (`/og/landing`) rather than a variant, so it is prepended here
// instead of coming out of list_variants(); LANDING_OG_SLUG is what the root
// page's og:image points at, so the name is shared rather than typed twice.
//
// Exported and pure so the list is testable without launching a browser: the
// root page's half of that contract is pinned by page-server.test.ts, and
// dropping the prepend here would otherwise leave og:image pointing at a PNG
// nothing writes, with every check still green.
export function og_card_slugs(): string[] {
  return [LANDING_OG_SLUG, ...list_variants()];
}

async function generate_og_images(): Promise<void> {
  const cards = og_card_slugs();
  const output_dir = resolve("build", "og");
  mkdirSync(output_dir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    for (const card of cards) {
      const url = `${BASE_URL}/og/${card}`;
      const output_path = resolve(output_dir, `${card}.png`);

      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (req.url().startsWith(BASE_URL) || req.url().startsWith("data:")) {
          req.continue();
        } else {
          req.abort();
        }
      });
      await page.setViewport({ width: 1200, height: 630 });
      await page.goto(url, { waitUntil: "load" });
      // The cards are set in faces served from this origin
      // (src/routes/og/+layout.svelte), and `load` does not wait for a font
      // the CSS only asks for once it is parsed. Without this the screenshot
      // can catch the block period and render nothing where the name goes.
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await delay(500);
      await page.screenshot({ path: output_path, type: "png" });
      await page.close();

      console.log(`OG image generated: ${output_path}`);
    }
  } finally {
    await browser.close();
  }
}

// Guards the side-effecting entry point the way build-geo.ts does, so
// importing this module - from generate-og-images.test.ts, or transitively -
// never launches a browser. Matches the shape this script runs under:
// `tsx scripts/generate-og-images.ts` (npm run generate-og).
if (process.argv[1]?.endsWith("generate-og-images.ts")) {
  generate_og_images().catch((err) => {
    console.error("Failed to generate OG images:", err);
    process.exit(1);
  });
}
