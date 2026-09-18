// #177 shipped a provisional colour-per-day shape here
// (`ProvisionalContributionCell` / `ProvisionalContributionWeek` /
// `ProvisionalContributionsGrid`) purely to keep Commits.svelte renderable
// before #167's real data source existed. #167 has since landed and, as
// planned, reconciled the two: Commits.svelte now imports
// `ContributionGridModel` from `$lib/github.js` directly (weeks are flat
// `(ContributionCell | null)[]`, cells carry `level: number`) and maps
// `level` to a colour at render time, so this file has nothing left to
// provide and the provisional types are gone.
export {};
