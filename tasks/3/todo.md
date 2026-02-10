# Issue #3: Data Model for Resume Data

## Plan

- [x] Create `data/resume.yaml` with all resume content
- [x] Create `data/variants/default.yaml` with default variant manifest
- [x] Verify schema covers all sections from the sample PDF
- [x] Verify variant system can express filtering/reordering

## Review

All YAML files validated:
- **resume.yaml**: 5 sections (profile, skills x8, employment x6, languages x3, courses x2)
- **variants/default.yaml**: title override, summary override, all 4 section ID lists
- Cross-reference: all variant IDs match content in resume.yaml
- Schema field checks: all required fields present, levels in 1-5 range
- Inline Markdown supported in string values (e.g. `**bold**` in highlight descriptions)
