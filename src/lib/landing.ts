import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import yaml from "js-yaml";
import { z } from "zod";

import type {
  LandingAppearance,
  LandingData,
  LandingGithub,
  LandingHero,
  LandingLink,
  LandingProject,
} from "./types.js";
import type { ValidationError } from "./validate.js";

const DATA_DIR = resolve("data");

// The section ids any component built so far can render: Hero ("hero"),
// Divider ("divider"), Commits ("commits"), Pipeline ("pipeline"), Work
// ("work"), Appearances ("appearances"), Contact ("contact"). A `sections`
// entry outside this set silently renders nothing once wired up. The
// resume CTA (#174's "resume" section) is no longer a standalone section -
// the redesign (#177) embeds it directly in the hero.
//
// Exported for LandingSections.test.ts, which walks it and renders each id
// in turn. This set and the {#if} chain in LandingSections.svelte are two
// hand-maintained copies of one list, and the failure mode of a mismatch
// is silence: an id here with no arm there renders nothing at all, with no
// error. Walking it in a test is what links the two.
export const KNOWN_SECTIONS = new Set([
  "hero",
  "divider",
  "commits",
  "pipeline",
  "work",
  "appearances",
  "contact",
]);

export function load_landing_data(): LandingData {
  const raw = readFileSync(resolve(DATA_DIR, "landing.yaml"), "utf-8");
  return yaml.load(raw) as LandingData;
}

// --- Schema ---
//
// This is the fix for a recurring defect: three review rounds on #166 each
// caught `validate_landing_data` missing a different field a component
// dereferences, by a different mechanism each time (an unchecked per-entry
// field, a presence check reached through `?? []`, a wrong-typed collection
// that threw). The common cause was that nothing forced the validator's
// coverage to track `LandingData`'s declared shape - a reviewer had to
// notice the gap by hand every time.
//
// `SchemaCoversType` below closes that gap for field *presence*: for each
// interface in `./types.ts` that composes `LandingData`, it asserts that
// every key of the real interface exists on the schema's inferred type. If
// a field is added to one of those interfaces and this file isn't updated
// to match, the assertion fails to compile and `npm run check` fails - a
// missing field is no longer expressible, it's a build break.
//
// Leaf fields are deliberately typed `z.any().optional()` rather than
// `z.string()` etc. Zod skips a schema's attached `superRefine` whenever
// that schema's own shape fails to type-check, and doing that per-item
// would make one project's wrong-typed `stack` field suppress the
// duplicate-id and required-field checks for every *other* project in the
// same document, in the same validation pass - a worse failure mode than
// today's, not a better one. Presence coverage (the structural guarantee)
// and required-ness (the actual check) are handled separately: the
// `superRefine` blocks below reproduce the same falsy/shape checks the
// hand-rolled validator used, so error messages are unchanged, while the
// type assertion is what keeps a *new* field from going unchecked silently.
// Only the outer containers - the document root, and each of the six
// top-level fields - keep real zod typing, so a wrong-typed collection
// (a YAML map where a list belongs) is a single clean validation error
// instead of a thrown exception, with no manual `Array.isArray` juggling
// needed to get there.

type SchemaCoversType<RealType, InferredType> = keyof RealType extends keyof InferredType
  ? true
  : never;

const LandingHeroSchema = z.object({
  name: z.any().optional(),
  role: z.any().optional(),
  location: z.any().optional(),
  tagline: z.any().optional(),
  tagline_emphasis: z.any().optional(),
});
const _hero_schema_covers_type: SchemaCoversType<LandingHero, z.infer<typeof LandingHeroSchema>> =
  true;

const LandingLinkSchema = z.object({
  label: z.any().optional(),
  url: z.any().optional(),
});
const _link_schema_covers_type: SchemaCoversType<LandingLink, z.infer<typeof LandingLinkSchema>> =
  true;

const LandingProjectSchema = z.object({
  id: z.any().optional(),
  name: z.any().optional(),
  blurb: z.any().optional(),
  repo_url: z.any().optional(),
  stack: z.any().optional(),
  links: z.any().optional(),
  status: z.any().optional(),
});
const _project_schema_covers_type: SchemaCoversType<
  LandingProject,
  z.infer<typeof LandingProjectSchema>
> = true;

const LandingAppearanceSchema = z.object({
  id: z.any().optional(),
  event: z.any().optional(),
  what: z.any().optional(),
  date: z.any().optional(),
  blurb: z.any().optional(),
});
const _appearance_schema_covers_type: SchemaCoversType<
  LandingAppearance,
  z.infer<typeof LandingAppearanceSchema>
> = true;

const LandingGithubSchema = z.object({
  user: z.any().optional(),
});
const _github_schema_covers_type: SchemaCoversType<
  LandingGithub,
  z.infer<typeof LandingGithubSchema>
> = true;

