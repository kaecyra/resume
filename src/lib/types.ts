export interface Contact {
  location: string;
  email: string;
  linkedin?: string;
}

export interface Profile {
  name: string;
  photo: string;
  contact: Contact;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
}

export interface Highlight {
  title?: string;
  description: string;
}

export interface Employment {
  id: string;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  description: string | null;
  summary: string | null;
  highlights: Highlight[];
}

export interface Language {
  id: string;
  name: string;
  proficiency: string;
  level: number;
}

export interface Course {
  id: string;
  title: string;
  institution: string;
  date: string;
}

export interface Domain {
  id: string;
  title: string;
  description: string;
}

export interface FieldDeployment {
  id: string;
  category: string;
  title: string;
  venue: string;
  date: string | null;
  description: string;
}

export interface ResumeData {
  profile: Profile;
  skills: Skill[];
  domains: Domain[];
  field_deployments: FieldDeployment[];
  employment: Employment[];
  languages: Language[];
  courses: Course[];
}

export interface VariantManifest {
  theme: string;
  title: string;
  summary: string;
  tagline?: string;
  online_callout?: string;
  skills: string[];
  domains?: string[];
  field_deployments?: string[];
  employment: string[];
  languages: string[];
  courses: string[];
}

export interface EmploymentOverride {
  id: string;
  summary?: string;
  highlights?: Highlight[];
}

export interface CoverLetter {
  greeting?: string;
  body: string;
  closing?: string;
}

export interface SubVariantManifest {
  parent: string;
  job: {
    url: string;
    company: string;
    title: string;
    fetched_at: string;
  };
  title?: string;
  summary?: string;
  tagline?: string;
  online_callout?: string;
  skills?: string[];
  domains?: string[];
  field_deployments?: string[];
  employment?: string[];
  languages?: string[];
  courses?: string[];
  employment_overrides?: EmploymentOverride[];
  cover_letter?: CoverLetter;
  cover_letter_enabled?: boolean;
}

export interface SubVariantEntry {
  parent: string;
  slug: string;
}

export interface ResolvedResume {
  theme: string;
  profile: Profile;
  title: string;
  summary: string;
  tagline?: string;
  online_callout?: string;
  online_url?: string;
  online_qr_svg?: string;
  skills: Skill[];
  domains: Domain[];
  field_deployments: FieldDeployment[];
  employment: Employment[];
  languages: Language[];
  courses: Course[];
}

export interface LandingHero {
  name: string;
  role: string;
  location: string;
  tagline: string;
  // A verbatim substring of `tagline` to emphasise when the hero renders it.
  // Carried as plain text rather than markup in the YAML: the tagline is
  // also consumed by seo.ts for meta descriptions, where inline HTML would
  // have to be stripped back out again. Optional - absent means the tagline
  // renders flat, which is what every other consumer already does.
  tagline_emphasis?: string;
}

export interface LandingLink {
  label: string;
  url: string;
}

export interface LandingProject {
  id: string;
  name: string;
  blurb: string;
  repo_url?: string;
  stack: string[];
  links?: LandingLink[];
  status: string;
}

export interface LandingAppearance {
  id: string;
  event: string;
  what: string;
  date: string;
  blurb: string;
}

export interface LandingGithub {
  user: string;
}

export interface LandingData {
  hero: LandingHero;
  projects: LandingProject[];
  appearances: LandingAppearance[];
  resume_links: string[];
  contact: LandingLink[];
  github: LandingGithub;
  sections: string[];
}

// --- data/pipeline.yaml (#209) ---
//
// The "Pipelines" section is the first landing section whose content does
// not live in data/landing.yaml. It is three annotated graphs plus the
// columns facing them, and folding that much structure into the landing
// document would have buried the six sections already there.
// src/lib/pipeline.ts loads and validates it, and +page.server.ts threads
// it through as its own prop the way contributions_grid already is.
//
// Nothing below carries a coordinate. A band's graph is described as nodes
// and the edges between them; src/lib/landing/pipeline-graph.ts turns that
// topology into positions and path strings, so moving a lane or restyling
// a curve is one change there rather than a sweep through the YAML.

// How a node is painted. `ring` is an outlined circle over the page
// ground, `disc` a solid fill, and `reader` the haloed terminus that
// closes the last graph - the only node of its kind, so it gets a name
// rather than a pile of flags.
export type PipelineNodeStyle = "ring" | "disc" | "reader";

// Which of the section's colours a node, a vendor mark, an edge or a
// readout value takes. The names are roles, not hexes: the values live in
// src/lib/landing/palette.ts.
export type PipelineTone = "default" | "muted" | "dim" | "accent" | "green";

// Which lane of a graph a node stands in. `merge` is the one node that
// rides the merge curve itself rather than standing in either lane.
export type PipelineLane = "trunk" | "branch" | "merge";

// What an edge is doing: running down a lane (`trunk`, `branch`), leaving
// the trunk for the branch (`fork`), or rejoining it (`merge`).
export type PipelineEdgeKind = "trunk" | "branch" | "fork" | "merge";

// `dotted` means "this lane is not the live tip right now"; `dashed` means
// "this is a tunnel, not a wire". Both are load bearing, not decoration.
export type PipelineEdgeDash = "solid" | "dotted" | "dashed";

