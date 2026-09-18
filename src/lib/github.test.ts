import { vi } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";

import {
  bucket_level,
  build_contribution_grid,
  load_github_contribution_data,
} from "./github.js";

import type { GithubContributionData } from "./github.js";

// --- Test fixtures ---

function make_data(overrides: Partial<GithubContributionData> = {}): GithubContributionData {
  return {
    generated_at: "2026-09-18T00:00:00.000Z",
    total_count: 0,
    days: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("bucket_level", () => {
  it("buckets a zero count as level 0 regardless of max", () => {
    expect(bucket_level(0, 10)).toBe(0);
  });

  it("buckets an all-zero calendar (max 0) as level 0", () => {
    expect(bucket_level(0, 0)).toBe(0);
  });

  it("buckets the calendar's own max as level 4", () => {
    expect(bucket_level(10, 10)).toBe(4);
  });

  it("buckets a count just above the 75% quartile as level 4", () => {
    expect(bucket_level(8, 10)).toBe(4);
  });

  it("buckets a count at the 75% quartile as level 3, not 4", () => {
    expect(bucket_level(7, 10)).toBe(3);
  });

  it("buckets a count at the 50% quartile as level 2, not 3", () => {
    expect(bucket_level(5, 10)).toBe(2);
  });

  it("buckets a count at the 25% quartile as level 1, not 2", () => {
    expect(bucket_level(2, 10)).toBe(1);
  });

  it("buckets the smallest nonzero count as level 1", () => {
    expect(bucket_level(1, 10)).toBe(1);
  });
});

describe("build_contribution_grid", () => {
  it("returns no weeks for an empty day list", () => {
    const grid = build_contribution_grid(make_data({ days: [] }));

    expect(grid.weeks).toEqual([]);
  });

  it("carries total_count and generated_at through unchanged", () => {
    const grid = build_contribution_grid(
      make_data({ total_count: 42, generated_at: "2026-01-01T00:00:00.000Z", days: [] }),
    );

    expect(grid.total_count).toBe(42);
    expect(grid.generated_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("pads a single day out to a full 7-day week", () => {
    // 2026-09-18 is a Friday (UTC), so it lands in column index 5.
    const grid = build_contribution_grid(make_data({ days: [{ date: "2026-09-18", count: 3 }] }));

    expect(grid.weeks).toHaveLength(1);
    expect(grid.weeks[0]).toHaveLength(7);
  });

  it("places a single day under its correct weekday column", () => {
    // 2026-09-18 is a Friday (UTC): Sun=0 .. Fri=5.
    const grid = build_contribution_grid(make_data({ days: [{ date: "2026-09-18", count: 3 }] }));

    expect(grid.weeks[0][5]).toEqual({ date: "2026-09-18", count: 3, level: 4 });
  });

  it("pads every other slot in a single-day week with null", () => {
    const grid = build_contribution_grid(make_data({ days: [{ date: "2026-09-18", count: 3 }] }));

    const non_null_count = grid.weeks[0].filter((cell) => cell !== null).length;
    expect(non_null_count).toBe(1);
  });

  it("starts a new week once a Sunday is reached", () => {
    // 2026-09-19 is a Saturday, 2026-09-20 is the next Sunday.
    const grid = build_contribution_grid(
      make_data({
        days: [
          { date: "2026-09-19", count: 1 },
          { date: "2026-09-20", count: 2 },
        ],
      }),
    );

    expect(grid.weeks).toHaveLength(2);
    // max across the calendar is 2, so count 1 lands at the 50% quartile (level 2).
    expect(grid.weeks[0][6]).toEqual({ date: "2026-09-19", count: 1, level: 2 });
    expect(grid.weeks[1][0]).toEqual({ date: "2026-09-20", count: 2, level: 4 });
  });

  it("buckets each day's level against the max across the whole calendar", () => {
    const grid = build_contribution_grid(
      make_data({
        days: [
          { date: "2026-09-13", count: 0 },
          { date: "2026-09-14", count: 10 },
        ],
      }),
    );

    const flat = grid.weeks.flat().filter((cell) => cell !== null);
    expect(flat.find((cell) => cell?.date === "2026-09-13")?.level).toBe(0);
    expect(flat.find((cell) => cell?.date === "2026-09-14")?.level).toBe(4);
  });
});

describe("load_github_contribution_data", () => {
  it("returns null when the generated file is missing", () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    expect(load_github_contribution_data()).toBeNull();
  });

  it("returns null when the generated file is not valid JSON", () => {
    vi.mocked(readFileSync).mockReturnValue("not json");

    expect(load_github_contribution_data()).toBeNull();
  });

  it("returns null when the parsed JSON is missing required fields", () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ total_count: 5 }));

    expect(load_github_contribution_data()).toBeNull();
  });

  it("returns null when the parsed JSON is not an object", () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(5));

    expect(load_github_contribution_data()).toBeNull();
  });

  it("returns null when an entry in days is missing a count", () => {
    // Malformed on purpose: a `days` entry without `count`, which
    // `GithubContributionData` cannot express, so this is built as loose
    // JSON rather than a `ContributionDay[]`.
    const malformed = { ...make_data(), days: [{ date: "2026-09-18" }] };
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(malformed));

    expect(load_github_contribution_data()).toBeNull();
  });

  it("returns the parsed data when the generated file is well-formed", () => {
    const data = make_data({ total_count: 7, days: [{ date: "2026-09-18", count: 1 }] });
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(data));

    expect(load_github_contribution_data()).toEqual(data);
  });

  it("reads from data/generated/github.json", () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(make_data()));

    load_github_contribution_data();

    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining("data/generated/github.json"),
      "utf-8",
    );
  });
});
