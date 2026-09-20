import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import yaml from "js-yaml";
import { z } from "zod";

import type {
  PipelineBand,
  PipelineBandLabel,
  PipelineColumn,
  PipelineCrossing,
  PipelineData,
  PipelineEdge,
  PipelineEdgeDash,
  PipelineEdgeKind,
  PipelineGraphSide,
  PipelineLane,
  PipelineMark,
  PipelineMarkEntry,
  PipelineNode,
  PipelineNodeStyle,
  PipelineNote,
  PipelineReadout,
  PipelineReadoutEntry,
  PipelineTerminal,
  PipelineTerminalTurn,
  PipelineTone,
  PipelineTurnSpeaker,
} from "./types.js";
import type { ListCoversUnion, SchemaCoversType, ValidationError } from "./validate.js";

const DATA_DIR = resolve("data");

export function load_pipeline_data(): PipelineData {
  const raw = readFileSync(resolve(DATA_DIR, "pipeline.yaml"), "utf-8");
  return yaml.load(raw) as PipelineData;
}

// --- Allowed values ---
//
// Every constrained field in data/pipeline.yaml is a closed set, and each
// set is written twice by necessity: once as a union in ./types.ts, which
// is what the components get to switch on, and once as a list here, which
// is what the validator can actually test a parsed YAML string against.
// `ListCoversUnion` keeps the two halves honest in both directions - the
// `satisfies` clause rejects a list entry that is not in the union, and the
// assertion below each list rejects a union member missing from the list.
// Without the pair, adding a tone to the union and forgetting the list
// would leave that tone rejected at build time by a validator nobody
// thought to update.
//
// `ListCoversUnion` lives in ./validate.js, next to `SchemaCoversType`, so
// the three loaders that assert with them cannot drift apart.

const NODE_STYLES = ["ring", "disc", "reader"] as const satisfies readonly PipelineNodeStyle[];
const _node_styles_cover: ListCoversUnion<PipelineNodeStyle, typeof NODE_STYLES> = true;

const TONES = [
  "default",
  "muted",
  "dim",
  "accent",
  "green",
] as const satisfies readonly PipelineTone[];
const _tones_cover: ListCoversUnion<PipelineTone, typeof TONES> = true;

const LANES = ["trunk", "branch", "merge"] as const satisfies readonly PipelineLane[];
const _lanes_cover: ListCoversUnion<PipelineLane, typeof LANES> = true;

const EDGE_KINDS = [
  "trunk",
  "branch",
  "fork",
  "merge",
] as const satisfies readonly PipelineEdgeKind[];
const _edge_kinds_cover: ListCoversUnion<PipelineEdgeKind, typeof EDGE_KINDS> = true;

const EDGE_DASHES = ["solid", "dotted", "dashed"] as const satisfies readonly PipelineEdgeDash[];
const _edge_dashes_cover: ListCoversUnion<PipelineEdgeDash, typeof EDGE_DASHES> = true;

const MARKS = [
  "github",
  "github-actions",
  "docker",
  "nginx",
  "cloudflare",
  "proxmox",
  "ubuntu",
] as const satisfies readonly PipelineMark[];
const _marks_cover: ListCoversUnion<PipelineMark, typeof MARKS> = true;

const GRAPH_SIDES = ["left", "right"] as const satisfies readonly PipelineGraphSide[];
const _graph_sides_cover: ListCoversUnion<PipelineGraphSide, typeof GRAPH_SIDES> = true;

const COLUMNS = ["graph", "aside"] as const satisfies readonly PipelineColumn[];
const _columns_cover: ListCoversUnion<PipelineColumn, typeof COLUMNS> = true;

const TURN_SPEAKERS = ["you", "agent", "tool"] as const satisfies readonly PipelineTurnSpeaker[];
const _turn_speakers_cover: ListCoversUnion<PipelineTurnSpeaker, typeof TURN_SPEAKERS> = true;

// --- Schema ---
//
// Built the same way as build_landing_data_schema in ./landing.ts, for the
// reasons documented at length there: leaves stay `z.any().optional()` so
// one wrong-typed field cannot suppress every other check in the same pass,
// requiredness and allowed values are re-stated by hand inside superRefine
// with messages that name the band and the node, and a SchemaCoversType
// assertion per interface makes a field added to ./types.ts without a
// matching schema entry a compile error rather than a silent gap.
//
// One deviation: the nested collections (a band's nodes, edges, marks and
// readout entries, and a terminal's turns) are `z.any().optional()` with a
// hand-written Array.isArray check rather than `z.array(...)`. Zod's own
// array message cannot name which band it is talking about, and "nodes must
// be an array" is not much help in a document with three bands. The outer
// two collections - `bands` and `crossings` - keep real zod typing, since
// there is only one of each and the message needs no context.

