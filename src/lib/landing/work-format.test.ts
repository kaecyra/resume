import type { LandingProject } from "$lib/types.js";

import { project_link } from "./work-format.js";

const PROJECT: LandingProject = {
  id: "proj-a",
  name: "Project A",
  blurb: "Does a thing.",
  stack: ["TypeScript"],
  status: "Active",
};

describe("project_link", () => {
  it("returns repo_url when only repo_url is set", () => {
    const project = { ...PROJECT, repo_url: "https://github.com/example/resume-engine" };

    expect(project_link(project)).toBe("https://github.com/example/resume-engine");
  });

  it("returns the first links entry when only links is set", () => {
    const project = {
      ...PROJECT,
      links: [
        { label: "Site", url: "https://penny-royal.example.com" },
        { label: "Docs", url: "https://penny-royal.example.com/docs" },
      ],
    };

    expect(project_link(project)).toBe("https://penny-royal.example.com");
  });

  it("prefers repo_url over links when both are set", () => {
    const project = {
      ...PROJECT,
      repo_url: "https://github.com/example/resume-engine",
      links: [{ label: "Site", url: "https://resume-engine.example.com" }],
    };

    expect(project_link(project)).toBe("https://github.com/example/resume-engine");
  });

  it("returns null when neither repo_url nor links is set", () => {
    expect(project_link(PROJECT)).toBeNull();
  });
});
