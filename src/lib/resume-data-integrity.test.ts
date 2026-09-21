import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { list_variants, load_resume_data, load_variant } from "./data.js";
import { load_landing_data } from "./landing.js";
import { build_master_ids, validate_resume_data, validate_variant } from "./validate.js";

// Unlike validate-resume.test.ts next door, this file reads the real files
// in data/ on purpose. ENGINEERING.md rule 17 keeps unit tests off the
// filesystem so they cannot break when content changes - but #6 asks for
// the content itself to be checked, and a test of the real documents is the
// only thing that catches a typo someone commits tomorrow. The validators'
// own behaviour is covered with inline fixtures; this covers the data.
//
// These reads go through the loaders, which now throw on invalid input, so
// a broken file fails here with its own field named rather than as a
// TypeError during a page render.
describe("data/ integrity", () => {
  it("data/resume.yaml is structurally valid", () => {
    expect(validate_resume_data(load_resume_data())).toEqual([]);
  });

  it("finds at least one variant, so the checks below are not vacuously passing", () => {
    // Without this, a bug in list_variants would turn every per-variant
    // assertion into an empty loop that reports success.
    expect(list_variants().length).toBeGreaterThan(0);
  });

  it("every variant's ids resolve against data/resume.yaml", () => {
    const master_ids = build_master_ids(load_resume_data());

    const failures = list_variants().flatMap((name) =>
      validate_variant(name, load_variant(name), master_ids),
    );

    // Asserted as the full list, not a count: a failure message that names
    // the variant and the dangling id is the entire value of this test.
    expect(failures).toEqual([]);
  });

  it("every image data/landing.yaml's about block names exists under static/", () => {
    // validate_landing_data checks the paths are site-relative; only the
    // real files can say whether the image is actually there. A missing
    // cover renders as a broken image with no build error.
    const about = load_landing_data().about;
    expect(about).toBeDefined();

    const paths = [
      about!.portrait.src,
      ...about!.photos.flatMap((photo) => [photo.src, photo.full_src ?? photo.src]),
      ...about!.books.map((book) => book.cover),
    ];
    const missing = paths.filter((path) => !existsSync(resolve("static", `.${path}`)));

    expect(missing).toEqual([]);
  });
});