const PipelineNodeSchema = z.object({
  id: z.any().optional(),
  label: z.any().optional(),
  detail: z.any().optional(),
  style: z.any().optional(),
  tone: z.any().optional(),
  lane: z.any().optional(),
  mark: z.any().optional(),
  mark_tone: z.any().optional(),
  emphasis: z.any().optional(),
  tick: z.any().optional(),
});
const _node_schema_covers_type: SchemaCoversType<
  PipelineNode,
  z.infer<typeof PipelineNodeSchema>
> = true;

const PipelineEdgeSchema = z.object({
  id: z.any().optional(),
  from: z.any().optional(),
  to: z.any().optional(),
  kind: z.any().optional(),
  tone: z.any().optional(),
  dash: z.any().optional(),
  head_tone: z.any().optional(),
});
const _edge_schema_covers_type: SchemaCoversType<
  PipelineEdge,
  z.infer<typeof PipelineEdgeSchema>
> = true;

const PipelineTerminalTurnSchema = z.object({
  speaker: z.any().optional(),
  bars: z.any().optional(),
  cursor: z.any().optional(),
});
const _turn_schema_covers_type: SchemaCoversType<
  PipelineTerminalTurn,
  z.infer<typeof PipelineTerminalTurnSchema>
> = true;

const PipelineTerminalSchema = z.object({
  path: z.any().optional(),
  turns: z.any().optional(),
});
const _terminal_schema_covers_type: SchemaCoversType<
  PipelineTerminal,
  z.infer<typeof PipelineTerminalSchema>
> = true;

const PipelineReadoutEntrySchema = z.object({
  id: z.any().optional(),
  label: z.any().optional(),
  value: z.any().optional(),
  unit: z.any().optional(),
  tone: z.any().optional(),
});
const _readout_entry_schema_covers_type: SchemaCoversType<
  PipelineReadoutEntry,
  z.infer<typeof PipelineReadoutEntrySchema>
> = true;

const PipelineReadoutSchema = z.object({
  column: z.any().optional(),
  entries: z.any().optional(),
  live: z.any().optional(),
  caption: z.any().optional(),
});
const _readout_schema_covers_type: SchemaCoversType<
  PipelineReadout,
  z.infer<typeof PipelineReadoutSchema>
> = true;

const PipelineMarkEntrySchema = z.object({
  id: z.any().optional(),
  label: z.any().optional(),
  lit: z.any().optional(),
});
const _mark_schema_covers_type: SchemaCoversType<
  PipelineMarkEntry,
  z.infer<typeof PipelineMarkEntrySchema>
> = true;

const PipelineBandLabelSchema = z.object({
  from: z.any().optional(),
  to: z.any().optional(),
});
const _band_label_schema_covers_type: SchemaCoversType<
  PipelineBandLabel,
  z.infer<typeof PipelineBandLabelSchema>
> = true;

const PipelineNoteSchema = z.object({
  column: z.any().optional(),
  text: z.any().optional(),
  emphasis: z.any().optional(),
});
const _note_schema_covers_type: SchemaCoversType<
  PipelineNote,
  z.infer<typeof PipelineNoteSchema>
> = true;

// Every field is `z.any().optional()`, including the four that hold a
// mapping. Declaring `note: PipelineNoteSchema.optional()` here reads like
// tighter validation and is the opposite: the band schema sits inside
// `z.array(...).superRefine(...)`, so `note: just a string` is a type
// failure on the array element, which aborts the array refinement and takes
// every check for every band down with it - plus the document-level pass.
// The whole document then reports one "Expected object, received string"
// with no band name and no field name. The hand-written checks below own
// these four instead, and `shape()` turns a scalar into an empty object so
// each field is reported by name. `note: some text` is an easy YAML
// mistake, and it has to read as "note is missing text", not as a document
// that failed to parse.
const PipelineBandSchema = z.object({
  id: z.any().optional(),
  label: z.any().optional(),
  graph_side: z.any().optional(),
  nodes: z.any().optional(),
  edges: z.any().optional(),
  tail_arrow: z.any().optional(),
  note: z.any().optional(),
  terminal: z.any().optional(),
  code: z.any().optional(),
  rack: z.any().optional(),
  marks: z.any().optional(),
  readout: z.any().optional(),
});
const _band_schema_covers_type: SchemaCoversType<
  PipelineBand,
  z.infer<typeof PipelineBandSchema>
