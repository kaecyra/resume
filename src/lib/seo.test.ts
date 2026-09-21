import { vi } from "vitest";

const mock_variants = { list: ["default", "cto-a", "cto-b"] };

vi.mock("./data.js", () => ({
  list_variants: () => mock_variants.list,
}));

import {
  build_document_title,
  build_landing_description,
  build_landing_title,
  build_llms_txt,
  build_og_metadata,
  build_person_context,
  build_person_jsonld,
  build_profile_page_jsonld,
  build_sitemap_urls,
  build_variant_canonical_url,
  CANONICAL_VARIANT,
} from "./seo.js";

import type { LandingData, LandingHero, Profile } from "./types.js";

const HERO: LandingHero = {
  name: "Tim Gunter",
  role: "VP Engineering, .Monks",
  location: "Montreal, QC",
  tagline: "I build systems, and lately I build them by directing AI agents.",
};

describe("build_sitemap_urls", () => {
  beforeEach(() => {
    mock_variants.list = ["default", "cto-a", "cto-b"];
  });

  it("lists only the landing page and the canonical variant, not every variant", () => {
    const urls = build_sitemap_urls("https://resume.timgunter.ca");
    expect(urls).toEqual([
      "https://resume.timgunter.ca",
      "https://resume.timgunter.ca/default",
    ]);
  });

  it("returns relative paths when base_url is empty", () => {
    expect(build_sitemap_urls("")).toEqual(["/", "/default"]);
  });

  it("throws when the canonical variant no longer exists", () => {
    mock_variants.list = ["cto-a", "cto-b"];
    expect(() => build_sitemap_urls("https://example.com")).toThrow(CANONICAL_VARIANT);
  });
});

describe("build_variant_canonical_url", () => {
  it("points every variant at the canonical variant, whichever variant is rendering", () => {
    expect(build_variant_canonical_url("https://example.com")).toBe("https://example.com/default");
  });

  it("returns null when base_url is empty, so no canonical tag is emitted", () => {
    expect(build_variant_canonical_url("")).toBeNull();
  });
});

describe("build_landing_title", () => {
  it("names the role and the document type, not just the person", () => {
    expect(build_landing_title(HERO)).toBe("Tim Gunter — VP Engineering | Resume");
  });

  it("uses the whole role when it carries no employer", () => {
    expect(build_landing_title({ ...HERO, role: "Independent" })).toBe(
      "Tim Gunter — Independent | Resume",
    );
  });
});

describe("build_landing_description", () => {
  it("leads with the resume framing and keeps the tagline behind it", () => {
    expect(build_landing_description(HERO)).toBe(
      "Resume of Tim Gunter, VP Engineering at .Monks in Montreal, QC. " +
        "I build systems, and lately I build them by directing AI agents.",
    );
  });

  it("omits the employer when the role carries none", () => {
    const description = build_landing_description({ ...HERO, role: "Independent" });
    expect(description).toBe(
      "Resume of Tim Gunter, Independent in Montreal, QC. " +
        "I build systems, and lately I build them by directing AI agents.",
    );
  });

  it("omits the location when the hero has none", () => {
    const description = build_landing_description({ ...HERO, location: "" });
    expect(description).toBe(
      "Resume of Tim Gunter, VP Engineering at .Monks. " +
        "I build systems, and lately I build them by directing AI agents.",
    );
  });

  it("strips markdown out of the tagline", () => {
    const description = build_landing_description({
      ...HERO,
      tagline: "I build **systems**.",
    });
    expect(description).toContain("I build systems.");
    expect(description).not.toContain("**");
  });

  it("truncates to 200 characters", () => {
    const description = build_landing_description({ ...HERO, tagline: "A".repeat(300) });
    expect(description.length).toBe(200);
  });
});

describe("build_document_title", () => {
  it("marks the page as a resume without touching the share-card title", () => {
    expect(build_document_title("Tim Gunter - Chief Technology Officer")).toBe(
      "Tim Gunter - Chief Technology Officer | Resume",
    );
  });
});

describe("build_person_context", () => {
  const landing: LandingData = {
    hero: HERO,
    projects: [],
    appearances: [],
    resume_links: ["default"],
    contact: [{ label: "@kaecyra", url: "https://github.com/kaecyra" }],
    github: { user: "kaecyra" },
    sections: ["hero"],
  };

  it("takes the employer from the hero role and the handle from the github block", () => {
    const context = build_person_context(landing, [
      { id: "strategy", name: "Strategy", level: 5 },
      { id: "culture", name: "Culture", level: 5 },
    ]);
    expect(context).toEqual({
      employer: ".Monks",
      github_user: "kaecyra",
      skills: ["Strategy", "Culture"],
    });
  });

  it("reports no employer when the hero role names none", () => {
    const context = build_person_context(
      { ...landing, hero: { ...HERO, role: "Independent" } },
      [],
    );
    expect(context.employer).toBeNull();
  });
});

