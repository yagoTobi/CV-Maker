---
phase: 05-ai-integration
plan: 04
subsystem: ui
tags: [react, contenteditable, tailor, apply-to-job, change-panel, web-cv]

# Dependency graph
requires:
  - phase: 05-01
    provides: MedLengthTemplate with readOnly prop for CV preview rendering
  - phase: 05-02
    provides: ChangePanel, ChangeCard components and useScrollSync hook
provides:
  - Rewritten ApplyToJobScreen step 3 with two-panel web CV + ChangePanel layout
  - Live CV preview updates on accept/reject of tailor suggestions
  - Child version creation with job metadata from Apply to Job flow
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Full-width layout breakout from centered container via conditional contentWide class"
    - "Collapsed steps header showing completed step summaries with click-to-navigate-back"
    - "useTailor hook integration in Apply to Job context with local previewFormData state"

key-files:
  created: []
  modified:
    - frontend/src/features/apply-to-job/ApplyToJobScreen.tsx
    - frontend/src/features/apply-to-job/ApplyToJobScreen.module.css

key-decisions:
  - "useTailor hook with local previewFormData state for Apply to Job context (not global context)"
  - "Collapsed steps header for step 3 to show completed steps without full re-render"
  - "Removed handleOpenInTuneScreen -- Apply to Job now has its own integrated tailor review"

patterns-established:
  - "Local previewFormData state pattern: useTailor onApply updates local state for read-only CV preview in non-editor contexts"
  - "Collapsed steps pattern: completed steps shown as clickable summary pills above the current step content"

requirements-completed: [AI-02, AI-04]

# Metrics
duration: 3min
completed: 2026-04-05
---

# Phase 05 Plan 04: Apply to Job Step 3 Rewrite Summary

**ApplyToJobScreen step 3 rewritten with read-only MedLengthTemplate + ChangePanel two-panel layout replacing checkbox-based change list**

## Performance

- **Duration:** 3 min (summary creation after checkpoint approval)
- **Started:** 2026-04-05T21:00:00Z
- **Completed:** 2026-04-05T21:15:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments
- Replaced checkbox-based tailor change list with full ChangePanel side panel in Apply to Job step 3
- Integrated read-only MedLengthTemplate for live CV preview that updates on accept/reject
- Wired useTailor hook and useScrollSync for consistent state management and scroll alignment
- Save Tailored CV creates child version with parentVersionId, job metadata, and match scores
- Removed handleOpenInTuneScreen callback and old form-builder tune mode navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite ApplyToJobScreen step 3 with web CV + ChangePanel** - `dad7e86` (feat)
2. **Task 2: Verify Apply to Job flow end-to-end** - checkpoint:human-verify (approved)

**Plan metadata:** (pending this commit)

## Files Created/Modified
- `frontend/src/features/apply-to-job/ApplyToJobScreen.tsx` - Rewrote step 3 with two-panel layout: read-only MedLengthTemplate + ChangePanel, replaced local tailor state with useTailor hook, added useScrollSync, Save Tailored CV creates child version
- `frontend/src/features/apply-to-job/ApplyToJobScreen.module.css` - Added full-width step 3 layout styles (.reviewLayout, .twoPanelContent, .cvPreviewPanel, .saveBar, .collapsedSteps), removed old checkbox change list styles

## Decisions Made
- Used useTailor hook with local previewFormData state instead of global context -- Apply to Job needs its own isolated CV preview that does not affect the main editor state
- Collapsed steps header pattern for step 3: shows completed steps 1-2 as clickable summary pills above the two-panel content, allowing users to navigate back
- Removed handleOpenInTuneScreen entirely -- the old "Open in Tune Screen" button in step 1 is no longer needed since step 3 now has its own integrated tailor review with the web CV

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Apply to Job flow is fully integrated with the web CV direct-edit components
- All phase 05 plans are now complete (01 through 05)
- Ready for any future testing or polish phases

## Self-Check: PASSED

- FOUND: frontend/src/features/apply-to-job/ApplyToJobScreen.tsx
- FOUND: frontend/src/features/apply-to-job/ApplyToJobScreen.module.css
- FOUND: .planning/phases/05-ai-integration/05-04-SUMMARY.md
- FOUND: commit dad7e86

---
*Phase: 05-ai-integration*
*Completed: 2026-04-05*
