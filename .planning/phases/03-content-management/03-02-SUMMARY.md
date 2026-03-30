---
phase: 03-content-management
plan: 02
subsystem: ui
tags: [react, css-modules, hover-reveal, confirmation-dialog, contenteditable]

# Dependency graph
requires:
  - phase: 03-content-management plan 01
    provides: useDirectEditor with addEntry/removeEntry/toggleSection/hiddenSections
provides:
  - SectionWrapper component (hover-reveal add button + section visibility toggle)
  - EntryWrapper component (hover-reveal delete button + optional confirmation dialog)
  - ConfirmDialog component (inline delete confirmation for major entries)
  - MedLengthTemplate integrated with SectionWrapper/EntryWrapper for all 6 section types
  - DirectEditPage wiring new callbacks from useDirectEditor to MedLengthTemplate
affects: [03-content-management plan 03, future template implementations]

# Tech tracking
tech-stack:
  added: []
  patterns: [hover-reveal UI pattern, inline SVG icons, wrapper component composition, headerClassName/renderHeader prop pattern]

key-files:
  created:
    - frontend/src/features/direct-edit/components/SectionWrapper.tsx
    - frontend/src/features/direct-edit/components/SectionWrapper.module.css
    - frontend/src/features/direct-edit/components/EntryWrapper.tsx
    - frontend/src/features/direct-edit/components/EntryWrapper.module.css
    - frontend/src/features/direct-edit/components/ConfirmDialog.tsx
    - frontend/src/features/direct-edit/components/ConfirmDialog.module.css
    - frontend/src/__tests__/SectionWrapper.test.tsx
    - frontend/src/__tests__/EntryWrapper.test.tsx
  modified:
    - frontend/src/features/direct-edit/components/MedLengthTemplate.tsx
    - frontend/src/features/direct-edit/components/MedLengthTemplate.module.css
    - frontend/src/features/direct-edit/DirectEditPage.tsx

key-decisions:
  - "SectionWrapper uses headerClassName prop for standard sections and renderHeader prop for custom headers (additional sections with EditableField)"
  - "Skills categories use requireConfirm=false (minor entries), all other entry types use requireConfirm=true (major entries)"
  - "Inline SVG icons (eye, eye-off, X) instead of icon library, per research decision"
  - "ConfirmDialog is inline-positioned (absolute) near delete button, not a full-screen modal"
  - "Empty sections always show add button (opacity: 1) without requiring hover"

patterns-established:
  - "Hover-reveal pattern: opacity 0 by default, opacity 1 on parent:hover, 0.15s ease transition"
  - "Wrapper composition: SectionWrapper/EntryWrapper wrap existing section/entry markup without changing internal structure"
  - "Major vs minor entry classification: major (requireConfirm=true) for work, education, projects, awards, additional; minor (requireConfirm=false) for skills"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04]

# Metrics
duration: 10min
completed: 2026-03-30
---

# Phase 3 Plan 2: Hover-Reveal UI Layer Summary

**SectionWrapper, EntryWrapper, and ConfirmDialog components with full MedLengthTemplate integration for add/delete/toggle on all CV sections**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-30T10:30:55Z
- **Completed:** 2026-03-30T10:40:58Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Created 3 new UI components (SectionWrapper, EntryWrapper, ConfirmDialog) with co-located CSS modules
- Integrated wrappers into all 6 MedLengthTemplate section renderers (work, education, skills, projects, awards, additional)
- 14 new tests (8 SectionWrapper + 6 EntryWrapper) covering render, click handlers, hidden state, and confirmation flow
- Zero regression across 72 related tests (58 existing + 14 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SectionWrapper, EntryWrapper, and ConfirmDialog components with tests** - `725f5c1` (feat)
2. **Task 2: Integrate SectionWrapper and EntryWrapper into MedLengthTemplate and DirectEditPage** - `9786fb9` (feat)

## Files Created/Modified
- `frontend/src/features/direct-edit/components/SectionWrapper.tsx` - Section container with hover-reveal add button and visibility toggle
- `frontend/src/features/direct-edit/components/SectionWrapper.module.css` - Hover-reveal CSS patterns for add button and toggle
- `frontend/src/features/direct-edit/components/EntryWrapper.tsx` - Entry container with hover-reveal delete and optional confirmation
- `frontend/src/features/direct-edit/components/EntryWrapper.module.css` - Hover-reveal CSS for delete button
- `frontend/src/features/direct-edit/components/ConfirmDialog.tsx` - Inline confirmation dialog with Delete/Cancel buttons
- `frontend/src/features/direct-edit/components/ConfirmDialog.module.css` - Chrome-styled (IBM Plex Sans) dialog styling
- `frontend/src/__tests__/SectionWrapper.test.tsx` - 8 tests for SectionWrapper
- `frontend/src/__tests__/EntryWrapper.test.tsx` - 6 tests for EntryWrapper
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` - All 6 section renderers refactored to use SectionWrapper/EntryWrapper
- `frontend/src/features/direct-edit/components/MedLengthTemplate.module.css` - Added overflow: visible for EntryWrapper delete button
- `frontend/src/features/direct-edit/DirectEditPage.tsx` - Destructures and passes addEntry, removeEntry, toggleSection, hiddenSections

## Decisions Made
- SectionWrapper has two header modes: `headerClassName` string prop for standard sections (renders plain text with that class), `renderHeader` function prop for custom headers (additional sections use EditableField for editable section titles)
- Skills categories are classified as "minor" entries (delete instantly, no confirm) while all other entry types are "major" (confirm before delete)
- Inline SVG icons used for eye/eye-off/X instead of an icon library, keeping the project dependency-free for icons
- ConfirmDialog uses absolute positioning near the delete button rather than a full-screen modal, keeping the interaction lightweight
- Empty sections show the add button with full opacity (no hover required) so users can add the first entry

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used fireEvent instead of userEvent for tests**
- **Found during:** Task 1 (test creation)
- **Issue:** `@testing-library/user-event` is listed in CLAUDE.md but not installed in package.json or node_modules
- **Fix:** Used `fireEvent` from `@testing-library/react` (already installed) for click interactions in tests
- **Files modified:** `frontend/src/__tests__/SectionWrapper.test.tsx`, `frontend/src/__tests__/EntryWrapper.test.tsx`
- **Verification:** All 14 tests pass
- **Committed in:** `725f5c1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor test utility substitution. No functional impact -- fireEvent provides equivalent click simulation for these component tests.

## Issues Encountered
None beyond the user-event dependency issue documented above.

## Known Stubs
None -- all components are fully functional with real callbacks wired through the component tree.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- SectionWrapper and EntryWrapper are ready for reuse by future template implementations
- All CONT-01 through CONT-04 requirements are user-facing: hover reveals contextual controls, hidden when not interacting
- Plan 03 (page overflow indicator) can proceed independently

## Self-Check: PASSED

All 11 files verified present. Both task commits verified in git log.

---
*Phase: 03-content-management*
*Completed: 2026-03-30*
