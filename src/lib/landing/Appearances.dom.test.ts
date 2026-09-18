// A `*.dom.test.ts` file (see vite.config.ts): covers the click-driven
// disclosure behaviour that only exists once real event listeners are
// attached - svelte/server (Appearances.test.ts) can render the initial
// collapsed markup but never runs a click handler. See #175 for why this
// needs its own project/environment.
import { fireEvent, render } from "@testing-library/svelte";

import type { LandingAppearance } from "$lib/types.js";

import Appearances from "./Appearances.svelte";

const APPEARANCES: LandingAppearance[] = [
  {
    id: "gtc-2026",
    event: "NVIDIA GTC 2026",
    what: "LiveVision talk",
    date: "March 2026",
    blurb: "Talked at NVIDIA GTC 2026 about the architecture behind LiveVision.",
  },
  {
    id: "ces-2026",
    event: "CES 2026",
    what: "LiveVision demo",
    date: "January 2026",
    blurb: "Built and ran a live, on-prem computer vision pipeline at CES 2026.",
  },
];

function render_appearances() {
  return render(Appearances, { props: { appearances: APPEARANCES } });
}

describe("Appearances (DOM)", () => {
  it("flips aria-expanded on click, and back on a second click", async () => {
    const { getByText } = render_appearances();
    const button = getByText("NVIDIA GTC 2026").closest("button");
    if (!button) {
      throw new Error("toggle button not found");
    }

    expect(button.getAttribute("aria-expanded")).toBe("false");

    await fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");

    await fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("points aria-controls at the id of the panel that actually holds that row's blurb", async () => {
    const { getByText, container } = render_appearances();
    const button = getByText("NVIDIA GTC 2026").closest("button");
    if (!button) {
      throw new Error("toggle button not found");
    }

    const panel_id = button.getAttribute("aria-controls");
    expect(panel_id).toBeTruthy();

    const panel = container.querySelector(`#${panel_id}`);
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain("Talked at NVIDIA GTC 2026 about the architecture behind LiveVision.");
  });

  it("un-hides the panel from assistive tech once its row opens, and re-hides it on close", async () => {
    const { getByText, container } = render_appearances();
    const button = getByText("CES 2026").closest("button");
    if (!button) {
      throw new Error("toggle button not found");
    }
    const panel_id = button.getAttribute("aria-controls");
    const panel = container.querySelector(`#${panel_id}`);
    if (!panel) {
      throw new Error("panel not found");
    }

    expect(panel.getAttribute("aria-hidden")).toBe("true");

    await fireEvent.click(button);
    expect(panel.hasAttribute("aria-hidden")).toBe(false);

    await fireEvent.click(button);
    expect(panel.getAttribute("aria-hidden")).toBe("true");
  });

  it("toggles each row independently, so opening one does not open or close the other", async () => {
    const { getByText } = render_appearances();
    const gtc_button = getByText("NVIDIA GTC 2026").closest("button");
    const ces_button = getByText("CES 2026").closest("button");
    if (!gtc_button || !ces_button) {
      throw new Error("toggle buttons not found");
    }

    await fireEvent.click(gtc_button);

    expect(gtc_button.getAttribute("aria-expanded")).toBe("true");
    expect(ces_button.getAttribute("aria-expanded")).toBe("false");
  });
});
