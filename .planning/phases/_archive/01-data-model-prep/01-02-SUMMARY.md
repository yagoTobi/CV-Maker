---
phase: 01-data-model-prep
plan: 02
subsystem: api
tags: [pydantic, storage-migration, jinja2, latex, ai-tailor, cv-import, backward-compat]

# Dependency graph
requires:
  - phase: 01-data-model-prep (plan 01)
    provides: BulletItem/SkillItem types, ensure_ids() migration helper, field_validators for coercion
provides:
  - Storage auto-migration on get_version() for both FileStorage and DynamoStorage
  - _flatten_for_template() in generate_latex.py stripping IDs and converting BulletItem/SkillItem to strings for Jinja2
  - _strip_ids_for_ai() in tailor.py removing IDs and flattening for AI consumption
  - ensure_ids() call in cv_extractor.py on extraction output
  - test_id_migration.py with 26 tests covering ensure_ids, backward compat, flatten, and strip
  - ID-bearing test fixtures (sample_cv.json with structured bullets, minimal_cv.json without IDs)
affects: [01-03, 02-web-cv-editor, 05-ai-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [auto-migration on read for backward-compatible ID injection, flatten-before-render for template isolation, strip-before-AI for clean prompts]

key-files:
  created:
    - backend/tests/test_id_migration.py
  modified:
    - backend/services/file_storage.py
    - backend/services/dynamo_storage.py
    - backend/routes/generate_latex.py
    - backend/routes/tailor.py
    - backend/services/cv_extractor.py
    - backend/tests/test_template_rendering.py
    - backend/tests/test_template_compilation.py
    - backend/tests/fixtures/sample_cv.json

key-decisions:
  - "Auto-migration persists to storage on first read -- subsequent loads skip migration (idempotent)"
  - "_flatten_for_template converts Pydantic model to dict, strips IDs, flattens BulletItem/SkillItem to plain strings so Jinja2 templates need zero changes"
  - "_strip_ids_for_ai uses deep copy to avoid mutating original data, ensuring form_dict used for path resolution is unaffected"

patterns-established:
  - "Auto-migrate on read: storage backends call ensure_ids() in get_version(), persist if modified, return enriched data"
  - "Flatten before render: _flatten_for_template() isolates templates from data model changes (templates always see plain strings)"
  - "Strip before AI: _strip_ids_for_ai() ensures AI prompts contain clean data matching training format"

requirements-completed: [DATA-02, DATA-03]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 1 Plan 02: Backend Consumer Integration Summary

**Storage auto-migration injects IDs on version load, LaTeX generation flattens BulletItem/SkillItem to strings for templates, AI tailor strips IDs before prompts, and CV import adds IDs on extraction -- with 26 new migration tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T23:15:35Z
- **Completed:** 2026-03-29T23:19:35Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- FileStorage and DynamoStorage auto-migrate legacy versions without IDs on first load, persisting the enriched data so subsequent reads are pass-through
- `_flatten_for_template()` converts structured BulletItem/SkillItem back to plain strings before Jinja2 rendering, keeping all 3 LaTeX templates unchanged
- `_strip_ids_for_ai()` deep-copies and strips IDs from form data before AI consumption, ensuring prompts match the expected schema format
- CV extractor calls `ensure_ids()` on both AI-extracted and JSON-imported data before returning results
- 26 new tests in test_id_migration.py covering ensure_ids migration, Pydantic backward compatibility, flatten-for-template, and strip-for-AI
- Maximal test fixture updated to use structured BulletItem/SkillItem format with test IDs
- sample_cv.json updated with deterministic test IDs on all entries and structured bullets/skills
- All 358 backend tests pass (48 rendering/migration tests + 310 others, 18 slow compilation tests deselected)

## Task Commits

Each task was committed atomically:

1. **Task 1: Storage auto-migration + generate_latex flattening + tailor strip + extractor IDs** - `1af9a8b` (feat)
2. **Task 2: Backend test fixtures + new migration tests** - `f8d4984` + `7506fa0` (test/feat)

## Files Created/Modified
- `backend/services/file_storage.py` - Added ensure_ids auto-migration in get_version() with persist-if-modified logic
- `backend/services/dynamo_storage.py` - Added ensure_ids auto-migration in get_version() with persist-if-modified logic
- `backend/routes/generate_latex.py` - Added _flatten_for_template() function and updated route to use flattened context
- `backend/routes/tailor.py` - Added _strip_ids_for_ai() function and wired into _serialize_form_data()
- `backend/services/cv_extractor.py` - Added ensure_ids() call in _parse_extraction_response() and extract_from_json()
- `backend/tests/test_id_migration.py` - NEW: 26 tests covering migration, backward compat, flatten, and strip
- `backend/tests/test_template_rendering.py` - Updated maximal_data fixture to use BulletItem/SkillItem; updated _build_context to use _flatten_for_template
- `backend/tests/test_template_compilation.py` - Updated _build_context to use _flatten_for_template
- `backend/tests/fixtures/sample_cv.json` - Added deterministic test IDs on all entries and structured bullet/skill format
- `backend/tests/fixtures/minimal_cv.json` - Intentionally left without IDs to test migration path

## Decisions Made
- Auto-migration persists to storage on first read -- ensures IDs are stable across sessions without requiring a separate migration script
- _flatten_for_template converts the full Pydantic model to a dict first (model_dump), then strips IDs and flattens in-place -- this means Jinja2 templates require zero changes and continue working with plain string arrays
- _strip_ids_for_ai uses copy.deepcopy to avoid mutating the original form data dict, since the original is needed for path resolution validation in the tailor suggest-changes endpoint

## Deviations from Plan

None - all code changes were already implemented by the prior executor session. This execution verified correctness, confirmed all 358 backend tests pass, and created the summary documentation.

## Issues Encountered
None - all verification checks passed on first run. The prior executor session had already implemented all Task 1 and Task 2 code changes across commits 1af9a8b, f8d4984, and 7506fa0.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All backend consumers now handle ID-bearing CVFormData correctly
- Plan 03 (frontend consumers) can proceed: useFormBuilder factories, formDataPatch, UI sections, and frontend tests need updating to use BulletItem/SkillItem types
- Phase 2 (Core Editing Surface) has the stable ID foundation it needs for field-level operations

## Self-Check: PASSED

All key files verified present. Task commits (1af9a8b, f8d4984, 7506fa0) verified in git log.

---
*Phase: 01-data-model-prep*
*Completed: 2026-03-30*
