---
phase: 02-core-editing-surface
plan: 03
subsystem: ui
tags: [react, hooks, auto-save, debounce, contenteditable, css-modules]

# Dependency graph
requires:
  - phase: 02-01
    provides: EditableField component, useDirectEditor hook, CVContext with formData/setFormData
provides:
  - useAutoSave hook with 2.5s debounced save and status tracking (idle/saving/saved/error)
  - SaveIndicator presentational component for save status display
  - SaveStatus type export for consumer components
affects: [02-04, direct-edit-page-assembly]

# Tech tracking
tech-stack:
  added: []
  patterns: [debounced-auto-save-with-status, mounted-ref-guard, json-comparison-dedup]

key-files:
  created:
    - frontend/src/features/direct-edit/hooks/useAutoSave.ts
    - frontend/src/features/direct-edit/components/SaveIndicator.tsx
    - frontend/src/features/direct-edit/components/SaveIndicator.module.css
    - frontend/src/__tests__/useAutoSave.test.ts
  modified: []

key-decisions:
  - "Auto-save always creates new versions via POST (no PATCH for full updates exists); version deduplication deferred"
  - "JSON.stringify comparison for change detection -- simple and sufficient for CVFormData size"
  - "mountedRef guard prevents setState-after-unmount during async save"

patterns-established:
  - "useAutoSave: debounced effect with lastSavedRef JSON comparison to skip redundant saves"
  - "SaveIndicator: chrome-layer component using app design tokens (IBM Plex Sans, CSS variables)"
  - "isSavingRef: prevents concurrent saves when debounce fires while save is in-flight"

requirements-completed: [UX-01]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 2 Plan 3: Auto-Save Hook + Save Indicator Summary

**Debounced auto-save hook (2.5s inactivity) with idle/saving/saved/error status cycling and fixed-position text indicator**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T06:50:10Z
- **Completed:** 2026-03-30T06:53:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- useAutoSave hook watches CVFormData for changes and saves to backend after 2.5 second debounce (D-08)
- Status tracking cycles through idle -> saving -> saved/error with JSON comparison to skip redundant saves (UX-01)
- SaveIndicator component renders "Saving..." / "Saved" / "Save failed" in top-right corner with chrome styling (D-07)
- 11 tests covering all status transitions, debounce reset, unmount cleanup, null guards, and data passthrough

## Task Commits

Each task was committed atomically:

1. **Task 1: useAutoSave hook + tests** - `b6fe0d7` (test+feat, TDD)
2. **Task 2: SaveIndicator component + CSS** - `bad3135` (feat)

## Files Created/Modified
- `frontend/src/features/direct-edit/hooks/useAutoSave.ts` - Debounced auto-save hook with SaveStatus type export
- `frontend/src/features/direct-edit/components/SaveIndicator.tsx` - Presentational save status indicator (hidden when idle)
- `frontend/src/features/direct-edit/components/SaveIndicator.module.css` - Fixed top-right positioning, IBM Plex Sans 13px, CSS variable colors
- `frontend/src/__tests__/useAutoSave.test.ts` - 11 tests: status transitions, debounce reset, dedup, null/unmount guards

## Decisions Made
- Auto-save uses POST (creates new version) because the existing PATCH endpoint only supports re-parenting, not full version updates. This means each auto-save creates a new version. A future plan should add a PUT/PATCH for in-place updates to avoid version proliferation.
- JSON.stringify comparison chosen for change detection over deep-equal library -- CVFormData is small enough that serialization cost is negligible and avoids a new dependency.
- mountedRef pattern used to prevent setState-after-unmount warnings during the async save callback.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- useAutoSave and SaveIndicator are ready for integration into DirectEditPage (plan 02-04)
- DirectEditPage will compose: useDirectEditor (02-01) + useAutoSave (02-03) + MedLengthTemplate (02-02) + SaveIndicator (02-03)
- The auto-save creates new versions on each save; a future PATCH endpoint for in-place updates would reduce version clutter

## Self-Check: PASSED

---
*Phase: 02-core-editing-surface*
*Completed: 2026-03-30*
