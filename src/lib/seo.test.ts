import { vi } from "vitest";

vi.mock("./data.js", () => ({
  list_variants: () => ["default", "cto-a", "cto-b"],
}));

import { build_variant_urls, build_person_jsonld, build_webpage_jsonld, build_og_metadata } from "./seo.js";

import type { Profile } from "./types.js";

describe("build_variant_urls", () => {
  it("returns absolute URLs when base_url is provided", () => {
    const urls = build_variant_urls("https://resume.timgunter.ca");
    expect(urls).toEqual([
      "https://resume.timgunter.ca",
      "https://resume.timgunter.ca/cto-a",
      "https://resume.timgunter.ca/cto-b",
    ]);
  });

  it("returns relative paths when base_url is empty", () => {
    const urls = build_variant_urls("");
    expect(urls).toEqual(["/", "/cto-a", "/cto-b"]);
  });
});

describe("build_person_jsonld", () => {
  const profile: Profile = {
    name: "Tim Gunter",
    photo: "assets/headshot.png",
    contact: {
      location: "Montreal, QC",
      phone: "555-0100",
      email: "tim@example.com",
      linkedin: "linkedin.com/in/guntertim",
    },
  };

  it("produces a valid Person object with all fields", () => {
    const result = build_person_jsonld(profile, "Software Engineer", "https://example.com");
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Person");
    expect(result.name).toBe("Tim Gunter");
    expect(result.jobTitle).toBe("Software Engineer");
    expect(result.url).toBe("https://example.com");
    expect(result.email).toBe("tim@example.com");
    expect(result.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Montreal, QC",
    });
    expect(result.sameAs).toEqual(["https://linkedin.com/in/guntertim"]);
  });

  it("omits url when base_url is null", () => {
    const result = build_person_jsonld(profile, "Engineer", null);
    expect(result.url).toBeUndefined();
  });

  it("skips email when value contains REDACTED", () => {
    const redacted_profile: Profile = {
      ...profile,
      contact: { ...profile.contact, email: "REDACTED" },
    };
    const result = build_person_jsonld(redacted_profile, "Engineer", null);
    expect(result.email).toBeUndefined();
  });

  it("omits sameAs when linkedin is not set", () => {
    const no_linkedin_profile: Profile = {
      ...profile,
      contact: { ...profile.contact, linkedin: undefined },
    };
    const result = build_person_jsonld(no_linkedin_profile, "Engineer", null);
    expect(result.sameAs).toBeUndefined();
  });
});

describe("build_webpage_jsonld", () => {
  it("produces a valid WebPage object with url", () => {
    const result = build_webpage_jsonld("My Page", "A description", "https://example.com");
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("WebPage");
    expect(result.name).toBe("My Page");
    expect(result.description).toBe("A description");
    expect(result.url).toBe("https://example.com");
  });

  it("omits url when null", () => {
    const result = build_webpage_jsonld("My Page", "A description", null);
    expect(result.url).toBeUndefined();
  });
});

describe("build_og_metadata", () => {
  it("builds title from profile name and resume title", () => {
    const og = build_og_metadata("Tim Gunter", "CTO", "A summary.", "https://example.com", "cto-a", "cto-a");
    expect(og.title).toBe("Tim Gunter - CTO");
  });

  it("strips markdown from description", () => {
    const og = build_og_metadata("Tim", "CTO", "Led **high-performing** teams.", "", "cto-a");
    expect(og.description).toBe("Led high-performing teams.");
  });

  it("truncates description to 200 characters", () => {
    const long_text = "A".repeat(300);
    const og = build_og_metadata("Tim", "CTO", long_text, "", "cto-a");
    expect(og.description.length).toBe(200);
  });

  it("builds image URL from base_url and image_variant", () => {
    const og = build_og_metadata("Tim", "CTO", "Summary.", "https://example.com", "cto-a");
    expect(og.image).toBe("https://example.com/og/cto-a.png");
  });

  it("returns null URL when url_variant is omitted", () => {
    const og = build_og_metadata("Tim", "CTO", "Summary.", "https://example.com", "cto-a");
    expect(og.url).toBeNull();
  });

  it("returns null URL when base_url is empty even with url_variant", () => {
    const og = build_og_metadata("Tim", "CTO", "Summary.", "", "cto-a", "cto-a");
    expect(og.url).toBeNull();
  });

  it("returns base_url directly for default variant", () => {
    const og = build_og_metadata("Tim", "CTO", "Summary.", "https://example.com", "default", "default");
    expect(og.url).toBe("https://example.com");
  });

  it("appends variant name to base_url for non-default variants", () => {
    const og = build_og_metadata("Tim", "CTO", "Summary.", "https://example.com", "cto-a", "cto-a");
    expect(og.url).toBe("https://example.com/cto-a");
  });
});
