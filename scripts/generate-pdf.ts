import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { list_variants, list_sub_variants, load_sub_variant, has_active_cover_letter } from "../src/lib/data.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";

interface PdfTarget {
  url: string;
  output_path: string;
  label: string;
}

async function generate_pdf(): Promise<void> {
  const targets: PdfTarget[] = [];

  for (const variant of list_variants()) {
    targets.push({
      url: `${BASE_URL}/${variant}`,
      output_path: resolve("build", `${variant}.pdf`),
      label: variant,
    });
  }

  for (const { parent, slug } of list_sub_variants()) {
    targets.push({
      url: `${BASE_URL}/${parent}/${slug}`,
      output_path: resolve("build", parent, `${slug}.pdf`),
      label: `${parent}/${slug}`,
    });

    const sub = load_sub_variant(parent, slug);
    if (has_active_cover_letter(sub)) {
      targets.push({
        url: `${BASE_URL}/${parent}/${slug}/letter`,
        output_path: resolve("build", parent, `${slug}-letter.pdf`),
        label: `${parent}/${slug}/letter`,
      });
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const target of targets) {
      mkdirSync(dirname(target.output_path), { recursive: true });

      const page = await browser.newPage();
      await page.setViewport({ width: 816, height: 1056 });
      await page.goto(target.url, { waitUntil: "networkidle0" });

      const content_height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );

      await page.pdf({
        path: target.output_path,
        width: "8.5in",
        height: `${content_height}px`,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
        printBackground: true,
      });
      await page.close();

      console.log(`PDF generated: ${target.output_path}`);
    }
  } finally {
    await browser.close();
  }
}

generate_pdf();
