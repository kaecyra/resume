# Lessons Learned

Intake log for corrections. Stable patterns get graduated into [ENGINEERING.md](./ENGINEERING.md) or [WORKING_AGREEMENT.md](./WORKING_AGREEMENT.md) and removed from here.

---

## 2026-02-11: SvelteKit $env/static/public requires variables to exist

**What happened:** Used `import { PUBLIC_BASE_URL } from "$env/static/public"` in a Svelte component. When `PUBLIC_BASE_URL` wasn't set in the environment, Vite/Rollup threw a build error: `"PUBLIC_BASE_URL" is not exported by "virtual:env/static/public"`.

**The rule:** `$env/static/public` enforces that the variable exists at build time. If an env var might be optional, use `$env/dynamic/public` (or `$env/dynamic/private` for non-PUBLIC_ vars) which returns `undefined` for missing keys. Also note that `$env/dynamic/private` only contains vars that do NOT start with `PUBLIC_` -- use `$env/dynamic/public` for `PUBLIC_*` vars.

**Why it matters:** Builds break for any developer or CI environment that doesn't have the var set, even if it's only needed in production.

**Correct behavior:** For optional env vars, use dynamic imports with fallbacks: `const base_url = env.PUBLIC_BASE_URL ?? "";`. Prefer computing derived values (like OG meta tag content) in `+page.server.ts` and passing them as data, rather than importing env vars in Svelte components.

## 2026-02-19: Tim's career history extends beyond resume.yaml

**What happened:** In a cover letter, wrote "I joined as Director of Operations" because that's the earliest Vanilla role in `resume.yaml`. Tim corrected this — he actually joined Vanilla as a Senior Systems Analyst (first employee after the founders) and worked his way up.

**The rule:** `resume.yaml` only contains the roles Tim chose to list. His actual career history may include earlier roles at the same company. Never assume the earliest listed role is how someone joined. When writing cover letters or narrative copy, don't invent details about how someone joined a company unless the user has confirmed it.

**Why it matters:** Cover letters are personal narratives. Getting the origin story wrong undermines authenticity — especially when the real story (employee #1, IC to COO) is more compelling than the assumed one.

## 2026-02-19: Never commit directly to main

**What happened:** CI failed on a merged PR. Instead of creating a fix branch and PR, I committed the fix directly to main and pushed. This violates the working agreement and also doesn't help because CI runs on PRs, not direct pushes.

**The rule:** Always create a branch and PR for fixes, even trivial one-line changes. The working agreement is explicit: "Never commit, push, or open PRs without explicit permission" and "Create the feature branch before making any commits — never commit issue work directly to main." Quick fixes are not an exception.

**Why it matters:** Direct commits to main bypass CI validation, skip code review, and break the team's trust in the trunk-based workflow. The whole point of PRs is that CI runs on them.

## 2026-07-21: Resume/narrative copy must follow SOUL.md voice — no buzzwords

**What happened:** Drafted the `agentic-engineer` variant summary and tagline in generic LLM voice — "orchestrate LLMs and AI harnesses," "first-class engineering disciplines," "direct fleets of agents," "systems judgment that makes delivery reliable instead of reckless." Tim called it out: "You wrote it like a fuckin' Claude."

**The rule:** All user-facing copy (variant summaries, taglines, cover letters, domain/highlight text) follows the voice in [SOUL.md](./SOUL.md) line 7: radical candor, no bullshit, low-buzzword, plain and direct. No tech-bro / corporate buzzword soup — no "orchestrate," "harnesses," "first-class disciplines," "force of nature" filler, "ship what actually works." Reference existing variants for tone: `default.yaml` ("scale without the bullshit"). Write blunt, concrete, human. Call out my own drift before shipping.

**Why it matters:** The whole brand is anti-bullshit technical candor. Buzzword copy on a resume that pitches "I know when the agents are bullshitting" is self-refuting.

## 2026-02-20: nginx proxy_pass with variables skips URI rewriting

**What happened:** Added `location /api/umami/ { proxy_pass $umami/api/; }` expecting nginx to strip the `/api/umami/` prefix and proxy to `/api/`. Instead, requests hit `umami:3000/api/umami/...` (404) because `$umami` is a variable.

**The rule:** When `proxy_pass` contains a variable, nginx disables automatic location-prefix-to-URI replacement. Use an explicit `rewrite ... break` to transform the URI, and specify `proxy_pass` without a URI path: `rewrite ^/api/umami/(.*) /api/$1 break; proxy_pass $umami;`. The existing exact-match locations (`= /api/send`) are unaffected because there's no prefix to strip.

**Why it matters:** This is a well-documented nginx behavior but easy to miss. The existing proxy locations in this project all use exact matches and work fine with variables, so the pattern appeared safe to extend to prefix matches.

## 2026-09-18: Design handoffs are proposals to argue with, not specs to schedule

**What happened:** Resuming from an overseer handoff that pointed at a design artifact, I treated the artifact as settled work and went straight to asking which of its two flagged options to ship, then started breaking it into dispatchable tickets. Tim stopped me: "we need to DISCUSS it. you're assuming its all fine." Checking the artifact against the actual source then found its central argument was stale — it proposed making the contribution ramp the page's brightest amber, but #194 had already made that ramp green, on purpose, with the reasoning written into `palette.ts`. It also miscounted the page's section weights, claiming six near-identical bands when `Divider.svelte` already renders a light plane and `Contact.svelte` a full amber one.

**The rule:** Before planning any work from a design artifact, proposal or handoff, verify its factual claims against the current code. State where it is wrong, out of date, or in conflict with a recorded decision, and say so before offering any options. A menu of choices drawn from an unverified premise is worse than no menu, because it launders the premise into a decision.

**Why it matters:** A design document is written at a moment in time against a snapshot of the code. On a fast-moving branch its claims rot within a day. Presenting its conclusions as live options hides that rot behind a question that looks like collaboration.

## 2026-09-18: Check a new component against .memory/ before shipping its styling

**What happened:** #194 shipped the contribution info rail as a panel with a background fill, a 1px border, a 3px coloured left accent bar and `Share Tech Mono` on its label and value. That is all four tells recorded in `.memory/no-default-ai-styling.md`, and the mono also contradicted #187, which retired that face outside the hero — a retirement `src/routes/+page.svelte:94` still described as total. No gate caught it.

**The rule:** When adding or restyling a visual component, read `.memory/` first and check the result against it. Where a rule has already been violated once, add a test that would have caught it rather than only fixing the instance — `Commits.test.ts` now reads the component's own source and fails on `Share Tech Mono`, because scoped styles never reach the rendered HTML and no DOM assertion can see a font declaration.

**Why it matters:** Design rules that live only in prose get re-violated by the next change. The mono retirement was decided, documented in a comment, and undone two PRs later without anyone noticing.
