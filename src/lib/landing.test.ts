import { vi } from "vitest";
import yaml from "js-yaml";

import type { LandingAbout, LandingData } from "./types.js";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";

import { load_landing_data, validate_landing_data } from "./landing.js";

// --- Test fixtures ---

const MOCK_LANDING_DATA: LandingData = {
  hero: {
    name: "Test Person",
    role: "Engineer",
    tagline: "I build things.",
    location: "Somewhere, QC",
  },
  projects: [
    {
      id: "proj-a",
      name: "Project A",
      blurb: "Does a thing.",
      repo_url: "https://github.com/example/proj-a",
      stack: ["TypeScript"],
      status: "Active",
    },
  ],
  appearances: [
    {
      id: "appearance-a",
      event: "Test Conference 2026",
      what: "Did a thing there",
      date: "January 2026",
      blurb: "Talked about the thing.",
    },
  ],
  resume_links: ["default"],
  contact: [{ label: "Email", url: "mailto:test@example.com" }],
  github: { user: "testuser" },
  sections: ["hero", "divider", "commits", "work", "contact"],
};

function make_landing(overrides: Partial<LandingData> = {}): LandingData {
  return { ...MOCK_LANDING_DATA, ...overrides };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

describe("load_landing_data", () => {
  it("reads and parses data/landing.yaml", () => {
    vi.mocked(readFileSync).mockReturnValue(yaml.dump(MOCK_LANDING_DATA));

    const result = load_landing_data();

    expect(result).toEqual(MOCK_LANDING_DATA);
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining("landing.yaml"),
      "utf-8",
    );
  });
});

