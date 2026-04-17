---
phase: 05-ai-integration
plan: 02
subsystem: ui
tags: [react, css-modules, intersection-observer, tailor, diff]

# Dependency graph
requires:
  - phase: 05-ai-integration/01
    provides: wordDiff utility, EditorToolbar, readOnly template variant
provides:
  - ChangeCard component with word-level diff and accept/reject/undo
  - ChangePanel side panel with grouped cards and match summary
  - useScrollSync hook for CV-to-panel section alignment
affects: [05-ai-integration/03, 05-ai-integration/04]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure renderer panel (props-only state), IntersectionObserver scroll sync with anti-jitter]

key-files:
  created:
    - frontend/src/features/direct-edit/components/ChangeCard.tsx
    - frontend/src/features/direct-edit/components/ChangeCard.module.css
    - frontend/src/features/direct-edit/components/ChangePanel.tsx
    - frontend/src/features/direct-edit/components/ChangePanel.module.css
    - frontend/src/features/direct-edit/hooks/useScrollSync.ts
  modified: []

key-decisions:
  - "ChangePanel is a pure renderer with all state via props from useTailor -- enables reuse in both DirectEditPage and ApplyToJobScreen"
  - "Separate Before/After diff display using filtered segments from computeWordDiff rather than inline interleaved diff"
  - "Score circle color thresholds: >=80 green, >=60 yellow, else red -- consistent with existing match analysis patterns"

patterns-established:
  - "Pure renderer panel: ChangePanel receives all state as props, parent controls open/close and data flow"
  - "data-change-section attribute on ChangeCards enables scroll sync with data-section on SectionWrapper"
  - "Anti-jitter scroll sync: isAutoScrolling ref + 150ms timeout prevents observer-to-scroll infinite loops"

requirements-completed: [AI-03, AI-04]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 05 Plan 02: ChangePanel & ChangeCard Summary

**ChangePanel side panel with word-level diff ChangeCards, editable suggestions, accept/reject/undo flow, and IntersectionObserver scroll sync**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T19:27:41Z
- **Completed:** 2026-04-05T19:31:53Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments
- ChangeCard renders section badge, change type pill, word-level diff, editable textarea, and accept/reject/undo with three mutually exclusive states (pending, applied, skipped)
- ChangePanel groups cards by CV section with match summary, loading/error/empty states, slide animation, and responsive bottom sheet
- useScrollSync tracks visible CV sections via IntersectionObserver and scrolls panel to matching cards with anti-jitter protection

## Task Commits

Each task was committed atomically:

1. **Task 1: ChangeCard component (D-03, D-04, D-05)** - `d06cb7e` (feat)
2. **Task 2: ChangePanel component (D-01, D-02)** - `b45ac54` (feat)
3. **Task 3: useScrollSync hook (D-02)** - `4dd6288` (feat)

## Files Created/Modified
- `frontend/src/features/direct-edit/components/ChangeCard.tsx` - Individual change card with diff, edit, accept/reject/undo buttons
- `frontend/src/features/direct-edit/components/ChangeCard.module.css` - Card styling with diff highlights, state transitions per UI-SPEC
- `frontend/src/features/direct-edit/components/ChangePanel.tsx` - Side panel container with grouped cards, match summary, states
- `frontend/src/features/direct-edit/components/ChangePanel.module.css` - Panel layout with slide animation and responsive bottom sheet
- `frontend/src/features/direct-edit/hooks/useScrollSync.ts` - IntersectionObserver scroll sync between CV sections and panel cards

## Decisions Made
- ChangePanel is a pure renderer with all state via props from useTailor -- enables reuse in both DirectEditPage and ApplyToJobScreen without duplicating state management
- Separate Before/After diff display: filtered computeWordDiff segments shown in two blocks rather than a single interleaved inline diff, for clearer visual comparison
- Score circle color thresholds: >=80 green, >=60 yellow, else red -- consistent with existing match analysis patterns in the codebase

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (4 tests in 3 files) observed when running `npx vitest run` -- these failures exist in the test suite before this plan's changes and are unrelated to the ChangePanel/ChangeCard/useScrollSync work. No new test failures were introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ChangePanel and ChangeCard are ready for integration into DirectEditPage (Plan 03) and ApplyToJobScreen (Plan 04)
- useScrollSync is ready to be wired between CV container ref and panel ref when layout is assembled
- All components follow the props-based contract defined in useTailor's return type

## Self-Check: PASSED

All 5 created files verified on disk. All 3 task commits (d06cb7e, b45ac54, 4dd6288) verified in git log.

---
*Phase: 05-ai-integration*
*Completed: 2026-04-05*
