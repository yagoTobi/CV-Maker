---
phase: "11"
plan: "03"
subsystem: "frontend-hooks, frontend-tests"
tags: ["tdd", "react", "hooks", "auto-save", "patch", "debounce"]
dependency_graph:
  requires: ["11-01 (api.updateVersionFull exists)"]
  provides: ["useAutoSave POST/PATCH branching", "onNeedName callback", "onFirstSave callback", "versionIdRef stale-closure fix"]
  affects: ["frontend/src/features/direct-edit/hooks/useAutoSave.ts", "frontend/src/__tests__/useAutoSave.test.ts"]
tech_stack:
  added: []
  patterns: ["versionIdRef stale-closure fix", "optionsRef for inline options object stability", "POST/PATCH branch on versionIdRef.current"]
key_files:
  created: []
  modified:
    - frontend/src/features/direct-edit/hooks/useAutoSave.ts
    - frontend/src/__tests__/useAutoSave.test.ts
decisions:
  - "versionIdRef.current used inside setTimeout rather than captured versionId to prevent stale-closure duplicate POSTs"
  - "optionsRef holds the options object so callers can pass inline objects without triggering extra effect re-runs"
  - "Empty onNeedName return falls back to formData.personalInfo.fullName || 'Untitled CV' (consistent with no-callback path)"
  - "isSavingRef set before await onNeedName() - blocks concurrent debounce fires while name prompt is open"
metrics:
  duration: "6 minutes"
  completed: "2026-04-17"
  tasks_completed: 2
  files_modified: 2
---

# Phase 11 Plan 03: useAutoSave POST/PATCH Branching Summary

Extended useAutoSave with versionId-based POST/PATCH branching: first save awaits onNeedName callback then POSTs via api.saveVersion; subsequent saves PATCH in-place via api.updateVersionFull, with versionIdRef preventing stale-closure duplicate POSTs.

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-17T21:18:43Z
- **Completed:** 2026-04-17T21:24:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `useAutoSave` signature with optional `options: { onNeedName?, onFirstSave? }` parameter
- Added `versionIdRef` to read latest versionId inside debounce timeout (prevents stale-closure)
- Added `optionsRef` so callers can pass inline options objects without re-triggering the effect
- Branch logic: `versionIdRef.current === null` → POST via `api.saveVersion` (with optional `onNeedName` name collection); non-null → PATCH via `api.updateVersionFull`
- `onFirstSave(version)` called after successful first POST
- Empty `onNeedName` result falls back to `fullName || 'Untitled CV'`
- Extended test suite from 10 to 16 tests covering all new paths
- Fixed pre-existing test bug: sentinel templateIds `template-1`/`template-2` were being filtered by the guard, causing "resets debounce" test to always stay 'idle'

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing test for PATCH path | f0d29bc | frontend/src/__tests__/useAutoSave.test.ts |
| 1 (GREEN) | Implement POST/PATCH branching | d9cf524 | frontend/src/features/direct-edit/hooks/useAutoSave.ts |
| 2 (GREEN) | Extend test suite with full coverage | ac27dac | frontend/src/__tests__/useAutoSave.test.ts |

## Decisions Made

1. **versionIdRef pattern** — `versionIdRef.current` is updated at the top of the save effect and read inside the `setTimeout` callback. This prevents the classic stale-closure issue where a `null` versionId captured at effect-run time would cause a second POST after the first save sets a non-null versionId.

2. **optionsRef pattern** — The `options` parameter is an object. If added directly to the effect dependency array, it would cause the effect to re-run on every render (new object reference each time). `optionsRef` solves this: the ref is always current without being a dependency.

3. **Empty onNeedName fallback** — When `onNeedName()` resolves with an empty string, the implementation uses `name || (formData.personalInfo.fullName || 'Untitled CV')`. This is consistent with the no-callback path and avoids saving a version with a blank name.

4. **isSavingRef blocks during onNeedName await** — Setting `isSavingRef.current = true` before `await onNeedName()` ensures that edits made while the name prompt is open do not trigger a second debounce fire. Correct per RESEARCH.md Pitfall 3 (T-11-06 disposition: accept).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing sentinel templateId test bug**
- **Found during:** Task 2 (running vitest before making changes)
- **Issue:** "resets debounce when formData changes before timeout" test used `templateId: 'template-1'` and `'template-2'` which are filtered by the sentinel guard `if (!['med-length-proff-cv', 'deedy-resume', 'mcdowell-cv'].includes(...)) return`. The save was always skipped, so status never reached 'saved'.
- **Fix:** Changed to use `'med-length-proff-cv'` with differing `workExperience` arrays to produce two genuinely different formData objects
- **Files modified:** `frontend/src/__tests__/useAutoSave.test.ts`
- **Commit:** ac27dac

**2. [Plan adaptation] Test name and fallback wording adjusted**
- **Found during:** Task 2 implementation
- **Issue:** Plan test "falls back to 'My CV' when onNeedName resolves with empty string" expected `'My CV'` but the implementation uses `fullName || 'Untitled CV'` as the fallback. With `makeFormData()` having `fullName: ''`, the actual fallback is `'Untitled CV'`, not `'My CV'`.
- **Fix:** Used `makeFormData` with empty `fullName` and expected `'Untitled CV'`. Test renamed to "falls back to fullName when onNeedName resolves with empty string".
- **Files modified:** `frontend/src/__tests__/useAutoSave.test.ts`
- **Commit:** ac27dac

## TDD Gate Compliance

- Task 1 RED: `test(11-03)` commit f0d29bc — added failing test for PATCH path
- Task 1 GREEN: `feat(11-03)` commit d9cf524 — implemented branching (RED test now passes)
- Task 2: `feat(11-03)` commit ac27dac — full test suite extension (16 tests total)

## Known Stubs

None — no UI stubs introduced. This plan only touches the useAutoSave hook and its test file.

## Threat Flags

No new threat surface introduced. The versionIdRef fix specifically mitigates T-11-07 (stale versionId closure causing duplicate POST), which was in the plan's threat model with `mitigate` disposition.

## Deferred Items

6 pre-existing test failures in unrelated files logged to `deferred-items.md`:
- `SectionWrapper.test.tsx` (1 failure)
- `entryFactories.test.ts` (1 failure)
- `useDirectEditor.test.ts` (1 failure)
- `useImport.test.ts` (3 failures)

These are not caused by plan 11-03 changes and are out of scope.

## Self-Check: PASSED

- FOUND: frontend/src/features/direct-edit/hooks/useAutoSave.ts
- FOUND: frontend/src/__tests__/useAutoSave.test.ts
- FOUND commit f0d29bc (test RED - PATCH path failing test)
- FOUND commit d9cf524 (feat GREEN - useAutoSave branching implementation)
- FOUND commit ac27dac (feat GREEN - full test suite extension)
- TypeScript: `npx tsc --noEmit` exits 0
- Tests: 16/16 passing in `src/__tests__/useAutoSave.test.ts`
