import { split_tagline } from "./tagline-format.js";

describe("split_tagline", () => {
  const TAGLINE = "I build systems by directing AI agents instead of typing every line.";

  it("splits the tagline into the text before, the emphasised phrase, and the text after", () => {
    expect(split_tagline(TAGLINE, "directing AI agents")).toEqual({
      before: "I build systems by ",
      emphasis: "directing AI agents",
      after: " instead of typing every line.",
    });
  });

  it("returns the whole tagline unemphasised when no phrase is given", () => {
    expect(split_tagline(TAGLINE, undefined)).toEqual({
      before: TAGLINE,
      emphasis: "",
      after: "",
    });
  });

  it("keeps the tagline intact when the phrase is not present, rather than dropping text", () => {
    // validate_landing_data rejects this, so this only guards the case where
    // data reached the component without passing validation. The failure
    // mode has to be "no highlight", never "missing words".
    expect(split_tagline(TAGLINE, "not in here")).toEqual({
      before: TAGLINE,
      emphasis: "",
      after: "",
    });
  });

  it("emphasises only the first occurrence when the phrase repeats", () => {
    const parts = split_tagline("agents and more agents", "agents");

    expect(parts.before).toBe("");
    expect(parts.emphasis).toBe("agents");
    expect(parts.after).toBe(" and more agents");
  });

  it("handles a phrase at the very start and at the very end without producing stray text", () => {
    expect(split_tagline("lead in tail", "lead")).toEqual({
      before: "",
      emphasis: "lead",
      after: " in tail",
    });
    expect(split_tagline("lead in tail", "tail")).toEqual({
      before: "lead in ",
      emphasis: "tail",
      after: "",
    });
  });
});
