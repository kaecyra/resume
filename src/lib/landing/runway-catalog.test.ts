import { CLOUDFLARE_POPS, find_pop, parse_runways_csv, select_pop_runways } from "./runway-catalog.js";

const CSV_HEADER =
  "id,airport_ref,airport_ident,length_ft,width_ft,surface,lighted,closed,le_ident,le_latitude_deg,le_longitude_deg,le_elevation_ft,le_heading_degT,le_displaced_threshold_ft,he_ident,he_latitude_deg,he_longitude_deg,he_elevation_ft,he_heading_degT,he_displaced_threshold_ft";

function csv_row(overrides: Partial<Record<string, string>> = {}): string {
  const base: Record<string, string> = {
    id: "1",
    airport_ref: "1928",
    airport_ident: "CYUL",
    length_ft: "11000",
    width_ft: "200",
    surface: "ASP",
    lighted: "1",
    closed: "0",
    le_ident: "06L",
    le_latitude_deg: "45.461063385009766",
    le_longitude_deg: "-73.7650146484375",
    le_elevation_ft: "96",
    le_heading_degT: "42.7",
    le_displaced_threshold_ft: "",
    he_ident: "24R",
    he_latitude_deg: "45.4832763671875",
    he_longitude_deg: "-73.73592376708984",
    he_elevation_ft: "106",
    he_heading_degT: "222.7",
    he_displaced_threshold_ft: "",
  };
  const merged = { ...base, ...overrides };
  return CSV_HEADER.split(",")
    .map((col) => merged[col])
    .join(",");
}

describe("parse_runways_csv", () => {
  it("parses rows into the named columns select_pop_runways needs", () => {
    const rows = parse_runways_csv(`${CSV_HEADER}\n${csv_row()}`);
    expect(rows).toEqual([
      {
        airport_ident: "CYUL",
        length_ft: "11000",
        width_ft: "200",
        closed: "0",
        le_ident: "06L",
        le_latitude_deg: "45.461063385009766",
        le_longitude_deg: "-73.7650146484375",
        he_ident: "24R",
        he_latitude_deg: "45.4832763671875",
        he_longitude_deg: "-73.73592376708984",
      },
    ]);
  });

  it("throws if a required column is missing from the header - a renamed column would otherwise silently select nothing", () => {
    const header_without_closed = CSV_HEADER.split(",")
      .filter((col) => col !== "closed")
      .join(",");
    expect(() => parse_runways_csv(header_without_closed)).toThrow(/closed/);
  });
});

describe("select_pop_runways", () => {
  it("groups matching rows by airport_ident into Runway objects, ignoring airports not asked for - any country, not just Canada", () => {
    const rows = parse_runways_csv(
      [
        CSV_HEADER,
        csv_row({ airport_ident: "CYUL", le_ident: "06L", he_ident: "24R" }),
        csv_row({ airport_ident: "CYUL", le_ident: "06R", he_ident: "24L", length_ft: "9600" }),
        csv_row({ airport_ident: "KJFK", le_ident: "04L", he_ident: "22R" }),
        csv_row({ airport_ident: "EGLL", le_ident: "09L", he_ident: "27R" }),
      ].join("\n"),
    );

    const by_icao = select_pop_runways(rows, ["CYUL", "KJFK"]);

    expect(Object.keys(by_icao).sort()).toEqual(["CYUL", "KJFK"]);
    expect(by_icao.CYUL).toHaveLength(2);
    expect(by_icao.KJFK).toEqual([
      {
        designator: "04L/22R",
        low_end: { ident: "04L", lat: 45.461063385009766, lon: -73.7650146484375 },
        high_end: { ident: "22R", lat: 45.4832763671875, lon: -73.73592376708984 },
        length_ft: 11000,
        width_ft: 200,
        closed: false,
      },
    ]);
  });

  it("marks closed='1' rows as closed", () => {
    const rows = parse_runways_csv(`${CSV_HEADER}\n${csv_row({ closed: "1" })}`);
    const by_icao = select_pop_runways(rows, ["CYUL"]);
    expect(by_icao.CYUL[0].closed).toBe(true);
  });

  it("skips a row missing a coordinate or length rather than producing a broken runway", () => {
    const rows = parse_runways_csv(
      [CSV_HEADER, csv_row({ le_latitude_deg: "" }), csv_row({ length_ft: "" })].join("\n"),
    );
    const by_icao = select_pop_runways(rows, ["CYUL"]);
    expect(by_icao.CYUL ?? []).toEqual([]);
  });

  it("omits an airport entirely from the result when none of its rows survive, rather than an empty array", () => {
    const rows = parse_runways_csv(`${CSV_HEADER}\n${csv_row({ airport_ident: "CYUL" })}`);
    const by_icao = select_pop_runways(rows, ["CYUL", "CYVR"]);
    expect(by_icao.CYVR).toBeUndefined();
  });
});

describe("CLOUDFLARE_POPS", () => {
  it("lists every PoP with a unique id, a valid IATA/ICAO/country, and (today) every entry in Canada", () => {
    const ids = CLOUDFLARE_POPS.map((pop) => pop.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const pop of CLOUDFLARE_POPS) {
      expect(pop.iata).toMatch(/^[A-Z]{3}$/);
      expect(pop.icao).toMatch(/^[A-Z]{4}$/);
      expect(pop.country).toMatch(/^[A-Z]{2}$/);
      // Canada's ICAO prefix happens to be "C" - true of every entry right
      // now because the catalog is Canada-only today, not a rule the
      // parsing/selection code enforces (a non-Canadian PoP is just another
      // POP_IDENTITY row away).
      if (pop.country === "CA") {
        expect(pop.icao).toBe(`C${pop.iata}`);
      }
    }
  });

  it("carries YUL's three physical runways, each end at its own real coordinate", () => {
    const yul = find_pop("yul");
    expect(yul).toBeDefined();
    expect(yul?.runways).toHaveLength(3);

    const long = yul?.runways?.find((r) => r.designator === "06L/24R");
    expect(long).toMatchObject({
      low_end: { ident: "06L" },
      high_end: { ident: "24R" },
      length_ft: 11000,
      width_ft: 200,
      closed: false,
    });
    expect(long?.low_end.lat).toBeCloseTo(45.4611, 3);
    expect(long?.high_end.lat).toBeCloseTo(45.4833, 3);

    const closed = yul?.runways?.find((r) => r.designator === "10/28");
    expect(closed?.closed).toBe(true);

    // The two parallel runways must not share a real position with each
    // other, or with the crosswind runway - that was the whole bug.
    const parallel = yul?.runways?.find((r) => r.designator === "06R/24L");
    expect(long?.low_end.lon).not.toBeCloseTo(parallel!.low_end.lon, 3);
  });

  it("leaves runways undefined, never an empty array, for a PoP the generated data has nothing for", () => {
    for (const pop of CLOUDFLARE_POPS) {
      if (pop.runways !== undefined) {
        expect(pop.runways.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("find_pop", () => {
  it("returns undefined for an id not in the catalog", () => {
    expect(find_pop("xxx")).toBeUndefined();
  });
});
