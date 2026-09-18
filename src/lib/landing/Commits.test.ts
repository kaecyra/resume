import { render } from "svelte/server";

import type { LandingGithub } from "$lib/types.js";

import Commits from "./Commits.svelte";
import type { ProvisionalContributionsGrid } from "./contributions.js";

const GITHUB: LandingGithub = { user: "testuser" };

// Two weeks of two days is enough to exercise both the outer `{#each}` over
// weeks and the inner `{#each}` over days, and to prove each day's own
// colour (not just the first) reaches the markup.
const GRID: ProvisionalContributionsGrid = [
  { days: [{ color: "#111111" }, { color: "#222222" }] },
  { days: [{ color: "#333333" }, { color: "#444444" }] },
];

function html_for(contributions_grid: ProvisionalContributionsGrid | null): string {
  return render(Commits, {
    props: { github: GITHUB, contributions_grid },
  }).body;
}

describe("Commits", () => {
  it("renders the offline state when contributions_grid is null", () => {
    const html = html_for(null);

    expect(html).toContain("Commit history is offline for this build.");
    expect(html).not.toContain("commits-day");
  });

  it("renders one commits-day element per day, in every week, with that day's colour", () => {
    const html = html_for(GRID);

    for (const color of ["#111111", "#222222", "#333333", "#444444"]) {
      expect(html).toContain(`background: ${color};`);
    }

    // `class="commits-day` (no closing quote in the pattern), not an exact
    // match on the full class attribute - Svelte appends its own scoping
    // class (e.g. `svelte-xxxxx`) to every element matched by a `<style>`
    // block's selectors, so the rendered attribute is never just
    // `class="commits-day"`.
    const day_count = html.match(/class="commits-day/g)?.length;
    expect(day_count).toBe(4);
  });

  it("does not render the offline state when contributions_grid is present", () => {
    const html = html_for(GRID);

    expect(html).not.toContain("Commit history is offline for this build.");
  });

  it("renders the caption naming the account and window, with the id the scroller labels itself from", () => {
    const html = html_for(GRID);

    expect(html).toContain("@testuser, last 12 months");
    expect(html).toMatch(/id="commits-caption"[^>]*>@testuser, last 12 months</);
  });

  it("gives the grid scroller keyboard reachability (WCAG 2.1.1) via tabindex, role and aria-labelledby", () => {
    const html = html_for(GRID);

    const scroller = html.match(/<div class="commits-grid-scroll[^>]*>/)?.[0];

    expect(scroller).toBeDefined();
    expect(scroller).toContain('tabindex="0"');
    expect(scroller).toContain('role="group"');
    expect(scroller).toContain('aria-labelledby="commits-caption"');
  });

  it("hides the colour-only grid from assistive tech, since it has no accessible summary of its own", () => {
    const html = html_for(GRID);

    // `commits-grid ` (trailing space), not `commits-grid[^>]*` - the
    // latter also matches the outer `commits-grid-scroll` div and grabs
    // that one first, since it appears earlier in the markup.
    const grid = html.match(/<div class="commits-grid svelte-[^>]*>/)?.[0];

    expect(grid).toBeDefined();
    expect(grid).toContain('aria-hidden="true"');
  });
});
