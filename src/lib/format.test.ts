import { format_markdown, format_date, format_date_range, strip_markdown } from "./format.js";

describe("format_markdown", () => {
  it("converts **text** to <strong>text</strong>", () => {
    expect(format_markdown("Led **high-performing teams** to success")).toBe(
      "Led <strong>high-performing teams</strong> to success"
    );
  });

  it("handles multiple bold segments", () => {
    expect(format_markdown("**one** and **two**")).toBe(
      "<strong>one</strong> and <strong>two</strong>"
    );
  });

  it("converts *text* to <em>text</em>", () => {
    expect(format_markdown("This is *italic* text")).toBe(
      "This is <em>italic</em> text"
    );
  });

  it("converts `code` to <code>code</code>", () => {
    expect(format_markdown("Use `format_markdown` here")).toBe(
      "Use <code>format_markdown</code> here"
    );
  });

  it("converts [text](url) to an anchor tag", () => {
    expect(format_markdown("[example](https://example.com)")).toBe(
      '<a href="https://example.com">example</a>'
    );
  });

  it("returns text unchanged when no markdown present", () => {
    expect(format_markdown("plain text")).toBe("plain text");
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

describe("strip_markdown", () => {
  it("strips **bold** markers", () => {
    expect(strip_markdown("Led **high-performing teams** to success")).toBe(
      "Led high-performing teams to success"
    );
  });

  it("strips *italic* markers", () => {
    expect(strip_markdown("This is *italic* text")).toBe("This is italic text");
  });

  it("strips [text](url) links to text only", () => {
    expect(strip_markdown("Visit [example](https://example.com) now")).toBe(
      "Visit example now"
    );
  });

  it("strips `code` backticks", () => {
    expect(strip_markdown("Use `format_markdown` here")).toBe(
      "Use format_markdown here"
    );
  });

  it("collapses whitespace and trims", () => {
    expect(strip_markdown("  too   many    spaces  ")).toBe("too many spaces");
  });

  it("handles multiple markdown types together", () => {
    expect(strip_markdown("**Bold** and *italic* with [link](http://x.com) and `code`")).toBe(
      "Bold and italic with link and code"
    );
  });

  it("returns plain text unchanged", () => {
    expect(strip_markdown("plain text")).toBe("plain text");
  });
});
