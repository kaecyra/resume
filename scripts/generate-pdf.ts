import puppeteer from "puppeteer";
import { resolve } from "node:path";

import { list_variants } from "../src/lib/data.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";

async function generate_pdf(): Promise<void> {
  const variants = list_variants();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const variant of variants) {
      const url = `${BASE_URL}/${variant}`;
      const output_path = resolve("build", `${variant}.pdf`);

      const page = await browser.newPage();
      await page.setViewport({ width: 816, height: 1056 });
      await page.goto(url, { waitUntil: "networkidle0" });

      const content_height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );

      await page.pdf({
        path: output_path,
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

      console.log(`PDF generated: ${output_path}`);
    }
  } finally {
    await browser.close();
  }
}

generate_pdf();
