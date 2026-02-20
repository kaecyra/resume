import { error } from "@sveltejs/kit";

import {
  has_active_cover_letter,
  list_sub_variants,
  load_resume_data,
  load_sub_variant,
  load_variant,
} from "$lib/data.js";
import { get_theme_palette } from "$lib/theme-palettes.js";

import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return list_sub_variants()
    .filter((entry) => {
      const sub = load_sub_variant(entry.parent, entry.slug);
      return has_active_cover_letter(sub);
    })
    .map((entry) => ({
      variant: entry.parent,
      subvariant: entry.slug,
    }));
};

export const load: PageServerLoad = ({ params }) => {
  const { variant: parent, subvariant: slug } = params;

  let sub;
  try {
    sub = load_sub_variant(parent, slug);
  } catch {
    error(404, "Sub-variant not found");
  }

  if (!has_active_cover_letter(sub) || !sub.cover_letter) {
    error(404, "Cover letter not found");
  }

  const data = load_resume_data();
  const parent_variant = load_variant(parent);
  const palette = get_theme_palette(parent_variant.theme);

  return {
    profile: data.profile,
    job: sub.job,
    cover_letter: sub.cover_letter,
    variant_name: `${parent}/${slug}`,
    variant_parent: parent,
    variant_slug: slug,
    theme: parent_variant.theme,
    palette,
    theme_color: palette.background,
  };
};
