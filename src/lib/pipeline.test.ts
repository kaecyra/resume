import { vi } from "vitest";
import yaml from "js-yaml";

import type { PipelineBand, PipelineData } from "./types.js";

// Own file rather than more cases in landing.test.ts: that file mocks
// node:fs wholesale for load_landing_data, and a second loader sharing the
// same readFileSync mock would have to sequence its return values with
// mockReturnValueOnce for every test in both suites. Two modules, two
// mocks, no ordering to get wrong.
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";

import { load_pipeline_data, validate_pipeline_data } from "./pipeline.js";

// --- Test fixtures ---

const MOCK_PIPELINE_DATA: PipelineData = {
  heading: "Building a pipeline",
  lede: "It leaves my laptop and arrives somewhere else.",
  lede_emphasis: "somewhere else",
  bands: [
    {
      id: "commit",
      label: { from: "My laptop", to: "GitHub" },
      graph_side: "left",
      tail_arrow: true,
      nodes: [
        { id: "repo", label: "the repo", style: "ring", tone: "default", lane: "trunk", mark: "github" },
        { id: "branch", label: "a branch", style: "disc", tone: "muted", lane: "branch" },
        { id: "gate", label: "CI green", style: "disc", tone: "green", lane: "merge", emphasis: true },
        { id: "merged", label: "merged", style: "ring", tone: "default", lane: "trunk" },
      ],
      edges: [
        { id: "out", from: "repo", to: "branch", kind: "fork", tone: "default" },
        { id: "back", from: "branch", to: "merged", kind: "merge", tone: "green" },
        { id: "main", from: "repo", to: "merged", kind: "trunk", tone: "dim", dash: "dotted", head_tone: "muted" },
      ],
      note: { column: "aside", text: "Work starts on a branch, then it merges.", emphasis: "Work starts on a branch" },
      terminal: {
        path: "~/somewhere",
        turns: [
          { speaker: "you", bars: [84, 41] },
          { speaker: "tool", bars: [55] },
          { speaker: "you", cursor: true },
        ],
      },
      code: "$ npm run dev\n",
    },
    {
      id: "serve",
      graph_side: "right",
      nodes: [
        { id: "origin", label: "the origin", style: "ring", tone: "default", lane: "trunk" },
        { id: "reader", label: "you", detail: "reading this now", style: "reader", tone: "accent", lane: "trunk" },
      ],
      edges: [{ id: "deliver", from: "origin", to: "reader", kind: "trunk", tone: "accent", dash: "dashed" }],
      note: { column: "graph", text: "It comes out the other end." },
      rack: true,
      marks: [
        { id: "docker", label: "Docker", lit: true },
        { id: "nginx", label: "nginx" },
      ],
      readout: {
        column: "aside",
        live: true,
        caption: "Samples until measured.",
        entries: [
          { id: "edge", label: "Edge that answered", value: "YYZ", tone: "accent" },
          { id: "ttfb", label: "First byte", value: "41", unit: "ms" },
        ],
      },
    },
  ],
  crossings: [{ id: "to-serve", after: "commit", label: "ghcr.io/example:latest" }],
  closer: "A machine in my basement hands you this page.",
  closer_emphasis: "A machine in my basement",
};

function make_pipeline(overrides: Partial<PipelineData> = {}): PipelineData {
  return { ...MOCK_PIPELINE_DATA, ...overrides };
}

// Rebuilds the document with one band replaced, so a band-level case does
// not have to restate the other band or the document around it.
function with_band(index: number, overrides: Partial<PipelineBand>): PipelineData {
  const bands = MOCK_PIPELINE_DATA.bands.map((band, i) =>
    i === index ? { ...band, ...overrides } : band,
  );
  return make_pipeline({ bands });
}

function messages_for(pipeline: PipelineData): string[] {
  return validate_pipeline_data(pipeline).map((error) => error.message);
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

describe("load_pipeline_data", () => {
  it("reads and parses data/pipeline.yaml", () => {
    vi.mocked(readFileSync).mockReturnValue(yaml.dump(MOCK_PIPELINE_DATA));

    const result = load_pipeline_data();

    expect(result).toEqual(MOCK_PIPELINE_DATA);
    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining("pipeline.yaml"), "utf-8");
  });

  it("reads pipeline.yaml and not landing.yaml", () => {
    vi.mocked(readFileSync).mockReturnValue(yaml.dump(MOCK_PIPELINE_DATA));

    load_pipeline_data();

    expect(readFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining("landing.yaml"),
      expect.anything(),
    );
  });
});

