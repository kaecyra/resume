import { HUD_PALETTE } from "./palette.js";

describe("HUD_PALETTE", () => {
  it("matches the retro-technical-derived HUD palette from issue #166", () => {
    expect(HUD_PALETTE).toEqual({
      background: "#1a2744",
      accent: "#e87a2e",
      text: "#f0e6d6",
      secondary: "#8b9bb5",
    });
  });
});
