---
status: complete
quick_id: 260415-ofh
slug: remove-import-cv-button-from-build-form-
date: 2026-04-15
commits:
  - 590a363
  - 90256e7
---

# Quick Task 260415-ofh: Remove Import CV Button from /build/form

## What Was Done

Removed the Import CV button from the editor NavBar and deleted the dead EditorToolbar component.

### Task 1: Remove Import CV from NavBar
- `frontend/src/components/NavBar.tsx` — Import CV button removed from editor mode toolbar section
- `frontend/src/contexts/EditorActionsContext.tsx` — `onImport` and `isImporting` fields removed from interface
- `frontend/src/features/direct-edit/DirectEditPage.tsx` — import action wiring to EditorActionsContext removed; import functionality via `/import` route preserved

### Task 2: Delete dead EditorToolbar component
- `frontend/src/features/direct-edit/components/EditorToolbar.tsx` — deleted (dead code since Phase 06)
- `frontend/src/features/direct-edit/components/EditorToolbar.module.css` — deleted (dead code since Phase 06)

## Result

The /build/form editor toolbar now only shows: Save, Download PDF, and Prep for Tuning actions. Import CV is accessible only at the earlier flow entry points (/build/start or /import), consistent with the intended app flow.