> = true;

const PipelineCrossingSchema = z.object({
  id: z.any().optional(),
  after: z.any().optional(),
  label: z.any().optional(),
});
const _crossing_schema_covers_type: SchemaCoversType<
  PipelineCrossing,
  z.infer<typeof PipelineCrossingSchema>
> = true;

// --- Checks ---

function issue(ctx: z.RefinementCtx, message: string): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, message });
}

/**
 * Reads one entry of a nested collection through its schema. Every field
 * on these schemas is optional, so an entry that is not an object at all -
 * a bare string written where a mapping belongs - reads as empty and gets
 * reported field by field, rather than throwing out of the superRefine
 * and taking every other check in the document down with it.
 */
function shape<Schema extends z.ZodObject<z.ZodRawShape>>(
  schema: Schema,
  raw: unknown,
): z.infer<Schema> {
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : ({} as z.infer<Schema>);
}

/**
 * Reports `describe(value)` when a field holds something outside its
 * allowed list. An absent value passes unless the field is `required`, in
 * which case it is reported the same way a wrong one is - "undefined" is
 * not a known style either.
 */
function check_value(
  ctx: z.RefinementCtx,
  value: unknown,
  allowed: readonly string[],
  describe: (bad: string) => string,
  required = false,
): void {
  if ((value === undefined || value === null) && !required) {
    return;
  }
  if (typeof value === "string" && allowed.includes(value)) {
    return;
  }
  issue(ctx, describe(String(value)));
}

/**
 * Checks a phrase a component highlights inside a longer string. An
 * emphasis that is not in its text highlights nothing at all, with no
 * error and nothing visibly wrong - the same trap hero.tagline_emphasis
 * closes in ./landing.ts.
 */
function check_emphasis(
  ctx: z.RefinementCtx,
  emphasis: unknown,
  text: unknown,
  describe: (bad: string) => string,
): void {
  if (typeof emphasis !== "string" || emphasis.length === 0) {
    return;
  }
  if (typeof text === "string" && text.includes(emphasis)) {
    return;
  }
  issue(ctx, describe(emphasis));
}

function check_note(ctx: z.RefinementCtx, band_label: string, note: unknown): void {
  if (!note || typeof note !== "object") {
    issue(ctx, `band ${band_label} is missing a note`);
    return;
  }

  const { column, text, emphasis } = shape(PipelineNoteSchema, note);

  if (!text) {
    issue(ctx, `band ${band_label} note is missing text`);
  }
  check_value(
    ctx,
    column,
    COLUMNS,
    (bad) => `band ${band_label} note column "${bad}" is not a known column`,
    true,
  );
  check_emphasis(
    ctx,
    emphasis,
    text,
    (bad) => `band ${band_label} note emphasis (${bad}) must appear verbatim in the note`,
  );
}

function check_nodes(ctx: z.RefinementCtx, band_label: string, nodes: unknown): Set<string> {
  const ids = new Set<string>();

  if (!Array.isArray(nodes)) {
    issue(ctx, `band ${band_label} nodes must be an array`);
    return ids;
  }
  if (nodes.length === 0) {
    issue(ctx, `band ${band_label} has no nodes`);
    return ids;
  }

  for (const raw of nodes) {
    const node = shape(PipelineNodeSchema, raw);
    const label = node.id ? `"${node.id}"` : '"unknown"';

    if (!node.id) {
      issue(ctx, `band ${band_label} node is missing an id`);
    } else if (ids.has(node.id)) {
      issue(ctx, `band ${band_label} repeats node id "${node.id}"`);
    } else {
      ids.add(node.id);
    }

    if (!node.label) {
      issue(ctx, `band ${band_label} node ${label} is missing a label`);
    }

    check_value(
      ctx,
      node.style,
      NODE_STYLES,
      (bad) => `band ${band_label} node ${label} style "${bad}" is not a known style`,
      true,
    );
    check_value(
      ctx,
      node.tone,
      TONES,
      (bad) => `band ${band_label} node ${label} tone "${bad}" is not a known tone`,
      true,
    );
    check_value(
      ctx,
      node.lane,
      LANES,
      (bad) => `band ${band_label} node ${label} lane "${bad}" is not a known lane`,
      true,
    );
    check_value(
      ctx,
      node.mark,
      MARKS,
      (bad) => `band ${band_label} node ${label} mark "${bad}" is not a known mark`,
    );
    check_value(
      ctx,
      node.mark_tone,
      TONES,
      (bad) => `band ${band_label} node ${label} mark_tone "${bad}" is not a known tone`,
    );
  }

  return ids;
}

