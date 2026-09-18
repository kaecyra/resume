// The shape the Commits section renders. #167 owns fetching and bucketing
// the real GitHub contribution calendar (its own pure transform lives in
// `src/lib/github.ts`, not this file); this is only the render-time
// contract between that eventual data source and Commits.svelte. Until
// #167 lands, the loader has nothing to read and passes `null`, which
// Commits.svelte renders as an explicit offline state rather than an empty
// or broken grid.
export interface ContributionDay {
  color: string;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export type ContributionsGrid = ContributionWeek[];
