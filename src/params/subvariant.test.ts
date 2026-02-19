import { match } from "./subvariant.js";

describe("subvariant param matcher", () => {
  it("matches valid 8-char hex slugs", () => {
    expect(match("abc12345")).toBe(true);
    expect(match("00000000")).toBe(true);
    expect(match("deadbeef")).toBe(true);
  });

  it("rejects non-hex characters", () => {
    expect(match("ghijklmn")).toBe(false);
    expect(match("ABCD1234")).toBe(false);
  });

  it("rejects wrong lengths", () => {
    expect(match("abc1234")).toBe(false);
    expect(match("abc123456")).toBe(false);
    expect(match("")).toBe(false);
  });
});
