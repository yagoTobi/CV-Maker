---
phase: 03-content-management
plan: 04
subsystem: ui
tags: [react, contenteditable, css-subgrid, skills-editing, date-range]

# Dependency graph
requires:
  - phase: 03-02
    provides: "MedLengthTemplate with SectionWrapper/EntryWrapper, handleSkillsTextChange, renderDateRange"
provides:
  - "Skills editing works without crash (SkillItem[] passed directly, not JSON-stringified)"
  - "Grid-transparent EntryWrapper via CSS subgrid for skills/awards 2-column grids"
  - "Always-visible date separator (en-dash) for new entries with empty date fields"
affects: [03-content-management, 04-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: ["CSS subgrid for grid-child wrappers preserving box model (position: relative, :hover)"]

key-files:
  created: []
  modified:
    - frontend/src/features/direct-edit/components/MedLengthTemplate.tsx
    - frontend/src/features/direct-edit/components/MedLengthTemplate.module.css
    - frontend/src/features/direct-edit/components/EntryWrapper.tsx
    - frontend/src/features/direct-edit/components/EntryWrapper.module.css
    - frontend/src/features/direct-edit/hooks/useDirectEditor.ts
    - frontend/src/__tests__/EntryWrapper.test.tsx

key-decisions:
  - "Widen onFieldChange type to string | SkillItem[] (Option A minimal fix) rather than adding separate onSkillsChange prop"
  - "CSS subgrid over display: contents -- preserves position: relative and :hover for delete button"

patterns-established:
  - "gridItem prop on EntryWrapper for CSS grid child contexts (skills/awards grids)"

requirements-completed: [CONT-01, CONT-02]

# Metrics
duration: 4min
completed: 2026-04-04
---

# Phase 03 Plan 04: UAT Bug Fixes Summary

**Fixed skills editing crash (removed JSON.stringify), grid layout collapse (CSS subgrid on EntryWrapper), and date separator visibility (always render en-dash)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T21:38:53Z
- **Completed:** 2026-04-04T21:42:56Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Skills editing no longer crashes -- SkillItem[] array passed directly to setAtPath instead of being JSON.stringify'd into a string
- Skills and awards 2-column grid layout preserved after entry deletion -- EntryWrapper uses CSS subgrid in grid contexts
- Date separator (en-dash) always visible between start/end placeholders on new entries, even when both fields are empty strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix skills crash and date separator visibility** - `29e052c` (fix)
2. **Task 2: Fix EntryWrapper grid transparency for skills and awards grids** - `e98a123` (fix)

## Files Created/Modified
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` - Removed JSON.stringify on skills, always-render date separator, pass gridItem to skills/awards EntryWrappers
- `frontend/src/features/direct-edit/components/MedLengthTemplate.module.css` - Added inline-flex + baseline alignment to .dateRange
- `frontend/src/features/direct-edit/components/EntryWrapper.tsx` - Added gridItem prop for CSS subgrid layout variant
- `frontend/src/features/direct-edit/components/EntryWrapper.module.css` - Added .entryWrapGrid class with subgrid, shared hover rule
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` - Widened updateField type to accept string | SkillItem[]
- `frontend/src/__tests__/EntryWrapper.test.tsx` - Added 2 tests for gridItem variant (rendering + instant delete)

## Decisions Made
- **Widen type over separate prop:** Changed `onFieldChange` from `(path: string, value: string)` to `(path: string, value: string | SkillItem[])` throughout the chain (useDirectEditor -> DirectEditPage -> MedLengthTemplate -> sub-components). This is the minimal change that fixes the crash without adding a separate callback prop or restructuring the skill editing flow.
- **CSS subgrid over display: contents:** `display: contents` was rejected because it removes the element from the box model, breaking `position: relative` (needed for delete button absolute positioning) and `:hover` (needed for hover-reveal). CSS subgrid preserves both while making EntryWrapper grid-transparent. Browser support: Chrome 117+, Firefox 71+, Safari 16+ -- acceptable per modern-browsers-only constraint.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures in `useImport.test.ts` (3 failures: link label derivation) and `LandingScreen.test.tsx` (1 failure: text mismatch) are unrelated to this plan's changes. Logged to `deferred-items.md`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three UAT blockers/majors from this plan are fixed
- Plan 05 (remaining UAT gap closure) can proceed
- 209 tests passing, TypeScript clean

## Self-Check: PASSED

All 6 modified files verified present. Both task commits (29e052c, e98a123) verified in git log.

---
*Phase: 03-content-management*
*Completed: 2026-04-04*