describe("validate_landing_data", () => {
  const VALID_VARIANTS = ["default", "cto-a"];

  it("returns empty array for valid landing data", () => {
    const errors = validate_landing_data(make_landing(), VALID_VARIANTS);
    expect(errors).toEqual([]);
  });

  it("reports one error and does not throw for an empty document", () => {
    const errors = validate_landing_data(undefined as unknown as LandingData, VALID_VARIANTS);
    expect(errors).toEqual([
      expect.objectContaining({ message: expect.stringContaining("must contain a document") }),
    ]);
  });

  it("does not throw when projects is a map instead of an array", () => {
    const landing = make_landing({ projects: { odette: {} } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "projects must be an array" }),
    );
  });

  it("does not throw when contact is a map instead of an array", () => {
    const landing = make_landing({ contact: { email: "test@example.com" } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "contact must be an array" }),
    );
  });

  it("does not throw when resume_links is a map instead of an array", () => {
    const landing = make_landing({ resume_links: { variant: "default" } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("resume_links must contain exactly one entry") }),
    );
  });

  it("does not throw when sections is a map instead of an array", () => {
    const landing = make_landing({ sections: { hero: true } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "sections must be an array" }),
    );
  });

  it.each(["name", "role", "location", "tagline"] as const)(
    "detects a missing hero %s",
    (field) => {
      const landing = make_landing({
        hero: { ...MOCK_LANDING_DATA.hero, [field]: "" },
      });
      expect(validate_landing_data(landing, VALID_VARIANTS)).toContainEqual(
        expect.objectContaining({
          message: "hero is missing required fields (name, role, location, tagline)",
        }),
      );
    },
  );

  it("detects a missing projects array", () => {
    const landing = make_landing({ projects: undefined as unknown as never });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "projects must be an array" }),
    );
  });

  it("detects a project missing an id", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], id: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "project is missing an id" }),
    );
  });

  it("detects duplicate project ids", () => {
    const landing = make_landing({
      projects: [MOCK_LANDING_DATA.projects[0], MOCK_LANDING_DATA.projects[0]],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `duplicate project id "proj-a"` }),
    );
  });

  it("detects a project missing name or blurb", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], name: "", blurb: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" is missing name, blurb, or status` }),
    );
  });

  it("detects a project missing status", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], status: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" is missing name, blurb, or status` }),
    );
  });

  it("detects a project missing a stack array", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], stack: undefined as unknown as string[] }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" is missing a stack array` }),
    );
  });

  it("detects a project links field that is not an array", () => {
    const landing = make_landing({
      projects: [
        { ...MOCK_LANDING_DATA.projects[0], links: "not-an-array" as unknown as never },
      ],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" links must be an array` }),
    );
  });

  it("detects a project link entry missing label or url", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], links: [{ label: "", url: "" }] }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `project "proj-a" link 0 is missing label or url` }),
    );
  });

  it("validates clean when a project's links array is empty", () => {
    const landing = make_landing({
      projects: [{ ...MOCK_LANDING_DATA.projects[0], links: [] }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toEqual([]);
  });

  it("detects empty resume_links", () => {
    const landing = make_landing({ resume_links: [] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("resume_links must contain exactly one entry") }),
    );
  });

  it("detects resume_links with more than one entry", () => {
    const landing = make_landing({ resume_links: ["default", "cto-a"] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("resume_links must contain exactly one entry") }),
    );
  });

  it("detects a resume_links entry that is not a valid variant", () => {
    const landing = make_landing({ resume_links: ["ghost-variant"] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({
        message: `resume_links variant "ghost-variant" is not a valid variant`,
      }),
    );
  });

  it("does not throw when appearances is a map instead of an array", () => {
    const landing = make_landing({ appearances: { gtc: {} } as unknown as never });
    expect(() => validate_landing_data(landing, VALID_VARIANTS)).not.toThrow();
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "appearances must be an array" }),
    );
  });

  it("detects a missing appearances array", () => {
    const landing = make_landing({ appearances: undefined as unknown as never });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "appearances must be an array" }),
    );
  });

  it("detects an appearance missing an id", () => {
    const landing = make_landing({
      appearances: [{ ...MOCK_LANDING_DATA.appearances[0], id: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "appearance is missing an id" }),
    );
  });

  it("detects duplicate appearance ids", () => {
    const landing = make_landing({
      appearances: [MOCK_LANDING_DATA.appearances[0], MOCK_LANDING_DATA.appearances[0]],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `duplicate appearance id "appearance-a"` }),
    );
  });

  it("detects an appearance missing event, what, date, or blurb", () => {
    const landing = make_landing({
      appearances: [{ ...MOCK_LANDING_DATA.appearances[0], event: "", what: "", date: "", blurb: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({
        message: `appearance "appearance-a" is missing event, what, date, or blurb`,
      }),
    );
  });

  it("detects a missing contact array", () => {
    const landing = make_landing({ contact: undefined as unknown as never });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "contact must be an array" }),
    );
  });

  it("detects a contact entry missing a label or url", () => {
    const landing = make_landing({
      contact: [{ label: "", url: "" }],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "contact entry 0 is missing label or url" }),
    );
  });

  it("detects a duplicate contact url", () => {
    const landing = make_landing({
      contact: [
        { label: "Email", url: "mailto:test@example.com" },
        { label: "Also email", url: "mailto:test@example.com" },
      ],
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `duplicate contact url "mailto:test@example.com"` }),
    );
  });

  it("detects missing github.user", () => {
    const landing = make_landing({ github: { user: "" } });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "github.user is required" }),
    );
  });

  it("detects a missing sections array", () => {
    const landing = make_landing({ sections: undefined as unknown as never });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: "sections must be an array" }),
    );
  });

  it("detects duplicate sections", () => {
    const landing = make_landing({ sections: ["hero", "hero"] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `duplicate section "hero"` }),
    );
  });

  it("detects a section that nothing renders", () => {
    const landing = make_landing({ sections: ["hero", "testimonials"] });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors).toContainEqual(
      expect.objectContaining({ message: `section "testimonials" is not a known section` }),
    );
  });

  it("accumulates multiple errors from different branches", () => {
    const landing = make_landing({
      hero: { name: "", role: "", location: "", tagline: "" },
      resume_links: [],
      github: { user: "" },
    });
    const errors = validate_landing_data(landing, VALID_VARIANTS);
    expect(errors.length).toBeGreaterThanOrEqual(3);

    const messages = errors.map((e) => e.message);
    expect(messages).toContainEqual(expect.stringContaining("hero is missing required fields"));
    expect(messages).toContainEqual(expect.stringContaining("resume_links must contain"));
    expect(messages).toContainEqual(expect.stringContaining("github.user is required"));
  });

  // These two go through js-yaml's real parser rather than a TypeScript cast,
  // so the wrong-typed collection is the actual shape `yaml.load` produces
  // from a YAML mapping written where a sequence belongs - not a shape the
  // type system would let anyone construct by hand.
  describe("using the real YAML parser", () => {
    it("does not throw and reports one error for an empty document", () => {
      const parsed = yaml.load("") as unknown as LandingData;
      expect(parsed).toBeUndefined();
      expect(() => validate_landing_data(parsed, VALID_VARIANTS)).not.toThrow();
      const errors = validate_landing_data(parsed, VALID_VARIANTS);
      expect(errors).toEqual([
        expect.objectContaining({ message: expect.stringContaining("must contain a document") }),
      ]);
    });

    it("does not throw when projects is written as a YAML mapping instead of a sequence", () => {
      const source = yaml.dump({ ...MOCK_LANDING_DATA, projects: { odette: { name: "oops" } } });
      const parsed = yaml.load(source) as unknown as LandingData;
      expect(() => validate_landing_data(parsed, VALID_VARIANTS)).not.toThrow();
      const errors = validate_landing_data(parsed, VALID_VARIANTS);
      expect(errors).toContainEqual(
        expect.objectContaining({ message: "projects must be an array" }),
      );
    });
  });
});

// --- "Off the Clock" (#241) ---

const MOCK_ABOUT: LandingAbout = {
  heading: "Off the Clock",
  interests: ["Homelab", "Golf"],
  portrait: { src: "/assets/portrait.png", alt: "Portrait" },
  lead: "I like building things.",
  paragraphs: ["I run a homelab."],
  photos_label: "Lately",
  photos: [{ id: "golf", src: "/landing/photos/golf.jpg", alt: "Golf", caption: "Won it." }],
  books_label: "Worth reading",
  books: [
    {
      id: "book-a",
      title: "Book A",
      author: "Author A",
      cover: "/landing/books/a.jpg",
      cover_alt: "Cover of Book A",
      url: "https://example.com/a",
    },
  ],
};

