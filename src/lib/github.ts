import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Raw shape written by scripts/fetch-github.ts to data/generated/github.json.
// Repository names are never part of this shape - the fetch script only ever
// asks GitHub for contributionCalendar totals, not repository-scoped data.
export interface ContributionDay {
  date: string;
  count: number;
}

export interface GithubContributionData {
  generated_at: string;
  total_count: number;
  days: ContributionDay[];
}

// A single day placed on the grid, with its color-ramp bucket (0-4)
// resolved so the rendering component never has to know the ramp's math.
export interface ContributionCell {
  date: string;
  count: number;
  level: number;
}

// One column of the grid (Sunday through Saturday, top to bottom). `null`
// marks a padding slot - the calendar doesn't start on a Sunday or end on a
// Saturday, so the first and last weeks are usually partial.
export type ContributionWeek = (ContributionCell | null)[];

export interface ContributionGridModel {
  weeks: ContributionWeek[];
  total_count: number;
  generated_at: string;
}

const GENERATED_GITHUB_PATH = resolve("data", "generated", "github.json");

const DAYS_PER_WEEK = 7;

// GitHub's own ramp buckets by quartile of the calendar's own max, not by
// fixed absolute counts - a quiet year and a heavy year both span the full
// color range. A count of 0 is always level 0, regardless of max.
export function bucket_level(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;

  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

// Turns the flat, chronological day list the fetch script wrote into a
// week-columned grid: padded with `null` at the front so the first real day
// lands under its actual weekday, and padded at the back so every week is a
// full 7-day column.
export function build_contribution_grid(data: GithubContributionData): ContributionGridModel {
  const max = data.days.reduce((running_max, day) => Math.max(running_max, day.count), 0);

  const cells: (ContributionCell | null)[] = [];

  if (data.days.length > 0) {
    const first_day = new Date(`${data.days[0].date}T00:00:00Z`);
    const leading_gap = first_day.getUTCDay();
    for (let i = 0; i < leading_gap; i++) {
      cells.push(null);
    }
  }

  for (const day of data.days) {
    cells.push({ date: day.date, count: day.count, level: bucket_level(day.count, max) });
  }

  while (cells.length % DAYS_PER_WEEK !== 0) {
    cells.push(null);
  }

  const weeks: ContributionWeek[] = [];
  for (let i = 0; i < cells.length; i += DAYS_PER_WEEK) {
    weeks.push(cells.slice(i, i + DAYS_PER_WEEK));
  }

  return { weeks, total_count: data.total_count, generated_at: data.generated_at };
}

function is_valid_contribution_data(value: unknown): value is GithubContributionData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.generated_at !== "string") return false;
  if (typeof candidate.total_count !== "number") return false;
  if (!Array.isArray(candidate.days)) return false;

  return candidate.days.every((day) => {
    if (!day || typeof day !== "object") return false;
    const day_candidate = day as Record<string, unknown>;
    return typeof day_candidate.date === "string" && typeof day_candidate.count === "number";
  });
}

// The landing loader's read of data/generated/github.json. Absent file,
// unreadable file, and malformed JSON all resolve to `null` rather than
// throwing - a contributor without GH_CONTRIB_PAT/GITHUB_TOKEN must still
// get a successful build, just with the offline state rendered instead of
// the grid.
export function load_github_contribution_data(): GithubContributionData | null {
  let raw: string;
  try {
    raw = readFileSync(GENERATED_GITHUB_PATH, "utf-8");
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return is_valid_contribution_data(parsed) ? parsed : null;
}
