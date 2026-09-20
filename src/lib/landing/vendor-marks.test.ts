import type { PipelineMark } from "$lib/types.js";

import { VENDOR_MARK_PATHS } from "./vendor-marks.js";

// Every id PipelineMark allows, spelled out rather than derived from the
// record under test: deriving the list from the thing being checked would
// make a missing entry invisible.
const EVERY_MARK: PipelineMark[] = [
  "github",
  "github-actions",
  "docker",
  "nginx",
  "cloudflare",
  "proxmox",
  "ubuntu",
];

describe("VENDOR_MARK_PATHS", () => {
  it("carries a path for every mark a band's data is allowed to ask for", () => {
    for (const mark of EVERY_MARK) {
      expect(VENDOR_MARK_PATHS[mark], mark).toBeTruthy();
    }

    expect(Object.keys(VENDOR_MARK_PATHS).sort()).toEqual([...EVERY_MARK].sort());
  });

  it("holds bare path data, so a mark drops straight into a 24x24 viewBox", () => {
    for (const mark of EVERY_MARK) {
      const path = VENDOR_MARK_PATHS[mark];

      // A `d` attribute, not a whole `<svg>` document and not a file path:
      // both would render as nothing at all inside the `<path>` these feed.
      expect(path.startsWith("M"), mark).toBe(true);
      expect(path, mark).not.toContain("<");
    }
  });

  it("gives each vendor its own drawing", () => {
    // The paths were lifted one at a time out of the mockup, where several
    // appear twice (once in a graph node, once in the marks row). A
    // copy-paste that landed the wrong vendor's curve under a key would
    // render a plausible-looking logo for the wrong product.
    const paths = EVERY_MARK.map((mark) => VENDOR_MARK_PATHS[mark]);

    expect(new Set(paths).size).toBe(EVERY_MARK.length);
  });
});
