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

// Each real day's aria-label wording - "14 commits on 3 March 2026",
// singular-aware at 1. A screen-reader user gets this one flowing sentence
// on focus, not the rail's split fields (see RailReadout below) - a
// sentence is what a spoken announcement wants; a labelled instrument
// reading is what a sighted/visual rail wants, and they don't have to say
// the same thing the same way to say the same thing.
export function format_day_summary(cell: ContributionCell): string {
  return `${cell.count} ${pluralize_commits(cell.count)} on ${DAY_MONTH_YEAR.format(to_utc_date(cell.date))}`;
}

// The info rail's structured readout (#192 round 2: "more stylized given
// how big the grid is") - a count and a context value as two labelled
// fields, echoing the page's other HUD instrument rows (Hero.svelte's
// topbar: a handle and a coordinate pair, each a static label over a
// value) rather than one prose sentence. `count_label`/`detail_label` are
// identical between the two variants below on purpose - a fixed label over
// a changing value is what makes it read as an instrument, not a caption -
// so Commits.svelte can lay both out with the same markup regardless of
// which one is showing.
export interface RailReadout {
  count_label: string;
  count_value: string;
  detail_label: string;
  detail_value: string;
}

// A hovered/focused day's reading.
export function day_readout(cell: ContributionCell): RailReadout {
  return {
    count_label: "Commits",
    count_value: String(cell.count),
    detail_label: "Date",
    detail_value: DAY_MONTH_YEAR.format(to_utc_date(cell.date)),
  };
}

// The rail's resting state (nothing hovered or focused) - the same total
// the caption above the grid already names, in the rail's own register, so
// the rail is never empty.
export function resting_readout(total_count: number): RailReadout {
  return {
    count_label: "Commits",
    count_value: String(total_count),
    detail_label: "Window",
    detail_value: "Last 12 months",
  };
}
