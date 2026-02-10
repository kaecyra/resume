import { get_theme, get_theme_favicon } from "./index.js";

describe("get_theme", () => {
  it("returns a component for classic", () => {
    const theme = get_theme("classic");
    expect(theme).toBeDefined();
  });

  it("returns a component for product-manual", () => {
    const theme = get_theme("product-manual");
    expect(theme).toBeDefined();
  });

  it("throws for unknown theme name", () => {
    expect(() => get_theme("nonexistent")).toThrow('Unknown theme: "nonexistent"');
  });
});

describe("get_theme_favicon", () => {
  it("returns undefined for classic (no override)", () => {
    expect(get_theme_favicon("classic")).toBeUndefined();
  });

  it("returns undefined for product-manual (no override)", () => {
    expect(get_theme_favicon("product-manual")).toBeUndefined();
  });

  it("throws for unknown theme name", () => {
    expect(() => get_theme_favicon("nonexistent")).toThrow('Unknown theme: "nonexistent"');
  });
});
