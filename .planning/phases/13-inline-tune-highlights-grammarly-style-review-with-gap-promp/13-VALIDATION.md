---
phase: 13
slug: inline-tune-highlights-grammarly-style-review-with-gap-promp
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-22
updated: 2026-05-23
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest ^4.0.18 + @testing-library/react ^16.3.2 + jsdom ^28.1.0 |
| **Framework (backend)** | pytest |
| **Config file (frontend)** | `frontend/vitest.config.ts` |
| **Config file (backend)** | `backend/pytest.ini` |
| **Quick run (frontend)** | `cd frontend && npx vitest run --reporter=basic` |
| **Quick run (backend)** | `cd backend && pytest -x -q -m "not slow"` |
| **Full suite (frontend)** | `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint .` |
| **Full suite (backend)** | `cd backend && pytest` |
| **Estimated runtime (quick)** | ~15 seconds |
| **Estimated runtime (full)** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command relevant to layer touched (frontend or backend)
- **After every plan wave:** Run full suite for both layers
- **Before `/gsd-verify-work`:** Both full suites must be green + manual visual checkpoint executed
- **Max feedback latency:** 15 seconds (quick), 60 seconds (full)

---

## Per-Task Verification Map

> Filled by gsd-planner from PLAN.md task IDs. One row per task.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | D-07 | T-13-01-01,03,04 | Pydantic validates List[str]; cache-key folds clarifications; prompt block instructs add-preference | unit (pytest) | `cd backend && pytest tests/test_tailor.py -x -q` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | D-04,D-05,D-06,D-12,D-17,D-18,D-19,D-25 | — | Wave 0 frontend scaffolds fail with module-not-found; Plans 02-04 turn each green without modifying tests | scaffold (vitest) | `cd frontend && npx vitest run src/__tests__/severity.test.ts src/__tests__/useChangeHighlights.test.ts src/__tests__/ChangePopover.test.tsx src/__tests__/GapPromptChips.test.tsx src/__tests__/TuneRail.test.tsx src/__tests__/PostSavePrompt.test.tsx --reporter=basic` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 2 | D-12 | — | severity inference returns 'strong'/'minor'/'add'/'delete' deterministically; useChangeHighlights returns DOM-ordered IDs + Range mapping with CSS.escape | unit (vitest) | `cd frontend && npx vitest run src/__tests__/severity.test.ts src/__tests__/useChangeHighlights.test.ts --reporter=basic` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | D-13,D-14,D-15,D-16 | T-13-02-01 | EditableField highlight injection escapes per-span text (createTextNode or escapeHtml); ghost bullet contentEditable=false; first-keystroke auto-dismiss fires once per highlight pass | unit (vitest) | `cd frontend && npx vitest run src/__tests__/EditableField.test.tsx src/__tests__/EditableBulletList.test.tsx --reporter=basic && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-02-03 | 02 | 2 | D-07 | — | useTailor.fetchSuggestions + api.suggestTailorChanges accept optional userClarifications: string[] forwarded as user_clarifications snake_case | type-check (tsc) | `cd frontend && npx tsc --noEmit && grep -n 'user_clarifications: userClarifications' frontend/src/services/api.ts` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 2 | D-13,D-14 | — | ChangeHighlight wraps text in span with severity-tier class + data-change-id; @floating-ui/react@^0.27.19 installed | unit (vitest) | `cd frontend && npm ls @floating-ui/react && npx vitest run src/__tests__/ChangeHighlight.test.tsx --reporter=basic` | ❌ W0 | ⬜ pending |
| 13-03-02 | 03 | 2 | D-17,D-18,D-19 | T-13-03-01 | ChangePopover renders compact (minor) and expanded (strong/add/delete) variants; ArrowLeft/Right/Enter/Escape keyboard nav; React JSX text rendering (no innerHTML) | unit (vitest) | `cd frontend && npx vitest run src/__tests__/ChangePopover.test.tsx --reporter=basic && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-03-03 | 03 | 2 | D-04,D-05,D-06 | T-13-03-02 | GapPromptChips renders one button per missing[]; click-to-expand textarea; emits ONLY touched chips on blur; maxLength=500 + trim filter | unit (vitest) | `cd frontend && npx vitest run src/__tests__/GapPromptChips.test.tsx --reporter=basic && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-04-01 | 04 | 3 | D-01,D-02,D-03,D-08,D-09,D-10,D-11,D-23,D-24 | — | TuneRail composes GapPromptChips + step machine; setBaselineScore preserved at DirectEditPage call site (NOT inside the rail); re-run confirm guard; all-reviewed banner; skip-section uses fieldPathToSection | unit (vitest) | `cd frontend && npx vitest run src/__tests__/TuneRail.test.tsx --reporter=basic && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-04-02 | 04 | 3 | D-21,D-25 | — | ScoreCard renders baseline → current with delta classes (positive/negative/neutral); PostSavePrompt three-option modal with default focus on "View in Dashboard"; Escape + backdrop dismiss | unit (vitest) | `cd frontend && npx vitest run src/__tests__/PostSavePrompt.test.tsx --reporter=basic && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-04-03 | 04 | 3 | D-13,D-22 | T-13-04-05 | MedLengthTemplate forwards highlightSpansByPath + addChangeByPath + onAutoDismiss to EditableField/EditableBulletList; EditorActionsContext extended; NavBar swaps Tune-for-Job → Save Tailored CV with progress text | unit (vitest) | `cd frontend && npx vitest run src/__tests__/navBar.test.tsx --reporter=basic && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-04-04 | 04 | 3 | D-20,D-25,D-26,D-27,D-28 | T-13-04-01 | DirectEditPage owns useChangeHighlights + delegated click handler + auto-advance scrollIntoView; handleAnalyze calls tailor.setBaselineScore(matchAnalysis.match_score) (Phase 12 D-01 lock); membership check on delegated changeId | integration (vitest) | `cd frontend && npx vitest run src/__tests__/ --reporter=basic && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-04-05 | 04 | 3 | D-13,D-15,D-16,D-19,D-20,D-25 | — | Manual checkpoint: 4 severity tiers render across line wraps; auto-advance smooth-scroll; ghost-text cursor isolation; first-keystroke dismiss; cross-browser Chrome + Firefox/Safari | manual (visual) | manual — see Plan 04 Task 5 `<how-to-verify>` (no automated command) | n/a | ⬜ pending |
| 13-05-01 | 05 | 4 | D-01 | T-13-05-01 | TunePanel/ChangePanel/ChangeCard files removed; useScrollSync removed; no imports remain; production build succeeds | grep + tsc + build | `! grep -rn "TunePanel\|ChangePanel\|ChangeCard\|useScrollSync" frontend/src/ --include="*.ts" --include="*.tsx" && cd frontend && npx tsc --noEmit && npx vitest run --reporter=basic && npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `frontend/src/__tests__/severity.test.ts` — severity inference cases (Plan 01 Task 2)
- [x] `frontend/src/__tests__/useChangeHighlights.test.ts` — pendingChanges filter + DOM order + Range mapping (Plan 01 Task 2)
- [x] `frontend/src/__tests__/ChangePopover.test.tsx` — compact/expanded variants + keyboard nav (Plan 01 Task 2)
- [x] `frontend/src/__tests__/GapPromptChips.test.tsx` — chip click-to-expand + onClarificationsChange filtering (Plan 01 Task 2)
- [x] `frontend/src/__tests__/TuneRail.test.tsx` — rail state machine (intake → analysis → review-shrunk) (Plan 01 Task 2)
- [x] `frontend/src/__tests__/PostSavePrompt.test.tsx` — three-option modal (Plan 01 Task 2)
- [x] `backend/tests/test_tailor.py` — 6 pytest cases for userClarifications validation + cache-key separation + prompt content (Plan 01 Task 1)
- [x] Install `@floating-ui/react@^0.27.19` — Plan 03 Task 1 prerequisite

