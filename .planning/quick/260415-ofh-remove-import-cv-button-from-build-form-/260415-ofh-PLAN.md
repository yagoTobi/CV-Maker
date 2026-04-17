---
phase: quick
plan: 260415-ofh
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/NavBar.tsx
  - frontend/src/contexts/EditorActionsContext.tsx
  - frontend/src/features/direct-edit/DirectEditPage.tsx
  - frontend/src/features/direct-edit/components/EditorToolbar.tsx
  - frontend/src/features/direct-edit/components/EditorToolbar.module.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "NavBar on /build/form shows Download PDF and SaveIndicator but NOT Import CV"
    - "EditorActionsContext interface no longer carries import-related fields"
    - "Dead EditorToolbar component files are removed"
  artifacts:
    - path: "frontend/src/components/NavBar.tsx"
      provides: "Editor toolbar without Import CV button"
    - path: "frontend/src/contexts/EditorActionsContext.tsx"
      provides: "EditorActions interface without import fields"
    - path: "frontend/src/features/direct-edit/DirectEditPage.tsx"
      provides: "Editor page without import action registration to NavBar"
  key_links:
    - from: "DirectEditPage.tsx"
      to: "EditorActionsContext"
      via: "setEditorActions with onDownload + saveStatus only"
    - from: "NavBar.tsx"
      to: "EditorActionsContext"
      via: "useEditorActions reading download + save only"
---

<objective>
Remove the "Import CV" button from the /build/form editor page (NavBar toolbar).

Purpose: The Import CV action belongs earlier in the flow (/build/start or /import), not on the form editing surface. Keeping it in the NavBar during editing is a UX dead-end that confuses the Build vs Import distinction.

Output: NavBar editor mode shows only "Download PDF" + SaveIndicator. Import-related props, state, and dead code cleaned up.
</objective>

<execution_context>
@.claude/get-shit-done/workflows/execute-plan.md
@.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/NavBar.tsx
@frontend/src/contexts/EditorActionsContext.tsx
@frontend/src/features/direct-edit/DirectEditPage.tsx
@frontend/src/features/direct-edit/components/EditorToolbar.tsx
@frontend/src/features/direct-edit/components/EditorToolbar.module.css

The "Import CV" button currently appears in the NavBar when on /build/form.
The flow is: NavBar reads `editorActions` from EditorActionsContext, which
DirectEditPage populates via `useSetEditorActions`. The context interface
includes `onImport` and `isImporting` fields that need removal.

Note: EditorToolbar.tsx and EditorToolbar.module.css are dead code (not
imported anywhere) -- they should be deleted as cleanup.

The hidden file input and import logic in DirectEditPage.tsx should be kept
because Import CV still works via the /import route and the useImport hook
is used there. However, the import-related wiring into EditorActionsContext
(handleImportClick, isImporting passed to setEditorActions) should be removed
since the NavBar will no longer trigger imports.

IMPORTANT: Keep the hidden file input + handleFileChange + handleImportClick +
importResult/importError/showImportToast logic in DirectEditPage.tsx. The import
flow still works -- users just won't trigger it from the NavBar anymore. The
import toast still needs to show if import was triggered before arriving at the
form. Only remove the EditorActionsContext wiring for import.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Import CV from EditorActionsContext and NavBar</name>
  <files>
    frontend/src/contexts/EditorActionsContext.tsx
    frontend/src/components/NavBar.tsx
    frontend/src/features/direct-edit/DirectEditPage.tsx
  </files>
  <action>
1. In `frontend/src/contexts/EditorActionsContext.tsx`:
   - Remove `onImport` and `isImporting` from the `EditorActions` interface. Keep `onDownload`, `saveStatus`, and `isDownloading`.

2. In `frontend/src/features/direct-edit/DirectEditPage.tsx`:
   - In the `useEffect` that calls `setEditorActions(...)` (around line 189-198), remove `onImport: handleImportClick` and `isImporting` from the object passed to `setEditorActions`.
   - Remove `handleImportClick` and `isImporting` from the dependency array of that useEffect.
   - Keep ALL other import-related code (hidden file input, handleFileChange, handleImportClick callback, useImport hook, importResult, importError, showImportToast, ImportToast rendering). These are still used for the import flow that arrives from /import.

3. In `frontend/src/components/NavBar.tsx`:
   - Remove the entire Import CV button block (lines 46-59 approximately -- the button that renders "Import CV" / "Extracting CV data..." with `editorActions.onImport`).
   - Update the docstring at the top: Right side (editor pages) should say "Download PDF accent button + SaveIndicator" (remove mention of Import CV ghost button).
  </action>
  <verify>
    <automated>cd /Users/yagotobi/Documents/Code/GitHub/Projects/CV-Maker/frontend && npx tsc --noEmit</automated>
  </verify>
  <done>
    - EditorActions interface has no onImport or isImporting fields
    - NavBar editor mode renders only Download PDF button + SaveIndicator
    - DirectEditPage no longer passes import actions to EditorActionsContext
    - TypeScript compiles cleanly with no errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Delete dead EditorToolbar component</name>
  <files>
    frontend/src/features/direct-edit/components/EditorToolbar.tsx
    frontend/src/features/direct-edit/components/EditorToolbar.module.css
  </files>
  <action>
Delete these two files entirely:
- `frontend/src/features/direct-edit/components/EditorToolbar.tsx`
- `frontend/src/features/direct-edit/components/EditorToolbar.module.css`

These are dead code -- EditorToolbar is not imported anywhere. DirectEditPage's docstring already says "EditorToolbar is removed." The toolbar actions were moved to the NavBar in Phase 06.

After deletion, verify no other file imports EditorToolbar (grep for "EditorToolbar" -- only comments/docstrings should remain, which are fine).
  </action>
  <verify>
    <automated>cd /Users/yagotobi/Documents/Code/GitHub/Projects/CV-Maker/frontend && npx tsc --noEmit && ! test -f src/features/direct-edit/components/EditorToolbar.tsx && ! test -f src/features/direct-edit/components/EditorToolbar.module.css</automated>
  </verify>
  <done>
    - EditorToolbar.tsx and EditorToolbar.module.css no longer exist
    - No import references to EditorToolbar anywhere in the codebase
    - TypeScript still compiles cleanly
  </done>
</task>

</tasks>

<verification>
1. `cd frontend && npx tsc --noEmit` -- zero type errors
2. `cd frontend && npx vitest run` -- all existing tests pass
3. Visual: navigate to /build/form -- NavBar right side shows only "Download PDF" button and save indicator, no "Import CV" button
</verification>

<success_criteria>
- The /build/form page NavBar contains exactly: "Download PDF" button + SaveIndicator (no Import CV button)
- TypeScript compiles without errors
- All existing tests pass
- Import CV flow still works via /import route (not broken by this change)
</success_criteria>

<output>
After completion, create `.planning/quick/260415-ofh-remove-import-cv-button-from-build-form-/260415-ofh-SUMMARY.md`
</output>
