import { vi } from "vitest";

import type { LandingHero } from "$lib/types.js";

vi.mock("$lib/analytics.js", () => ({
  track_pdf_download: vi.fn(),
}));

import { track_pdf_download } from "$lib/analytics.js";

import { handle_resume_download, resume_pdf_filename, resume_pdf_href } from "./resume-download.js";

const HERO: LandingHero = {
  name: "Test Person",
  role: "Engineer",
  tagline: "I build things.",
  status: "Somewhere.",
};

describe("resume_pdf_href", () => {
  it("builds the PDF path for the given resume variant", () => {
    expect(resume_pdf_href("default")).toBe("/default.pdf");
  });
});

describe("resume_pdf_filename", () => {
  it("composes the download filename from the hero's name and role", () => {
    expect(resume_pdf_filename(HERO)).toBe("Test Person - Resume - Engineer.pdf");
  });
});

describe("handle_resume_download", () => {
  it("fires a resume pdf_download analytics event for the given variant", () => {
    handle_resume_download("default");

    expect(track_pdf_download).toHaveBeenCalledWith({
      variant: "default",
      type: "resume",
      slug: "default",
    });
  });
});