> Backend test path corrected from `backend/tests/routes/test_tailor.py` (initial seed) to `backend/tests/test_tailor.py` to match the codebase's flat test layout.
> Frontend test paths corrected from `frontend/src/features/direct-edit/{components,hooks}/__tests__/*.test.{ts,tsx}` (initial seed) to `frontend/src/__tests__/*.test.{ts,tsx}` to match the codebase's flat test layout.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Squiggle underline visual fidelity across line wraps | D-13 | Cross-browser CSS rendering — needs eyeball check | Open `/build/form` in Chrome, Firefox, Safari with active tune; verify 4 severity tiers render correctly across multi-line bullets |
| Auto-advance scroll continuity | D-20 | Smooth-scroll timing + popover reposition is perceptual | Accept/Skip 5 changes in succession; verify CV scrolls smoothly + popover stays anchored without flicker |
| Ghost-text inside contentEditable | D-15 | Cursor/selection edge cases — test in real browser | Click ghost-text bullet → verify cursor doesn't enter ghost; type → verify ghost dismisses cleanly |
| Severity threshold (50% diff) usability | D-12 | Threshold is heuristic — needs UX feedback | Submit JD with 12+ changes; check that "strong" tier highlights match user's intuition for "big change" |
| First-keystroke auto-dismiss | D-16 | contentEditable interaction — fragile in jsdom | Click inside highlighted region → type → verify highlight dismisses + text restores |
| PostSavePrompt three-option default focus | D-25 | Focus-mgmt verification needs assistive-tech walk-through | Save tailored CV → verify focus lands on "View in Dashboard" by default; Tab cycles between options; Escape closes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are explicit manual checkpoints (Plan 04 Task 5 is the single manual node)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (the manual checkpoint is bookended by automated tasks 13-04-04 before and 13-05-01 after)
- [x] Wave 0 covers all MISSING references (8 items above)
- [x] No watch-mode flags (use `vitest run`, not `vitest`)
- [x] Feedback latency < 15s for quick, < 60s for full
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (planner)