interface EdgeSurvey {
  connected: Set<string>;
  has_merge: boolean;
}

function check_edges(
  ctx: z.RefinementCtx,
  band_label: string,
  edges: unknown,
  node_ids: Set<string>,
): EdgeSurvey {
  const survey: EdgeSurvey = { connected: new Set<string>(), has_merge: false };

  if (!Array.isArray(edges)) {
    issue(ctx, `band ${band_label} edges must be an array`);
    return survey;
  }

  const ids = new Set<string>();

  for (const raw of edges) {
    const edge = shape(PipelineEdgeSchema, raw);
    const label = edge.id ? `"${edge.id}"` : '"unknown"';

    if (!edge.id) {
      issue(ctx, `band ${band_label} edge is missing an id`);
    } else if (ids.has(edge.id)) {
      issue(ctx, `band ${band_label} repeats edge id "${edge.id}"`);
    } else {
      ids.add(edge.id);
    }

    // A misspelt endpoint is the expensive mistake this file exists to
    // catch: the renderer has no coordinate to draw to, so the line just
    // never appears and the graph reads as one hop shorter.
    for (const [end, node_id] of [
      ["starts at", edge.from],
      ["ends at", edge.to],
    ] as const) {
      if (!node_id) {
        issue(ctx, `band ${band_label} edge ${label} ${end} no node`);
      } else if (!node_ids.has(node_id)) {
        issue(ctx, `band ${band_label} edge ${label} ${end} unknown node "${node_id}"`);
      } else {
        survey.connected.add(node_id);
      }
    }

    if (edge.from && edge.from === edge.to) {
      issue(ctx, `band ${band_label} edge ${label} starts and ends on "${edge.from}"`);
    }

    if (edge.kind === "merge") {
      survey.has_merge = true;
    }

    check_value(
      ctx,
      edge.kind,
      EDGE_KINDS,
      (bad) => `band ${band_label} edge ${label} kind "${bad}" is not a known kind`,
      true,
    );
    check_value(
      ctx,
      edge.tone,
      TONES,
      (bad) => `band ${band_label} edge ${label} tone "${bad}" is not a known tone`,
      true,
    );
    check_value(
      ctx,
      edge.dash,
      EDGE_DASHES,
      (bad) => `band ${band_label} edge ${label} dash "${bad}" is not a known dash`,
    );
    check_value(
      ctx,
      edge.head_tone,
      TONES,
      (bad) => `band ${band_label} edge ${label} head_tone "${bad}" is not a known tone`,
    );
  }

  return survey;
}

function check_terminal(ctx: z.RefinementCtx, band_label: string, terminal: unknown): void {
  if (terminal === undefined) {
    return;
  }

  const { path, turns } = shape(PipelineTerminalSchema, terminal);

  if (!path) {
    issue(ctx, `band ${band_label} terminal is missing a path`);
  }

  if (!Array.isArray(turns)) {
    issue(ctx, `band ${band_label} terminal turns must be an array`);
    return;
  }

  turns.forEach((raw, index) => {
    const turn = shape(PipelineTerminalTurnSchema, raw);

    check_value(
      ctx,
      turn.speaker,
      TURN_SPEAKERS,
      (bad) => `band ${band_label} terminal speaker "${bad}" is not a known speaker`,
      true,
    );

    const bars: unknown[] = Array.isArray(turn.bars) ? turn.bars : [];
    if (bars.length === 0 && !turn.cursor) {
      issue(ctx, `band ${band_label} terminal turn ${index} has neither bars nor a cursor`);
    }

    for (const bar of bars) {
      if (typeof bar !== "number" || !Number.isFinite(bar) || bar < 0 || bar > 100) {
        issue(
          ctx,
          `band ${band_label} terminal turn ${index} has a bar width of ${String(bar)}, outside 0-100`,
        );
      }
    }
  });
}

