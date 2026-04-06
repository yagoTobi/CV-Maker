---
phase: 06-route-integration
plan: 02
subsystem: ui
tags: [react, navigation, template-selection, dashboard, coming-soon]

# Dependency graph
requires:
  - phase: 06-route-integration
    provides: "NavBar and route wiring from 06-01"
provides:
  - "TemplateSelector with disabled state and Coming soon badge for unsupported templates"
  - "Dashboard handleApplyToJob navigating to /apply with baseVersionId state"
  - "SUPPORTED_TEMPLATES constant for template enablement control"
affects: [06-route-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: ["SUPPORTED_TEMPLATES Set for template enablement gating"]

key-files:
  created: []
  modified:
    - frontend/src/features/template-selection/TemplateSelector.tsx
    - frontend/src/features/template-selection/TemplateSelector.module.css
    - frontend/src/features/dashboard/Dashboard.tsx

key-decisions:
  - "SUPPORTED_TEMPLATES as client-side Set -- lightweight guard, not security boundary"
  - "handleApplyToJob simplified to navigate-only -- ApplyToJobScreen fetches its own version data"

patterns-established:
  - "SUPPORTED_TEMPLATES gating: Set-based enablement with disabled CSS class and Coming soon badge"
  - "Dashboard navigate to /apply with baseVersionId state: ApplyToJobScreen is self-contained"

requirements-completed: [ROUTE-03, ROUTE-04, ROUTE-05]

# Metrics
duration: 2min
completed: 2026-04-06
---

# Phase 6 Plan 2: Navigation Wiring and Template Disabling Summary

**Dashboard Tune for a Job navigates to /apply with baseVersionId, TemplateSelector shows Coming soon on unsupported templates**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-06T11:18:45Z
- **Completed:** 2026-04-06T11:21:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TemplateSelector displays three template cards with med-length-proff-cv as only clickable option; deedy-resume and mcdowell-cv show as disabled with "Coming soon" badge
- Dashboard "Tune for a Job" button now correctly navigates to /apply with baseVersionId in route state (was broken, navigating to /build/form with mode: 'tune')
- Simplified handleApplyToJob from async version-fetching callback to synchronous navigation-only callback

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Coming soon badge and disabled state to TemplateSelector** - `52779d5` (feat)
2. **Task 2: Fix Dashboard handleApplyToJob navigation to /apply** - `a0cf1f1` (fix)

## Files Created/Modified
- `frontend/src/features/template-selection/TemplateSelector.tsx` - Added SUPPORTED_TEMPLATES Set, handleSelect guard, disabled class, Coming soon badge, aria-disabled and tabIndex attributes
- `frontend/src/features/template-selection/TemplateSelector.module.css` - Added .card.disabled (opacity 0.55, pointer-events none), .comingSoon absolute-positioned badge
- `frontend/src/features/dashboard/Dashboard.tsx` - Replaced handleApplyToJob: removed async version fetch, navigate to /apply with baseVersionId state

## Decisions Made
- SUPPORTED_TEMPLATES is a client-side-only guard (not a security boundary). Backend accepts any template ID. This is a UX guard for templates without web rendering.
- handleApplyToJob simplified to navigation-only since ApplyToJobScreen fetches its own version data from the API -- no need to pre-load into context.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures in useImport.test.ts and deriveLinkLabel.test.ts (4 failures related to link label derivation logic, not caused by this plan's changes). Logged as out-of-scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Navigation wiring complete for Dashboard and TemplateSelector
- Ready for 06-03 (final route cleanup / old route removal)

---
*Phase: 06-route-integration*
*Completed: 2026-04-06*
