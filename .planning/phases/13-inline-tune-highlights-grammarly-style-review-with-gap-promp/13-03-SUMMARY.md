---
phase: 13
plan: 03
subsystem: tune-presentational-primitives
tags:
  - frontend
  - direct-edit
  - tune
  - floating-ui
  - css-modules
  - vitest
  - wave-2
requirements:
  - D-04
  - D-05
  - D-06
  - D-13
  - D-14
  - D-17
  - D-18
  - D-19
dependency_graph:
  requires:
    - "@floating-ui/react@^0.27.19 (installed in this plan)"
    - frontend/src/types/index.ts (TailorChange)
    - frontend/src/features/direct-edit/utils/severity.ts (Severity type — stub created here, full impl from Plan 02 will merge)
  provides:
    - "ChangePopover: floating compact/expanded popover with keyboard nav"
    - "ChangeHighlight: presentational squiggle wrapper"
    - "GapPromptChips: click-to-expand chip array seeded from missing[]"
  affects:
    - downstream Plan 04 TuneRail composes all three of these
    - downstream Plan 02 severity.ts merge (Plan 02 expected to land inferSeverity in same file)
tech_stack:
  added:
    - "@floating-ui/react@0.27.19 (resolved exactly at floor; no version drift)"
  patterns:
    - "floating-ui virtual-element anchoring via setPositionReference + DOMRect"
    - "useDismiss(escapeKey=true, outsidePress=false) for keyboard-modal / pointer-non-modal popovers"
    - "Composed onKeyDown that runs local handlers before delegating to floating-ui's useInteractions"
    - "Reset-by-remount pattern (parent passes key=) instead of setState-in-effect under React 19 lint rules"
key_files:
  created:
    - frontend/src/features/direct-edit/components/ChangePopover.tsx
    - frontend/src/features/direct-edit/components/ChangePopover.module.css
    - frontend/src/features/direct-edit/components/ChangeHighlight.tsx
    - frontend/src/features/direct-edit/components/ChangeHighlight.module.css
    - frontend/src/features/direct-edit/components/GapPromptChips.tsx
    - frontend/src/features/direct-edit/components/GapPromptChips.module.css
    - frontend/src/features/direct-edit/utils/severity.ts
    - frontend/src/__tests__/ChangeHighlight.test.tsx
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/src/__tests__/GapPromptChips.test.tsx
decisions:
  - "anchor prop named anchorRect (DOMRect) not anchorRange (Range) — Plan 01 Wave 0 scaffold passed `anchorRect: null`; the scaffold is the locked contract. The internal implementation uses floating-ui's setPositionReference virtual-element pattern, which only requires getBoundingClientRect, so DOMRect works as well as Range."
  - "Escape key handled exclusively via useDismiss → onOpenChange → onClose to avoid double-firing onClose. Local onKeyDown intentionally NOT calling onClose for Escape."
  - "FloatingFocusManager wraps inner content (modal=false) — popover root with class compact/expanded stays as container.firstElementChild for the test contract."
  - "GapPromptChips collapses on textarea blur (sets expandedIndex=null). Re-clicking the same chip re-opens cleanly — required for the 'clear-and-blur removes clarification' test."
  - "Reset-on-missing-change in GapPromptChips delegated to parent via React `key=` remount. Direct setState (in render or in effect) trips React 19 lint rules (react-hooks/refs and react-hooks/set-state-in-effect)."
  - "severity.ts type-only stub (created here) is intentionally minimal. Plan 02 will land the full file with `inferSeverity`. Both worktrees create the file; the merge will combine the type alias with Plan 02's function. This is a known parallel-execution artifact, not a deviation from the plan."
metrics:
  duration_minutes: 8
  completed_date: "2026-05-23"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 3
  commits: 3
---

# Phase 13 Plan 03: Tune Presentational Primitives Summary

**One-liner:** Installed `@floating-ui/react@^0.27.19` and built three Plan-04-feeding presentational primitives — `ChangePopover` (Grammarly-style compact + expanded floating card with full keyboard nav), `ChangeHighlight` (severity-tier squiggle wrapper), and `GapPromptChips` (click-to-expand chip array seeded from match-analysis `missing[]`) — turning two of the Plan 01 Wave 0 scaffolds green and adding a fresh five-test suite for `ChangeHighlight`.

## What Was Built

### Task 1 — Dependency + ChangeHighlight (commit `25d5f12`)

