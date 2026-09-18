// This shape is provisional. #177 (this node) invented it purely to keep
// Commits.svelte renderable before its real data source exists, and it is
// not the shape #167 will actually deliver.
//
// #167 (branch `feature/167-github-heatmap`, `src/lib/github.ts`) owns the
// real contract: `ContributionGridModel { weeks, total_count, generated_at }`,
// whose weeks are flat `(ContributionCell | null)[]` (null padding slots,
// no `days` wrapper), and whose cells carry a `level: number` (a 0-4 ramp
// bucket) rather than a colour - deliberately, so the rendering component
// never has to know the ramp's math itself.
//
// Until #167 lands, the loader has nothing real to read and passes `null`,
// which Commits.svelte renders as an explicit offline state rather than an
// empty or broken grid. Once #167 lands, whichever node lands second is
// responsible for reconciling the two shapes - most likely by having
// Commits.svelte map `level` to a colour at render time, so the ramp's math
// stays out of the loader. These types are named for what they are (a
// provisional, local render-time shape) rather than for what #167 will
// eventually supply, so they do not collide with #167's real exports.
export interface ProvisionalContributionCell {
  color: string;
}

export interface ProvisionalContributionWeek {
  days: ProvisionalContributionCell[];
}

export type ProvisionalContributionsGrid = ProvisionalContributionWeek[];
