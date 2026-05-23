---
phase: 13-inline-tune-highlights-grammarly-style-review-with-gap-promp
plan: 02
subsystem: ui
tags: [react, tailor, highlights, contenteditable, dom-range, vitest, css-modules]

# Dependency graph
requires:
  - phase: 13
    provides: "Plan 01 — TailorRequest.user_clarifications backend wiring + Wave 0 frontend test scaffolds (severity.test.ts, useChangeHighlights.test.ts, EditableField highlight tests, EditableBulletList ghost-bullet tests)."
provides:
  - "inferSeverity client-side util (D-12) — deterministic word-overlap diff (threshold 0.5) plus changeType short-circuit for add/remove."
  - "useChangeHighlights hook returning activeChangeId/setActiveChangeId, pendingChanges, severityMap (covers ALL changes for D-25 recap), getRangeForChange, advanceTo(direction, currentId), dismissSection(sectionKey), documentOrderIds."
  - "EditableField highlightSpans + onAutoDismiss props (D-13/D-14/D-16) — non-focus-disturbing injection via createTextNode (no innerHTML for user content), focus strips wrappers, first keystroke fires onAutoDismiss once."
  - "EditableBulletList ghost-bullet (addChange D-15), delete-tier strikethrough (deleteChangeIdsByBulletId), modify-span pass-through (highlightSpansByBulletId)."
  - "useTailor.fetchSuggestions and api.suggestTailorChanges accept optional userClarifications: string[] (snake_case wire field user_clarifications, D-07)."