function build_landing_data_schema(valid_variants: string[]) {
  const RESUME_LINKS_MESSAGE =
    "resume_links must contain exactly one entry (multiple public variants need per-variant CTA labels, which this data model does not support yet)";

  return z.object({
    hero: LandingHeroSchema.superRefine((hero, ctx) => {
      if (!hero.name || !hero.role || !hero.location || !hero.tagline) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "hero is missing required fields (name, role, location, tagline)",
        });
      }

      // An emphasis that isn't in the tagline would silently render nothing
      // - the phrase would just never be highlighted, with no error - so a
      // typo here has to fail loudly rather than degrade quietly.
      if (hero.tagline_emphasis && typeof hero.tagline === "string") {
        if (!hero.tagline.includes(hero.tagline_emphasis)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `hero.tagline_emphasis (${hero.tagline_emphasis}) must appear verbatim in hero.tagline`,
          });
        }
      }
    }),

    projects: z
      .array(LandingProjectSchema, {
        required_error: "projects must be an array",
        invalid_type_error: "projects must be an array",
      })
      .superRefine((projects, ctx) => {
        const seen_ids = new Set<string>();
        for (const project of projects) {
          const label = project.id || "unknown";

          if (!project.id) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "project is missing an id" });
          } else if (seen_ids.has(project.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate project id "${project.id}"`,
            });
          } else {
            seen_ids.add(project.id);
          }

          if (!project.name || !project.blurb || !project.status) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `project "${label}" is missing name, blurb, or status`,
            });
          }

          if (!Array.isArray(project.stack)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `project "${label}" is missing a stack array`,
            });
          }

          if (project.links !== undefined && !Array.isArray(project.links)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `project "${label}" links must be an array`,
            });
          } else {
            for (const [link_index, link] of (project.links ?? []).entries()) {
              if (!link?.label || !link?.url) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `project "${label}" link ${link_index} is missing label or url`,
                });
              }
            }
          }
        }
      }),

    appearances: z
      .array(LandingAppearanceSchema, {
        required_error: "appearances must be an array",
        invalid_type_error: "appearances must be an array",
      })
      .superRefine((appearances, ctx) => {
        const seen_ids = new Set<string>();
        for (const appearance of appearances) {
          const label = appearance.id || "unknown";

          if (!appearance.id) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "appearance is missing an id" });
          } else if (seen_ids.has(appearance.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate appearance id "${appearance.id}"`,
            });
          } else {
            seen_ids.add(appearance.id);
          }

          if (!appearance.event || !appearance.what || !appearance.date || !appearance.blurb) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `appearance "${label}" is missing event, what, date, or blurb`,
            });
          }
        }
      }),

    resume_links: z
      .array(z.any(), {
        required_error: RESUME_LINKS_MESSAGE,
        invalid_type_error: RESUME_LINKS_MESSAGE,
      })
      .superRefine((resume_links, ctx) => {
        if (resume_links.length !== 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: RESUME_LINKS_MESSAGE });
        }
        for (const variant of resume_links) {
          if (!valid_variants.includes(variant)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `resume_links variant "${variant}" is not a valid variant`,
            });
          }
        }
      }),

    contact: z
      .array(LandingLinkSchema, {
        required_error: "contact must be an array",
        invalid_type_error: "contact must be an array",
      })
      .superRefine((contact, ctx) => {
        const seen_urls = new Set<string>();
        for (const [index, item] of contact.entries()) {
          if (!item?.label || !item?.url) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `contact entry ${index} is missing label or url`,
            });
          } else if (seen_urls.has(item.url)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate contact url "${item.url}"`,
            });
          } else {
            seen_urls.add(item.url);
          }
        }
      }),

    github: LandingGithubSchema.superRefine((github, ctx) => {
      if (!github.user) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "github.user is required" });
      }
    }),

    sections: z
      .array(z.any(), {
        required_error: "sections must be an array",
        invalid_type_error: "sections must be an array",
      })
      .superRefine((sections, ctx) => {
        const seen = new Set<string>();
        for (const section of sections) {
          if (seen.has(section)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate section "${section}"`,
            });
          }
          seen.add(section);

          if (!KNOWN_SECTIONS.has(section)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `section "${section}" is not a known section`,
            });
          }
        }
      }),
  });
}

const _landing_data_schema_covers_type: SchemaCoversType<
  LandingData,
  z.infer<ReturnType<typeof build_landing_data_schema>>
> = true;

export function validate_landing_data(
  landing: LandingData,
  valid_variants: string[],
): ValidationError[] {
  const path = "data/landing.yaml";
  const schema = build_landing_data_schema(valid_variants);
  const result = schema.safeParse(landing);

  if (result.success) {
    return [];
  }

  // A missing or malformed document (an empty `data/landing.yaml` parses to
  // `undefined`) collapses to this one root-level issue - zod can't descend
  // into fields of a value that isn't an object at all, so there's nothing
  // to report per-field.
  if (result.error.issues.length === 1 && result.error.issues[0].path.length === 0) {
    return [{ path, message: "landing.yaml must contain a document" }];
  }

  return result.error.issues.map((issue) => ({ path, message: issue.message }));
}