export type PipelineMark =
  | "github"
  | "github-actions"
  | "docker"
  | "nginx"
  | "cloudflare"
  | "proxmox"
  | "ubuntu";

// Which side of a band's two-column grid the graph takes on desktop. Below
// the breakpoint every band stacks graph first regardless.
export type PipelineGraphSide = "left" | "right";

// Which of a band's two columns a note or a readout belongs to.
export type PipelineColumn = "graph" | "aside";

export type PipelineTurnSpeaker = "you" | "agent" | "tool";

export interface PipelineNode {
  id: string;
  label: string;
  // The smaller line under the label, or the lines where the copy breaks
  // it over more than one. Nothing downstream can measure a proportional
  // face, so a single string too long for the drawing's box is clipped
  // rather than wrapped - the break belongs with the copy, as it does in
  // the mockup this was ported from.
  detail?: string | string[];
  style: PipelineNodeStyle;
  tone: PipelineTone;
  lane: PipelineLane;
  mark?: PipelineMark;
  // Only set where the mark does not take the node's own tone.
  mark_tone?: PipelineTone;
  // Renders the label at weight 500 rather than regular.
  emphasis?: boolean;
  // Draws a tick inside the node.
  tick?: boolean;
}

export interface PipelineEdge {
  id: string;
  // Both name a node in the same band.
  from: string;
  to: string;
  kind: PipelineEdgeKind;
  tone: PipelineTone;
  dash?: PipelineEdgeDash;
  // A trunk edge spanning a fork carries two readings at once: the stretch
  // above the fork is still the live tip, the rest is not. `head_tone`
  // paints that first stretch, `tone` the remainder.
  head_tone?: PipelineTone;
}

export interface PipelineTerminalTurn {
  speaker: PipelineTurnSpeaker;
  // Bar widths as percentages of the terminal body. The terminal carries
  // no readable text - a real transcript would date immediately and say
  // nothing the note does not - so the shape of the exchange is the
  // content, and these numbers are it.
  bars?: number[];
  // The trailing turn is a bare blinking cursor rather than bars.
  cursor?: boolean;
}

export interface PipelineTerminal {
  path: string;
  turns: PipelineTerminalTurn[];
}

export interface PipelineReadoutEntry {
  id: string;
  label: string;
  value: string;
  // Rendered smaller and alongside the value: a unit, or in the protocol
  // entry's case the TLS version.
  unit?: string;
  tone?: PipelineTone;
}

// Which live source, if any, replaces a readout's sample values once the
// page is running: `delivery` measures the reader's own request (band 3),
// `basement` polls the mechanical room's temperature/humidity sensor (band
// 2). Named for the source rather than left a boolean, because the two
// swap in on entirely different mechanisms - one measurement on mount, one
// poll on an interval - and a component branching on `true` would have
// nothing left to branch on if a third source ever showed up.
export type PipelineReadoutSource = "delivery" | "basement";

export interface PipelineReadout {
  column: PipelineColumn;
  entries: PipelineReadoutEntry[];
  // Marks the readout whose values are replaced by measurements from a live
  // source once the page is running. The values in the YAML are what a
  // prerendered, no-JavaScript reader sees, so they have to stand on their
  // own.
  live?: PipelineReadoutSource;
}

export interface PipelineMarkEntry {
  id: PipelineMark;
  label: string;
  // Painted in the accent rather than the chip grey.
  lit?: boolean;
}

export interface PipelineBandLabel {
  from: string;
  // Absent where the band names one place rather than a hop between two.
  to?: string;
}

export interface PipelineNote {
  column: PipelineColumn;
  text: string;
  // A verbatim substring of `text` to emphasise, same contract as
  // LandingHero.tagline_emphasis: carried as plain text so nothing
  // downstream has to strip markup back out.
  emphasis?: string;
}

export interface PipelineBand {
  id: string;
  label?: PipelineBandLabel;
  graph_side: PipelineGraphSide;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  // Draws an arrow off the bottom of the trunk, for a band whose story
  // carries on into the next one.
  tail_arrow?: boolean;
  note: PipelineNote;
  terminal?: PipelineTerminal;
  // A verbatim shell transcript, rendered as a code block.
  code?: string;
  // Whether this band's facing column carries the rack drawing. A flag
  // rather than a band id the renderer knows about by heart, because a
  // registry that lives in two places drifts - see KNOWN_SECTIONS.
  rack?: boolean;
  marks?: PipelineMarkEntry[];
  readout?: PipelineReadout;
}

export interface PipelineCrossing {
  id: string;
  // The band this connector leaves. It lands on the band after that one,
  // so the last band cannot have one.
  after: string;
  label: string;
}

export interface PipelineData {
  heading: string;
  // The line directly under the heading, before the lede. Optional: the
  // section reads without it, and it carries a joke rather than a fact.
  subtitle?: string;
  lede: string;
  // Verbatim substring of `lede`, same contract as PipelineNote.emphasis.
  lede_emphasis?: string;
  bands: PipelineBand[];
  crossings: PipelineCrossing[];
  closer: string;
  closer_emphasis?: string;
}
