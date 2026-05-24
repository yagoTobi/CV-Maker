---
phase: 08-streamlined-tune-flow
plan: 02
subsystem: ui
tags: [react-router, navigation, dashboard, breadcrumb, location-state]

# Dependency graph
requires:
  - phase: 07-navigation-flow-consolidation
    provides: inline expansion panels, landing screen architecture
provides:
  - "/apply route redirected to /build/form with tune state"
  - "All tune entry points navigate to /build/form with tune:true in location.state"
  - "Dashboard scoped view filtered by baseId with breadcrumb navigation"
  - "Dashboard handleApplyToJob loads version before navigating to editor"
affects: [08-03, 08-04, direct-edit-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "location.state.tune as boolean flag for tune mode entry"
    - "location.state.baseId as UUID filter for Dashboard scoped view"
    - "Version pre-loading before navigation (api.getVersion then handleVersionLoad)"

key-files:
  created: []
  modified:
    - frontend/src/App.tsx
    - frontend/src/features/landing/LandingScreen.tsx
    - frontend/src/features/landing/TuneExpansionPanel.tsx
    - frontend/src/features/dashboard/Dashboard.tsx
    - frontend/src/features/dashboard/Dashboard.module.css
    - frontend/src/__tests__/import-flow-state.test.tsx

key-decisions:
  - "Pre-load version data before navigating to editor so form state is ready on mount"
  - "Use Navigate redirect with replace for /apply backward compatibility"
  - "Dashboard breadcrumb uses replace:true to avoid filter state persisting in history"

patterns-established:
  - "Tune entry pattern: load version via api.getVersion, call handleVersionLoad + setSelectedTemplateForBuild, navigate to /build/form with { tune: true }"
  - "Dashboard scoped view pattern: filterBaseId from location.state, displayedBases derived array, breadcrumb for clearing filter"

requirements-completed: [TUNE-05, TUNE-07]

# Metrics
duration: 5min
completed: 2026-04-17
---

# Phase 08 Plan 02: Navigation Rewiring Summary

**Rewired all /apply navigation targets to /build/form with tune:true location.state, added Dashboard scoped view with baseId filter and breadcrumb**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-16T23:49:36Z
- **Completed:** 2026-04-16T23:54:36Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- All tune entry points (LandingScreen, TuneExpansionPanel, Dashboard) now navigate to /build/form with tune state instead of /apply
- /apply route converted to a redirect (Navigate with replace) for backward compatibility
- Dashboard supports scoped view via location.state.baseId with breadcrumb to clear filter
- Version data is pre-loaded before navigation so editor has form state on mount

## Task Commits

Each task was committed atomically:

1. **Task 1: Redirect /apply route and update LandingScreen + TuneExpansionPanel navigation** - `339d40b` (feat)
2. **Task 2: Dashboard scoped view with baseId filter and breadcrumb** - `221281d` (feat)

## Files Created/Modified
- `frontend/src/App.tsx` - Replaced /apply route with Navigate redirect, removed ApplyToJobScreen lazy import
- `frontend/src/features/landing/LandingScreen.tsx` - Single-CV shortcut loads version then navigates to /build/form with tune state
- `frontend/src/features/landing/TuneExpansionPanel.tsx` - CV item onClick loads version before navigating to editor with tune state, added loading indicator
- `frontend/src/features/dashboard/Dashboard.tsx` - Added filterBaseId from location.state, displayedBases filtering, breadcrumb JSX, updated handleApplyToJob
- `frontend/src/features/dashboard/Dashboard.module.css` - Added breadcrumb, breadcrumbLink, breadcrumbSep, breadcrumbCurrent styles
- `frontend/src/__tests__/import-flow-state.test.tsx` - Updated NAV-03 test to expect version loading and /build/form navigation, added getVersion mock

## Decisions Made
- Pre-load version data via api.getVersion before navigating to editor, so handleVersionLoad and setSelectedTemplateForBuild are called before the route change. This ensures the editor page has form data ready on mount.
- Use Navigate component with replace prop for /apply redirect, preventing /apply from appearing in browser history.
- Dashboard breadcrumb "All CVs" button uses replace:true to avoid creating filter history entries (per RESEARCH.md Pitfall 5).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test NAV-03 to match new navigation behavior**
- **Found during:** Task 2 verification (test suite run)
- **Issue:** Test "Tune with exactly 1 base CV navigates directly to /apply (NAV-03)" failed because handleTuneClick now calls api.getVersion (async) before navigating, but the mock did not include getVersion
- **Fix:** Added getVersion to the api mock at the top of the test file; updated test to mock api.getVersion return value and verify it was called with the correct base CV id
- **Files modified:** frontend/src/__tests__/import-flow-state.test.tsx
- **Verification:** All 13 tests in import-flow-state.test.tsx pass
- **Committed in:** 221281d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix - test update)
**Impact on plan:** Test update was necessary to match changed navigation behavior. No scope creep.

## Issues Encountered
None - all changes applied cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All navigation rewiring complete; /apply is fully deprecated as a navigation target
- Dashboard scoped view is ready for Plan 03 (TunePanel) to navigate back with baseId after save
- DirectEditPage can read location.state.tune to determine whether to show the TunePanel (Plan 03 scope)

---
## Self-Check: PASSED

All files verified present. Both task commits (339d40b, 221281d) confirmed in git log.

---
*Phase: 08-streamlined-tune-flow*
*Completed: 2026-04-17*
