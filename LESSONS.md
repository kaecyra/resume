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
