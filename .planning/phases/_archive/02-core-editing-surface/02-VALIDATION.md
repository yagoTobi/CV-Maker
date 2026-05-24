---
phase: 2
slug: core-editing-surface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), pytest (backend - regression only) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npm test` and `cd backend && pytest -m "not slow" -q` |
| **Estimated runtime** | ~15 seconds (quick), ~45 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run full suite (frontend + backend regression)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | EDIT-01 | unit | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EDIT-02 | visual | Manual visual comparison | N/A | ⬜ pending |
| TBD | TBD | TBD | EDIT-03 | unit | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EDIT-04 | unit | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EDIT-05 | unit | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EDIT-06 | unit | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UX-01 | integration | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Tests for EditableField component (focus, blur, sync, placeholder)
- [ ] Tests for bullet list editing (Enter creates, Backspace deletes)
- [ ] Tests for CVFormData sync on input
- [ ] Tests for auto-save debounce behavior
- [ ] TypeScript compilation check (`cd frontend && npx tsc --noEmit`)

*Existing vitest infrastructure covers framework setup. Wave 0 adds editing-specific tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity to LaTeX PDF | EDIT-02 | CSS rendering vs LaTeX rendering requires human judgment | Open web CV and compiled PDF side-by-side, compare fonts, spacing, section headers |
| Cursor behavior across fields | EDIT-01 | Browser cursor positioning is hard to test programmatically | Tab between fields, verify cursor lands correctly |
| Font rendering quality | EDIT-02 | Font metrics and anti-aliasing are visual | Compare EB Garamond rendering in browser vs PDF |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
