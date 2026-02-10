import puppeteer from "puppeteer";
import { resolve } from "node:path";

import { list_variants } from "../src/lib/data.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";

async function generate_pdf(): Promise<void> {
  const variants = list_variants();
  const browser = await puppeteer.launch({ headless: true });

  try {
    for (const variant of variants) {
      const url = `${BASE_URL}/${variant}`;
      const output_path = resolve("build", `${variant}.pdf`);

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle0" });
      await page.pdf({
        path: output_path,
        format: "Letter",
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
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
