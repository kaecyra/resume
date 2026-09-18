import type { LandingProject } from "$lib/types.js";

// A project's card links out to whichever of these the data actually has:
// `repo_url` wins when both are present (it's the canonical source-code
// link), then the first entry of `links` (validated to hold at least one
// entry when present; rendering only the first is deliberate - see Work.svelte),
// then no link at all when a project has neither. `resume-engine` reaches
// its card through `repo_url`; `penny-royal` through `links` - so both
// branches, and the precedence between them, are live against shipped data.
export function project_link(project: LandingProject): string | null {
  if (project.repo_url) {
    return project.repo_url;
  }
  if (project.links?.length) {
    return project.links[0].url;
  }
  return null;
}
