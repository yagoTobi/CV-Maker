---
status: complete
quick_id: 260415-pmj
slug: remove-section-confirm-red-ring-fix-save
date: 2026-04-15
commits:
  - 50fccf7
  - 357346b
  - 6532cf2
---

# Quick Task 260415-pmj: Ring removal + SaveIndicator fade + Tune for Job

## What Was Done

### Task 1: Remove red ring + auto-fade SaveIndicator
- `SectionWrapper.tsx` — removed `sectionConfirming` class application (no more red ring on confirm)
- `SectionWrapper.module.css` — deleted `.sectionConfirming` rule block
- `useAutoSave.ts` — added `fadeTimerRef` with 2s timeout to reset status to `'idle'` after `'saved'`; "Saved" text now disappears automatically after 2 seconds

### Task 2: Add onTuneForJob to EditorActionsContext + DirectEditPage
- `EditorActionsContext.tsx` — added `onTuneForJob: () => void` to EditorActions interface
- `DirectEditPage.tsx` — added `useNavigate` import, `handleTuneForJob` callback (navigates to `/dashboard`), wired into `setEditorActions`

### Task 3: Render "Tune for Job" ghost button in NavBar
- `NavBar.tsx` — added ghost-styled "Tune for Job" button in editor mode, positioned between Download PDF and SaveIndicator

## Result

- Section delete confirm: no ring, just right-anchored dialog + no backdrop
- "Saved" indicator auto-fades after 2s (only visible briefly after actual save)
- NavBar editor mode now has: [Tune for Job] [Download PDF] [Saved indicator]
- "Tune for Job" navigates to /dashboard to continue the CV → job application flow
