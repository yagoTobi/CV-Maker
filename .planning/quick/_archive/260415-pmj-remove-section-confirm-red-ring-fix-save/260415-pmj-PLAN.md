---
type: quick
tasks: 3
files_modified:
  - frontend/src/features/direct-edit/components/SectionWrapper.tsx
  - frontend/src/features/direct-edit/components/SectionWrapper.module.css
  - frontend/src/features/direct-edit/hooks/useAutoSave.ts
  - frontend/src/contexts/EditorActionsContext.tsx
  - frontend/src/features/direct-edit/DirectEditPage.tsx
  - frontend/src/components/NavBar.tsx
autonomous: true
---

<objective>
Three targeted UX fixes for the direct-edit experience:
1. Remove the red outline ring that appears around a section during delete confirmation
2. Make the "Saved" indicator auto-fade after 2 seconds instead of persisting forever
3. Add a "Tune for Job" button in the NavBar editor actions that navigates to /dashboard

Purpose: Polish the editing experience -- remove a visual annoyance, fix a stale UI element, and add the missing navigation path from editor to job-tuning flow.
Output: Modified SectionWrapper (ring removal), useAutoSave (auto-fade), EditorActionsContext + DirectEditPage + NavBar (tune button).
</objective>

<context>
@frontend/src/features/direct-edit/components/SectionWrapper.tsx
@frontend/src/features/direct-edit/components/SectionWrapper.module.css
@frontend/src/features/direct-edit/hooks/useAutoSave.ts
@frontend/src/features/direct-edit/components/SaveIndicator.tsx
@frontend/src/contexts/EditorActionsContext.tsx
@frontend/src/features/direct-edit/DirectEditPage.tsx
@frontend/src/components/NavBar.tsx
@frontend/src/components/NavBar.module.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove red ring from section delete confirm + auto-fade SaveIndicator</name>
  <files>
    frontend/src/features/direct-edit/components/SectionWrapper.tsx
    frontend/src/features/direct-edit/components/SectionWrapper.module.css
    frontend/src/features/direct-edit/hooks/useAutoSave.ts
  </files>
  <action>
**SectionWrapper.tsx (line 114):**
Remove the `isConfirming` conditional class from the className template literal. Change:
```
className={`${styles.sectionWrap}${isDragSource ? ` ${styles.dragging}` : ''}${isConfirming ? ` ${styles.sectionConfirming}` : ''}`}
```
to:
```
className={`${styles.sectionWrap}${isDragSource ? ` ${styles.dragging}` : ''}`}
```
The `isConfirming` state variable itself stays (it controls the ConfirmDialog render). Only remove the CSS class application.

**SectionWrapper.module.css (lines 147-153):**
Delete the entire `.sectionConfirming` rule block (the comment and the 4 properties). Keep the `.sectionDialog` rule that follows it.

**useAutoSave.ts:**
Add a fadeTimerRef alongside the existing timerRef. After `setStatus('saved')` on line 65, add a setTimeout that resets status to 'idle' after 2000ms, but only if mountedRef is still true. Store it in fadeTimerRef so it can be cleaned up.

Specifically:
1. Add `const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();` after the timerRef declaration (line 24).
2. After `setStatus('saved')` (line 65), add:
   ```typescript
   if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
   fadeTimerRef.current = setTimeout(() => {
     if (mountedRef.current) setStatus('idle');
   }, 2000);
   ```
3. In the unmount cleanup (lines 30-33), add `if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);` inside the return function.
  </action>
  <verify>
    <automated>cd /Users/yagotobi/Documents/Code/GitHub/Projects/CV-Maker/frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
    - Red outline ring no longer appears when section delete confirm is active
    - .sectionConfirming CSS rule is gone from SectionWrapper.module.css
    - "Saved" text disappears after ~2 seconds, returning SaveIndicator to idle (renders null)
  </done>
</task>

<task type="auto">
  <name>Task 2: Add onTuneForJob to EditorActionsContext and wire in DirectEditPage</name>
  <files>
    frontend/src/contexts/EditorActionsContext.tsx
    frontend/src/features/direct-edit/DirectEditPage.tsx
  </files>
  <action>
**EditorActionsContext.tsx:**
Add `onTuneForJob: () => void;` to the `EditorActions` interface (after `isDownloading: boolean;` on line 16).

**DirectEditPage.tsx:**
1. Add `useNavigate` import: change line 17 to also import from react-router-dom:
   ```typescript
   import { useNavigate } from 'react-router-dom';
   ```
2. Inside DirectEditPage component, after the `const setEditorActions = useSetEditorActions();` line (56), add:
   ```typescript
   const navigate = useNavigate();
   ```
3. After the `handleDownload` useCallback (ends at line 148), add:
   ```typescript
   const handleTuneForJob = useCallback(() => {
     navigate('/dashboard');
   }, [navigate]);
   ```
   Simple navigation is sufficient -- auto-save with 2.5s debounce will have already persisted the latest changes in nearly all cases. No need to force-save.
4. In the setEditorActions call (line 152-156), add `onTuneForJob: handleTuneForJob` to the object:
   ```typescript
   setEditorActions({
     onDownload: handleDownload,
     onTuneForJob: handleTuneForJob,
     saveStatus,
     isDownloading,
   });
   ```
5. Add `handleTuneForJob` to the useEffect dependency array on line 158.
  </action>
  <verify>
    <automated>cd /Users/yagotobi/Documents/Code/GitHub/Projects/CV-Maker/frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
    - EditorActions interface includes onTuneForJob callback
    - DirectEditPage provides handleTuneForJob that navigates to /dashboard
    - TypeScript compiles cleanly with no errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Render "Tune for Job" ghost button in NavBar editor mode</name>
  <files>
    frontend/src/components/NavBar.tsx
  </files>
  <action>
In the NavBar editor mode JSX block (lines 44-62, the `isEditorPage ? (...)` branch), add a ghost button for "Tune for Job" between the Download PDF button and the SaveIndicator.

Insert after the closing `</button>` of the Download PDF button (after line 60) and before the `<SaveIndicator .../>` line (line 61):

```tsx
<button
  className={styles.ghostBtn}
  onClick={editorActions.onTuneForJob}
  type="button"
>
  Tune for Job
</button>
```

The `.ghostBtn` class already exists in NavBar.module.css with the right secondary/ghost styling (transparent background, border, hover accent color). No CSS changes needed.

Final order in the rightGroup for editor mode: Download PDF (accent) | Tune for Job (ghost) | SaveIndicator (inline text).
  </action>
  <verify>
    <automated>cd /Users/yagotobi/Documents/Code/GitHub/Projects/CV-Maker/frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
    - "Tune for Job" ghost button visible in NavBar when on editor page
    - Button navigates to /dashboard on click
    - Visual hierarchy: Download PDF (primary accent) > Tune for Job (secondary ghost) > SaveIndicator
  </done>
</task>

</tasks>

<verification>
1. `cd frontend && npx tsc --noEmit` -- zero type errors
2. Open editor page in browser: no red ring appears when clicking section trash icon
3. Make an edit, observe "Saving..." then "Saved" appears and fades away within ~2 seconds
4. "Tune for Job" button visible in NavBar, clicking it navigates to /dashboard
</verification>
