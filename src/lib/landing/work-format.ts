import type { LandingProject } from "$lib/types.js";

// A project's card links out to whichever of these the data actually has:
// `repo_url` wins when both are present (it's the canonical source-code
// link), then the first entry of `links` (rendering only the first is
// deliberate - see Work.svelte), then no link at all when a project has
// neither. `links: []` is a real, valid case - landing.ts's validator
// checks each entry's label/url when `links` is present, but never requires
// the array to be non-empty - so the `?.length` guard below is what
// actually rules out that case, not a redundant restatement of a validator
// rule. `resume-engine` reaches its card through `repo_url`; `penny-royal`
// through `links` - so both branches, and the precedence between them, are
// live against shipped data.
export function project_link(project: LandingProject): string | null {
  if (project.repo_url) {
    return project.repo_url;
  }
  if (project.links?.length) {
    return project.links[0].url;
  }
  return null;
}
