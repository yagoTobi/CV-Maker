---
phase: 7
slug: navigation-flow-consolidation-collapse-buildchoicescreen-int
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx` |
| **Full suite command** | `cd frontend && npm run test` |
| **Estimated runtime** | ~10 seconds (quick), ~30 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx`
- **After every plan wave:** Run `cd frontend && npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| NAV-01 | 01 | 1 | NAV-01 | — | N/A | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | ❌ W0 | ⬜ pending |
| NAV-02 | 01 | 1 | NAV-02 | T-file-upload | File type/size validated before import | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | ❌ W0 | ⬜ pending |
| NAV-03 | 01 | 1 | NAV-03 | — | N/A | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | ❌ W0 | ⬜ pending |
| NAV-04 | 01 | 1 | NAV-04 | — | N/A | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | ❌ W0 | ⬜ pending |
| NAV-05 | 01 | 1 | NAV-05 | — | N/A | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | ❌ W0 | ⬜ pending |
| NAV-06 | 01 | 1 | NAV-06 | — | N/A | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | ❌ W0 | ⬜ pending |
| NAV-07 | 01 | 1 | NAV-07 | — | N/A | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | ❌ W0 | ⬜ pending |
| NAV-08 | 01 | 1 | NAV-08 | — | N/A | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/__tests__/import-flow-state.test.tsx` — full rewrite to cover new inline expansion flow (NAV-01 through NAV-08); existing file tests the old /build/start route and needs replacement

*Wave 0 must complete before any phase tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Panel enter/exit animations (250ms ease-out) | C-02, C-03, C-04 | CSS transitions are not testable in jsdom | Visually verify expansion/collapse animations in browser |
| Focus management on panel expand | Accessibility | Focus movement hard to assert in jsdom reliably | Tab into expanded panel and verify first interactive element receives focus |
| prefers-reduced-motion: instant expand/collapse | Accessibility | Requires OS-level setting | Enable reduced motion in macOS, verify panels show instantly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
