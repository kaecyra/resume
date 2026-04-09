import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import puppeteer from "puppeteer";

import { list_variants } from "../src/lib/data.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generate_og_images(): Promise<void> {
  const variants = list_variants();
  const output_dir = resolve("build", "og");
  mkdirSync(output_dir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    for (const variant of variants) {
      const url = `${BASE_URL}/og/${variant}`;
      const output_path = resolve(output_dir, `${variant}.png`);

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
      await delay(500);
      await page.screenshot({ path: output_path, type: "png" });
      await page.close();

      console.log(`OG image generated: ${output_path}`);
    }
  } finally {
    await browser.close();
  }
}

generate_og_images().catch((err) => {
  console.error("Failed to generate OG images:", err);
  process.exit(1);
});
