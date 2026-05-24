---
phase: quick-260415-q5j
plan: 01
subsystem: frontend/direct-edit
tags: [navigation, tune-for-job, apply-to-job]
dependency_graph:
  requires: []
  provides: [handleTuneForJob navigates to /apply with baseVersionId]
  affects: [frontend/src/features/direct-edit/DirectEditPage.tsx]
tech_stack:
  added: []
  patterns: [React Router navigate with state]
key_files:
  modified:
    - frontend/src/features/direct-edit/DirectEditPage.tsx
decisions:
  - handleTuneForJob now navigates directly to /apply skipping the dashboard -- user is already on the version they want to tune
metrics:
  duration: 3min
  completed: 2026-04-15
---

# Quick Task 260415-q5j: Fix handleTuneForJob navigate to /apply Summary

**One-liner:** `handleTuneForJob` now navigates to `/apply` with `baseVersionId: activeVersion?.id` instead of `/dashboard`, allowing direct entry into the apply-to-job flow from the editor.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix handleTuneForJob to navigate to /apply with baseVersionId | b0179f1 | frontend/src/features/direct-edit/DirectEditPage.tsx |

## Changes Made

In `DirectEditPage.tsx`, replaced:

```ts
const handleTuneForJob = useCallback(() => {
  navigate('/dashboard');
}, [navigate]);
```

With:

```ts
const handleTuneForJob = useCallback(() => {
  navigate('/apply', { state: { baseVersionId: activeVersion?.id } });
}, [navigate, activeVersion?.id]);
```

`activeVersion` was already destructured from `useCVContext()` at the top of the component. `ApplyToJobScreen` already reads `location.state.baseVersionId` and uses it to load the base version — no changes needed there.

## Verification

- `npx tsc --noEmit` in `frontend/` completed with zero errors.
- `activeVersion?.id` yields `string | undefined`, which matches `ApplyToJobScreen`'s `LocationState.baseVersionId?: string` interface.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- Modified file exists: `frontend/src/features/direct-edit/DirectEditPage.tsx` — FOUND
- Commit b0179f1 exists in git log — FOUND
