---
name: customize-variant
description: Use this skill when the user asks to customize or tailor a resume variant for a specific job posting, generate a tailored resume/cover letter for a job, or create a sub-variant (e.g. "customize cto-a for this job: <URL>", "tailor my resume for this role", "make a sub-variant for this posting"). Produces the sub-variant YAML under `data/variants/{parent}/{slug}.yaml` plus its cover letter.
argument-hint: <parent> <job-url>
---

# Customize Variant

Generate a tailored resume sub-variant and cover letter for a specific job posting.

## When to use

Trigger when the user asks to:

- Customize or tailor an existing variant for a job (e.g. "customize cto-a for this job: <URL>")
- Generate a resume + cover letter for a specific posting
- Create a new sub-variant

## Arguments

Usage: `/customize-variant <parent> <job-url>`

- `<parent>` — required. The parent variant name (must match a file at `data/variants/{parent}.yaml`, e.g. `cto-a`).
- `<job-url>` — required. The URL of the job posting to tailor for.

Arguments can appear in either order; detect the URL by `http(s)://` prefix and treat the other token as the parent. If either is missing or the parent doesn't resolve to a real variant file, ask the user before proceeding — do not guess.

## Workflow

### 1. Gather context

Read these files to understand the full picture:

- `data/resume.yaml` — master resume data (all available content and IDs)
- `data/variants/{parent}.yaml` — the parent variant being customized
- `src/lib/types.ts` — `SubVariantManifest` schema for reference

Fetch the job posting URL with WebFetch to extract job title, company, and description.

### 2. Generate the sub-variant YAML

Generate an 8-character hex slug:

```sh
npm run generate-slug
```

Create the file at `data/variants/{parent}/{slug}.yaml` with this structure:

```yaml
parent: {parent-variant-name}

job:
  url: "{job-posting-url}"
  company: "{company-name}"
  title: "{job-title}"
  fetched_at: "{ISO-8601-timestamp}"

# Only include fields that benefit from customization.
# Omitted fields inherit from the parent variant.
title: "..."
summary: |
  ...
tagline: |
  ...
skills:
  - skill_id
employment_overrides:
  - id: employment-id
    summary: |
      Rewritten summary...
    highlights:
      - title: "..."
        description: |
          ...
```

### 2b. Generate the cover letter

Always generate a `cover_letter` as part of sub-variant creation:

```yaml
cover_letter:
  greeting: "Dear Hiring Team,"
  body: |
    First paragraph...

    Second paragraph...
  closing: "Best regards,"
```

- `greeting` defaults to "Dear Hiring Manager," if omitted
- `body` is required and supports markdown (paragraphs separated by blank lines)
- `closing` defaults to "Sincerely," if omitted
- The cover letter renders at `/{variant}/{slug}/letter` using the parent's theme
- A cover letter PDF is generated at `build/{parent}/{slug}-letter.pdf`
- **NEVER fabricate** content. Base the letter on real experience from `data/resume.yaml`.

To suppress a cover letter from rendering/routing, add `cover_letter_enabled: false` to the YAML. The cover letter data stays in the file but the route and PDF will not be generated.

### 3. Constraints

- **NEVER fabricate** experience, skills, or accomplishments. Only use content from `data/resume.yaml`.
- **Preserve voice and style** — match the tone of the parent variant. Never tone-police the parent's language. If the parent uses profanity, slang, or deliberately provocative phrasing, the sub-variant must preserve that energy. Sanitizing the voice is a bug, not professionalism.
- All IDs (skills, employment, domains, etc.) MUST exist in `data/resume.yaml`.
- Employment override IDs must be in the active employment list (sub-variant's or parent's).
- Only override what benefits from customization. Less is more.
- Keep the summary concise (3-5 sentences).
- Do NOT set `theme` or `online_callout` — those inherit from the parent.

### 4. Validate and verify

```sh
npm run validate-sub-variants
npm run build
```

The validation script checks: parent field matches directory, all IDs exist in master data, required job metadata is present.

### 5. Helper scripts

| Script                          | Purpose                            |
| ------------------------------- | ---------------------------------- |
| `npm run generate-slug`         | Generate a random 8-char hex slug  |
| `npm run validate-sub-variants` | Validate all sub-variant manifests |
