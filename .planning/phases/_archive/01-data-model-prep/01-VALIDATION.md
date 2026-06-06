---
phase: 1
slug: data-model-prep
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (backend), vitest (frontend) |
| **Config file** | `backend/pytest.ini`, `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && pytest -m "not slow" -q` and `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd backend && pytest` and `cd frontend && npm test` |
| **Estimated runtime** | ~30 seconds (quick), ~120 seconds (full with compilation tests) |

---

## Sampling Rate

- **After every task commit:** Run quick suite
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DATA-01 | unit | `cd backend && pytest tests/ -k "test_id" -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-02 | integration | `cd backend && pytest tests/ -k "test_tailor or test_import" -q` | ✅ | ⬜ pending |
| TBD | TBD | TBD | DATA-03 | unit | `cd backend && pytest tests/ -k "test_cv_versions" -q` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Tests verifying ID presence on all entry types after creation
- [ ] Tests verifying ID persistence across save/load cycle
- [ ] Tests verifying auto-migration of legacy data (no IDs -> IDs generated)
- [ ] Tests verifying bullet/skill structural change (string[] -> {id, text}[])

*Existing test infrastructure covers framework setup. Wave 0 adds ID-specific test cases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Existing saved CVs load with auto-generated IDs | DATA-01 | Requires actual saved version files | Load a pre-existing version via Dashboard, verify all fields render correctly |

*Most behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
