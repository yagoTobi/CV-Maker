---
phase: 03-content-management
plan: 01
subsystem: ui
tags: [react, hooks, factory-pattern, tdd, contenteditable]

# Dependency graph
requires:
  - phase: 02-direct-edit-foundation
    provides: useDirectEditor hook with updateField/addBullet/removeBullet, idHelpers utility
provides:
  - Shared entry factory functions (entryFactories.ts) for all CVFormData array types
  - Extended useDirectEditor with addEntry, removeEntry, toggleSection, hiddenSections
affects: [03-content-management plan 02 (UI wrapper components), 03-content-management plan 03]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared factory utility, section key switch dispatch, Set-based toggle state]

key-files:
  created:
    - frontend/src/utils/entryFactories.ts
    - frontend/src/__tests__/entryFactories.test.ts
  modified:
    - frontend/src/hooks/useFormBuilder.ts
    - frontend/src/features/direct-edit/hooks/useDirectEditor.ts
    - frontend/src/__tests__/useDirectEditor.test.ts

key-decisions:
  - "Re-export DEFAULT_PERSONAL_ORDER from useFormBuilder for backward compatibility"
  - "hiddenSections uses Set<string> for O(1) lookup in UI rendering"
  - "addEntry uses section key string dispatch (switch) for extensibility"
  - "removeEntry allows empty sections (unlike removeBullet which guards minimum 1)"

patterns-established:
  - "Factory extraction pattern: shared factories in utils/ imported by both hooks"
  - "Section key convention: 'work', 'education', 'skills', 'projects', 'awards', 'additional-N', 'additional-new'"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04]

# Metrics
duration: 11min
completed: 2026-03-30
---

# Phase 3 Plan 1: Entry Factories and CRUD Operations Summary

**Shared entry factory utilities extracted from useFormBuilder, useDirectEditor extended with addEntry/removeEntry/toggleSection for all CVFormData section types**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-30T10:16:30Z
- **Completed:** 2026-03-30T10:27:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extracted 10 factory functions to `entryFactories.ts` shared utility with 24 unit tests
- Extended `useDirectEditor` with `addEntry` (7 section types), `removeEntry` (7 section types), `toggleSection`, and `hiddenSections` state
- Refactored `useFormBuilder` to import factories from shared utility (zero regression across 37 existing tests)
- Full TDD workflow: RED (failing tests) -> GREEN (implementation) -> REFACTOR for both tasks

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract entry factories to shared utility** - `ac1fc19` (test: RED), `1563ed9` (feat: GREEN + refactor)
2. **Task 2: Extend useDirectEditor with addEntry/removeEntry/toggleSection** - `d41bd7c` (test: RED), `c341e25` (feat: GREEN)

_TDD tasks each have RED and GREEN commits._

## Files Created/Modified
- `frontend/src/utils/entryFactories.ts` - 10 exported factory functions (emptyBullet through emptyAdditionalSection) + DEFAULT_PERSONAL_ORDER
- `frontend/src/__tests__/entryFactories.test.ts` - 24 tests covering shape, defaults, unique IDs, cross-factory uniqueness
- `frontend/src/hooks/useFormBuilder.ts` - Refactored to import factories from entryFactories.ts, re-exports DEFAULT_PERSONAL_ORDER
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` - Added addEntry, removeEntry, toggleSection callbacks + hiddenSections useState
- `frontend/src/__tests__/useDirectEditor.test.ts` - 21 new tests (31 total) covering all new methods

## Decisions Made
- Re-exported `DEFAULT_PERSONAL_ORDER` from `useFormBuilder` to maintain backward compatibility with existing test imports
- Used `Set<string>` for `hiddenSections` to enable O(1) lookup during UI rendering
- `addEntry` uses string-based section key dispatch (switch statement) matching the existing `sectionOrder` convention
- `removeEntry` allows sections to become empty (unlike `removeBullet` which guards minimum 1 bullet) since sections CAN be empty
- `structuredClone` used for immutable state updates (consistent with existing useDirectEditor pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
None - all factory functions produce correctly-shaped, fully-wired data objects.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `entryFactories.ts` is ready for import by Plan 02's UI wrapper components (add/delete buttons)
- `useDirectEditor` now exposes the complete CRUD API that Plan 02's components will call
- `hiddenSections` state is ready for Plan 02/03 to wire into section visibility toggling UI

## Self-Check: PASSED

All 5 files verified present. All 4 task commits verified in git log.

---
*Phase: 03-content-management*
*Completed: 2026-03-30*
