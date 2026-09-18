import { split_role_badge } from "./hero-format.js";

describe("split_role_badge", () => {
  it("splits a title,company role into a mono tag and a display label", () => {
    expect(split_role_badge("VP Engineering, .Monks")).toEqual({
      tag: "VP Engineering",
      label: ".Monks",
    });
  });

  it("trims surrounding whitespace on both sides of the comma", () => {
    expect(split_role_badge("Staff Engineer ,  Acme Corp")).toEqual({
      tag: "Staff Engineer",
      label: "Acme Corp",
    });
  });

  it("falls back to the full string as the tag when there is no comma", () => {
    expect(split_role_badge("Independent")).toEqual({
      tag: "Independent",
      label: "",
    });
  });

  it("only splits on the first comma, keeping the rest of the string in the label", () => {
    expect(split_role_badge("CTO, Acme, Inc.")).toEqual({
      tag: "CTO",
      label: "Acme, Inc.",
    });
  });
});
