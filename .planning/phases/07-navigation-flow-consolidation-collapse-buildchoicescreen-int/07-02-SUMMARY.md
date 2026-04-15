---
phase: 07-navigation-flow-consolidation
plan: 02
subsystem: ui
tags: [react, navigation, landing-page, expansion-panel, route-removal]

# Dependency graph
requires:
  - phase: 07-01
    provides: "BuildExpansionPanel and TuneExpansionPanel components"
provides:
  - "LandingScreen with inline expansion panels replacing /build/start route navigation"
  - "Sequential collapse-then-expand animation for panel switching"
  - "Route cleanup: /build/start removed, NavBar and TemplateSelector point to /"
affects: [07-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sequential panel animation: collapse current (200ms) then expand new via setTimeout"
    - "switchTimeoutRef pattern: useRef for timeout cleanup prevents accumulation on rapid clicks"
    - "Card expanded state: aria-expanded + CSS class for visual feedback and accessibility"

key-files:
  created: []
  modified:
    - frontend/src/features/landing/LandingScreen.tsx
    - frontend/src/features/landing/LandingScreen.module.css
    - frontend/src/App.tsx
    - frontend/src/components/NavBar.tsx
    - frontend/src/features/template-selection/TemplateSelector.tsx
  deleted:
    - frontend/src/features/build-choice/BuildChoiceScreen.tsx
    - frontend/src/features/build-choice/BuildChoiceScreen.module.css
    - frontend/src/features/build-choice/index.ts

key-decisions:
  - "Sequential 200ms setTimeout for panel switching prevents jarring instant swap"
  - "Tune card with exactly 1 base CV navigates directly to /apply (skips picker)"
  - "switchTimeoutRef cleared on every handler entry and on unmount to prevent timer accumulation (T-07-05 mitigation)"

patterns-established:
  - "Expansion panel toggle: expandedPanel state with 'build' | 'tune' | null union type"
  - "Cross-panel communication: onBuildClick prop from TuneExpansionPanel triggers panel switch"

requirements-completed: [NAV-01, NAV-06, NAV-07, NAV-08]

# Metrics
duration: 3min
completed: 2026-04-15
---

# Phase 07 Plan 02: Wire Expansion Panels and Remove /build/start Summary

**LandingScreen inline expansion panels with sequential animation, /build/start route removed, all navigation references updated to /**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-15T21:49:24Z
- **Completed:** 2026-04-15T21:52:40Z
- **Tasks:** 2
- **Files modified:** 5 modified, 3 deleted

## Accomplishments
- LandingScreen now manages expandedPanel state ('build' | 'tune' | null) with sequential collapse-then-expand animation using 200ms setTimeout
- Build card toggles BuildExpansionPanel inline (no route navigation)
- Tune card checks base CV count: exactly 1 navigates directly to /apply with baseVersionId, 0 or 2+ expands TuneExpansionPanel
- handleBuildFromTune callback enables cross-panel switch from TuneExpansionPanel empty state
- Cards show expanded visual state (accent border, rotated arrow) with aria-expanded for accessibility
- CSS animation uses max-height/opacity transitions with prefers-reduced-motion media query
- /build/start route removed from App.tsx along with BuildChoiceScreen lazy import
- NavBar "+ New CV" and TemplateSelector Back button both navigate to / instead of /build/start
- BuildChoiceScreen directory (3 files) deleted as dead code

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrate expansion panels into LandingScreen with animation and card states** - `8d2af76` (feat)
2. **Task 2: Remove /build/start route and update NavBar + TemplateSelector references** - `1d8b520` (feat)

## Files Created/Modified
- `frontend/src/features/landing/LandingScreen.tsx` - Added expansion panel state, toggle handlers, panel rendering, aria-expanded
- `frontend/src/features/landing/LandingScreen.module.css` - Added .expansionPanel/.expansionPanelOpen animation, .cardExpanded/.cardSecondaryExpanded states, prefers-reduced-motion
- `frontend/src/App.tsx` - Removed BuildChoiceScreen lazy import and /build/start route
- `frontend/src/components/NavBar.tsx` - Changed "+ New CV" navigate from /build/start to /
- `frontend/src/features/template-selection/TemplateSelector.tsx` - Changed Back button navigate from /build/start to /
- `frontend/src/features/build-choice/` - Directory deleted (BuildChoiceScreen.tsx, .module.css, index.ts)

## Decisions Made
- Sequential 200ms setTimeout for panel switching prevents jarring instant swap while keeping animation snappy
- Tune card with exactly 1 base CV navigates directly to /apply with baseVersionId (skips picker for the common case)
- switchTimeoutRef cleared on every handler entry and on unmount to prevent timer accumulation (mitigates T-07-05)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All expansion panels wired and animated in LandingScreen
- /build/start route fully removed -- test files may still reference it (Plan 03 handles test updates)
- Navigation flow consolidated: landing page is now the single entry point for both Build and Tune flows

## Self-Check: PASSED
