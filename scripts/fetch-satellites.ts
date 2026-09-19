import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  parse_satcat_csv,
  select_satellites,
  type GpElements,
  type SatellitePayload,
} from "../src/lib/landing/satellite-catalog.js";

// Not itself unit tested (ENGINEERING.md #13: don't test passthroughs).
// Everything that decides which satellites survive - Canadian ownership,
// flagship names, operational status, the join to orbital elements - lives
// in src/lib/landing/satellite-catalog.ts with its own tests. This script
// is thin glue: download two CelesTrak files, select, write.
//
// Two bulk downloads rather than one request per satellite: CelesTrak's GP
// endpoint takes a single catalog number per query, and it asks clients
// not to hammer it. Once a night (deploy.yml's schedule) is well inside
// what it asks for.
const SATCAT_URL = "https://celestrak.org/pub/satcat.csv";
const ACTIVE_ELEMENTS_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json";

// Written under static/ rather than data/generated/ because the browser
// fetches it at runtime, like static/landing/globe-lines.json - it is
// never read at build time. Gitignored, like data/generated/.
const OUTPUT_PATH = resolve("static", "landing", "satellites.json");

const USER_AGENT = "resume-fetch-satellites-script";

async function fetch_text(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`CelesTrak request failed: ${url} ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function main(): Promise<void> {
  const [satcat_csv, elements_json] = await Promise.all([fetch_text(SATCAT_URL), fetch_text(ACTIVE_ELEMENTS_URL)]);

  const satcat = parse_satcat_csv(satcat_csv);
  const elements = JSON.parse(elements_json) as GpElements[];
  const satellites = select_satellites(satcat, elements);

  if (satellites.length === 0) {
    throw new Error("No satellites selected - refusing to write an empty sky");
  }

  const output: SatellitePayload = { generated_at: new Date().toISOString(), satellites };
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output));

  const flagships = satellites.filter((s) => s.flagship).length;
  console.log(`Satellite data written: ${OUTPUT_PATH} (${satellites.length} satellites, ${flagships} flagships)`);
}

main().catch((err) => {
  console.error("Failed to fetch satellite data:", err);
  process.exit(1);
});
