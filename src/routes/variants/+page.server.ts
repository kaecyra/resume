import {
  has_active_cover_letter,
  list_sub_variants,
  list_variants,
  load_sub_variant,
  load_variant,
} from "$lib/data.js";

import type { PageServerLoad } from "./$types";

export const prerender = true;

interface VariantRow {
  name: string;
  title: string;
}

interface DashboardRow {
  parent: string;
  slug: string;
  company: string;
  title: string;
  job_url: string;
  fetched_at: string;
  has_letter: boolean;
}

export const load: PageServerLoad = () => {
  const variant_rows: VariantRow[] = list_variants().map((name) => {
    const variant = load_variant(name);
    return { name, title: variant.title };
  });

  const rows: DashboardRow[] = list_sub_variants().map((entry) => {
    const sub = load_sub_variant(entry.parent, entry.slug);
    return {
      parent: entry.parent,
      slug: entry.slug,
      company: sub.job.company,
      title: sub.job.title,
      job_url: sub.job.url,
      fetched_at: sub.job.fetched_at,
      has_letter: has_active_cover_letter(sub),
    };
  });

  rows.sort((a, b) => b.fetched_at.localeCompare(a.fetched_at));

  return { variant_rows, rows };
};
