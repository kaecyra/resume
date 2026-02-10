import { format_bold, format_date, format_date_range } from "./format.js";

describe("format_bold", () => {
  it("converts **text** to <strong>text</strong>", () => {
    expect(format_bold("Led **high-performing teams** to success")).toBe(
      "Led <strong>high-performing teams</strong> to success"
    );
  });

  it("handles multiple bold segments", () => {
    expect(format_bold("**one** and **two**")).toBe(
      "<strong>one</strong> and <strong>two</strong>"
    );
  });

  it("returns text unchanged when no bold markers present", () => {
    expect(format_bold("plain text")).toBe("plain text");
  });
});

describe("format_date", () => {
  it("formats YYYY-MM to Mon YYYY", () => {
    expect(format_date("2024-07")).toBe("Jul 2024");
  });

  it("formats January correctly", () => {
    expect(format_date("2020-01")).toBe("Jan 2020");
  });

  it("formats December correctly", () => {
    expect(format_date("2019-12")).toBe("Dec 2019");
  });
});

describe("format_date_range", () => {
  it("formats a range with both dates", () => {
    expect(format_date_range("2022-02", "2024-07")).toBe("Feb 2022 - Jul 2024");
  });

  it("uses Present when end is null", () => {
    expect(format_date_range("2024-07", null)).toBe("Jul 2024 - Present");
  });
});
