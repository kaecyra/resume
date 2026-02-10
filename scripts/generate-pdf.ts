import puppeteer from "puppeteer";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";
const OUTPUT_PATH = resolve("build", "resume.pdf");

async function generate_pdf(): Promise<void> {
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await page.pdf({
      path: OUTPUT_PATH,
      format: "Letter",
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      printBackground: true,
    });

    console.log(`PDF generated: ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

generate_pdf();
