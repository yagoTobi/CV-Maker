---
plan: 08-03
phase: 08-streamlined-tune-flow
status: complete
completed: 2026-04-17
---

## Summary

Built TunePanel component (3 progressive tiers) and integrated into DirectEditPage as right-side inline panel. Human checkpoint approved after visual verification.

## What was built

- `frontend/src/features/direct-edit/components/TunePanel.tsx` — 3-tier progressive tune panel (save-as-base, job details, diff review). Replaces standalone ApplyToJobScreen flow.
- `frontend/src/features/direct-edit/components/TunePanel.module.css` — Fixed sidebar layout (400px), slide animation, responsive bottom sheet at 1199px.
- `frontend/src/features/direct-edit/DirectEditPage.tsx` — Hosts TunePanel, reads `location.state.tune`, sets `isTuning` in EditorActionsContext, switches CV to read-only preview in Tier 3.
- `frontend/src/features/direct-edit/DirectEditPage.module.css` — `.contentAreaWithPanel` padding-right 416px when panel open.

## Deviations

1. **EditableField hooks violation** — `readOnly` early return was placed after `useEffect`/`useCallback` hooks, causing "Rendered fewer hooks than expected" when Tier 3 activated. Fixed by moving the `readOnly` conditional to after all hooks.
2. **ChangePanel position:fixed** — ChangePanel's fixed positioning caused it to escape the tier body and render off-screen. Fixed by adding `className` prop to ChangePanel and passing `styles.changePanelInline` override with `!important` rules.
3. **tierBodyOpen max-height** — 800px was insufficient for ChangePanel content. Bumped to 4000px.

## Key files

- `frontend/src/features/direct-edit/components/TunePanel.tsx`
- `frontend/src/features/direct-edit/components/TunePanel.module.css`
- `frontend/src/features/direct-edit/DirectEditPage.tsx`
- `frontend/src/features/direct-edit/DirectEditPage.module.css`
- `frontend/src/features/direct-edit/components/EditableField.tsx` (hooks fix)
- `frontend/src/features/direct-edit/components/ChangePanel.tsx` (className prop)

## Self-Check: PASSED
