---
phase: 01-data-model-prep
plan: 01
subsystem: database
tags: [nanoid, pydantic, typescript, id-generation, data-migration]

# Dependency graph
requires: []
provides:
  - BulletItem and SkillItem interfaces (frontend TypeScript)
  - BulletItem and SkillItem Pydantic models (backend Python)
  - Stable id field on all CVFormData entry types (both frontend and backend)
  - generateId() frontend helper via nanoid
  - generate_id() and ensure_ids() backend migration helper
  - field_validators for backward-compatible bare string coercion in Pydantic models
affects: [01-02, 01-03, 02-web-cv-editor, 05-ai-integration]

# Tech tracking
tech-stack:
  added: [nanoid 5.1.7]
  patterns: [BulletItem/SkillItem structured arrays replacing bare string arrays, Optional[str] id for backward-compatible Pydantic models, field_validator for legacy data coercion]

key-files:
  created:
    - frontend/src/utils/idHelpers.ts
    - backend/utils/__init__.py
    - backend/utils/id_helpers.py
  modified:
    - frontend/src/types/index.ts
    - frontend/package.json
    - frontend/package-lock.json
    - backend/routes/cv_versions.py

key-decisions:
  - "nanoid 5.1.7 for frontend IDs (21-char URL-safe), secrets.token_urlsafe(16) for backend IDs (22-char URL-safe)"
  - "Pydantic id fields are Optional[str] = None to allow legacy data without IDs to deserialize"
  - "field_validators on each model coerce bare strings to BulletItem/SkillItem on deserialization"

patterns-established:
  - "BulletItem/SkillItem pattern: all bullet/skill/detail arrays use {id, text} structured objects instead of bare strings"
  - "Optional ID pattern: backend models use Optional[str] = None for IDs so legacy data passes validation"
  - "field_validator coercion: Pydantic models auto-convert bare strings to structured items for backward compatibility"

requirements-completed: [DATA-01, DATA-03]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 1 Plan 01: Type Definitions and ID Helpers Summary

**BulletItem/SkillItem structured types with stable IDs on all CVFormData entries, nanoid frontend helper, and ensure_ids backend migration function with backward-compatible Pydantic coercion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T23:00:18Z
- **Completed:** 2026-03-29T23:03:54Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- All CVFormData entry types (WorkEntry, EducationEntry, SkillCategory, Project, Award, AdditionalEntry, AdditionalSection) now have stable `id` fields on both frontend (required string) and backend (Optional, backward-compatible)
- Bullets, details, and skills arrays converted from bare `string[]` to structured `BulletItem[]`/`SkillItem[]` with `{id, text}` shape
- PersonalInfo.links now includes `id` field in the frontend type
- Backend Pydantic models accept both legacy format (`["string"]`) and new format (`[{"id": "abc", "text": "string"}]`) via field_validators
- `ensure_ids()` migration helper converts legacy data structures (bare string bullets/skills, missing IDs) to the new format
- `generateId()` (frontend, nanoid) and `generate_id()` (backend, secrets.token_urlsafe) provide centralized ID generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Frontend type definitions + ID helper + install nanoid** - `6d3c328` (feat)
2. **Task 2: Backend Pydantic models + ID generation + ensure_ids migration** - `3aa69cc` (feat)

## Files Created/Modified
- `frontend/src/types/index.ts` - Added BulletItem, SkillItem interfaces; added id field and structured arrays to all entry types
- `frontend/src/utils/idHelpers.ts` - NEW: generateId() wrapping nanoid for frontend ID generation
- `frontend/package.json` - Added nanoid ^5.1.7 dependency
- `frontend/package-lock.json` - Updated lockfile with nanoid
- `backend/routes/cv_versions.py` - Added BulletItem/SkillItem Pydantic models, Optional id fields, field_validators for coercion
- `backend/utils/__init__.py` - NEW: empty init for utils package
- `backend/utils/id_helpers.py` - NEW: generate_id() and ensure_ids() migration helper

## Decisions Made
- Used nanoid 5.1.7 (21-char URL-safe) for frontend and secrets.token_urlsafe(16) (22-char URL-safe) for backend -- compact, sufficient entropy, no extra backend dependencies
- Made Pydantic `id` fields `Optional[str] = None` rather than required, ensuring old saved versions without IDs can still deserialize
- Added `field_validator` on each bullet/skill/detail field to auto-coerce bare strings to BulletItem/SkillItem on input, enabling the backend to accept both old and new data formats seamlessly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compiled cleanly even after the type changes (no consumer breakage at this stage). All backend verification tests passed on first run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Type definitions and ID helpers are ready for Plan 02 (storage migration integration with ensure_ids in load path) and Plan 03 (frontend consumer updates -- hooks, form sections, factory functions)
- The ensure_ids() function is complete and tested, ready to be wired into FileStorage.get_version() and DynamoStorage.get_version()
- Frontend consumers (useFormBuilder, form sections) will need updating to use BulletItem/SkillItem types -- that work is scoped in Plan 03

## Self-Check: PASSED

All 7 files verified present. Both task commits (6d3c328, 3aa69cc) verified in git log.

---
*Phase: 01-data-model-prep*
*Completed: 2026-03-30*
