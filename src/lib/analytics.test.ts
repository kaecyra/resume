import { filter_defined } from "./analytics.js";

describe("filter_defined", () => {
  it("removes undefined values", () => {
    expect(filter_defined({ a: "1", b: undefined, c: "3" })).toEqual({ a: "1", c: "3" });
  });

  it("returns all entries when none are undefined", () => {
    expect(filter_defined({ x: "hello", y: "world" })).toEqual({ x: "hello", y: "world" });
  });

  it("returns empty object when all values are undefined", () => {
    expect(filter_defined({ a: undefined, b: undefined })).toEqual({});
  });

  it("returns empty object for empty input", () => {
    expect(filter_defined({})).toEqual({});
  });
});
