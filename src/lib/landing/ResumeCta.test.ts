// @vitest-environment happy-dom
//
// This is the one component test in the landing area that needs a real DOM:
// it proves the download link's onclick handler is actually wired to the
// anchor element, which svelte/server rendering (used by LandingSections.test.ts)
// can't exercise because it never attaches event listeners. Every other
// landing test stays on the default `node` environment - see #175.
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { vi } from "vitest";

vi.mock("$lib/analytics.js", () => ({
  track_pdf_download: vi.fn(),
}));

import { track_pdf_download } from "$lib/analytics.js";

import ResumeCta from "./ResumeCta.svelte";

afterEach(() => {
  cleanup();
});

describe("ResumeCta", () => {
  it("fires a resume pdf_download analytics event when the download link is clicked", async () => {
    const { getByLabelText } = render(ResumeCta, {
      props: {
        resume_link: "default",
        profile_name: "Tim Gunter",
        resume_title: "Chief Technology Officer",
      },
    });

    await fireEvent.click(getByLabelText("Download resume PDF"));

    expect(track_pdf_download).toHaveBeenCalledWith({
      variant: "default",
      type: "resume",
      slug: "default",
    });
  });
});
