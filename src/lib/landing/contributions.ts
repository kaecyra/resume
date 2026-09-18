// #177 shipped a provisional colour-per-day shape here
// (`ProvisionalContributionCell` / `ProvisionalContributionWeek` /
// `ProvisionalContributionsGrid`) purely to keep Commits.svelte renderable
// before #167's real data source existed. #167 landed and reconciled the
// two: Commits.svelte imports `ContributionGridModel` from `$lib/github.js`
// directly. #192 gives this file a real job again: the pure, presentation-
// independent derivations Commits.svelte needs (month-label positions, the
// info rail's text) live here so they can be reasoned about - and, since
// Commits.svelte and Commits.test.ts are the only test surface for this
// file (see the round's ownership globs - there is no contributions.test.ts),
// verified - without a Svelte render.
import type { ContributionCell, ContributionWeek } from "$lib/github.js";

export interface MonthLabel {
  week_index: number;
  label: string;
}

// "Mon" / "Sep" - never a 12-entry lookup table of our own. Reaches for
// Intl instead of a hand-maintained array so there is nothing here that can
// drift out of sync with what a month is actually called; en-US's
// abbreviations ("Jan".."Dec") also happen to match GitHub's own labels.
const MONTH_ABBREVIATION = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

// Full month name, for the info rail / per-day aria-label ("3 March 2026"),
// where an abbreviation would read as clipped rather than deliberate.
const DAY_MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function to_utc_date(iso_date: string): Date {
  // `T00:00:00Z` pins the parse to UTC midnight, matching build_contribution
  // grid's own leading_gap calculation in github.ts - without it, a local
  // timezone west of UTC parses the date string as the previous local day.
  return new Date(`${iso_date}T00:00:00Z`);
}

// One label per month change, placed at the week (column) where that month
// first appears - GitHub's own convention. Derived entirely from the real
// cells' own `date`, not a fixed twelve-label list: a week with no real day
// (padding-only, at the very edges of the grid) contributes no signal and
// is skipped rather than guessed.
export function derive_month_labels(weeks: ContributionWeek[]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let last_month_key: string | null = null;

  weeks.forEach((week, week_index) => {
    const first_cell = week.find((cell): cell is ContributionCell => cell !== null);
    if (!first_cell) {
      return;
    }

    const date = to_utc_date(first_cell.date);
    const month_key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;

    if (month_key === last_month_key) {
      return;
    }

    last_month_key = month_key;
    labels.push({ week_index, label: MONTH_ABBREVIATION.format(date) });
  });

  return labels;
}

function pluralize_commits(count: number): string {
  return count === 1 ? "commit" : "commits";
}

// The info rail's text for a hovered/focused day, and the same wording a
// screen-reader user gets from that day's own aria-label - "14 commits on
// 3 March 2026", singular-aware at 1.
export function format_day_summary(cell: ContributionCell): string {
  return `${cell.count} ${pluralize_commits(cell.count)} on ${DAY_MONTH_YEAR.format(to_utc_date(cell.date))}`;
}

// The info rail's resting state (nothing hovered or focused) - the same
// total the caption already names, in the rail's own register, so the rail
// is never empty.
export function format_resting_summary(total_count: number): string {
  return `${total_count} ${pluralize_commits(total_count)} in the last 12 months`;
}