function check_marks(ctx: z.RefinementCtx, band_label: string, marks: unknown): void {
  if (marks === undefined) {
    return;
  }
  if (!Array.isArray(marks)) {
    issue(ctx, `band ${band_label} marks must be an array`);
    return;
  }

  const ids = new Set<string>();

  for (const raw of marks) {
    const mark = shape(PipelineMarkEntrySchema, raw);

    check_value(
      ctx,
      mark.id,
      MARKS,
      (bad) => `band ${band_label} mark "${bad}" is not a known mark`,
      true,
    );

    if (mark.id) {
      if (ids.has(mark.id)) {
        issue(ctx, `band ${band_label} repeats mark "${mark.id}"`);
      }
      ids.add(mark.id);
    }

    if (!mark.label) {
      issue(ctx, `band ${band_label} mark "${String(mark.id)}" is missing a label`);
    }
  }
}

function check_readout(ctx: z.RefinementCtx, band_label: string, readout: unknown): void {
  if (readout === undefined) {
    return;
  }

  const { column, entries } = shape(PipelineReadoutSchema, readout);

  check_value(
    ctx,
    column,
    COLUMNS,
    (bad) => `band ${band_label} readout column "${bad}" is not a known column`,
    true,
  );

  if (!Array.isArray(entries)) {
    issue(ctx, `band ${band_label} readout entries must be an array`);
    return;
  }
  if (entries.length === 0) {
    issue(ctx, `band ${band_label} readout has no entries`);
    return;
  }

  const ids = new Set<string>();

  for (const raw of entries) {
    const entry = shape(PipelineReadoutEntrySchema, raw);

    if (!entry.id) {
      issue(ctx, `band ${band_label} readout entry is missing an id`);
    } else if (ids.has(entry.id)) {
      issue(ctx, `band ${band_label} repeats readout entry id "${entry.id}"`);
    } else {
      ids.add(entry.id);
    }

    if (!entry.label || !entry.value) {
      issue(
        ctx,
        `band ${band_label} readout entry "${String(entry.id)}" is missing a label or value`,
      );
    }

    check_value(
      ctx,
      entry.tone,
      TONES,
      (bad) =>
        `band ${band_label} readout entry "${String(entry.id)}" tone "${bad}" is not a known tone`,
    );
  }
}