affects: [13-03, 13-04, 13-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DOM Range mapping via TreeWalker for substring-to-Range with CSS.escape on fieldPath."
    - "Highlight injection that survives focus: focus → flatten to plain text via textContent assignment; blur/effect → rebuild DOM via createTextNode (XSS-safe, no innerHTML)."
    - "Single-fire auto-dismiss guarded by useRef boolean, re-armed when highlightSpans change."

key-files:
  created:
    - frontend/src/features/direct-edit/utils/severity.ts
    - frontend/src/features/direct-edit/hooks/useChangeHighlights.ts
  modified:
    - frontend/src/features/direct-edit/components/EditableField.tsx
    - frontend/src/features/direct-edit/components/EditableField.module.css
    - frontend/src/features/direct-edit/components/EditableBulletList.tsx
    - frontend/src/features/direct-edit/components/EditableBulletList.module.css
    - frontend/src/hooks/useTailor.ts
    - frontend/src/services/api.ts

key-decisions:
  - "Followed the Wave 0 test contract (object-arg useChangeHighlights({changes,applied,skipped,containerRef}); advanceTo(direction, currentId)) over the plan's <interfaces> sketch — tests are the executable contract."
  - "Built per-span text content via createTextNode rather than templating innerHTML to mitigate T-13-02-01 (XSS via tailored field content)."
  - "documentOrderIds reads containerRef.current inside useMemo, matching the established codebase ref-during-render pattern (useTailor.ts:71). ESLint react-hooks rule conflict logged to deferred-items.md, not fixed inline."
  - "severityMap covers ALL changes (not just pending) so D-25 'all-reviewed' recap (Plan 04/05) can color-key resolved items."

patterns-established:
  - "Highlight overlay pattern: useEffect with [value, spans, focused] deps; focused → textContent flatten; blurred → rebuild via createTextNode + per-span <span class={tierX}>."
  - "Auto-dismiss pattern: ref boolean armed when injecting highlights, fires once on first input event, re-armed on next highlight injection."
  - "Ghost-bullet pattern: extra <div contentEditable=false data-change-id=...> rendered AFTER real bullets, so focus refs and indices for real bullets are unaffected."

requirements-completed:
  - D-07
  - D-12
  - D-13
  - D-14
  - D-15
  - D-16

# Metrics
duration: 75min
completed: 2026-05-23
---

# Phase 13 Plan 02: Inline-Highlight Foundation Summary

**Client-side severity inference (D-12) + DOM-range highlight mapping hook + EditableField/EditableBulletList overlay extensions, all XSS-safe via createTextNode and focus-non-disturbing.**

## Performance

- **Duration:** ~75 min
- **Tasks:** 3
- **Files created:** 2
- **Files modified:** 6 (+1 deferred-items.md)

## Accomplishments

- `severity.ts` deterministic util — `inferSeverity(change)` returns `'add' | 'delete' | 'strong' | 'minor'` per D-12 word-overlap rule (threshold 0.5).
- `useChangeHighlights` hook — wraps `TailorChange[]` into highlight state + DOM range resolver consumable by Plan 03 (popover) and Plan 04 (rail).
- `EditableField` + `EditableBulletList` accept highlight props without breaking the existing uncontrolled-while-focused contract.
- `useTailor` + `api.ts` forward `userClarifications` to the backend route wired in Plan 01 (D-07).
- Plan 01 Wave 0 scaffolds turned green: 6 severity tests, 6 useChangeHighlights tests, +9 EditableField highlight tests, +6 EditableBulletList ghost/delete tests = **27 plan-targeted tests passing** (plus the 23 pre-existing tests still passing on these files = 50 total green).

## Task Commits

Each task committed atomically:

1. **Task 1: severity util + useChangeHighlights hook** — `cbb8485` (feat)
2. **Task 2: EditableField highlight overlay + EditableBulletList ghost bullets** — `faa007b` (feat)
3. **Task 3: userClarifications plumbing through useTailor → api** — `135d5fe` (feat)

**Plan metadata:** committed alongside this SUMMARY.md.

## Files Created/Modified

### Created

- `frontend/src/features/direct-edit/utils/severity.ts` — `inferSeverity` + `Severity` type, `SEVERITY_DIFF_THRESHOLD = 0.5`, internal helpers `toDisplayString`, `tokens`, `simpleDiffRatio`.
- `frontend/src/features/direct-edit/hooks/useChangeHighlights.ts` — object-arg hook returning `activeChangeId, setActiveChangeId, pendingChanges, severityMap, getRangeForChange, documentOrderIds, advanceTo, dismissSection`.

### Modified

- `frontend/src/features/direct-edit/components/EditableField.tsx` — added `HighlightSpan` interface (exported), `highlightSpans?` and `onAutoDismiss?` props; `renderHighlightedDom(el, value, spans)` builds DOM via createTextNode; `handleFocus` flattens via `textContent = plain` to strip wrappers (cursor-safe); `handleInput` fires `onAutoDismiss` once per render via `autoDismissArmed` ref.
- `frontend/src/features/direct-edit/components/EditableField.module.css` — `.highlight` (wavy underline), `.tierStrong/Minor/Add/Delete`, `.active.tier*` (tinted bg).
- `frontend/src/features/direct-edit/components/EditableBulletList.tsx` — `addChange?: TailorChange`, `deleteChangeIdsByBulletId?: Map<string,string>`, `highlightSpansByBulletId?: Map<string, HighlightSpan[]>`, `onAutoDismiss?`, `activeChangeId?`. Composes per-bullet spans (modify spans + synthetic delete-tier full-bullet span). Ghost `<div contentEditable={false} data-change-id=...>` rendered AFTER real bullets.
- `frontend/src/features/direct-edit/components/EditableBulletList.module.css` — `.ghostBulletItem`, `.ghostBulletMarker`, `.ghostBulletText`.
- `frontend/src/hooks/useTailor.ts` — `UseTailorReturn.fetchSuggestions` 5th param `userClarifications?: string[]`; useCallback body forwards to `api.suggestTailorChanges`.
- `frontend/src/services/api.ts` — `suggestTailorChanges` adds `userClarifications?: string[]` between `role?` and `signal?`; POST body includes `user_clarifications` (snake_case, FastAPI convention) — axios omits when undefined.

## Decisions Made

- **Test contract over plan `<interfaces>` sketch.** Plan 02's `<interfaces>` block showed positional args for `useChangeHighlights`; the Wave 0 scaffold (which Plan 02 must turn green) uses object-args `{ changes, applied, skipped, containerRef }` with `advanceTo(direction, currentId)`. Per Rule 3, followed the executable test contract. This is the public surface Plan 03 and Plan 04 will consume.
- **`severityMap` covers ALL changes, not just pending.** Plan 04/05 D-25 'all-reviewed' recap needs to color-key already-applied/skipped items, so the map keys must persist after dismissal.
- **`createTextNode`-only DOM building (no innerHTML).** T-13-02-01 (XSS through tailored field content): per-span text comes from `TailorChange.alternatives[i].value`, which originates from the LLM. innerHTML concatenation would let `<script>` payloads render. createTextNode escapes all HTML.
- **`CSS.escape(fieldPath)` before querySelector.** T-13-02-04: `fieldPath` like `workExperience[0].bullets[0]` contains brackets/dots that break CSS selectors. CSS.escape handles all CSS-special chars.
- **Focus flattens via `textContent` assignment, not via removeChild loop.** Setting `textContent` is one DOM mutation that replaces all children with a single text node — this is the only mode that reliably preserves the user's caret position when they click into a highlighted region.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] frontend/node_modules not provisioned in worktree**
- **Found during:** Task 1 (running vitest to verify scaffold goes green)
- **Issue:** Worktree spawn does not symlink or install frontend deps; `npm test` failed to find vitest.
- **Fix:** `ln -s /Users/yagotobi/Documents/Code/GitHub/Projects/CV-Maker/frontend/node_modules .claude/worktrees/agent-a600502275090b534/frontend/node_modules` (gitignored, doesn't pollute commits).
- **Files modified:** none (symlink only).
- **Verification:** vitest invocations succeed inside the worktree.
- **Committed in:** N/A — symlink is local to worktree.
- **Cross-cutting:** logged to `deferred-items.md` for orchestrator-level fix (worktree provisioning).

**2. [Rule 3 - Blocking] `vitest --reporter=basic` flag broken in Vitest 4 toolchain**
- **Found during:** Task 1 (running plan's specified verify command).
- **Issue:** The plan's `<verify>` block ran `vitest --reporter=basic`; Vitest 4 no longer ships a `basic` reporter and exits non-zero.
- **Fix:** Dropped `--reporter=basic`; default reporter produces equivalent test summary.
- **Files modified:** none.
- **Verification:** All targeted tests run + report cleanly with default reporter.
- **Cross-cutting:** logged to `deferred-items.md` so future plans drop the flag.

**3. [Rule 1 - Bug] First-keystroke auto-dismiss test failure on focus**
- **Found during:** Task 2 (running EditableField highlight test "focusing strips highlights").
- **Issue:** `handleFocus` only set `textContent = plain` if `textContent !== plain`; but `textContent` already returned the unwrapped string even when `<span>` wrappers were present, so spans persisted on focus.
- **Fix:** Always force `ref.current.textContent = plain` to flatten element children regardless of equality check.
- **Files modified:** `frontend/src/features/direct-edit/components/EditableField.tsx`.
- **Verification:** "focusing strips highlights" test passes; "blurring re-injects highlight spans" test passes via rerender.
- **Committed in:** `faa007b`.

**4. [Rule 3 - Blocking] ESLint `no-useless-escape` in CSS.escape fallback regex**
- **Found during:** Task 1 (lint).
- **Issue:** Regex `/(["\\\]\[])/g` — extra escape on `]` triggered ESLint error.
- **Fix:** Rewrote as `/(["\\[\]])/g`.
- **Files modified:** `frontend/src/features/direct-edit/hooks/useChangeHighlights.ts`.
- **Committed in:** `cbb8485`.

### Cross-cutting (logged to deferred-items.md, not fixed)

- **6 pre-existing unrelated frontend test failures** in `useImport.test.ts` (×3), `useDirectEditor.test.ts`, `SectionWrapper.test.tsx`, `entryFactories.test.ts` — all reproduce on `main` without any 13-02 changes touching the offending modules. Out of scope (SCOPE BOUNDARY).
- **ESLint `react-hooks/refs` rule conflict with established codebase pattern** of reading `someRef.current` inside `useMemo` (e.g., `useTailor.ts:71` reads `baselineScoreRef.current`). New `useChangeHighlights` follows the same pattern. Future plans should configure ESLint or coordinate a sweep.

---

**Total deviations:** 4 auto-fixed (1 bug, 3 blocking) + 2 cross-cutting deferred.
**Impact on plan:** All auto-fixes essential. No scope creep — Task 3 plumbing is a pure forward-compat extension (existing 4-arg callers still type-check; axios omits undefined wire field).

## Issues Encountered

- **Flaky test in full-suite run:** `import-flow-state.test.tsx > Tune with exactly 1 base CV...` failed in one full-suite run but passed in isolation (13/13). Determined to be cross-test interference, not a regression — re-running full suite confirmed exactly 6 failures matching pre-13-02 baseline.

## Test Results

- **Plan-targeted tests (50 total):** all passing
  - `severity.test.ts` (6) — green.
  - `useChangeHighlights.test.ts` (6) — green.
  - `EditableField.test.tsx` (25, +9 new under `describe('highlightSpans (Phase 13 D-13/D-14/D-16)')`) — green.
  - `EditableBulletList.test.tsx` (13, +6 new under `describe('addChange ghost bullet')` and `describe('deleteChangeIdsByBulletId')`) — green.
- **Full frontend suite:** 250 passed / 6 failed — all 6 failures pre-existing on `main`, unrelated to 13-02 (logged to deferred-items.md).
- **`npx tsc --noEmit`:** clean.

## Plan 03 / Plan 04 Contract Handoff

Plan 03 (popover) and Plan 04 (rail/integration) consume:

- `import { inferSeverity, type Severity } from '../utils/severity'` — pure function, no React deps.
- `import { useChangeHighlights } from '../hooks/useChangeHighlights'` — call shape:
  ```ts
  const { activeChangeId, setActiveChangeId, severityMap, getRangeForChange,
          documentOrderIds, advanceTo, dismissSection } =
    useChangeHighlights({ changes, applied, skipped, containerRef });
  ```
- `EditableField` accepts:
  - `highlightSpans?: HighlightSpan[]` — `{ changeId, severity, start, end }[]` for substring highlights.
  - `onAutoDismiss?: (changeId: string) => void` — fires once on first input over an active highlight (D-16).
  - `activeChangeId?: string | null` — flips active tier styling.
- `EditableBulletList` accepts:
  - `addChange?: TailorChange` — renders ghost bullet AFTER real bullets.
  - `deleteChangeIdsByBulletId?: Map<string, string>` — bulletId → changeId for delete-tier strike.
  - `highlightSpansByBulletId?: Map<string, HighlightSpan[]>` — modify-spans within a bullet.
  - `onAutoDismiss`, `activeChangeId` — same as EditableField.
- `useTailor.fetchSuggestions(formData, jobDesc, company, role, userClarifications?)` — Plan 04 passes the rail's clarifications array.

## Threat Flags

None — all new surface (highlight injection, fieldPath querySelectors, user_clarifications wire field) was already in plan's threat model and mitigated as documented.

## Self-Check: PASSED

- Created files: `severity.ts`, `useChangeHighlights.ts` — both FOUND.
- Modified files: `EditableField.tsx`, `EditableField.module.css`, `EditableBulletList.tsx`, `EditableBulletList.module.css`, `useTailor.ts`, `api.ts` — all FOUND.
- Commits: `cbb8485`, `faa007b`, `135d5fe` — all FOUND in git log.

---
*Phase: 13-inline-tune-highlights-grammarly-style-review-with-gap-promp*
*Completed: 2026-05-23*
