// A `*.dom.test.ts` file (see vite.config.ts): proves the variant route's
// own PDF download link is actually wired to its onclick handler, the same
// gap #175 closed for the landing page's ResumeCta. Renders the route's
// +page.svelte directly with an inline PageData fixture, bypassing SvelteKit's
// load/router - see ENGINEERING.md rule 17 (inline fixtures, not filesystem
// dependencies).
import { fireEvent, render } from "@testing-library/svelte";
import { vi } from "vitest";

vi.mock("$lib/analytics.js", () => ({
  track_pdf_download: vi.fn(),
  track_resume_view: vi.fn(),
}));

import { track_pdf_download } from "$lib/analytics.js";
import { resume_pdf_filename } from "$lib/landing/resume-download.js";

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
  variant_name: "cto-a",
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
    url: "https://example.com/cto-a",
  },
  canonical_url: "https://example.com/default",
  document_title: "Tim Gunter - Chief Technology Officer | Resume",
  jsonld: {
    profile_page: {
      "@context": "https://schema.org" as const,
      "@type": "ProfilePage" as const,
      name: "Tim Gunter - Chief Technology Officer | Resume",
      description: "Ships things that work.",
      mainEntity: {
        "@context": "https://schema.org" as const,
        "@type": "Person" as const,
        name: "Tim Gunter",
        jobTitle: "Chief Technology Officer",
        hasOccupation: { "@type": "Occupation" as const, name: "Chief Technology Officer" },
      },
    },
  },
  theme_color: "#ffffff",
};

describe("variant route page", () => {
  it("fires a resume pdf_download analytics event when the download link is clicked", async () => {
    const { getByText } = render(Page, { props: { data: PAGE_DATA } });

    await fireEvent.click(getByText("Download PDF"));

    expect(track_pdf_download).toHaveBeenCalledWith({
      variant: "cto-a",
      type: "resume",
      slug: "cto-a",
    });
  });

  it("sets the download link's filename via resume_pdf_filename", () => {
    const { getByText } = render(Page, { props: { data: PAGE_DATA } });

    const link = getByText("Download PDF");

    expect(link.getAttribute("download")).toBe(
      resume_pdf_filename(RESUME.profile.name, RESUME.title),
    );
  });
});

// #237: the variant pages all canonical to one of them, so the tag in the
// head must be the canonical variant's URL while og:url stays this page's
// own. A change that collapsed the two back into one value would restore
// the six-way duplicate the canonical exists to end, or - in the other
// direction - point a share card at a resume nobody shared.
describe("variant route page - head (#237)", () => {
  it("canonicals to the canonical variant, not to itself", () => {
    render(Page, { props: { data: PAGE_DATA } });

    const canonical = document.querySelector('link[rel="canonical"]');

    expect(canonical?.getAttribute("href")).toBe("https://example.com/default");
  });

  it("keeps og:url on the page that was actually shared", () => {
    render(Page, { props: { data: PAGE_DATA } });

    const og_url = document.querySelector('meta[property="og:url"]');

    expect(og_url?.getAttribute("content")).toBe("https://example.com/cto-a");
    expect(og_url?.getAttribute("content")).not.toBe(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    );
  });

  it("names the document a resume in the title while og:title stays the share-card form", () => {
    render(Page, { props: { data: PAGE_DATA } });

    expect(document.title).toBe("Tim Gunter - Chief Technology Officer | Resume");
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(
      "Tim Gunter - Chief Technology Officer",
    );
  });

  it("publishes the page as a ProfilePage with the person as its subject", () => {
    render(Page, { props: { data: PAGE_DATA } });

    const tags = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'));
    const payloads = tags.map((tag) => JSON.parse(tag.textContent ?? "{}"));
    const profile_page = payloads.find((payload) => payload["@type"] === "ProfilePage");

    expect(profile_page).toBeDefined();
    expect(profile_page.mainEntity["@type"]).toBe("Person");
    expect(profile_page.mainEntity.name).toBe("Tim Gunter");
  });
});
