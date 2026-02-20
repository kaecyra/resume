import {
  has_active_cover_letter,
  list_sub_variants,
  load_sub_variant,
} from "$lib/data.js";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const entries = () => [{}];

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

  return { rows };
};
