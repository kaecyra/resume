# Issue #10: Research and Select Tooling, Frameworks, Stack

## Plan

- [x] Create feature branch `feature/10-tooling-stack`
- [x] Install dependencies (svelte, sveltekit, tailwind, puppeteer, js-yaml, etc.)
- [x] Create `svelte.config.js` with adapter-static
- [x] Rename `vitest.config.ts` to `vite.config.ts` with SvelteKit/Tailwind plugins
- [x] Update `tsconfig.json` to extend SvelteKit generated config
- [x] Create SvelteKit boilerplate (`app.html`, `app.css`, `app.d.ts`)
- [x] Update `.gitignore` with `.svelte-kit/` and `build/`
- [x] Create `src/lib/types.ts` — TypeScript interfaces for data model
- [x] Create `src/lib/data.ts` — YAML data loading and variant resolution
- [x] Create `src/lib/data.test.ts` — Tests for data loading layer
- [x] Create route files (`+layout.svelte`, `+page.server.ts`, `+page.svelte`)
- [x] Create `scripts/generate-pdf.ts` — Puppeteer PDF generation
- [x] Update `package.json` scripts
- [x] Update CI workflow with sync, check, and build steps
- [x] Create `static/` directory
- [x] Verify: `svelte-kit sync` succeeds
- [x] Verify: `npm run check` — 0 errors
- [x] Verify: `npm test` — 9 tests pass (2 smoke + 7 data)
- [x] Verify: `npm run build` — static site builds with resume data in HTML

## Review

All verification steps pass:
- `svelte-check` reports 0 errors, 0 warnings
- All 9 tests pass across 2 test files
- Static build produces `build/index.html` with rendered resume data
- Build output shows "Tim Gunter - Chief Technology Officer" in the HTML
