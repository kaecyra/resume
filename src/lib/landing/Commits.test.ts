import { render } from "svelte/server";

import type { ContributionCell, ContributionGridModel } from "$lib/github.js";
import type { LandingGithub } from "$lib/types.js";

import Commits from "./Commits.svelte";
import { HUD_PALETTE } from "./palette.js";

const GITHUB: LandingGithub = { user: "testuser" };

function cell(level: number): ContributionCell {
  return { date: `2026-09-${13 + level}`, count: level * 2, level };
}

// One week carrying every ramp bucket (0-4) plus two `null` padding slots,
// so a single fixture exercises the level-to-colour ramp end to end and the
// padding path, without needing a second grid.
const GRID: ContributionGridModel = {
  total_count: 23,
  generated_at: "2026-09-18T00:00:00.000Z",
  weeks: [[null, cell(0), cell(1), cell(2), cell(3), cell(4), null]],
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

  it("colours each real day by its level, from the empty end of the amber ramp (0) to full accent (4)", () => {
    const html = html_for(GRID);

    expect(html).toContain(`background: ${HUD_PALETTE.edge};`);
    expect(html).toContain(`background: ${HUD_PALETTE.accent}40;`);
    expect(html).toContain(`background: ${HUD_PALETTE.accent}80;`);
    expect(html).toContain(`background: ${HUD_PALETTE.accent}bf;`);
    expect(html).toContain(`background: ${HUD_PALETTE.accent};`);
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

  it("renders null padding slots hidden and without a background colour", () => {
    const html = html_for(GRID);

    const pad_count = html.match(/class="commits-day commits-day-pad/g)?.length;
    const null_count = GRID.weeks[0].filter((slot) => slot === null).length;
    expect(pad_count).toBe(null_count);
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

  it("hides the grid from assistive tech, since it has no accessible summary distinct from the caption", () => {
    const html = html_for(GRID);

    // `commits-grid ` (trailing space), not `commits-grid[^>]*` - the
    // latter also matches the outer `commits-grid-scroll` div and grabs
    // that one first, since it appears earlier in the markup.
    const grid = html.match(/<div class="commits-grid svelte-[^>]*>/)?.[0];

    expect(grid).toBeDefined();
    expect(grid).toContain('aria-hidden="true"');
  });
});
