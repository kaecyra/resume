import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import puppeteer from "puppeteer";

async function generate_apple_touch_icon(): Promise<void> {
  const svg_path = resolve("static", "favicon.svg");
  const svg_content = readFileSync(svg_path, "utf-8");
  const output_path = resolve("build", "apple-touch-icon.png");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 180, height: 180 });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body { width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
            svg { width: 140px; height: 140px; }
          </style>
        </head>
        <body>${svg_content}</body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.screenshot({ path: output_path, type: "png" });
    await page.close();

    console.log(`Apple touch icon generated: ${output_path}`);
  } finally {
    await browser.close();
  }
}

generate_apple_touch_icon();
