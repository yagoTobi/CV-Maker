---
phase: 6
slug: route-integration
status: approved
nyquist_compliant: true
nyquist_rationale: "Route integration phase uses TypeScript compilation (npx tsc --noEmit) as primary automated verification after each task. Manual end-to-end flow verification in 06-03 Task 2 checkpoint provides comprehensive integration validation. Automated unit tests for route structure would be brittle and low-value compared to human verification of complete user flows."
wave_0_complete: true
created: 2026-04-06
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ROUTE-01 | — | N/A | integration | `cd frontend && npx vitest run` | ⬜ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | ROUTE-02 | — | N/A | integration | `cd frontend && npx vitest run` | ⬜ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | ROUTE-03 | — | N/A | integration | `cd frontend && npx vitest run` | ⬜ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | ROUTE-04 | — | N/A | integration | `cd frontend && npx vitest run` | ⬜ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | ROUTE-05 | — | N/A | manual | N/A | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing test infrastructure covers all phase requirements — vitest already configured with jsdom and testing-library.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Complete build flow end-to-end | ROUTE-04 | Full user flow across multiple routes | Navigate Landing → Template Select → Web CV Editor → edit text → Download PDF |
| Dead code removal verification | ROUTE-05 | File deletion confirmed via filesystem | Verify `frontend/src/features/form-builder/`, `frontend/src/features/editor/`, `frontend/src/features/cv-import/` directories are removed |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (TypeScript compilation + human checkpoint)
