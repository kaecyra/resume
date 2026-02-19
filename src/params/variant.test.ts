import { match } from "./variant.js";

describe("variant param matcher", () => {
  it("matches plain variant names", () => {
    expect(match("cto-a")).toBe(true);
    expect(match("default")).toBe(true);
  });

  it("rejects filenames with dots", () => {
    expect(match("favicon.ico")).toBe(false);
    expect(match("robots.txt")).toBe(false);
  });
});
