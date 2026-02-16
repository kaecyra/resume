import { get_theme_palette, THEME_PALETTES } from "./theme-palettes.js";

describe("get_theme_palette", () => {
  it("returns retro-technical palette for retro-technical theme", () => {
    expect(get_theme_palette("retro-technical")).toBe(THEME_PALETTES["retro-technical"]);
  });

  it("returns classic palette for classic theme", () => {
    expect(get_theme_palette("classic")).toBe(THEME_PALETTES["classic"]);
  });

  it("returns product-manual palette for product-manual theme", () => {
    expect(get_theme_palette("product-manual")).toBe(THEME_PALETTES["product-manual"]);
  });

  it("falls back to classic palette for unknown theme", () => {
    expect(get_theme_palette("nonexistent")).toBe(THEME_PALETTES["classic"]);
  });
});
