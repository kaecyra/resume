# Lessons Learned

Patterns and rules to prevent repeated mistakes.

---

## 2026-02-02: Always suggest creating an issue for untracked work

**What happened:** User asked me to commit and PR documentation changes that weren't associated with an issue. I proceeded without suggesting we create an issue first.

**The rule:** When asked to do untracked work, always mention the option to create an issue first, even if the user may choose to proceed without one. Don't assume - ask.

**Why it matters:** Issues preserve context and make work visible to stakeholders. Even small documentation changes benefit from being tracked.

**Correct behavior:**

> "These documentation changes aren't tied to an issue. Want me to create one first for tracking, or proceed directly?"

The project manager can then decide. The key is giving them the choice rather than making the decision for them.

## 2026-02-09: Verify versions against live sources, not training data

**What happened:** When setting up CI, I used Node 22, actions/checkout@v4, and actions/setup-node@v4 based on training data. Node 24 is the current LTS, and both actions are on v6.

**The rule:** Never assume version numbers from memory. Always check the live source of truth (npm, GitHub releases, official docs) for:
- Runtime versions (Node.js, Python, etc.) used in CI
- GitHub Actions versions (checkout, setup-node, etc.)
- Any version choice that will be baked into config files

**Why it matters:** Starting a project on outdated versions means unnecessary migration work later and missing out on security patches, performance improvements, and new features.

**Correct behavior:** Before writing any version number into a config file, run `npm view <pkg> dist-tags.latest` for npm packages, and check the GitHub repo or official release page for GitHub Actions and runtimes.

## 2026-02-11: SvelteKit $env/static/public requires variables to exist

**What happened:** Used `import { PUBLIC_BASE_URL } from "$env/static/public"` in a Svelte component. When `PUBLIC_BASE_URL` wasn't set in the environment, Vite/Rollup threw a build error: `"PUBLIC_BASE_URL" is not exported by "virtual:env/static/public"`.

**The rule:** `$env/static/public` enforces that the variable exists at build time. If an env var might be optional, use `$env/dynamic/public` (or `$env/dynamic/private` for non-PUBLIC_ vars) which returns `undefined` for missing keys. Also note that `$env/dynamic/private` only contains vars that do NOT start with `PUBLIC_` -- use `$env/dynamic/public` for `PUBLIC_*` vars.

**Why it matters:** Builds break for any developer or CI environment that doesn't have the var set, even if it's only needed in production.

**Correct behavior:** For optional env vars, use dynamic imports with fallbacks: `const base_url = env.PUBLIC_BASE_URL ?? "";`. Prefer computing derived values (like OG meta tag content) in `+page.server.ts` and passing them as data, rather than importing env vars in Svelte components.

## 2026-02-11: Always branch before committing issue work

**What happened:** Implemented a planned palette refactor and field deployments feature (tied to #61) but committed directly to `main` instead of creating a feature branch first. By the time the user asked to PR, the commits were already on main and couldn't be branched retroactively.

**The rule:** Before making the first commit for any task tied to an issue (or that should be), create a feature branch per ENGINEERING.md conventions (`feature/{issue-number}-short-name`). This applies even when the work starts from an approved plan — the plan approval doesn't change the branching requirement.

**Why it matters:** Direct-to-main commits bypass the PR review workflow, lose the issue linkage, and can't be undone cleanly. The user expects trunk-based development with short-lived feature branches and PRs.

**Correct behavior:** At the start of implementation, before any edits:
1. Check if you're on `main`
2. If the work relates to an issue, create a branch: `git checkout -b feature/{issue}-{description}`
3. Commit and push the branch, then open a PR linking the issue

## 2026-02-11: Never fabricate issue numbers in branch names

**What happened:** When asked to create a fix branch, I invented issue number `65` for the branch name `fix/65-tsconfig-include-override` even though no such issue existed.

**The rule:** Branch names should only include an issue number if a real issue exists. If there's no issue, omit the number entirely (e.g. `fix/tsconfig-include-override`). Never guess or invent an issue number.

**Why it matters:** Fabricated issue numbers create false linkage, confuse traceability, and erode trust. The branch naming convention from ENGINEERING.md uses issue numbers to link work to tracked issues — using a fake number defeats the purpose.

**Correct behavior:** If no issue exists, either suggest creating one first, or use a branch name without a number.

## 2026-02-11: Include VERSION bump in PRs, not after

**What happened:** Merged two PRs (a bug fix and a content revision) without bumping the VERSION file. Had to create a separate follow-up PR just for the version bump.

**The rule:** When a PR warrants a version bump per ENGINEERING.md (content updates, features, fixes, serious layout changes), include the VERSION bump in the same PR. The version tag must travel with the build artifact.

**Why it matters:** The deploy workflow reads VERSION to tag Docker images. If the version bump is a separate commit after the merge, the build artifact from the original PR gets tagged with the old version.

**Correct behavior:** Before opening a PR, check if the changes warrant a version bump. If so, update VERSION as part of the branch.
