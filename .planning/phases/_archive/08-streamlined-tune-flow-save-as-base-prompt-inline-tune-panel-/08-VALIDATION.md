---
phase: 8
slug: streamlined-tune-flow-save-as-base-prompt-inline-tune-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -20`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | D-04/D-05 | — | N/A | unit | `cd frontend && npx vitest run --reporter=verbose src/__tests__/TunePanel` | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 1 | D-01/D-02 | — | N/A | unit | `cd frontend && npx vitest run --reporter=verbose src/__tests__/TunePanel` | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | 1 | D-08/D-09 | — | N/A | unit | `cd frontend && npx vitest run --reporter=verbose src/__tests__/navigation` | ❌ W0 | ⬜ pending |
| 8-03-01 | 03 | 2 | D-11 | — | N/A | unit | `cd frontend && npx vitest run --reporter=verbose src/__tests__/Dashboard` | ✅ | ⬜ pending |
| 8-04-01 | 04 | 2 | D-12/D-13 | — | N/A | unit | `cd frontend && npx vitest run --reporter=verbose src/__tests__/NavBar` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/__tests__/TunePanel.test.tsx` — stubs for D-01 through D-07 (tier state machine)
- [ ] `frontend/src/__tests__/navigation.test.tsx` — stubs for D-08, D-09 route rewiring

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CV stays visible in left panel while all tune tiers are traversed | D-04 | Layout/visual check | Open /build/form, click Tune, verify CV never disappears through Tier 1→2→3 |
| Tiers collapse to summary rows after completion | D-06 | Visual/interaction | Complete Tier 1 save, verify panel shows "Base CV: [name]" summary row; complete Tier 2, verify company·role·score row |
| Dashboard filtered view shows only base CV group post-save | D-11 | Integration/navigation | Accept changes, save, verify redirect to /dashboard shows only parent base CV and its children |
| "+ New CV" absent from NavBar on Dashboard/non-editor pages | D-13 | Visual regression | Navigate to /dashboard and /build, verify "+ New CV" is gone from NavBar |
| Tuning indicator appears in NavBar when panel is open | D-12 | Visual | Open tune panel, verify NavBar shows active indicator |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
