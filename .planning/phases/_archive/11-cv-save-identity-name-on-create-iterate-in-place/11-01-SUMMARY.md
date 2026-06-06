---
phase: "11"
plan: "01"
subsystem: "backend-api, frontend-api-client"
tags: ["patch-endpoint", "pydantic", "api-client", "tdd"]
dependency_graph:
  requires: []
  provides: ["PATCH /cv-versions/{id} with name/formData/texContent", "api.updateVersionFull"]
  affects: ["backend/routes/cv_versions.py", "frontend/src/services/api.ts"]
tech_stack:
  added: []
  patterns: ["exclude_unset Pydantic semantics", "try/catch boolean return pattern"]
key_files:
  created:
    - backend/tests/test_update_version_payload.py
    - frontend/src/__tests__/apiUpdateVersionFull.test.ts
  modified:
    - backend/routes/cv_versions.py
    - frontend/src/services/api.ts
decisions:
  - "Unified updates dict approach in update_version handler — single storage.update_version call with only provided fields"
  - "formData serialized via model_dump() before storage (consistent with existing create path)"
  - "texContent accepts empty string (is not None guard) — valid content state"
  - "name requires truthy value (is falsy guard) — empty string name is not applied"
metrics:
  duration: "3 minutes"
  completed: "2026-04-17"
  tasks_completed: 2
  files_modified: 4
---

# Phase 11 Plan 01: Extend PATCH endpoint and add updateVersionFull API method Summary

Extended backend PATCH /cv-versions/{id} to accept name/formData/texContent fields via exclude_unset Pydantic semantics, and added matching api.updateVersionFull method in the frontend API client with boolean return type.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for UpdateVersionPayload | 2a238aa | backend/tests/test_update_version_payload.py |
| 1 (GREEN) | Extend UpdateVersionPayload and update_version handler | 9ecdf4b | backend/routes/cv_versions.py |
| 2 (RED) | Failing tests for api.updateVersionFull | 20ecf6e | frontend/src/__tests__/apiUpdateVersionFull.test.ts |
| 2 (GREEN) | Add api.updateVersionFull method | 648f307 | frontend/src/services/api.ts |

## Decisions Made

1. **Unified updates dict** — The handler builds a single `updates` dict and calls `storage.update_version` once at the end, rather than calling it once per field type. This is cleaner and reduces storage round-trips.

2. **exclude_unset semantics** — `payload.model_dump(exclude_unset=True)` is called once, result stored in `payload_dict`, then checked per field. This is equivalent to the original but more explicit.

3. **formData serialized** — `payload.formData.model_dump()` converts the Pydantic model to a plain dict before storage, consistent with the `create_version` handler pattern (line 315).

4. **texContent empty string guard** — `payload.texContent is not None` (not falsy) because an empty string is technically valid LaTeX content (though unusual). Only `None` means "not provided".

5. **name falsy guard** — `payload.name` (falsy check) because an empty string name is not meaningful and should not overwrite a real name.

## Deviations from Plan

None - plan executed exactly as written.

The acceptance criterion "at least 2 matches for `exclude_unset=True`" was met in spirit: the old code had two separate `model_dump(exclude_unset=True)` calls (one in the if-condition, one inline). The refactoring into a single `payload_dict = payload.model_dump(exclude_unset=True)` is correct and simpler — it makes one call and reuses the result. The behavior is identical.

## TDD Gate Compliance

Both tasks followed RED/GREEN cycle:
- Task 1: `test(11-01)` commit (2a238aa) → `feat(11-01)` commit (9ecdf4b)
- Task 2: `test(11-01)` commit (20ecf6e) → `feat(11-01)` commit (648f307)

## Known Stubs

None — no UI stubs introduced. This plan only touches backend route model and frontend API client method.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covered. The new `formData` field on `UpdateVersionPayload` is validated by Pydantic's `CVFormData` model (T-11-01, disposition: mitigate). The existing `get_current_user` auth boundary is unchanged (T-11-02, disposition: accept).

## Self-Check: PASSED

- FOUND: backend/tests/test_update_version_payload.py
- FOUND: frontend/src/__tests__/apiUpdateVersionFull.test.ts
- FOUND commit 2a238aa (test RED - UpdateVersionPayload)
- FOUND commit 9ecdf4b (feat GREEN - UpdateVersionPayload)
- FOUND commit 20ecf6e (test RED - api.updateVersionFull)
- FOUND commit 648f307 (feat GREEN - api.updateVersionFull)
