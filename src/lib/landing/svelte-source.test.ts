import { content_measure_of } from "./svelte-source.js";

// The reader behind the content-width tests. Its job is to make two
// components' widths and gutters comparable, so what it must not do is
// report two sources as equal when a reader would see different layouts.
describe("content_measure_of", () => {
  const BASE = `
    .wrap { max-width: 1180px; padding-inline: 40px; }
    @media (max-width: 700px) {
      .wrap { padding-inline: 20px; }
    }
  `;

  it("reads the base rule and the override inside its media query", () => {
    expect(content_measure_of(BASE, ".wrap")).toEqual([
      { media: null, max_width: "1180px", padding_inline: "40px" },
      { media: "(max-width: 700px)", max_width: undefined, padding_inline: "20px" },
    ]);
  });

  it("tells apart the same override under a different breakpoint", () => {
    const moved = BASE.replace("700px", "760px");

    expect(content_measure_of(moved, ".wrap")).not.toEqual(content_measure_of(BASE, ".wrap"));
  });

  it("does not match a selector that only starts with the one asked for", () => {
    const source = ".wrap-inner { max-width: 10px; } .wrap { max-width: 20px; }";

    expect(content_measure_of(source, ".wrap")).toEqual([
      { media: null, max_width: "20px", padding_inline: undefined },
    ]);
  });

  it("throws when the selector has no rule, rather than comparing two empty lists", () => {
    expect(() => content_measure_of(".other { color: red; }", ".wrap")).toThrow(/no rule for \.wrap/);
  });
});
