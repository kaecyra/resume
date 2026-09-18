import { vi } from "vitest";

vi.mock("$lib/analytics.js", () => ({
  track_pdf_download: vi.fn(),
}));

import { track_pdf_download } from "$lib/analytics.js";

import { handle_resume_download, resume_pdf_filename } from "./resume-download.js";

describe("resume_pdf_filename", () => {
  // src/routes/[variant=variant]/+page.svelte calls this function directly
  // for its own download attribute, so the same PDF gets an identical
  // filename from either route - there is no separate template to drift.
  it("composes the download filename from the profile name and resume title", () => {
    expect(resume_pdf_filename("Tim Gunter", "Chief Technology Officer")).toBe(
      "Tim Gunter - Resume - Chief Technology Officer.pdf",
    );
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
