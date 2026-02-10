import { get_theme } from "./index.js";

describe("get_theme", () => {
  it("returns a component for classic", () => {
    const theme = get_theme("classic");
    expect(theme).toBeDefined();
  });

  it("throws for unknown theme name", () => {
    expect(() => get_theme("nonexistent")).toThrow('Unknown theme: "nonexistent"');
  });
});
