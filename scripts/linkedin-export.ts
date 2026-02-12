import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { list_variants, load_resume_data, load_variant, resolve_resume } from "../src/lib/data.js";
import {
  format_headline,
  format_about,
  format_experience,
  format_skills,
  format_certifications,
  format_languages,
  render_section,
} from "../src/lib/linkedin.js";

async function linkedin_export(): Promise<void> {
  const variants = list_variants();

  if (variants.length === 0) {
    console.log("No variants found.");
    return;
  }

  console.log("\nAvailable variants:\n");
  for (let i = 0; i < variants.length; i++) {
    console.log(`  ${i + 1}. ${variants[i]}`);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`\nSelect a variant (1-${variants.length}): `);
    const index = parseInt(answer, 10) - 1;

    if (isNaN(index) || index < 0 || index >= variants.length) {
      console.log("Invalid selection.");
      return;
    }

    const variant_name = variants[index];
    const data = load_resume_data();
    const variant = load_variant(variant_name);
    const resume = resolve_resume(data, variant);

    console.log(`\nLinkedIn content for variant: ${variant_name}\n`);

    const sections = [
      format_headline(resume.title, resume.tagline),
      format_about(resume.summary),
      format_experience(resume.employment),
      format_skills(resume.skills),
      format_certifications(resume.courses),
      format_languages(resume.languages),
    ];

    for (const section of sections) {
      console.log(render_section(section));
      console.log("");
    }
  } finally {
    rl.close();
  }
}

linkedin_export();
