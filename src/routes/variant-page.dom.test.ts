// A `*.dom.test.ts` file (see vite.config.ts): proves the variant route's
// own PDF download link is actually wired to its onclick handler, the same
// gap #175 closed for the landing page's ResumeCta. Renders the route's
// +page.svelte directly with an inline PageData fixture, bypassing SvelteKit's
// load/router - see ENGINEERING.md rule 17 (inline fixtures, not filesystem
// dependencies).
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { vi } from "vitest";

vi.mock("$lib/analytics.js", () => ({
  track_pdf_download: vi.fn(),
  track_resume_view: vi.fn(),
}));

import { track_pdf_download } from "$lib/analytics.js";

import Page from "./[variant=variant]/+page.svelte";

import type { ResolvedResume } from "$lib/types.js";

// Minimal ResolvedResume: only what ClassicTheme and its children need to
// render without crashing. Empty arrays hit the components' own "omit this
// section" guards rather than exercising them.
const RESUME: ResolvedResume = {
  theme: "classic",
  profile: {
    name: "Tim Gunter",
    photo: "",
    contact: { location: "Remote", email: "tim@example.com" },
  },
  title: "Chief Technology Officer",
  summary: "Ships things that work.",
  skills: [],
  domains: [],
  field_deployments: [],
  employment: [],
  languages: [],
  courses: [],
};

const PAGE_DATA = {
  umami_website_id: "",
  resume: RESUME,
  variant_name: "default",
  palette: {
    background: "#ffffff",
    page_background: "#ffffff",
    content_width: "56rem",
    accent: "#374151",
    text: "#111827",
    secondary: "#4b5563",
  },
  og: {
    title: "Tim Gunter - Chief Technology Officer",
    description: "Ships things that work.",
    image: "/og/default.png",
    url: "https://example.com/default",
  },
  jsonld: {
    person: {
      "@context": "https://schema.org" as const,
      "@type": "Person" as const,
      name: "Tim Gunter",
      jobTitle: "Chief Technology Officer",
    },
    webpage: {
      "@context": "https://schema.org" as const,
      "@type": "WebPage" as const,
      name: "Tim Gunter - Chief Technology Officer",
      description: "Ships things that work.",
    },
  },
  theme_color: "#ffffff",
};

afterEach(() => {
  cleanup();
});

describe("variant route page", () => {
  it("fires a resume pdf_download analytics event when the download link is clicked", async () => {
    const { getByText } = render(Page, { props: { data: PAGE_DATA } });

    await fireEvent.click(getByText("Download PDF"));

    expect(track_pdf_download).toHaveBeenCalledWith({
      variant: "default",
      type: "resume",
      slug: "default",
    });
  });
});
