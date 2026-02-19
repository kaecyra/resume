import { get_theme, get_theme_favicon, get_cover_letter_theme } from "./index.js";

describe("get_theme", () => {
  it("returns a component for classic", () => {
    const theme = get_theme("classic");
    expect(theme).toBeDefined();
  });

  it("returns a component for product-manual", () => {
    const theme = get_theme("product-manual");
    expect(theme).toBeDefined();
  });

  it("returns a component for retro-technical", () => {
    const theme = get_theme("retro-technical");
    expect(theme).toBeDefined();
  });

  it("throws for unknown theme name", () => {
    expect(() => get_theme("nonexistent")).toThrow('Unknown theme: "nonexistent"');
  });
});

describe("get_theme_favicon", () => {
  it("throws for unknown theme name", () => {
    expect(() => get_theme_favicon("nonexistent")).toThrow('Unknown theme: "nonexistent"');
  });
});

describe("get_cover_letter_theme", () => {
  it("returns a component for a known theme", () => {
    const component = get_cover_letter_theme("classic");
    expect(component).toBeDefined();
  });

  it("throws for unknown theme name", () => {
    expect(() => get_cover_letter_theme("nonexistent")).toThrow('Unknown theme: "nonexistent"');
  });
});
