// Which satellites the hero globe shows (#203), and the shape of the file
// scripts/fetch-satellites.ts writes for it. Selection is pure data in,
// data out: the fetch script downloads CelesTrak's SATCAT and its active GP
// element set, and everything that decides what survives into the payload
// lives here, where it is tested directly.

// The flagships: the only satellites that get an orbit ring and an icon.
// Everything else selected is a plain dot.
export type FlagshipKind =
  | "iss"
  | "hubble"
  | "sentinel-1"
  | "sentinel-2"
  | "earthcare"
  | "rcm"
  | "radarsat-2"
  | "ghgsat";

// Matched against SATCAT's OBJECT_NAME. Anchored at both ends so a docked
// ISS module ("ISS (NAUKA)") or a sibling mission ("SENTINEL-6A",
// "RADARSAT-1") never slips in on a prefix.
const FLAGSHIP_PATTERNS: readonly (readonly [FlagshipKind, RegExp])[] = [
  ["iss", /^ISS \(ZARYA\)$/],
  ["hubble", /^HST$/],
  ["sentinel-1", /^SENTINEL-1[A-Z]$/],
  ["sentinel-2", /^SENTINEL-2[A-Z]$/],
  ["earthcare", /^EARTHCARE$/],
  ["rcm", /^RCM-\d+$/],
  ["radarsat-2", /^RADARSAT-2$/],
  ["ghgsat", /^GHGSAT-C\d+$/],
];

const FLAGSHIP_KINDS: ReadonlySet<string> = new Set(FLAGSHIP_PATTERNS.map(([kind]) => kind));

// SATCAT operational status codes that mean the satellite is still working:
// operational, partially operational, backup, spare, extended mission.
// Everything else (nonoperational, decayed, unknown) is dropped.
const ACTIVE_OPS_STATUS: ReadonlySet<string> = new Set(["+", "P", "B", "S", "X"]);

const CANADA_OWNER_CODE = "CA";
const PAYLOAD_OBJECT_TYPE = "PAY";

// The SATCAT columns selection needs, out of the many the CSV carries.
export interface SatcatRow {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  OBJECT_TYPE: string;
  OPS_STATUS_CODE: string;
  OWNER: string;
}

const SATCAT_COLUMNS = ["OBJECT_NAME", "NORAD_CAT_ID", "OBJECT_TYPE", "OPS_STATUS_CODE", "OWNER"] as const;

// One CelesTrak GP record in OMM JSON form, as satellite.js's json2satrec
// reads it. Kept as CelesTrak sends it so nothing is lost converting.
export interface GpElements {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  [key: string]: unknown;
}

export interface CatalogSatellite {
  norad_id: number;
  name: string;
  canadian: boolean;
  flagship: FlagshipKind | null;
  elements: GpElements;
}

export interface SatellitePayload {
  generated_at: string;
  satellites: CatalogSatellite[];
}

export function flagship_kind(name: string): FlagshipKind | null {
  for (const [kind, pattern] of FLAGSHIP_PATTERNS) {
    if (pattern.test(name)) {
      return kind;
    }
  }
  return null;
}

// Every active Canadian payload, plus every active flagship whatever its
// owner, joined to its orbital elements by NORAD id. A selected satellite
// with no elements (CelesTrak sometimes withholds a set) is dropped: there
// is nothing to propagate.
export function select_satellites(satcat: readonly SatcatRow[], elements: readonly GpElements[]): CatalogSatellite[] {
  const elements_by_id = new Map(elements.map((e) => [Number(e.NORAD_CAT_ID), e]));
  const selected: CatalogSatellite[] = [];

  for (const row of satcat) {
    if (row.OBJECT_TYPE !== PAYLOAD_OBJECT_TYPE || !ACTIVE_OPS_STATUS.has(row.OPS_STATUS_CODE)) {
      continue;
    }
    const canadian = row.OWNER === CANADA_OWNER_CODE;
    const flagship = flagship_kind(row.OBJECT_NAME);
    if (!canadian && !flagship) {
      continue;
    }
    const row_elements = elements_by_id.get(row.NORAD_CAT_ID);
    if (!row_elements) {
      continue;
    }
    selected.push({ norad_id: row.NORAD_CAT_ID, name: row.OBJECT_NAME, canadian, flagship, elements: row_elements });
  }

  return selected.sort((a, b) => a.norad_id - b.norad_id);
}

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

// Parses CelesTrak's satcat.csv down to the columns selection needs. Throws
// when one of them is missing: a renamed column would otherwise select
// nothing and ship an empty sky without any error.
export function parse_satcat_csv(csv: string): SatcatRow[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.length > 0);
  const header = split_csv_line(lines[0] ?? "");
  const index: Record<string, number> = {};
  for (const column of SATCAT_COLUMNS) {
    const position = header.indexOf(column);
    if (position === -1) {
      throw new Error(`satcat.csv is missing the ${column} column`);
    }
    index[column] = position;
  }

  return lines.slice(1).map((line) => {
    const fields = split_csv_line(line);
    return {
      OBJECT_NAME: fields[index.OBJECT_NAME],
      NORAD_CAT_ID: Number(fields[index.NORAD_CAT_ID]),
      OBJECT_TYPE: fields[index.OBJECT_TYPE],
      OPS_STATUS_CODE: fields[index.OPS_STATUS_CODE],
      OWNER: fields[index.OWNER],
    };
  });
}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function is_catalog_satellite(value: unknown): value is CatalogSatellite {
  if (!is_record(value)) return false;
  if (typeof value.norad_id !== "number" || typeof value.name !== "string") return false;
  if (typeof value.canadian !== "boolean") return false;
  if (value.flagship !== null && !(typeof value.flagship === "string" && FLAGSHIP_KINDS.has(value.flagship))) {
    return false;
  }
  return is_record(value.elements) && typeof value.elements.EPOCH === "string";
}

// The browser's check on the fetched payload. A stale or hand-edited file
// resolves to `null` - the globe renders without satellites - rather than
// throwing partway through a frame.
export function parse_satellite_payload(value: unknown): SatellitePayload | null {
  if (!is_record(value)) return null;
  if (typeof value.generated_at !== "string" || !Array.isArray(value.satellites)) return null;
  if (!value.satellites.every(is_catalog_satellite)) return null;
  return value as unknown as SatellitePayload;
}
