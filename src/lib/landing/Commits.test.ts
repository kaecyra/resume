import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import type { ContributionCell, ContributionGridModel, ContributionWeek } from "$lib/github.js";
import type { LandingGithub } from "$lib/types.js";

import Commits from "./Commits.svelte";
import { CONTRIBUTION_RAMP } from "./palette.js";

const GITHUB: LandingGithub = { user: "testuser" };

function cell(date: string, level: number): ContributionCell {
  return { date, count: level * 2, level };
}

// One week carrying every ramp bucket (0-4) plus two `null` padding slots,
// so a single fixture exercises the level-to-colour ramp end to end and the
// padding path, without needing a second grid.
const GRID: ContributionGridModel = {
  total_count: 23,
  generated_at: "2026-09-18T00:00:00.000Z",
  weeks: [[null, cell("2026-09-14", 0), cell("2026-09-15", 1), cell("2026-09-16", 2), cell("2026-09-17", 3), cell("2026-09-18", 4), null]],
};

// A week per Sunday, spanning a real year boundary (Nov 2025 -> Jan 2026),
// so month-label placement is pinned against dates a human can check by
// hand rather than "some labels exist". Nov has one week in range (week 0),
// Dec spans four (weeks 1-4), Jan starts at week 5.
function sunday_week(date: string): ContributionWeek {
  return [cell(date, 0), null, null, null, null, null, null];
}

const YEAR_BOUNDARY_GRID: ContributionGridModel = {
  total_count: 7,
  generated_at: "2026-01-11T00:00:00.000Z",
  weeks: [
    sunday_week("2025-11-30"),
    sunday_week("2025-12-07"),
    sunday_week("2025-12-14"),
    sunday_week("2025-12-21"),
    sunday_week("2025-12-28"),
    sunday_week("2026-01-04"),
    sunday_week("2026-01-11"),
  ],
};

