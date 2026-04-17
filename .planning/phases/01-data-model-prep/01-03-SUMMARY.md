---
phase: 01-data-model-prep
plan: 03
subsystem: ui
tags: [react, typescript, useFormBuilder, formDataPatch, BulletItem, SkillItem, vitest]

# Dependency graph
requires:
  - phase: 01-01
    provides: BulletItem/SkillItem types, generateId() helper, nanoid
provides:
  - useFormBuilder factory functions producing ID-bearing entries (emptyBullet, emptyWorkEntry, etc.)
  - Bullet/skill CRUD operations preserving stable IDs on update
  - updateSkillsText with SkillItem ID preservation for unchanged skills
  - formDataPatch setAtPath with BulletItem-aware leaf detection and ID preservation
  - applyTailorChanges wrapping string[] as SkillItem[] for structured arrays
  - All 5 UI sections rendering .text from BulletItem/SkillItem (not [object Object])
  - Stable IDs used as React keys for bullet/detail lists
  - formDataPatch.test.ts with 6 tests covering structured type path resolution
  - useFormBuilder.test.ts updated with 37 tests for BulletItem/SkillItem structures
affects: [02-core-editing-surface, 05-ai-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [BulletItem.text access in UI rendering, bullet.id as React key, ID-preserving CRUD updates via spread pattern, structured array detection in formDataPatch]

key-files:
  created:
    - frontend/src/__tests__/formDataPatch.test.ts
  modified:
    - frontend/src/hooks/useFormBuilder.ts
    - frontend/src/utils/formDataPatch.ts
    - frontend/src/features/form-builder/sections/WorkSection.tsx
    - frontend/src/features/form-builder/sections/EducationSection.tsx
    - frontend/src/features/form-builder/sections/SkillsSection.tsx
    - frontend/src/features/form-builder/sections/ProjectsSection.tsx
    - frontend/src/features/form-builder/sections/AdditionalSectionView.tsx
    - frontend/src/__tests__/useFormBuilder.test.ts

key-decisions:
  - "ID-preserving update pattern: { ...b, text: value } spread to update text while keeping stable id"
  - "Structured array detection via _isStructuredArray() checking for {id, text} shape at runtime"
  - "updateSkillsText preserves IDs by position-match first, then text-match for reordering, then generateId() for new"

patterns-established:
  - "Bullet rendering pattern: bullet.text for value, bullet.id for React key"
  - "ID-preserving CRUD: update callbacks spread existing item and replace only the text field"
  - "formDataPatch leaf detection: existing object with id+text fields + string value => preserve ID, update text"

requirements-completed: [DATA-01, DATA-02]

# Metrics
duration: 6min
completed: 2026-03-30
---

# Phase 1 Plan 03: Frontend Consumer Updates Summary

**useFormBuilder factories, CRUD ops, UI sections, and formDataPatch all operating on BulletItem/SkillItem structured types with stable ID preservation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-30T00:08:00Z (first task commit)
- **Completed:** 2026-03-30T00:14:26Z (last task commit)
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- All factory functions (emptyBullet, emptyWorkEntry, emptyEducationEntry, etc.) generate unique IDs via generateId()
- Bullet/skill CRUD operations (addBullet, updateBullet, updateSkillsText, addEduDetail, etc.) produce BulletItem/SkillItem objects preserving stable IDs
- All 5 UI section components (WorkSection, EducationSection, SkillsSection, ProjectsSection, AdditionalSectionView) render `.text` from structured items and use `.id` as React keys
- formDataPatch setAtPath detects BulletItem/SkillItem at leaf nodes and preserves IDs when the AI sends string replacements
- applyTailorChanges wraps `string[]` values as `SkillItem[]` when the target array is structured
- New formDataPatch.test.ts with 6 tests covering bullet modify (ID preservation), education detail modify, non-selected skip, plain string field, new bullet add to structured array, and string[] to SkillItem[] wrapping
- useFormBuilder.test.ts updated to 37 tests with BulletItem/SkillItem expectations including ID stability verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Update useFormBuilder factories + CRUD + formDataPatch** - `3d1439d` (feat)
2. **Task 2: UI sections + frontend tests** - `3ccaae5` (feat)

Intermediate fix commit (between tasks): `f8d4984` - Removed unused dependencies, fixed structured array rendering in UI sections, created formDataPatch.test.ts

## Files Created/Modified
- `frontend/src/hooks/useFormBuilder.ts` - Factory functions with generateId(), CRUD ops producing BulletItem/SkillItem, ID-preserving updateSkillsText
- `frontend/src/utils/formDataPatch.ts` - BulletItem-aware setAtPath with _isStructuredArray detection, string[] wrapping in applyTailorChanges
- `frontend/src/features/form-builder/sections/WorkSection.tsx` - bullet.text rendering, bullet.id keys
- `frontend/src/features/form-builder/sections/EducationSection.tsx` - detail.text rendering, detail.id keys
- `frontend/src/features/form-builder/sections/SkillsSection.tsx` - cat.skills.map(s => s.text).join(", ") rendering
- `frontend/src/features/form-builder/sections/ProjectsSection.tsx` - bullet.text rendering, bullet.id keys
- `frontend/src/features/form-builder/sections/AdditionalSectionView.tsx` - bullet.text rendering, bullet.id keys
- `frontend/src/__tests__/useFormBuilder.test.ts` - Updated 37 tests for BulletItem/SkillItem expectations
- `frontend/src/__tests__/formDataPatch.test.ts` - NEW: 6 tests for structured type path resolution

## Decisions Made
- Used `{ ...b, text: value }` spread pattern for ID-preserving bullet updates -- simple, avoids mutation, keeps stable reference identity for React reconciliation
- Added `_isStructuredArray()` runtime check in formDataPatch rather than path-based detection -- more robust as it works for any array position, not just known paths
- updateSkillsText preserves IDs via three-tier strategy: position match (same index, same text), text match (find by text for reordering), new ID (truly new skill)

## Deviations from Plan

None - plan executed exactly as written. All factory functions, CRUD operations, UI sections, and tests were updated as specified.

## Issues Encountered
None - TypeScript compiled cleanly and all plan-related tests passed on first run.

## Known Pre-existing Test Failures (Out of Scope)
4 test failures in `useImport.test.ts` related to link label derivation logic -- pre-existing and unrelated to this plan. Documented in `deferred-items.md`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 (Data Model Prep) is now complete across all 3 plans: type definitions (01), backend consumers (02), frontend consumers (03)
- All CVFormData array entries have stable IDs on both frontend and backend
- Frontend renders structured BulletItem/SkillItem types correctly
- formDataPatch handles AI-generated string values by wrapping them in structured types
- Phase 2 (Core Editing Surface) can proceed -- stable IDs are the prerequisite for contentEditable field binding

## Self-Check: PASSED

All key files verified present. Both task commits (3d1439d, 3ccaae5) verified in git log.

---
*Phase: 01-data-model-prep*
*Completed: 2026-03-30*