describe("validate_pipeline_data", () => {
  it("returns an empty array for a well-formed document", () => {
    expect(validate_pipeline_data(make_pipeline())).toEqual([]);
  });

  it("attributes every error to data/pipeline.yaml, not data/landing.yaml", () => {
    const errors = validate_pipeline_data(make_pipeline({ heading: "" }));

    expect(errors.length).toBeGreaterThan(0);
    for (const error of errors) {
      expect(error.path).toBe("data/pipeline.yaml");
    }
  });

  // The document-level superRefine reports at the root, exactly where an
  // absent document reports, so matching on the path alone would describe
  // a document with one blank field as missing entirely.
  it("does not mistake a single document-level fault for a missing document", () => {
    const messages = messages_for(make_pipeline({ heading: "" }));

    expect(messages).toEqual(["heading is required"]);
  });

  it("reports one error and does not throw for an empty document", () => {
    const errors = validate_pipeline_data(undefined as unknown as PipelineData);

    expect(errors).toEqual([
      expect.objectContaining({ message: expect.stringContaining("must contain a document") }),
    ]);
  });

  it("does not throw when bands is a map instead of an array", () => {
    const pipeline = make_pipeline({ bands: { commit: {} } as unknown as never });

    expect(() => validate_pipeline_data(pipeline)).not.toThrow();
    expect(messages_for(pipeline)).toContain("bands must be an array");
  });

  it("does not throw when crossings is a map instead of an array", () => {
    const pipeline = make_pipeline({ crossings: { first: {} } as unknown as never });

    expect(() => validate_pipeline_data(pipeline)).not.toThrow();
    expect(messages_for(pipeline)).toContain("crossings must be an array");
  });

  describe("section copy", () => {
    it("detects missing heading, lede and closer", () => {
      const messages = messages_for(make_pipeline({ heading: "", lede: "", closer: "" }));

      expect(messages).toContain("heading is required");
      expect(messages).toContain("lede is required");
      expect(messages).toContain("closer is required");
    });

    // An emphasis that isn't in the text it emphasises renders nothing at
    // all - the phrase just never lights up - so it has to fail loudly,
    // the same way hero.tagline_emphasis does in landing.ts.
    it("detects a lede_emphasis that is not in the lede", () => {
      const messages = messages_for(make_pipeline({ lede_emphasis: "nowhere in there" }));

      expect(messages).toContainEqual(
        expect.stringContaining("lede_emphasis (nowhere in there) must appear verbatim"),
      );
    });

    it("detects a closer_emphasis that is not in the closer", () => {
      const messages = messages_for(make_pipeline({ closer_emphasis: "nowhere in there" }));

      expect(messages).toContainEqual(
        expect.stringContaining("closer_emphasis (nowhere in there) must appear verbatim"),
      );
    });

    it("detects a note emphasis that is not in the note", () => {
      const messages = messages_for(
        with_band(0, { note: { column: "aside", text: "A note.", emphasis: "not in it" } }),
      );

      expect(messages).toContainEqual(
        expect.stringContaining('band "commit" note emphasis (not in it) must appear verbatim'),
      );
    });

    it("detects a note with no text", () => {
      const messages = messages_for(with_band(0, { note: { column: "aside", text: "" } }));

      expect(messages).toContain('band "commit" note is missing text');
    });

    it("detects a note in a column that does not exist", () => {
      const messages = messages_for(
        with_band(0, { note: { column: "sidebar" as never, text: "A note." } }),
      );

      expect(messages).toContain('band "commit" note column "sidebar" is not a known column');
    });
  });

  describe("bands", () => {
    it("detects a band with no id", () => {
      const messages = messages_for(with_band(0, { id: "" }));

      expect(messages).toContain("band is missing an id");
    });

    it("detects duplicate band ids", () => {
      const messages = messages_for(with_band(1, { id: "commit" }));

      expect(messages).toContain('duplicate band id "commit"');
    });

    it("detects a graph_side that is neither left nor right", () => {
      const messages = messages_for(with_band(0, { graph_side: "middle" as never }));

      expect(messages).toContain('band "commit" graph_side "middle" is not a known side');
    });

    it("detects a band with no nodes", () => {
      const messages = messages_for(with_band(0, { nodes: [] }));

      expect(messages).toContain('band "commit" has no nodes');
    });

    it("does not throw when a band's nodes are a map instead of an array", () => {
      const pipeline = with_band(0, { nodes: { repo: {} } as unknown as never });

      expect(() => validate_pipeline_data(pipeline)).not.toThrow();
      expect(messages_for(pipeline)).toContain('band "commit" nodes must be an array');
    });

    it("does not throw when a band's edges are a map instead of an array", () => {
      const pipeline = with_band(0, { edges: { out: {} } as unknown as never });

      expect(() => validate_pipeline_data(pipeline)).not.toThrow();
      expect(messages_for(pipeline)).toContain('band "commit" edges must be an array');
    });
  });

  describe("nodes", () => {
    it("detects a node with no id or label", () => {
      const messages = messages_for(
        with_band(1, {
          nodes: [{ id: "", label: "", style: "ring", tone: "default", lane: "trunk" }],
        }),
      );

      expect(messages).toContain('band "serve" node is missing an id');
      expect(messages).toContainEqual(expect.stringContaining("is missing a label"));
    });

    it("detects duplicate node ids inside one band", () => {
      const messages = messages_for(
        with_band(1, {
          nodes: [
            { id: "origin", label: "one", style: "ring", tone: "default", lane: "trunk" },
            { id: "origin", label: "two", style: "disc", tone: "muted", lane: "trunk" },
          ],
          edges: [],
        }),
      );

      expect(messages).toContain('band "serve" repeats node id "origin"');
    });

    // Two bands each naming a node "nginx" is fine - edges only ever
    // resolve inside their own band - so this must not be rejected.
    it("allows the same node id in two different bands", () => {
      const pipeline = with_band(1, {
        nodes: [
          { id: "repo", label: "the origin", style: "ring", tone: "default", lane: "trunk" },
          { id: "reader", label: "you", style: "reader", tone: "accent", lane: "trunk" },
        ],
        edges: [{ id: "deliver", from: "repo", to: "reader", kind: "trunk", tone: "accent" }],
      });

      expect(validate_pipeline_data(pipeline)).toEqual([]);
    });

    it("detects an unknown node style, tone, lane and mark", () => {
      const messages = messages_for(
        with_band(1, {
          nodes: [
            {
              id: "origin",
              label: "the origin",
              style: "square" as never,
              tone: "puce" as never,
              lane: "siding" as never,
              mark: "gitlab" as never,
            },
            { id: "reader", label: "you", style: "reader", tone: "accent", lane: "trunk" },
          ],
        }),
      );

      expect(messages).toContain('band "serve" node "origin" style "square" is not a known style');
      expect(messages).toContain('band "serve" node "origin" tone "puce" is not a known tone');
      expect(messages).toContain('band "serve" node "origin" lane "siding" is not a known lane');
      expect(messages).toContain('band "serve" node "origin" mark "gitlab" is not a known mark');
    });

    it("detects an unknown mark_tone", () => {
      const messages = messages_for(
        with_band(1, {
          nodes: [
            {
              id: "origin",
              label: "the origin",
              style: "ring",
              tone: "default",
              lane: "trunk",
              mark: "nginx",
              mark_tone: "puce" as never,
            },
            { id: "reader", label: "you", style: "reader", tone: "accent", lane: "trunk" },
          ],
        }),
      );

      expect(messages).toContain('band "serve" node "origin" mark_tone "puce" is not a known tone');
    });

    // A node nothing connects to is drawn floating beside the spine with
    // no line reaching it - visible, wrong, and no error anywhere.
    it("detects a node no edge reaches", () => {
      const messages = messages_for(
        with_band(1, {
          nodes: [
            { id: "origin", label: "the origin", style: "ring", tone: "default", lane: "trunk" },
            { id: "reader", label: "you", style: "reader", tone: "accent", lane: "trunk" },
            { id: "stray", label: "nothing points here", style: "disc", tone: "muted", lane: "trunk" },
          ],
        }),
      );

      expect(messages).toContain('band "serve" node "stray" is not connected by any edge');
    });

    // A merge-lane node is positioned along a merge curve rather than by
    // its own edges, so it is exempt from the check above - but only where
    // there is a merge edge for it to ride.
    it("detects a merge-lane node in a band with no merge edge", () => {
      const messages = messages_for(
        with_band(0, {
          edges: [
            { id: "out", from: "repo", to: "branch", kind: "fork", tone: "default" },
            { id: "back", from: "branch", to: "merged", kind: "branch", tone: "green" },
            { id: "main", from: "repo", to: "merged", kind: "trunk", tone: "dim" },
          ],
        }),
      );

      expect(messages).toContain('band "commit" node "gate" rides a merge edge, but there is none');
    });
  });

  describe("edges", () => {
    it("detects an edge with no id", () => {
      const messages = messages_for(
        with_band(1, {
          edges: [{ id: "", from: "origin", to: "reader", kind: "trunk", tone: "accent" }],
        }),
      );

      expect(messages).toContain('band "serve" edge is missing an id');
    });

    it("detects duplicate edge ids inside one band", () => {
      const messages = messages_for(
        with_band(1, {
          edges: [
            { id: "deliver", from: "origin", to: "reader", kind: "trunk", tone: "accent" },
            { id: "deliver", from: "reader", to: "origin", kind: "trunk", tone: "accent" },
          ],
        }),
      );

      expect(messages).toContain('band "serve" repeats edge id "deliver"');
    });

    // The whole point of naming nodes: a typo here silently drops a line
    // out of the drawing, because the renderer has no coordinate to draw to.
    it("detects an edge whose endpoints name no node in that band", () => {
      const messages = messages_for(
        with_band(1, {
          edges: [{ id: "deliver", from: "orign", to: "raeder", kind: "trunk", tone: "accent" }],
        }),
      );

      expect(messages).toContain('band "serve" edge "deliver" starts at unknown node "orign"');
      expect(messages).toContain('band "serve" edge "deliver" ends at unknown node "raeder"');
    });

    it("detects an edge naming a node from another band", () => {
      const messages = messages_for(
        with_band(1, {
          edges: [{ id: "deliver", from: "repo", to: "reader", kind: "trunk", tone: "accent" }],
        }),
      );

      expect(messages).toContain('band "serve" edge "deliver" starts at unknown node "repo"');
    });

    it("detects an edge that starts and ends on the same node", () => {
      const messages = messages_for(
        with_band(1, {
          edges: [{ id: "deliver", from: "origin", to: "origin", kind: "trunk", tone: "accent" }],
        }),
      );

      expect(messages).toContain('band "serve" edge "deliver" starts and ends on "origin"');
    });

    it("detects an unknown edge kind, tone, dash and head_tone", () => {
      const messages = messages_for(
        with_band(1, {
          edges: [
            {
              id: "deliver",
              from: "origin",
              to: "reader",
              kind: "siding" as never,
              tone: "puce" as never,
              dash: "wavy" as never,
              head_tone: "puce" as never,
            },
          ],
        }),
      );

      expect(messages).toContain('band "serve" edge "deliver" kind "siding" is not a known kind');
      expect(messages).toContain('band "serve" edge "deliver" tone "puce" is not a known tone');
      expect(messages).toContain('band "serve" edge "deliver" dash "wavy" is not a known dash');
      expect(messages).toContain(
        'band "serve" edge "deliver" head_tone "puce" is not a known tone',
      );
    });
  });

  describe("crossings", () => {
    it("detects a crossing with no id or label", () => {
      const messages = messages_for(make_pipeline({ crossings: [{ id: "", after: "commit", label: "" }] }));

      expect(messages).toContain("crossing is missing an id");
      expect(messages).toContainEqual(expect.stringContaining("is missing a label"));
    });

    it("detects duplicate crossing ids", () => {
      const messages = messages_for(
        make_pipeline({
          crossings: [
            { id: "x", after: "commit", label: "one" },
            { id: "x", after: "commit", label: "two" },
          ],
        }),
      );

      expect(messages).toContain('duplicate crossing id "x"');
    });

    it("detects a crossing after a band that does not exist", () => {
      const messages = messages_for(
        make_pipeline({ crossings: [{ id: "x", after: "deploy", label: "one" }] }),
      );

      expect(messages).toContain('crossing "x" comes after unknown band "deploy"');
    });

    // The connector leaves one band and lands on the next, so one hung off
    // the last band would be drawn into empty page below the section.
    it("detects a crossing after the last band", () => {
      const messages = messages_for(
        make_pipeline({ crossings: [{ id: "x", after: "serve", label: "one" }] }),
      );

      expect(messages).toContain('crossing "x" comes after the last band "serve"');
    });

    it("detects two crossings after the same band", () => {
      const messages = messages_for(
        make_pipeline({
          crossings: [
            { id: "x", after: "commit", label: "one" },
            { id: "y", after: "commit", label: "two" },
          ],
        }),
      );

      expect(messages).toContain('band "commit" already has a crossing after it');
    });
  });

  describe("readouts, marks and the terminal", () => {
    it("detects a readout entry with no label or value", () => {
      const messages = messages_for(
        with_band(1, {
          readout: { column: "aside", entries: [{ id: "edge", label: "", value: "" }] },
        }),
      );

      expect(messages).toContain('band "serve" readout entry "edge" is missing a label or value');
    });

    it("detects a readout with no entries and an unknown column", () => {
      const messages = messages_for(
        with_band(1, { readout: { column: "sidebar" as never, entries: [] } }),
      );

      expect(messages).toContain('band "serve" readout column "sidebar" is not a known column');
      expect(messages).toContain('band "serve" readout has no entries');
    });

    it("detects duplicate readout entry ids", () => {
      const messages = messages_for(
        with_band(1, {
          readout: {
            column: "aside",
            entries: [
              { id: "edge", label: "Edge", value: "YYZ" },
              { id: "edge", label: "Edge again", value: "YUL" },
            ],
          },
        }),
      );

      expect(messages).toContain('band "serve" repeats readout entry id "edge"');
    });

    it("detects a vendor mark that is not one of the known marks", () => {
      const messages = messages_for(
        with_band(1, { marks: [{ id: "gitlab" as never, label: "GitLab" }] }),
      );

      expect(messages).toContain('band "serve" mark "gitlab" is not a known mark');
    });

    it("detects a terminal with no path and a turn from an unknown speaker", () => {
      const messages = messages_for(
        with_band(0, {
          terminal: { path: "", turns: [{ speaker: "robot" as never, bars: [50] }] },
        }),
      );

      expect(messages).toContain('band "commit" terminal is missing a path');
      expect(messages).toContain('band "commit" terminal speaker "robot" is not a known speaker');
    });

    // A turn with neither bars nor a cursor renders an empty row: the
    // glyph with nothing beside it.
    it("detects a terminal turn with neither bars nor a cursor", () => {
      const messages = messages_for(
        with_band(0, { terminal: { path: "~/somewhere", turns: [{ speaker: "you" }] } }),
      );

      expect(messages).toContain('band "commit" terminal turn 0 has neither bars nor a cursor');
    });

    it("detects a bar width outside 0-100", () => {
      const messages = messages_for(
        with_band(0, {
          terminal: { path: "~/somewhere", turns: [{ speaker: "you", bars: [84, 410] }] },
        }),
      );

      expect(messages).toContain(
        'band "commit" terminal turn 0 has a bar width of 410, outside 0-100',
      );
    });
  });

  it("accumulates errors from more than one branch of the document at once", () => {
    const messages = messages_for(
      make_pipeline({
        heading: "",
        closer_emphasis: "nowhere in there",
        crossings: [{ id: "x", after: "nonexistent", label: "one" }],
      }),
    );

    expect(messages).toContain("heading is required");
    expect(messages).toContainEqual(expect.stringContaining("closer_emphasis"));
    expect(messages).toContainEqual(expect.stringContaining("unknown band"));
  });

  // Goes through js-yaml's real parser rather than a TypeScript cast, so
  // the wrong-typed collection is the shape yaml.load actually produces
  // from a mapping written where a sequence belongs.
  describe("using the real YAML parser", () => {
    it("does not throw and reports one error for an empty document", () => {
      const parsed = yaml.load("") as unknown as PipelineData;

      expect(parsed).toBeUndefined();
      expect(() => validate_pipeline_data(parsed)).not.toThrow();
      expect(messages_for(parsed)).toEqual([
        expect.stringContaining("must contain a document"),
      ]);
    });

    it("does not throw when bands is written as a mapping instead of a sequence", () => {
      const source = yaml.dump({ ...MOCK_PIPELINE_DATA, bands: { commit: { id: "commit" } } });
      const parsed = yaml.load(source) as unknown as PipelineData;

      expect(() => validate_pipeline_data(parsed)).not.toThrow();
      expect(messages_for(parsed)).toContain("bands must be an array");
    });
  });
});
