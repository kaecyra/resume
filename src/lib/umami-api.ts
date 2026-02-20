export interface UmamiValueRow {
  value: string;
  total: number;
}

export interface SlugMetrics {
  resume_views: number;
  letter_views: number;
  pdf_downloads: number;
}

export type MetricsMap = Map<string, SlugMetrics>;

export type TimeRange = "7d" | "30d" | "all";

const MS_PER_DAY = 86_400_000;

export function compute_start_at(range: TimeRange, now: number): number {
  if (range === "all") return 0;
  const days = range === "7d" ? 7 : 30;
  return now - days * MS_PER_DAY;
}

interface RawCounts {
  resume_views: UmamiValueRow[];
  letter_views: UmamiValueRow[];
  pdf_downloads: UmamiValueRow[];
}

export async function fetch_slug_counts(
  website_id: string,
  start_at: number,
  end_at: number,
): Promise<RawCounts> {
  const base = `/api/umami/websites/${website_id}/event-data/values`;
  const params = new URLSearchParams({
    startAt: String(start_at),
    endAt: String(end_at),
    propertyName: "slug",
  });

  const [resume_views, letter_views, pdf_downloads] = await Promise.all(
    ["resume_view", "letter_view", "pdf_download"].map(async (event) => {
      const url = `${base}?${params.toString()}&event=${event}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Umami API ${res.status}: ${res.statusText}`);
      return res.json() as Promise<UmamiValueRow[]>;
    }),
  );

  return { resume_views, letter_views, pdf_downloads };
}

export function aggregate_slug_metrics(
  data: RawCounts,
  slugs: string[],
): MetricsMap {
  const map: MetricsMap = new Map();

  const slug_set = new Set(slugs);
  for (const slug of slugs) {
    map.set(slug, { resume_views: 0, letter_views: 0, pdf_downloads: 0 });
  }

  for (const row of data.resume_views) {
    if (slug_set.has(row.value)) {
      map.get(row.value)!.resume_views = Number(row.total);
    }
  }
  for (const row of data.letter_views) {
    if (slug_set.has(row.value)) {
      map.get(row.value)!.letter_views = Number(row.total);
    }
  }
  for (const row of data.pdf_downloads) {
    if (slug_set.has(row.value)) {
      map.get(row.value)!.pdf_downloads = Number(row.total);
    }
  }

  return map;
}
