// A `*.dom.test.ts` file (see vite.config.ts): covers the parts of #192
// that only exist once real event listeners are attached - hover/focus
// driving the info rail, and the scroller's mount-time overflow
// measurement - none of which svelte/server (Commits.test.ts) can exercise,
// since SSR never runs onMount or attaches DOM event handlers. See #175 for
// why this needs its own project/environment.
import { fireEvent, render } from "@testing-library/svelte";

import type { ContributionGridModel } from "$lib/github.js";
import type { LandingGithub } from "$lib/types.js";

import Commits from "./Commits.svelte";
import { CONTRIBUTION_RAMP, HUD_PALETTE } from "./palette.js";

const GITHUB: LandingGithub = { user: "testuser" };

const GRID: ContributionGridModel = {
  total_count: 23,
  generated_at: "2026-09-18T00:00:00.000Z",
  weeks: [
    [
      { date: "2026-09-14", count: 0, level: 0 },
      { date: "2026-09-15", count: 14, level: 4 },
      { date: "2026-09-16", count: 2, level: 1 },
      null,
      null,
      null,
      null,
    ],
  ],
};

function render_commits() {
  return render(Commits, { props: { github: GITHUB, contributions_grid: GRID } });
}

// The rail is two <dt>/<dd> fields (round 2 of #192), not one sentence -
// read each field's label and value text separately rather than the whole
// element's flattened textContent, so a test failure says which field
// changed rather than just "the string differs somewhere".
function rail_fields(container: HTMLElement): { label: string; value: string }[] {
  return [...container.querySelectorAll(".commits-rail-field")].map((field) => ({
    label: field.querySelector(".commits-rail-label")?.textContent ?? "",
    value: field.querySelector(".commits-rail-value")?.textContent ?? "",
  }));
}

function rail_accent(container: HTMLElement): string {
  return container.querySelector<HTMLElement>(".commits-rail")?.style.getPropertyValue("--commits-rail-accent") ?? "";
}

describe("Commits (DOM)", () => {
  it("shows the resting total before anything is hovered or focused, as two labelled fields", () => {
    const { container } = render_commits();

    expect(rail_fields(container)).toEqual([
      { label: "Commits", value: "23" },
      { label: "Window", value: "Last 12 months" },
    ]);
  });

  it("updates the rail on hover and reverts to the resting total on mouseleave", async () => {
    const { container, getByLabelText } = render_commits();
    const day = getByLabelText("14 commits on 15 September 2026");

    await fireEvent.mouseEnter(day);
    expect(rail_fields(container)).toEqual([
      { label: "Commits", value: "14" },
      { label: "Date", value: "15 September 2026" },
    ]);

    await fireEvent.mouseLeave(day);
    expect(rail_fields(container)).toEqual([
      { label: "Commits", value: "23" },
      { label: "Window", value: "Last 12 months" },
    ]);
  });

  it("updates the rail on focus and reverts to the resting total on blur, so keyboard users get the same info hover gives mouse users", async () => {
    const { container, getByLabelText } = render_commits();
    const day = getByLabelText("2 commits on 16 September 2026");

    await fireEvent.focus(day);
    expect(rail_fields(container)).toEqual([
      { label: "Commits", value: "2" },
      { label: "Date", value: "16 September 2026" },
    ]);

    await fireEvent.blur(day);
    expect(rail_fields(container)).toEqual([
      { label: "Commits", value: "23" },
      { label: "Window", value: "Last 12 months" },
    ]);
  });

  it("tints the rail's accent border with the hovered day's own ramp level, and reverts to the neutral edge tone on mouseleave", async () => {
    const { container, getByLabelText } = render_commits();
    const day = getByLabelText("14 commits on 15 September 2026"); // level 4

    expect(rail_accent(container)).toBe(HUD_PALETTE.edge);

    await fireEvent.mouseEnter(day);
    expect(rail_accent(container)).toBe(CONTRIBUTION_RAMP.level_4);

    await fireEvent.mouseLeave(day);
    expect(rail_accent(container)).toBe(HUD_PALETTE.edge);
  });

  it("renders every real day as a real <button>, so it is reachable by Tab without any extra wiring", () => {
    const { getByLabelText } = render_commits();

    expect(getByLabelText("0 commits on 14 September 2026").tagName).toBe("BUTTON");
  });

  it("drops the scroller's tabindex/role/aria-labelledby once mounted, when the grid does not actually overflow", () => {
    // happy-dom's layout is not a real box model - scrollWidth/clientWidth
    // are both 0 by default on every element, i.e. "never overflowing" -
    // which is exactly the common case #192 optimizes for (a fluid grid
    // that fits). onMount's measurement runs synchronously as part of
    // mounting, so by the time render() returns the scroller should already
    // have narrowed itself down from the conservative SSR default.
    const { container } = render_commits();

    const scroller = container.querySelector(".commits-grid-scroll");

    expect(scroller).not.toBeNull();
    expect(scroller?.hasAttribute("tabindex")).toBe(false);
    expect(scroller?.hasAttribute("role")).toBe(false);
    expect(scroller?.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("restores the scroller's tabindex/role/aria-labelledby when a resize reveals real overflow", async () => {
    const { container } = render_commits();
    const scroller = container.querySelector<HTMLElement>(".commits-grid-scroll");
    if (!scroller) {
      throw new Error("scroller not found");
    }

    Object.defineProperty(scroller, "scrollWidth", { value: 600, configurable: true });
    Object.defineProperty(scroller, "clientWidth", { value: 300, configurable: true });
    await fireEvent(window, new Event("resize"));

    expect(scroller.getAttribute("tabindex")).toBe("0");
    expect(scroller.getAttribute("role")).toBe("group");
    expect(scroller.getAttribute("aria-labelledby")).toBe("commits-caption");
  });
});
