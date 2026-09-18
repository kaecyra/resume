// A `*.dom.test.ts` file (see vite.config.ts): the landing page's `<meta
// name="theme-color">` is a static attribute in +page.svelte's
// svelte:head, so nothing about a swapped-source break-test applies to it
// (there is no data flow to sever). What can be pinned is that the
// rendered head actually carries HUD_PALETTE.background - a regression
// back to a literal hex (as happened once already: #1a2744, the
// pre-redesign HUD_PALETTE.background) would fail this. Renders +page.svelte
// directly with an inline PageData fixture, bypassing SvelteKit's
// load/router - see ENGINEERING.md rule 17 (inline fixtures, not
// filesystem dependencies).
import { fireEvent, render } from "@testing-library/svelte";

import { HUD_PALETTE } from "$lib/landing/palette.js";
import type { LandingData } from "$lib/types.js";

import Page from "./+page.svelte";

const LANDING: LandingData = {
  hero: {
    name: "Test Person",
    role: "Engineer",
    location: "Somewhere",
    tagline: "I build things.",
  },
  projects: [],
  appearances: [],
  resume_links: ["default"],
  contact: [{ label: "Email", url: "mailto:test@example.com" }],
  github: { user: "testuser" },
  sections: ["hero", "divider", "commits", "work", "contact"],
};

const PAGE_DATA = {
  umami_website_id: "",
  landing: LANDING,
  profile_name: "Test Person",
  resume_title: "Chief Technology Officer",
  contributions_grid: null,
  og: {
    title: "Test Person",
    description: "I build things.",
    image: "/og/default.png",
    url: "https://example.com",
  },
  jsonld: {
    person: {
      "@context": "https://schema.org" as const,
      "@type": "Person" as const,
      name: "Test Person",
      jobTitle: "Engineer",
    },
    webpage: {
      "@context": "https://schema.org" as const,
      "@type": "WebPage" as const,
      name: "Test Person",
      description: "I build things.",
    },
  },
};

describe("landing route page", () => {
  it("sets theme-color to the HUD palette's background, not a stale literal", () => {
    render(Page, { props: { data: PAGE_DATA } });

    const meta = document.querySelector('meta[name="theme-color"]');

    expect(meta).not.toBeNull();
    expect(meta?.getAttribute("content")).toBe(HUD_PALETTE.background);
  });

  it("publishes --hud-bg on :root from HUD_PALETTE.background, not a literal hex", () => {
    // :global(body)'s background-color reads var(--hud-bg) (see the
    // component <style> block), which only resolves to something if this
    // <style> tag actually reaches the rendered <head> carrying the live
    // palette value - a regression back to a hardcoded hex here (as the
    // theme-color meta tag above shipped once already, #1a2744) would
    // leave --hud-bg undefined instead of failing loudly, so this pins the
    // token going in rather than a computed colour coming out.
    render(Page, { props: { data: PAGE_DATA } });

    const style_tags = Array.from(document.head.querySelectorAll("style"));
    const root_style = style_tags.find((tag) => tag.textContent?.includes("--hud-bg"));

    expect(root_style).toBeDefined();
    expect(root_style?.textContent).toContain(`:root { --hud-bg: ${HUD_PALETTE.background}; }`);
  });
});

