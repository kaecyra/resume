// Cloudflare PoPs (network.cloudflare.com) named for the airport whose
// IATA code they share - any country, not only Canada - and, where the
// source data has it, that airport's physical runways.
//
// `POP_IDENTITY` (which PoPs exist, and their id/IATA/ICAO/city/country) is
// hand curated - Cloudflare doesn't publish that list as a file, and it
// changes rarely enough that maintaining it by hand is fine. Runway
// geometry is the opposite: it's exactly what OurAirports's `runways.csv`
// (davidmegginson.github.io/ourairports-data/runways.csv) already
// publishes, so `scripts/fetch-runways.ts` derives it mechanically via
// `parse_runways_csv` + `select_pop_runways` below (both pure, both tested
// here, and neither cares what country an ICAO code belongs to) and writes
// the committed result to `runway-data.generated.ts`. Re-run
// `npm run fetch-runways` to refresh it or pick up a newly-added PoP, from
// any country - no per-airport manual lookup.
//
// `runways` stays `undefined` rather than `[]` when the generated data has
// nothing for a PoP's ICAO code, so RunwayDiagram can tell "no data" apart
// from "genuinely no runways".
//
// Each end is stored as its own real lat/lon (`le_latitude_deg`/
// `le_longitude_deg` and the `he_` pair in the source CSV), not a heading
// number: an airport's runways sit at their own real offsets from one
// another - parallel runways are laterally separated, a crosswind runway
// may not cross them at all - and a single shared heading-plus-length model
// drew every runway through the same center point, which is a different,
// wrong airport. runway-diagram-layout.ts projects every end's lat/lon into
// one shared local frame so the drawing keeps that true relative geometry.

import { RUNWAYS_BY_ICAO } from "./runway-data.generated.js";

export interface RunwayEnd {
  ident: string;
  lat: number;
  lon: number;
}

export interface Runway {
  designator: string;
  low_end: RunwayEnd;
  high_end: RunwayEnd;
  length_ft: number;
  width_ft: number;
  closed: boolean;
}

export interface PopAirport {
  id: string;
  iata: string;
  icao: string;
  city: string;
  /** ISO 3166-1 alpha-2, e.g. "CA". */
  country: string;
  runways?: Runway[];
}

export const POP_IDENTITY: readonly Omit<PopAirport, "runways">[] = [
  { id: "yul", iata: "YUL", icao: "CYUL", city: "Montréal", country: "CA" },
  { id: "yyz", iata: "YYZ", icao: "CYYZ", city: "Toronto", country: "CA" },
  { id: "yvr", iata: "YVR", icao: "CYVR", city: "Vancouver", country: "CA" },
  { id: "yyc", iata: "YYC", icao: "CYYC", city: "Calgary", country: "CA" },
  { id: "ywg", iata: "YWG", icao: "CYWG", city: "Winnipeg", country: "CA" },
  { id: "yhz", iata: "YHZ", icao: "CYHZ", city: "Halifax", country: "CA" },
  { id: "yxe", iata: "YXE", icao: "CYXE", city: "Saskatoon", country: "CA" },
] as const;

export const CLOUDFLARE_POPS: readonly PopAirport[] = POP_IDENTITY.map((pop) => ({
  ...pop,
  runways: RUNWAYS_BY_ICAO[pop.icao],
}));

export function find_pop(id: string): PopAirport | undefined {
  return CLOUDFLARE_POPS.find((pop) => pop.id === id);
}

// --- Mechanical generation: OurAirports runways.csv -> Runway[] ----------
// Used only by scripts/fetch-runways.ts, kept here (like
// satellite-catalog.ts's satcat parsing) so the logic that decides what
// survives is tested directly rather than embedded in a script.

export interface RunwayCsvRow {
  airport_ident: string;
  length_ft: string;
  width_ft: string;
  closed: string;
  le_ident: string;
  le_latitude_deg: string;
  le_longitude_deg: string;
  he_ident: string;
  he_latitude_deg: string;
  he_longitude_deg: string;
}

const RUNWAY_CSV_COLUMNS = [
  "airport_ident",
  "length_ft",
  "width_ft",
  "closed",
  "le_ident",
  "le_latitude_deg",
  "le_longitude_deg",
  "he_ident",
  "he_latitude_deg",
  "he_longitude_deg",
] as const;

// Splits one CSV line, honouring double-quoted fields (a quoted field may
// hold commas, and "" inside quotes is a literal quote).
function split_csv_line(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

// Parses OurAirports's runways.csv down to the columns select_pop_runways
// needs. Throws when one of them is missing: a renamed column would
// otherwise select nothing and ship an empty diagram without any error.
export function parse_runways_csv(csv: string): RunwayCsvRow[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.length > 0);
  const header = split_csv_line(lines[0] ?? "");
  const index: Record<string, number> = {};
  for (const column of RUNWAY_CSV_COLUMNS) {
    const position = header.indexOf(column);
    if (position === -1) {
      throw new Error(`runways.csv is missing the ${column} column`);
    }
    index[column] = position;
  }

  return lines.slice(1).map((line) => {
    const fields = split_csv_line(line);
    return {
      airport_ident: fields[index.airport_ident],
      length_ft: fields[index.length_ft],
      width_ft: fields[index.width_ft],
      closed: fields[index.closed],
      le_ident: fields[index.le_ident],
      le_latitude_deg: fields[index.le_latitude_deg],
      le_longitude_deg: fields[index.le_longitude_deg],
      he_ident: fields[index.he_ident],
      he_latitude_deg: fields[index.he_latitude_deg],
      he_longitude_deg: fields[index.he_longitude_deg],
    };
  });
}

function to_finite_number(value: string): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Groups runways.csv rows by ICAO code, keeping only the ICAOs asked for
// and converting each surviving row into one physical Runway. A row
// missing a coordinate or length is dropped rather than producing a
// runway drawn at (NaN, NaN); an ICAO with no surviving rows is left out
// of the result entirely (not an empty array), matching the "no data yet"
// vs. "genuinely no runways" distinction PopAirport#runways relies on.
export function select_pop_runways(
  rows: readonly RunwayCsvRow[],
  icaos: readonly string[],
): Record<string, Runway[]> {
  const wanted = new Set(icaos);
  const by_icao: Record<string, Runway[]> = {};

  for (const row of rows) {
    if (!wanted.has(row.airport_ident)) continue;

    const length_ft = to_finite_number(row.length_ft);
    const width_ft = to_finite_number(row.width_ft);
    const le_lat = to_finite_number(row.le_latitude_deg);
    const le_lon = to_finite_number(row.le_longitude_deg);
    const he_lat = to_finite_number(row.he_latitude_deg);
    const he_lon = to_finite_number(row.he_longitude_deg);
    if (length_ft === null || width_ft === null || le_lat === null || le_lon === null || he_lat === null || he_lon === null) {
      continue;
    }

    const runway: Runway = {
      designator: `${row.le_ident}/${row.he_ident}`,
      low_end: { ident: row.le_ident, lat: le_lat, lon: le_lon },
      high_end: { ident: row.he_ident, lat: he_lat, lon: he_lon },
      length_ft,
      width_ft,
      closed: row.closed === "1",
    };

    (by_icao[row.airport_ident] ??= []).push(runway);
  }

  return by_icao;
}