const PipelineDataSchema = z
  .object({
    heading: z.any().optional(),
    lede: z.any().optional(),
    lede_emphasis: z.any().optional(),

    bands: z
      .array(PipelineBandSchema, {
        required_error: "bands must be an array",
        invalid_type_error: "bands must be an array",
      })
      .superRefine((bands, ctx) => {
        if (bands.length === 0) {
          issue(ctx, "bands must contain at least one band");
        }

        const seen_ids = new Set<string>();

        for (const band of bands) {
          const band_label = band.id ? `"${band.id}"` : '"unknown"';

          if (!band.id) {
            issue(ctx, "band is missing an id");
          } else if (seen_ids.has(band.id)) {
            issue(ctx, `duplicate band id "${band.id}"`);
          } else {
            seen_ids.add(band.id);
          }

          check_value(
            ctx,
            band.graph_side,
            GRAPH_SIDES,
            (bad) => `band ${band_label} graph_side "${bad}" is not a known side`,
            true,
          );

          if (band.label !== undefined && !shape(PipelineBandLabelSchema, band.label).from) {
            issue(ctx, `band ${band_label} label is missing its first part`);
          }

          check_note(ctx, band_label, band.note);

          const node_ids = check_nodes(ctx, band_label, band.nodes);
          const survey = check_edges(ctx, band_label, band.edges, node_ids);

          // Nothing else notices a node no line reaches: it is drawn
          // beside the spine with nothing connecting it, which looks
          // deliberate. The one exception is a merge-lane node, which is
          // positioned along a merge curve rather than by its own edges.
          for (const raw of Array.isArray(band.nodes) ? band.nodes : []) {
            const node = shape(PipelineNodeSchema, raw);
            if (!node.id) {
              continue;
            }
            if (node.lane === "merge") {
              if (!survey.has_merge) {
                issue(
                  ctx,
                  `band ${band_label} node "${node.id}" rides a merge edge, but there is none`,
                );
              }
            } else if (!survey.connected.has(node.id)) {
              issue(ctx, `band ${band_label} node "${node.id}" is not connected by any edge`);
            }
          }

          check_terminal(ctx, band_label, band.terminal);
          check_marks(ctx, band_label, band.marks);
          check_readout(ctx, band_label, band.readout);
        }
      }),

    crossings: z
      .array(PipelineCrossingSchema, {
        required_error: "crossings must be an array",
        invalid_type_error: "crossings must be an array",
      })
      .superRefine((crossings, ctx) => {
        const seen_ids = new Set<string>();

        for (const crossing of crossings) {
          if (!crossing.id) {
            issue(ctx, "crossing is missing an id");
          } else if (seen_ids.has(crossing.id)) {
            issue(ctx, `duplicate crossing id "${crossing.id}"`);
          } else {
            seen_ids.add(crossing.id);
          }

          if (!crossing.label) {
            issue(ctx, `crossing "${String(crossing.id)}" is missing a label`);
          }
        }
      }),

    closer: z.any().optional(),
    closer_emphasis: z.any().optional(),
  })
  // The document-level pass: the copy fields, which need a sibling to
  // check against, and the crossings, which only mean anything relative to
  // the band list. A non-array `bands` or `crossings` is a type failure and
  // aborts before this runs, so both can be assumed to be arrays here.
  // Field-level faults do not skip it: an inner superRefine that calls
  // addIssue marks the result dirty rather than aborted, and the outer
  // refinement still runs, which is why a bad graph_side and a missing
  // heading are reported together.
  .superRefine((pipeline, ctx) => {
    if (!pipeline.heading) {
      issue(ctx, "heading is required");
    }
    if (!pipeline.lede) {
      issue(ctx, "lede is required");
    }
    if (!pipeline.closer) {
      issue(ctx, "closer is required");
    }

    check_emphasis(
      ctx,
      pipeline.lede_emphasis,
      pipeline.lede,
      (bad) => `lede_emphasis (${bad}) must appear verbatim in the lede`,
    );
    check_emphasis(
      ctx,
      pipeline.closer_emphasis,
      pipeline.closer,
      (bad) => `closer_emphasis (${bad}) must appear verbatim in the closer`,
    );

    const band_ids = pipeline.bands.map((band) => band.id).filter(Boolean);
    // The last band, not the last band with an id: filtering first would
    // make a document whose final band is unnamed report the crossing
    // before it as hanging off the end, which is a false message on top of
    // a real one.
    const last_band_id = pipeline.bands[pipeline.bands.length - 1]?.id;
    const spoken_for = new Set<string>();

    for (const crossing of pipeline.crossings) {
      if (!crossing.after) {
        issue(ctx, `crossing "${String(crossing.id)}" does not say which band it comes after`);
        continue;
      }

      if (!band_ids.includes(crossing.after)) {
        issue(
          ctx,
          `crossing "${String(crossing.id)}" comes after unknown band "${crossing.after}"`,
        );
        continue;
      }

      // A connector leaves one band and lands on the next, so one hung off
      // the last band would be drawn into the empty page below the section.
      if (crossing.after === last_band_id) {
        issue(
          ctx,
          `crossing "${String(crossing.id)}" comes after the last band "${crossing.after}"`,
        );
      }

      if (spoken_for.has(crossing.after)) {
        issue(ctx, `band "${crossing.after}" already has a crossing after it`);
      }
      spoken_for.add(crossing.after);
    }
  });

const _pipeline_data_schema_covers_type: SchemaCoversType<
  PipelineData,
  z.infer<typeof PipelineDataSchema>
> = true;

export function validate_pipeline_data(pipeline: PipelineData): ValidationError[] {
  const path = "data/pipeline.yaml";
  const result = PipelineDataSchema.safeParse(pipeline);

  if (result.success) {
    return [];
  }

  // A missing or malformed document (an empty data/pipeline.yaml parses to
  // `undefined`) collapses to this one root-level issue - zod cannot
  // descend into the fields of a value that is not an object at all.
  // Matched on the issue code, not just the empty path: the document-level
  // superRefine reports at the root too, so a document whose only fault is
  // a blank heading would otherwise be described as missing entirely.
  const first = result.error.issues[0];
  if (
    result.error.issues.length === 1 &&
    first.path.length === 0 &&
    first.code === z.ZodIssueCode.invalid_type
  ) {
    return [{ path, message: "pipeline.yaml must contain a document" }];
  }

  return result.error.issues.map((issue_found) => ({ path, message: issue_found.message }));
}