function make_about(overrides: Partial<LandingAbout> = {}): LandingData {
  return make_landing({
    about: { ...MOCK_ABOUT, ...overrides },
    sections: [...MOCK_LANDING_DATA.sections, "about"],
  });
}

function about_errors(landing: LandingData): string[] {
  return validate_landing_data(landing, ["default"]).map((error) => error.message);
}

describe("validate_landing_data: about", () => {
  it("accepts a complete about block named in sections", () => {
    expect(about_errors(make_about())).toEqual([]);
  });

  it("accepts a document with no about block when sections does not name it", () => {
    expect(about_errors(make_landing())).toEqual([]);
  });

  it("requires the about block when sections names it", () => {
    const landing = make_landing({ sections: [...MOCK_LANDING_DATA.sections, "about"] });
    expect(about_errors(landing)).toContain('about is required when sections includes "about"');
  });

  it.each(["heading", "lead"] as const)("detects a missing about %s", (field) => {
    expect(about_errors(make_about({ [field]: "" }))).toContain(
      "about is missing required fields (heading, lead)",
    );
  });

  it("detects a portrait missing its alt text", () => {
    expect(about_errors(make_about({ portrait: { src: "/a.png", alt: "" } }))).toContain(
      "about.portrait is missing src or alt",
    );
  });

  it("detects an image path that is not site-relative", () => {
    // The CSP serves images from 'self' only, so a hotlinked cover renders
    // as a broken image in production while looking fine in a test.
    const book = { ...MOCK_ABOUT.books[0], cover: "https://covers.example.com/a.jpg" };
    expect(about_errors(make_about({ books: [book] }))).toContain(
      'book "book-a" cover must be a site path starting with "/"',
    );
  });

  it("detects a portrait or photo path that is not site-relative", () => {
    const photo = { ...MOCK_ABOUT.photos[0], src: "photos/golf.jpg" };
    const errors = about_errors(
      make_about({ portrait: { src: "https://example.com/me.png", alt: "Me" }, photos: [photo] }),
    );

    expect(errors).toContain('about.portrait src must be a site path starting with "/"');
    expect(errors).toContain('photo "golf" src must be a site path starting with "/"');
  });

  it("detects an interests entry that is not a non-empty string", () => {
    expect(about_errors(make_about({ interests: ["Golf", ""] }))).toContain(
      "about.interests must be a list of non-empty strings",
    );
  });

  it("detects paragraphs that are not a list", () => {
    expect(about_errors(make_about({ paragraphs: "one" as unknown as string[] }))).toContain(
      "about.paragraphs must be a list of non-empty strings",
    );
  });

  it("detects a photo missing its caption", () => {
    const photo = { ...MOCK_ABOUT.photos[0], caption: "" };
    expect(about_errors(make_about({ photos: [photo] }))).toContain(
      'photo "golf" is missing src, alt, or caption',
    );
  });

  it("detects duplicate photo ids", () => {
    const photos = [MOCK_ABOUT.photos[0], MOCK_ABOUT.photos[0]];
    expect(about_errors(make_about({ photos }))).toContain('duplicate photo id "golf"');
  });

  it("requires photos_label when there are photos", () => {
    expect(about_errors(make_about({ photos_label: "" }))).toContain(
      "about.photos_label is required when about.photos is not empty",
    );
  });

  it("allows an empty photos list with no label", () => {
    expect(about_errors(make_about({ photos: [], photos_label: "" }))).toEqual([]);
  });

  it.each(["title", "author", "cover", "cover_alt"] as const)("detects a book missing %s", (field) => {
    const book = { ...MOCK_ABOUT.books[0], [field]: "" };
    expect(about_errors(make_about({ books: [book] }))).toContain(
      'book "book-a" is missing title, author, cover, or cover_alt',
    );
  });

  it("detects duplicate book ids", () => {
    const books = [MOCK_ABOUT.books[0], MOCK_ABOUT.books[0]];
    expect(about_errors(make_about({ books }))).toContain('duplicate book id "book-a"');
  });

  it("detects a book url that is not https", () => {
    const book = { ...MOCK_ABOUT.books[0], url: "http://example.com" };
    expect(about_errors(make_about({ books: [book] }))).toContain(
      'book "book-a" url must start with https://',
    );
  });

  it("accepts a book with no url", () => {
    const { url: _url, ...book } = MOCK_ABOUT.books[0];
    expect(about_errors(make_about({ books: [book] }))).toEqual([]);
  });

  it("requires books_label when there are books", () => {
    expect(about_errors(make_about({ books_label: "" }))).toContain(
      "about.books_label is required when about.books is not empty",
    );
  });

  it("does not throw when books is a map instead of an array", () => {
    const landing = make_about({ books: { a: {} } as unknown as never });
    expect(() => validate_landing_data(landing, ["default"])).not.toThrow();
    expect(about_errors(landing)).toContain("about.books must be an array");
  });
});
