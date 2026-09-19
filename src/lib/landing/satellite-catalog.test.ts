import {
  flagship_kind,
  parse_satcat_csv,
  parse_satellite_payload,
  select_satellites,
  type GpElements,
  type SatcatRow,
} from "./satellite-catalog.js";

const BASE_ROW: SatcatRow = {
  OBJECT_NAME: "RADARSAT-2",
  NORAD_CAT_ID: 32382,
  OBJECT_TYPE: "PAY",
  OPS_STATUS_CODE: "+",
  OWNER: "CA",
};

const BASE_ELEMENTS: GpElements = {
  OBJECT_NAME: "RADARSAT-2",
  OBJECT_ID: "2007-061A",
  EPOCH: "2026-09-18T12:00:00.000000",
  MEAN_MOTION: 14.29,
  ECCENTRICITY: 0.0001,
  INCLINATION: 98.58,
  RA_OF_ASC_NODE: 10,
  ARG_OF_PERICENTER: 90,
  MEAN_ANOMALY: 270,
  NORAD_CAT_ID: 32382,
  ELEMENT_SET_NO: 999,
  BSTAR: 0.0001,
  MEAN_MOTION_DOT: 0,
  MEAN_MOTION_DDOT: 0,
};

function row(overrides: Partial<SatcatRow>): SatcatRow {
  return { ...BASE_ROW, ...overrides };
}

function elements_for(norad_id: number): GpElements {
  return { ...BASE_ELEMENTS, NORAD_CAT_ID: norad_id };
}

describe("flagship_kind", () => {
  it.each([
    ["ISS (ZARYA)", "iss"],
    ["HST", "hubble"],
    ["SENTINEL-1C", "sentinel-1"],
    ["SENTINEL-2A", "sentinel-2"],
    ["EARTHCARE", "earthcare"],
    ["RCM-2", "rcm"],
    ["RADARSAT-2", "radarsat-2"],
    ["GHGSAT-C12", "ghgsat"],
  ])("classifies %s as %s", (name, kind) => {
    expect(flagship_kind(name)).toBe(kind);
  });

  it("does not classify a module docked to the ISS, or a near-miss name, as a flagship", () => {
    expect(flagship_kind("ISS (NAUKA)")).toBeNull();
    expect(flagship_kind("SENTINEL-6A")).toBeNull();
    expect(flagship_kind("RADARSAT-1")).toBeNull();
  });
});

describe("select_satellites", () => {
  it("keeps active Canadian payloads and marks them Canadian", () => {
    const selected = select_satellites([row({ OBJECT_NAME: "NEOSSAT", NORAD_CAT_ID: 39089 })], [elements_for(39089)]);
    expect(selected).toEqual([
      { norad_id: 39089, name: "NEOSSAT", canadian: true, flagship: null, elements: elements_for(39089) },
    ]);
  });

  it("keeps non-Canadian flagships and marks them non-Canadian", () => {
    const selected = select_satellites(
      [row({ OBJECT_NAME: "ISS (ZARYA)", NORAD_CAT_ID: 25544, OWNER: "ISS" })],
      [elements_for(25544)],
    );
    expect(selected.map((s) => [s.name, s.canadian, s.flagship])).toEqual([["ISS (ZARYA)", false, "iss"]]);
  });

  it("drops non-Canadian satellites that are not flagships", () => {
    const selected = select_satellites([row({ OBJECT_NAME: "TIANHE", NORAD_CAT_ID: 48274, OWNER: "PRC" })], [
      elements_for(48274),
    ]);
    expect(selected).toEqual([]);
  });

  it("drops nonoperational, decayed and unknown-status payloads", () => {
    const rows = [
      row({ NORAD_CAT_ID: 1, OPS_STATUS_CODE: "-" }),
      row({ NORAD_CAT_ID: 2, OPS_STATUS_CODE: "D" }),
      row({ NORAD_CAT_ID: 3, OPS_STATUS_CODE: "" }),
      row({ NORAD_CAT_ID: 4, OPS_STATUS_CODE: "P" }),
    ];
    const selected = select_satellites(rows, [1, 2, 3, 4].map(elements_for));
    expect(selected.map((s) => s.norad_id)).toEqual([4]);
  });

  it("drops rocket bodies and debris even when Canadian", () => {
    const rows = [row({ NORAD_CAT_ID: 1, OBJECT_TYPE: "R/B" }), row({ NORAD_CAT_ID: 2, OBJECT_TYPE: "DEB" })];
    expect(select_satellites(rows, [1, 2].map(elements_for))).toEqual([]);
  });

  it("drops a selected satellite that has no orbital elements to propagate", () => {
    expect(select_satellites([row({})], [])).toEqual([]);
  });

  it("orders the result by NORAD id, whatever order the catalog arrived in", () => {
    const rows = [row({ NORAD_CAT_ID: 30 }), row({ NORAD_CAT_ID: 10 }), row({ NORAD_CAT_ID: 20 })];
    const selected = select_satellites(rows, [10, 20, 30].map(elements_for));
    expect(selected.map((s) => s.norad_id)).toEqual([10, 20, 30]);
  });
});

describe("parse_satcat_csv", () => {
  const HEADER = "OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE";

  it("maps each row onto the columns it needs, with the NORAD id as a number", () => {
    const csv = `${HEADER}\nRADARSAT-2,2007-061A,32382,PAY,+,CA,2007-12-14\n`;
    expect(parse_satcat_csv(csv)).toEqual([BASE_ROW]);
  });

  it("keeps a comma inside a quoted name as part of the name", () => {
    const csv = `${HEADER}\n"SAT, WITH COMMA",2000-001A,123,PAY,+,CA,2000-01-01`;
    expect(parse_satcat_csv(csv)[0].OBJECT_NAME).toBe("SAT, WITH COMMA");
  });

  it("accepts CRLF line endings", () => {
    const csv = `${HEADER}\r\nRADARSAT-2,2007-061A,32382,PAY,+,CA,2007-12-14\r\n`;
    expect(parse_satcat_csv(csv)).toEqual([BASE_ROW]);
  });

  it("throws when a column it needs is missing, rather than selecting nothing silently", () => {
    expect(() => parse_satcat_csv("OBJECT_NAME,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE\nX,1,PAY,+")).toThrow(/OWNER/);
  });
});

describe("parse_satellite_payload", () => {
  const VALID = {
    generated_at: "2026-09-19T06:00:00Z",
    satellites: [
      { norad_id: 32382, name: "RADARSAT-2", canadian: true, flagship: "radarsat-2", elements: BASE_ELEMENTS },
    ],
  };

  it("accepts a well-formed payload", () => {
    expect(parse_satellite_payload(VALID)).toEqual(VALID);
  });

  it("rejects a payload whose satellites list is missing", () => {
    expect(parse_satellite_payload({ generated_at: "x" })).toBeNull();
  });

  it("rejects an unknown flagship kind", () => {
    const bad = { ...VALID, satellites: [{ ...VALID.satellites[0], flagship: "tiangong" }] };
    expect(parse_satellite_payload(bad)).toBeNull();
  });

  it("rejects a satellite without orbital elements", () => {
    const bad = { ...VALID, satellites: [{ ...VALID.satellites[0], elements: null }] };
    expect(parse_satellite_payload(bad)).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parse_satellite_payload(null)).toBeNull();
    expect(parse_satellite_payload("nope")).toBeNull();
  });
});
