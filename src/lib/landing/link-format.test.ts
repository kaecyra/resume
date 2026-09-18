import { contact_icon, is_mailto } from "./link-format.js";

describe("is_mailto", () => {
  it("returns true for a mailto: url", () => {
    expect(is_mailto("mailto:test@example.com")).toBe(true);
  });

  it("returns false for an https: url", () => {
    expect(is_mailto("https://github.com/testuser")).toBe(false);
  });

  it("only matches mailto: as a prefix, not anywhere in the string", () => {
    expect(is_mailto("https://example.com/mailto:not-an-email")).toBe(false);
  });
});

describe("contact_icon", () => {
  it("returns the GitHub mark for a github.com url", () => {
    expect(contact_icon("https://github.com/testuser")).toBe("/landing/github-mark.svg");
  });

  it("returns the LinkedIn mark for a linkedin.com url", () => {
    expect(contact_icon("https://linkedin.com/in/testuser")).toBe("/landing/linkedin-mark.svg");
  });

  it("returns null for a mailto: url", () => {
    expect(contact_icon("mailto:test@example.com")).toBeNull();
  });

  it("returns null for an unrecognised provider rather than a fallback icon", () => {
    expect(contact_icon("https://mastodon.social/@testuser")).toBeNull();
  });
});