- `npm install @floating-ui/react@^0.27.19 --save` from `frontend/`. **Resolved exactly to `0.27.19`** (the floor specified in the plan); no version drift to 0.27.x or 0.28.x.
- `frontend/src/features/direct-edit/components/ChangeHighlight.tsx` (NEW): purely presentational `<span>` wrapper.
  - Renders `<span class="highlight tier{Strong|Minor|Add|Delete} [active]" data-change-id data-severity>{children}</span>`.
  - Pure: no state, no effects. Click handler stops propagation and calls `onClick?.(changeId)`.
  - `import type { Severity }` (verbatimModuleSyntax compliance).
- `frontend/src/features/direct-edit/components/ChangeHighlight.module.css` (NEW):
  - `.highlight` base: `text-decoration: underline wavy 2px`, `text-underline-offset: 3px`, `text-decoration-skip-ink: none`, `cursor: pointer`, `transition: background-color 0.15s ease`.
  - Per-tier squiggle color (idle): `tierStrong`/`tierDelete` → `--error`; `tierMinor` → `--accent`; `tierAdd` → `--success`. `tierDelete` upgrades to `line-through` solid for strikethrough semantics.
  - Active state: `.active.tier{Strong|Minor|Add|Delete}` adds the matching `--*-light` background.
- `frontend/src/__tests__/ChangeHighlight.test.tsx` (NEW, 5 tests): data-attrs, tierStrong class, active class toggle, click → onClick(changeId), children render.
- `frontend/src/features/direct-edit/utils/severity.ts` (NEW STUB): `export type Severity = 'strong' | 'minor' | 'add' | 'delete';` only. Plan 02 will land `inferSeverity` in the same file; the merge will combine.

### Task 2 — ChangePopover (commit `8af59e1`)

- `frontend/src/features/direct-edit/components/ChangePopover.tsx` (NEW): floating-ui-anchored popover with two layout variants per D-18 and full keyboard nav per D-19.
  - **Variants:** `severity === 'minor'` → compact (single AFTER row); `'strong' | 'add' | 'delete'` → expanded (BEFORE strikethrough block + AFTER block).
  - **`severity === 'add'`:** hides the BEFORE block; AFTER text reads `Add new {section} item`.
  - **`severity === 'delete'`:** keeps BEFORE strikethrough; AFTER text reads `Remove this item`.
  - **Anchor:** `useFloating({ middleware: [offset(8), flip(), shift({ padding: 8 })], whileElementsMounted: autoUpdate })` + virtual element via `refs.setPositionReference({ getBoundingClientRect: () => anchorRect ?? FALLBACK_RECT })`. Fallback path emits a single `console.warn` per mount (RESEARCH §Pitfall 2).
  - **Dismiss:** `useDismiss(context, { escapeKey: true, outsidePress: false })` — Escape closes via `onOpenChange → onClose`; outside clicks do NOT close (D-19 keyboard-modal semantics).
  - **Focus:** `<FloatingFocusManager context={context} modal={false} initialFocus={-1}>` wraps inner content. The popover root with class `compact`/`expanded` stays as `container.firstElementChild` (test contract).
  - **Keyboard handlers (composed):** `onKeyDown` runs local arrow/Enter handlers first, then forwards to floating-ui's `getFloatingProps().onKeyDown` if `defaultPrevented` is false. `Escape` is intentionally NOT handled locally to avoid double-firing onClose.
  - **Buttons:** `Skip change` → `onSkip(activeChange.id)`; `Accept change` → `onAccept(activeChange.id)`. Keyboard hint footer shows `Enter · Esc · ← →`.
  - **T-13-03-01 (XSS):** AI-supplied `alternatives[0].value` rendered as JSX text — no `innerHTML` or `dangerouslySetInnerHTML` anywhere in the file (verified via grep, returns 0 matches).
- `frontend/src/features/direct-edit/components/ChangePopover.module.css` (NEW):
  - `.popover` base: `--bg-primary`, `--shadow-lg`, `--radius`, `min-width: 280px`, `max-width: 480px`, `z-index: 1000`.
  - `.severityStrong | .severityMinor | .severityAdd` apply a 3px top border in `--error | --accent | --success`.
  - `.beforeBlock` uses `--error-light` background + line-through; `.afterBlock` uses `--success-light` + `--success` left-border (D-18).
  - `.compactAfter` is a one-line accent-tinted row for the minor variant.
  - `.actions` is a flex-end row of `Skip` (transparent) + `Accept` (accent solid) buttons.

### Task 3 — GapPromptChips (commit `becd253`)