function html_for(contributions_grid: ContributionGridModel | null): string {
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

  it("does not render the offline state when contributions_grid is present", () => {
    const html = html_for(GRID);

    expect(html).not.toContain("Commit history is offline for this build.");
  });

  it("colours each real day by its level, from the empty end of the green ramp (0) to full brightness (4)", () => {
    const html = html_for(GRID);

    expect(html).toContain(`background: ${CONTRIBUTION_RAMP.level_0};`);
    expect(html).toContain(`background: ${CONTRIBUTION_RAMP.level_1};`);
    expect(html).toContain(`background: ${CONTRIBUTION_RAMP.level_2};`);
    expect(html).toContain(`background: ${CONTRIBUTION_RAMP.level_3};`);
    expect(html).toContain(`background: ${CONTRIBUTION_RAMP.level_4};`);
  });

  it("renders one commits-day element per grid slot, including null padding, so week columns stay aligned", () => {
    const html = html_for(GRID);

    // `class="commits-day` (no closing quote in the pattern), not an exact
    // match on the full class attribute - Svelte appends its own scoping
    // class (e.g. `svelte-xxxxx`) to every element matched by a `<style>`
    // block's selectors, so the rendered attribute is never just
    // `class="commits-day"`.
    const day_count = html.match(/class="commits-day/g)?.length;
    expect(day_count).toBe(GRID.weeks[0].length);
  });

  it("renders null padding slots hidden, aria-hidden and without a background colour", () => {
    const html = html_for(GRID);

    const pad_matches = html.match(/<div class="commits-day commits-day-pad[^>]*>/g) ?? [];
    const null_count = GRID.weeks[0].filter((slot) => slot === null).length;

    expect(pad_matches.length).toBe(null_count);
    for (const pad of pad_matches) {
      expect(pad).toContain('aria-hidden="true"');
      expect(pad).not.toContain("background:");
    }
  });

  it("renders real days as focusable buttons labelled with that day's count and date", () => {
    const html = html_for(GRID);

    // The level-4 fixture day (2026-09-18, count 8) - proves the button
    // carries real per-day text, not a generic label.
    expect(html).toContain('<button type="button" class="commits-day');
    expect(html).toMatch(/aria-label="8 commits on 18 September 2026"/);
  });

  it("renders the caption naming the account and window, with the id the scroller labels itself from", () => {
    const html = html_for(GRID);

    expect(html).toContain("@testuser, last 12 months");
    expect(html).toMatch(/id="commits-caption"[^>]*>@testuser, last 12 months</);
  });

  it("gives the grid scroller keyboard reachability (WCAG 2.1.1) via tabindex, role and aria-labelledby by default", () => {
    const html = html_for(GRID);

    const scroller = html.match(/<div class="commits-grid-scroll[^>]*>/)?.[0];

    // SSR (and any no-JS visitor) can never measure real overflow, so the
    // scroller starts in the conservative, always-reachable state - see
    // Commits.dom.test.ts for the JS-measured narrowing of this down once
    // the grid is known not to overflow.
    expect(scroller).toBeDefined();
    expect(scroller).toContain('tabindex="0"');
    expect(scroller).toContain('role="group"');
    expect(scroller).toContain('aria-labelledby="commits-caption"');
  });

  it("does not hide the grid from assistive tech, since real days are now focusable with their own labels", () => {
    const html = html_for(GRID);

    // `commits-grid ` (trailing space), not `commits-grid[^>]*` - the
    // latter also matches the outer `commits-grid-scroll` div and grabs
    // that one first, since it appears earlier in the markup.
    const grid = html.match(/<div class="commits-grid svelte-[^>]*>/)?.[0];

    expect(grid).toBeDefined();
    expect(grid).not.toContain("aria-hidden");
  });

  it("renders the readout at its resting state (the grid total), not empty, as two labelled fields", () => {
    const html = html_for(GRID);

    expect(html).toContain('<dl class="commits-readout');
    expect(html).toMatch(/class="commits-readout-label[^>]*>Commits<\/dt>\s*<dd class="commits-readout-value[^>]*>23</);
    expect(html).toMatch(
      /class="commits-readout-label[^>]*>Window<\/dt>\s*<dd class="commits-readout-value[^>]*>Last 12 months</,
    );
  });

  it("paints the legend's swatches from CONTRIBUTION_RAMP, so the key and the grid can never drift apart", () => {
    const html = html_for(GRID);

    const swatches = [...html.matchAll(/class="commits-legend-step[^>]*style="background: ([^;]+);"/g)].map(
      (match) => match[1],
    );

    expect(swatches).toEqual([
      CONTRIBUTION_RAMP.level_0,
      CONTRIBUTION_RAMP.level_1,
      CONTRIBUTION_RAMP.level_2,
      CONTRIBUTION_RAMP.level_3,
      CONTRIBUTION_RAMP.level_4,
    ]);
  });

  it("hides the legend from assistive tech, since every day's aria-label already says the count in words", () => {
    const html = html_for(GRID);

    expect(html).toMatch(/<div class="commits-legend[^>]*aria-hidden="true"/);
  });

  it("stamps each week with its own column index, which is what staggers the grid's entry animation", () => {
    const html = html_for(GRID);

    expect(html).toMatch(/class="commits-week[^>]*style="--week: 0;"/);
  });

  describe("month labels", () => {
    it("places one label per month change, pinned to the exact week index the month starts at", () => {
      const html = html_for(YEAR_BOUNDARY_GRID);

      const labels = [...html.matchAll(/<span class="commits-month[^>]*style="grid-column: (\d+);">([^<]+)<\/span>/g)].map(
        (match) => ({ week_index: Number(match[1]) - 1, label: match[2] }),
      );

      // Hand-computed against YEAR_BOUNDARY_GRID's own Sunday dates above:
      // week 0 (2025-11-30) is Nov's only week in range, week 1
      // (2025-12-07) is Dec's first, week 5 (2026-01-04) is Jan's first.
      expect(labels).toEqual([
        { week_index: 0, label: "Nov" },
        { week_index: 1, label: "Dec" },
        { week_index: 5, label: "Jan" },
      ]);
    });

    it("derives labels from cell dates, never a hardcoded twelve-month list, so a grid touching only two months renders only two labels", () => {
      const html = html_for(GRID);

      const labels = [...html.matchAll(/<span class="commits-month/g)];

      // GRID's single week is entirely September - one month touched, one
      // label, not twelve.
      expect(labels).toHaveLength(1);
      expect(html).toMatch(/<span class="commits-month[^>]*style="grid-column: 1;">Sep<\/span>/);
    });
  });

  // Reads the component's own source rather than its output: Svelte extracts
  // scoped <style> to a separate stylesheet, so a font-family declaration
  // never appears in the rendered HTML and no amount of DOM assertion can
  // see it. This is not a style-police test - #187 retired Share Tech Mono
  // everywhere outside the hero, #194 reintroduced it here on the readout's
  // label and value, and nothing failed. This is the check that would have
  // caught it.
  it("keeps Share Tech Mono out of this component, which #187 retired outside the hero", () => {
    const source = readFileSync(new URL("./Commits.svelte", import.meta.url), "utf8");

    expect(source).not.toContain("Share Tech Mono");
  });
});
