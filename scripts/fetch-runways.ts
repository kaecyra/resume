import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  parse_runways_csv,
  select_pop_runways,
  POP_IDENTITY,
  type Runway,
} from "../src/lib/landing/runway-catalog.js";

// Not itself unit tested (ENGINEERING.md #13: don't test passthroughs).
// Everything that decides which rows survive and how they become a
// Runway - matching ICAO, dropping incomplete rows - lives in
// src/lib/landing/runway-catalog.ts with its own tests. This script is
// thin glue: download, select, write.
//
// Committed rather than fetched at runtime (unlike static/landing/
// satellites.json): airport geometry doesn't go stale overnight the way
// satellite elements do, so there's nothing to refresh on a schedule -
// see build-geo.ts's comment for the same tradeoff over globe-lines.json.
const RUNWAYS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/runways.csv";

const OUTPUT_PATH = resolve("src", "lib", "landing", "runway-data.generated.ts");

async function fetch_text(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`runways.csv request failed: ${url} ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function render_runway(runway: Runway): string {
  return `    {
      designator: ${JSON.stringify(runway.designator)},
      low_end: { ident: ${JSON.stringify(runway.low_end.ident)}, lat: ${runway.low_end.lat}, lon: ${runway.low_end.lon} },
      high_end: { ident: ${JSON.stringify(runway.high_end.ident)}, lat: ${runway.high_end.lat}, lon: ${runway.high_end.lon} },
      length_ft: ${runway.length_ft},
      width_ft: ${runway.width_ft},
      closed: ${runway.closed},
    },`;
}

async function main(): Promise<void> {
  const csv = await fetch_text(RUNWAYS_CSV_URL);
  const rows = parse_runways_csv(csv);
  const icaos = POP_IDENTITY.map((pop) => pop.icao);
  const by_icao = select_pop_runways(rows, icaos);

  const entries = icaos
    .filter((icao) => by_icao[icao])
    .map((icao) => `  ${JSON.stringify(icao)}: [\n${by_icao[icao].map((r) => render_runway(r)).join("\n")}\n  ],`)
    .join("\n");

  const output = `// GENERATED FILE - do not hand-edit. Produced by scripts/fetch-runways.ts
// from OurAirports's runways.csv. Re-run \`npm run fetch-runways\` to refresh.

import type { Runway } from "./runway-catalog.js";

export const RUNWAYS_BY_ICAO: Record<string, Runway[]> = {
${entries}
};
`;

  writeFileSync(OUTPUT_PATH, output);

  for (const pop of POP_IDENTITY) {
    const count = by_icao[pop.icao]?.length ?? 0;
    console.log(`${pop.icao} (${pop.iata} ${pop.city}): ${count} runway${count === 1 ? "" : "s"}`);
  }
  console.log(`Runway data written: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Failed to fetch runway data:", err);
  process.exit(1);
});