// Covers the depth-pass chrome added for #199: a grain overlay and a
// scroll-tracking spine, both decorative. Scoped styles never reach the
// rendered HTML (see LESSONS.md's #194 entry and Commits.test.ts), so these
// assert on markup, attributes and the scroll handler's effect on an
// inline style - never on an opacity value the DOM here can't see.
describe("landing route page - depth-pass chrome (#199)", () => {
  function stub_matchmedia(matches: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  }

  // scroll_progress() (+page.svelte) divides by
  // (documentElement.scrollHeight - window.innerHeight); happy-dom never
  // lays anything out, so both default to 0 unless a test fakes them.
  // configurable: true lets every call redefine them.
  function set_scroll_metrics({
    scroll_height = 0,
    inner_height = 0,
    scroll_y = 0,
  }: {
    scroll_height?: number;
    inner_height?: number;
    scroll_y?: number;
  }) {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: scroll_height,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", { value: inner_height, configurable: true });
    Object.defineProperty(window, "scrollY", { value: scroll_y, configurable: true });
  }

  function spine_fill_el(): HTMLElement {
    const el = document.querySelector<HTMLElement>(".spine-fill");
    if (!el) {
      throw new Error(".spine-fill not found");
    }
    return el;
  }

  beforeEach(() => {
    set_scroll_metrics({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the grain overlay and the spine as decorative, aria-hidden elements", () => {
    stub_matchmedia(false);
    render(Page, { props: { data: PAGE_DATA } });

    const grain = document.querySelector(".grain");
    const spine = document.querySelector(".spine");

    expect(grain).not.toBeNull();
    expect(grain?.getAttribute("aria-hidden")).toBe("true");
    expect(spine).not.toBeNull();
    expect(spine?.getAttribute("aria-hidden")).toBe("true");
    expect(spine?.querySelector(".spine-fill")).not.toBeNull();
  });

  it("holds the spine fill at its resting height (0%) before any scroll - the SSR/no-JS state", () => {
    stub_matchmedia(false);
    render(Page, { props: { data: PAGE_DATA } });

    expect(spine_fill_el().style.height).toBe("0%");
  });

  it("updates the spine fill from a scroll event, proportional to scroll progress", async () => {
    stub_matchmedia(false);
    render(Page, { props: { data: PAGE_DATA } });

    // scrollable_height = 1000 - 500 = 500; progress = 250 / 500 = 0.5
    set_scroll_metrics({ scroll_height: 1000, inner_height: 500, scroll_y: 250 });
    await fireEvent(window, new Event("scroll"));

    expect(spine_fill_el().style.height).toBe("50%");
  });

  it("clamps the spine fill to 100% past the end of the document", async () => {
    stub_matchmedia(false);
    render(Page, { props: { data: PAGE_DATA } });

    set_scroll_metrics({ scroll_height: 1000, inner_height: 500, scroll_y: 5000 });
    await fireEvent(window, new Event("scroll"));

    expect(spine_fill_el().style.height).toBe("100%");
  });

  it("removes its scroll listener on unmount, matching the addEventListener it registered", () => {
    stub_matchmedia(false);
    const add_spy = vi.spyOn(window, "addEventListener");
    const remove_spy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(Page, { props: { data: PAGE_DATA } });

    const scroll_registration = add_spy.mock.calls.find(([type]) => type === "scroll");
    expect(scroll_registration).toBeDefined();

    unmount();

    expect(remove_spy).toHaveBeenCalledWith("scroll", scroll_registration?.[1]);
  });

  // The spine keeps tracking under prefers-reduced-motion on purpose: the
  // fill reports where the reader already is, and only ever changes in
  // response to a scroll they performed themselves, so it is a readout
  // rather than motion. Pinning it at 0 for these visitors would leave a
  // permanently empty rail - a worse experience, not a calmer one. The
  // easing is the only real motion, and CSS turns that off (see
  // .spine-fill's reduced-motion rule); a stylesheet media query is not
  // observable from happy-dom, so this asserts the behaviour that is.
  it("still tracks scroll under prefers-reduced-motion, since the fill reports position rather than animating", async () => {
    stub_matchmedia(true);
    const add_spy = vi.spyOn(window, "addEventListener");

    render(Page, { props: { data: PAGE_DATA } });

    expect(add_spy.mock.calls.some(([type]) => type === "scroll")).toBe(true);

    set_scroll_metrics({ scroll_height: 1000, inner_height: 500, scroll_y: 250 });
    await fireEvent(window, new Event("scroll"));

    expect(spine_fill_el().style.height).toBe("50%");
  });
});
