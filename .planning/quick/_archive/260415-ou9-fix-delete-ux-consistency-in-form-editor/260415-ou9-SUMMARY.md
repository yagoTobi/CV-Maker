---
status: complete
quick_id: 260415-ou9
slug: fix-delete-ux-consistency-in-form-editor
date: 2026-04-15
commits:
  - 9c33e0c
  - f5fe1b0
---

# Quick Task 260415-ou9: Fix Delete UX Consistency + Download PDF Fix

## What Was Done

### Task 1: Unify section delete to use ConfirmDialog popover
- `SectionWrapper.tsx` — replaced inline confirm (`removeConfirm` div) with shared `ConfirmDialog` component; now both section and entry deletion use the same confirm UX
- `SectionWrapper.module.css` — removed 6 dead CSS classes for the inline confirm UI

### Task 2: Remove dead import code from DirectEditPage
- `DirectEditPage.tsx` — removed all dead import-related code left over from quick task 260415-ofh: `useImport` hook call, `ImportToast` component, hidden file input element, `handleImportClick` callback, `handleFileChange` callback, `fileInputRef`, and related `showImportToast` state and effects
- This fixed ESLint `noUnusedLocals` errors that were breaking HMR and could break the build, restoring Download PDF functionality

## Result

- Section delete and entry delete both use the same `ConfirmDialog` popover — consistent UX
- Download PDF button works correctly — dead import code no longer causes ESLint/HMR errors
- TypeScript compiles clean (`npx tsc --noEmit` passes)
