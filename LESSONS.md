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