- `frontend/src/features/direct-edit/components/GapPromptChips.tsx` (NEW): chip array + click-to-expand textarea per D-04/D-05/D-06.
  - One `<button>` per `missing[]` entry; `aria-label={gap}`. Empty array renders `<h4>No gaps detected</h4>` (UI-SPEC line 76).
  - Click chip → toggles `expandedIndex`; only one chip is expanded at a time. Re-clicking the same chip collapses.
  - Expanded chip renders a `<textarea>` immediately below in the same `chipGroup` flex column (forces wrap so subsequent chips reflow correctly).
  - Textarea: `value` controlled by local state, `onBlur` emits trimmed/filtered `clarifications` array (untouched chips → empty strings → filtered out), then collapses (so re-clicking the same chip cleanly re-opens).
  - **`maxLength={500}`** (T-13-03-02 frontend defense in depth alongside the Plan 01 Pydantic backend cap).
  - Auto-focus textarea on open via `ref` + `useEffect` on `expandedIndex`.
  - Reset-on-missing-change deferred to the parent via React `key=` remount (avoids setState-in-effect under React 19's stricter `react-hooks/set-state-in-effect` lint rule).
- `frontend/src/features/direct-edit/components/GapPromptChips.module.css` (NEW): `.chipArray` flex-wrap container, `.chip` neutral pill that switches to `--accent-light` + `--accent` border when expanded, `.textarea` with focus ring, `.emptyHeading` muted center copy.
- `frontend/src/__tests__/GapPromptChips.test.tsx` (EXTENDED): added three behavior tests on top of the Plan 01 scaffold:
  - **Single-chip-expanded invariant:** opening chip[1] while chip[0] is open collapses chip[0] and the surviving textarea has the new aria-label.
  - **`maxLength` enforcement:** textarea has `maxLength === 500` (T-13-03-02).
  - **Cleared chip removed from emit:** type → blur (emit `['Native']`) → re-open same chip → clear → blur (emit `[]`).

## Wave 0 Scaffold Status — turned green

| Scaffold | Status | Test count |
|----------|--------|-----------|
| `ChangePopover.test.tsx` | ✅ green | 9 / 9 passing |
| `GapPromptChips.test.tsx` | ✅ green | 5 / 5 (Plan 01 scaffold) + 3 / 3 (added here) = 8 / 8 |
| `ChangeHighlight.test.tsx` | ✅ green (new this plan) | 5 / 5 passing |

**Total Plan-03 owned tests:** 22 passing, 0 failing.

Other Wave 0 scaffolds remain failing as expected (their Plans haven't run in this worktree):

- `severity.test.ts` — Plan 02 owns `inferSeverity` implementation (Plan 02 worktree running in parallel)
- `useChangeHighlights.test.ts` — Plan 02
- `TuneRail.test.tsx`, `PostSavePrompt.test.tsx` — Plan 04

## Commits

| Hash | Title |
|------|-------|
| `25d5f12` | `feat(13-03): install @floating-ui/react + ChangeHighlight wrapper` |
| `8af59e1` | `feat(13-03): ChangePopover with @floating-ui/react + keyboard nav` |
| `becd253` | `feat(13-03): GapPromptChips click-to-expand input + lint fixes` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 – Blocking] Frontend `node_modules` missing in worktree**

- **Found during:** Task 1 `npm install`.
- **Issue:** Same blocker as Plan 01 — fresh worktrees have no `frontend/node_modules`, so vitest/tsc/eslint cannot run.
- **Fix:** Initially symlinked from the main repo; `npm install @floating-ui/react` then replaced the symlink with a real `node_modules` directory (npm refused to install into a symlink target). The full install picked up the rest of the dependency tree from `package-lock.json`. Result: clean install, no peer-dep errors.
- **Files modified:** none beyond `package.json` / `package-lock.json` (which the plan asked us to modify anyway). The new `node_modules/` is gitignored.
- **Logged for orchestrator:** `.planning/phases/13-.../deferred-items.md` already covers this from Plan 01.

**2. [Rule 1 – Bug] Naive `onKeyDown` on the popover root was clobbered by floating-ui's `getFloatingProps`**

- **Found during:** Task 2 first vitest run (3 keyboard tests failing on ArrowRight/Left/Enter; Escape passing).
- **Issue:** `<div onKeyDown={local} {...getFloatingProps()}>` lets `getFloatingProps()` overwrite `onKeyDown` because spread props win in JSX prop order. Local handlers were never called.
- **Fix:** Pulled `getFloatingProps()` into a const, composed an `onKeyDown` that calls our local handler first, then delegates to floating-ui's chain if `e.defaultPrevented` is false. Spread `floatingProps` first, then assign the composed handler last so it wins.
- **Files modified:** `frontend/src/features/direct-edit/components/ChangePopover.tsx`.
- **Outcome:** All 9 ChangePopover tests pass.

**3. [Rule 1 – Bug] Escape was firing `onClose` twice (once from local handler, once from `useDismiss`)**

- **Found during:** Task 2 second vitest run (Escape test asserted called 1 time, was called 2 times).
- **Fix:** Removed the local Escape branch from the `onKeyDown` switch — `useDismiss(context, { escapeKey: true })` already routes Escape through `onOpenChange(false)`, which my `useFloating` config maps to `onClose()`. Single source of truth.
- **Files modified:** `frontend/src/features/direct-edit/components/ChangePopover.tsx`.

**4. [Rule 1 – Bug] GapPromptChips "clear-and-blur removes clarification" test failed because the textarea stayed visible after blur**

- **Found during:** Task 3 first vitest run.
- **Issue:** The new behavior test re-clicks the same chip after blur to re-open it for clearing, but my initial implementation kept `expandedIndex` set after blur. Re-clicking the same chip then toggled `expandedIndex` to `null`, hiding the textarea before the test could clear it.
- **Fix:** Set `expandedIndex = null` inside `onBlur` after emitting clarifications. Re-clicking the same chip cleanly re-opens it.
- **Files modified:** `frontend/src/features/direct-edit/components/GapPromptChips.tsx`.

**5. [Rule 3 – Blocking] React 19 lint rules (`react-hooks/refs`, `react-hooks/set-state-in-effect`) blocked the GapPromptChips reset-on-missing-change pattern**

- **Found during:** Task 3 final eslint pass (`--max-warnings 0`).
- **Issue:** Two patterns the plan suggested for resetting state when `missing` reference changes both trip new React 19 lint rules:
  - `useEffect(() => { setValues(missing.map(...)); }, [missing])` → `react-hooks/set-state-in-effect` ("avoid calling setState() directly within an effect").
  - `if (prevMissingRef.current !== missing) { prevMissingRef.current = missing; setValues(...); }` → `react-hooks/refs` ("Cannot access refs during render").
- **Fix:** Removed the auto-reset entirely and documented the contract — parent (TuneRail in Plan 04) is expected to pass `key={someStableKey}` to force remount when the chip set changes. This is the React-recommended pattern for "reset all internal state on prop change" anyway.
- **Files modified:** `frontend/src/features/direct-edit/components/GapPromptChips.tsx`.
- **Hand-off note for Plan 04:** when wiring `<GapPromptChips missing={...} onClarificationsChange={...} />` into TuneRail, pass `key={missing.join('|') || 'empty'}` (or any stable hash) so a fresh match-analysis triggers a remount and clears local chip state.

**6. [Rule 1 – False positive] `react-hooks/refs` flagged `<div ref={refs.setFloating}>` as a render-time ref read**

- **Found during:** Task 3 final eslint pass.
- **Issue:** The lint plugin treats any `refs.x` access as a `.current` read. floating-ui's `refs.setFloating` is a stable callback ref — passing it as `ref={...}` is the canonical, supported pattern for this library.
- **Fix:** Surgical `// eslint-disable-next-line react-hooks/refs` directly on the `ref={...}` line, with a code comment explaining why the rule misfires.
- **Files modified:** `frontend/src/features/direct-edit/components/ChangePopover.tsx`.

### Plan-Action Discrepancies (intentional)

**1. Anchor prop named `anchorRect: DOMRect | null`, NOT `anchorRange: Range | null`**

- The plan's `<interfaces>` block specified `anchorRange: Range | null`, but the Plan 01 Wave 0 `ChangePopover.test.tsx` scaffold passes `anchorRect: null` in its `defaultProps()`. Per the Plan 01 SUMMARY, "Wave 0 scaffolds … planners commit to the contract upfront" — the scaffold is the locked contract.
- Internal implementation uses floating-ui's `setPositionReference({ getBoundingClientRect: () => anchorRect ?? FALLBACK })` — `getBoundingClientRect` is the only API needed, and a `DOMRect` provides it directly (no `.getBoundingClientRect()` call needed). The behavior the plan asked for ("anchor next to the active highlight") is identical.
- Plan 04 will need to pass `anchorRect` (a `DOMRect`) instead of `anchorRange` (a `Range`). The hook in Plan 02 (`useChangeHighlights.getRangeForChange`) returns a `Range` — Plan 04 must call `.getBoundingClientRect()` on it once before passing to ChangePopover.

**2. `severity.ts` stub created here, full implementation comes from Plan 02 in parallel**

- Plan 02 (which actually owns `severity.ts` per its frontmatter) is running in parallel as `worktree-agent-a600502275090b534`. Our worktree could not import from a non-existent module, so we created a minimal type-only stub (`export type Severity = 'strong' | 'minor' | 'add' | 'delete';`).
- Plan 02 will create the same file with the type alias plus the `inferSeverity` function. The orchestrator's wave-2 merge will see both worktrees creating the same file with overlapping content — Plan 02's longer file should win (it is a superset; the type alias is byte-identical). This is a known parallel-execution artifact and was anticipated by the planner ("Plan 03 will mock these in unit tests").

## Open Plan 04 Contract Hand-offs

| Surface | Shape Plan 04 must implement |
|---------|-------------------------------|
| `ChangePopover` props | `{ activeChange, severity, anchorRect, onAccept, onSkip, onAdvance, onClose }` — note `anchorRect: DOMRect \| null`, NOT `Range`. |
| `ChangeHighlight` props | `{ changeId, severity, isActive, children, onClick? }` — pure presentational, no state. |
| `GapPromptChips` props | `{ missing: string[], onClarificationsChange: (clarifications: string[]) => void }`. **Pass `key={...}` from parent for reset-on-missing-change.** |
| Severity computation | Comes from Plan 02 (`inferSeverity(change: TailorChange) => Severity` in `features/direct-edit/utils/severity.ts`). |
| Range → Rect conversion | Plan 02's `useChangeHighlights.getRangeForChange(id)` returns a `Range`. Plan 04 should call `.getBoundingClientRect()` before forwarding to `<ChangePopover anchorRect={...} />`. |

## Floating-ui Version Notes

- Resolved: `@floating-ui/react@0.27.19` (exactly the floor specified in the plan).
- No version drift to 0.27.20 / 0.28.x (npm picked the floor as the latest matching `^0.27.19`).
- All required exports present (`useFloating`, `autoUpdate`, `flip`, `shift`, `offset`, `FloatingFocusManager`, `FloatingPortal`, `useDismiss`, `useInteractions`, `useRole` — verified via `node -e "Object.keys(require('@floating-ui/react'))"`).

## Threat Model — Mitigation Status

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-13-03-01 (XSS via AI alternative values) | **Mitigated** | All AI text rendered as JSX. `grep -n "innerHTML\|dangerouslySetInnerHTML" ChangePopover.tsx ChangeHighlight.tsx GapPromptChips.tsx` → 0 matches. |
| T-13-03-02 (clarifications payload tampering) | **Mitigated** | `maxLength={500}` on the textarea + `trim().filter(Boolean)` on emit. Backend Pydantic cap from Plan 01 is the second layer. |
| T-13-03-03 (autoUpdate DoS) | Accepted (per plan) | floating-ui debounces autoUpdate via rAF internally. |
| T-13-03-04 (focus trap modal=false) | Accepted (per plan) | `<FloatingFocusManager modal={false}>` is intentional — assistive tech can still reach the rest of the page. |
| T-13-03-05 (supply-chain) | **Mitigated** | `npm ls @floating-ui/react` shows a single resolved version (0.27.19), no UNMET PEER DEPENDENCY. Caret-minor pin. |

## Self-Check: PASSED

- ✅ All 8 created files exist (`ChangePopover.tsx`, `ChangePopover.module.css`, `ChangeHighlight.tsx`, `ChangeHighlight.module.css`, `GapPromptChips.tsx`, `GapPromptChips.module.css`, `severity.ts`, `ChangeHighlight.test.tsx`).
- ✅ All 3 modified files exist (`package.json`, `package-lock.json`, `GapPromptChips.test.tsx`).
- ✅ All 3 commits exist on `worktree-agent-afada11a905c7cfbf`: `25d5f12`, `8af59e1`, `becd253`.
- ✅ `npx vitest run src/__tests__/ChangeHighlight.test.tsx src/__tests__/ChangePopover.test.tsx src/__tests__/GapPromptChips.test.tsx` → 22 passed.
- ✅ `npx tsc --noEmit` → 0 errors, 0 warnings.
- ✅ `npx eslint <three components> --max-warnings 0` → 0 errors, 0 warnings.
- ✅ `npm ls @floating-ui/react` → single 0.27.19 resolved, no peer-dep errors.
- ✅ `! grep -n "innerHTML\|dangerouslySetInnerHTML"` over all three components → 0 matches (T-13-03-01 mitigation).
- ✅ No CLAUDE.md violations: type-only imports use `import type`; relative paths only; new components co-locate with their `.module.css`; AppProvider/MemoryRouter wrap not needed (pure presentational, no context consumers).
