import { aggregate_slug_metrics, compute_start_at } from "./umami-api.js";

describe("compute_start_at", () => {
  const NOW = 1_700_000_000_000;

  it("returns correct offset for 7d", () => {
    expect(compute_start_at("7d", NOW)).toBe(NOW - 7 * 86_400_000);
  });

  it("returns correct offset for 30d", () => {
    expect(compute_start_at("30d", NOW)).toBe(NOW - 30 * 86_400_000);
  });

  it("returns 0 for all", () => {
    expect(compute_start_at("all", NOW)).toBe(0);
  });
});

describe("aggregate_slug_metrics", () => {
  it("maps counts correctly across all event types", () => {
    const data = {
      resume_views: [{ value: "abc123", total: 5 }],
      letter_views: [{ value: "abc123", total: 3 }],
      pdf_downloads: [{ value: "abc123", total: 1 }],
    };

    const result = aggregate_slug_metrics(data, ["abc123"]);

    expect(result.get("abc123")).toEqual({
      resume_views: 5,
      letter_views: 3,
      pdf_downloads: 1,
    });
  });

  it("returns zeros for slugs with no data", () => {
    const data = {
      resume_views: [],
      letter_views: [],
      pdf_downloads: [],
    };

    const result = aggregate_slug_metrics(data, ["missing"]);

    expect(result.get("missing")).toEqual({
      resume_views: 0,
      letter_views: 0,
      pdf_downloads: 0,
    });
  });

  it("ignores rows for unknown slugs", () => {
    const data = {
      resume_views: [{ value: "unknown", total: 10 }],
      letter_views: [],
      pdf_downloads: [],
    };

    const result = aggregate_slug_metrics(data, ["known"]);

    expect(result.has("unknown")).toBe(false);
    expect(result.get("known")).toEqual({
      resume_views: 0,
      letter_views: 0,
      pdf_downloads: 0,
    });
  });

  it("handles empty input arrays", () => {
    const data = {
      resume_views: [],
      letter_views: [],
      pdf_downloads: [],
    };

    const result = aggregate_slug_metrics(data, []);

    expect(result.size).toBe(0);
  });

  it("coerces string totals to numbers", () => {
    const data = {
      resume_views: [{ value: "s1", total: "42" as unknown as number }],
      letter_views: [{ value: "s1", total: "7" as unknown as number }],
      pdf_downloads: [{ value: "s1", total: "0" as unknown as number }],
    };

    const result = aggregate_slug_metrics(data, ["s1"]);

    const metrics = result.get("s1")!;
    expect(metrics.resume_views).toBe(42);
    expect(metrics.letter_views).toBe(7);
    expect(metrics.pdf_downloads).toBe(0);
    expect(typeof metrics.resume_views).toBe("number");
  });
});
