import { describe, expect, it } from "vitest";

import { covers_exact_fields } from "./readout-fields.js";

describe("covers_exact_fields", () => {
  it("matches regardless of order", () => {
    expect(covers_exact_fields(["a", "b"], ["a", "b"])).toBe(true);
    expect(covers_exact_fields(["b", "a"], ["a", "b"])).toBe(true);
  });

  it("rejects a shorter or longer set", () => {
    expect(covers_exact_fields(["a"], ["a", "b"])).toBe(false);
    expect(covers_exact_fields(["a", "b", "c"], ["a", "b"])).toBe(false);
  });

  it("rejects a same-length set with the wrong members", () => {
    expect(covers_exact_fields(["a", "c"], ["a", "b"])).toBe(false);
  });

  it("rejects empty input against a non-empty expectation", () => {
    expect(covers_exact_fields([], ["a"])).toBe(false);
  });

  it("matches two empty sets", () => {
    expect(covers_exact_fields([], [])).toBe(true);
  });
});