describe("build_person_jsonld", () => {
  const profile: Profile = {
    name: "Tim Gunter",
    photo: "assets/headshot.png",
    contact: {
      location: "Montreal, QC",
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

  it("omits sameAs when neither profile nor context carries a link", () => {
    const no_linkedin_profile: Profile = {
      ...profile,
      contact: { ...profile.contact, linkedin: undefined },
    };
    const result = build_person_jsonld(no_linkedin_profile, "Engineer", null);
    expect(result.sameAs).toBeUndefined();
  });

  it("carries the GitHub profile alongside LinkedIn in sameAs", () => {
    const result = build_person_jsonld(profile, "Engineer", null, { github_user: "kaecyra" });
    expect(result.sameAs).toEqual([
      "https://linkedin.com/in/guntertim",
      "https://github.com/kaecyra",
    ]);
  });

  it("records the employer as an Organization and the role as an Occupation", () => {
    const result = build_person_jsonld(profile, "Chief Technology Officer", null, {
      employer: ".Monks",
    });
    expect(result.worksFor).toEqual({ "@type": "Organization", name: ".Monks" });
    expect(result.hasOccupation).toEqual({
      "@type": "Occupation",
      name: "Chief Technology Officer",
    });
  });

  it("omits worksFor when no employer is known, but still states the occupation", () => {
    const result = build_person_jsonld(profile, "Engineer", null);
    expect(result.worksFor).toBeUndefined();
    expect(result.hasOccupation).toEqual({ "@type": "Occupation", name: "Engineer" });
  });

  it("lists the skills it is given under knowsAbout", () => {
    const result = build_person_jsonld(profile, "Engineer", null, {
      skills: ["Strategy", "Culture"],
    });
    expect(result.knowsAbout).toEqual(["Strategy", "Culture"]);
  });

  it("omits knowsAbout when the skill list is empty", () => {
    const result = build_person_jsonld(profile, "Engineer", null, { skills: [] });
    expect(result.knowsAbout).toBeUndefined();
  });
});

describe("build_profile_page_jsonld", () => {
  const person = build_person_jsonld(
    { name: "Tim", photo: "p.png", contact: { location: "Montreal", email: "t@example.com" } },
    "Engineer",
    null,
  );

  it("types the page as a ProfilePage carrying the person as its subject", () => {
    const result = build_profile_page_jsonld("My Page", "A description", "https://example.com", person);
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("ProfilePage");
    expect(result.name).toBe("My Page");
    expect(result.description).toBe("A description");
    expect(result.url).toBe("https://example.com");
    expect(result.mainEntity).toBe(person);
  });

  it("omits url when null", () => {
    const result = build_profile_page_jsonld("My Page", "A description", null, person);
    expect(result.url).toBeUndefined();
  });
});

describe("build_llms_txt", () => {
  const input = {
    hero: HERO,
    base_url: "https://resume.timgunter.ca",
    email: "tim@example.com",
    links: [
      { label: "guntertim", url: "https://linkedin.com/in/guntertim" },
      { label: "@kaecyra", url: "https://github.com/kaecyra" },
    ],
    variants: [
      { slug: "default", title: "Chief Technology Officer", summary: "The default pitch." },
      { slug: "cto-a", title: "Chief Technology Officer", summary: "The operator pitch." },
    ],
  };

  it("leads with the person, the role and the resume framing", () => {
    const text = build_llms_txt(input);
    expect(text.startsWith("# Tim Gunter — VP Engineering | Resume\n")).toBe(true);
    expect(text).toContain("> Resume of Tim Gunter, VP Engineering at .Monks in Montreal, QC.");
  });

  it("names the canonical resume and its PDF", () => {
    const text = build_llms_txt(input);
    expect(text).toContain("https://resume.timgunter.ca/default");
    expect(text).toContain("https://resume.timgunter.ca/default.pdf");
  });

  it("lists the other variants and what each one is for", () => {
    const text = build_llms_txt(input);
    expect(text).toContain("https://resume.timgunter.ca/cto-a");
    expect(text).toContain("The operator pitch.");
  });

  it("lists the contact address and the profile links", () => {
    const text = build_llms_txt(input);
    expect(text).toContain("tim@example.com");
    expect(text).toContain("https://github.com/kaecyra");
  });

  it("collapses a multi-line markdown summary onto one bullet", () => {
    const text = build_llms_txt({
      ...input,
      variants: [
        { slug: "cto-a", title: "CTO", summary: "Led **teams**.\nAcross three\ncontinents." },
      ],
    });
    expect(text).toContain("- [CTO](https://resume.timgunter.ca/cto-a): Led teams. Across three continents.");
  });

  it("omits the email line when no address is published", () => {
    const text = build_llms_txt({ ...input, email: undefined });
    expect(text).not.toContain("Email:");
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

  it("keeps og:url on the variant's own page, not the canonical one", () => {
    const og = build_og_metadata("Tim", "CTO", "Summary.", "https://example.com", "cto-a", "cto-a");
    expect(og.url).toBe("https://example.com/cto-a");
    expect(og.url).not.toBe(build_variant_canonical_url("https://example.com"));
  });

  it("appends /default to base_url for the default variant, same as any other variant", () => {
    const og = build_og_metadata("Tim", "CTO", "Summary.", "https://example.com", "default", "default");
    expect(og.url).toBe("https://example.com/default");
  });
});
