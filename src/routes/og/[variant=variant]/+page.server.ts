import { error } from "@sveltejs/kit";

import { list_variants, load_resume_data, load_variant, resolve_resume } from "$lib/data.js";

import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

const THEME_PALETTES: Record<string, {
  background: string;
  accent: string;
  text: string;
  secondary: string;
}> = {
  "retro-technical": {
    background: "#1a2744",
    accent: "#e87a2e",
    text: "#f0e6d6",
    secondary: "#8b9bb5",
  },
  classic: {
    background: "#ffffff",
    accent: "#374151",
    text: "#111827",
    secondary: "#4b5563",
  },
  "product-manual": {
    background: "#f5f0e8",
    accent: "#c4412b",
    text: "#292524",
    secondary: "#57534e",
  },
};

export const entries: EntryGenerator = () => {
  const variants = list_variants();
  return variants.map((v) => ({ variant: v }));
};

export const load: PageServerLoad = ({ params }) => {
  const variant_name = params.variant;

  let variant;
  try {
    variant = load_variant(variant_name);
  } catch {
    error(404, "Variant not found");
  }

  const data = load_resume_data();
  const resume = resolve_resume(data, variant);
  const palette = THEME_PALETTES[resume.theme] ?? THEME_PALETTES["classic"];

  return { resume, palette };
};
