import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  list_variants,
  list_sub_variants,
  load_sub_variant,
  load_variant,
  load_resume_data,
  resolve_resume,
  resolve_sub_variant,
  has_active_cover_letter,
} from "../src/lib/data.js";
import type { ResolvedResume } from "../src/lib/types.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";

interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
}

interface PdfTarget {
  url: string;
  output_path: string;
  label: string;
  metadata?: PdfMetadata;
}

function build_metadata(resolved: ResolvedResume): PdfMetadata {
  const name = resolved.profile.name;
  return {
    title: `${name} - ${resolved.title}`,
    author: name,
    subject: resolved.summary.slice(0, 200),
    keywords: resolved.skills.map((s) => s.name).join(", "),
  };
}

async function set_pdf_metadata(path: string, metadata: PdfMetadata): Promise<void> {
  const bytes = readFileSync(path);
  const doc = await PDFDocument.load(bytes);
  if (metadata.title) doc.setTitle(metadata.title);
  if (metadata.author) doc.setAuthor(metadata.author);
  if (metadata.subject) doc.setSubject(metadata.subject);
  if (metadata.keywords) doc.setKeywords([metadata.keywords]);
  const updated = await doc.save();
  writeFileSync(path, updated);
}

async function generate_pdf(): Promise<void> {
  const data = load_resume_data();
  const targets: PdfTarget[] = [];

  for (const variant_name of list_variants()) {
    const variant = load_variant(variant_name);
    const resolved = resolve_resume(data, variant);
    targets.push({
      url: `${BASE_URL}/${variant_name}`,
      output_path: resolve("build", `${variant_name}.pdf`),
      label: variant_name,
      metadata: build_metadata(resolved),
    });
  }

  for (const { parent, slug } of list_sub_variants()) {
    const sub = load_sub_variant(parent, slug);
    const parent_variant = load_variant(parent);
    const resolved = resolve_sub_variant(data, parent_variant, sub);

    targets.push({
      url: `${BASE_URL}/${parent}/${slug}`,
      output_path: resolve("build", parent, `${slug}.pdf`),
      label: `${parent}/${slug}`,
      metadata: build_metadata(resolved),
    });

    if (has_active_cover_letter(sub)) {
      targets.push({
        url: `${BASE_URL}/${parent}/${slug}/letter`,
        output_path: resolve("build", parent, `${slug}-letter.pdf`),
        label: `${parent}/${slug}/letter`,
        metadata: { author: resolved.profile.name },
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

      if (target.metadata) {
        await set_pdf_metadata(target.output_path, target.metadata);
      }

      console.log(`PDF generated: ${target.output_path}`);
    }
  } finally {
    await browser.close();
  }
}

generate_pdf();
