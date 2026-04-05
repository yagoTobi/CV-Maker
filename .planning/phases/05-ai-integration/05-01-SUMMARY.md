---
phase: 05-ai-integration
plan: 01
subsystem: ui
tags: [react, contenteditable, toolbar, toast, readonly, css-modules]

# Dependency graph
requires:
  - phase: 04-drag-and-drop
    provides: MedLengthTemplate with SectionWrapper, EntryWrapper, EditableField, EditableBulletList, DnD hooks
provides:
  - EditorToolbar component (Import CV, Download PDF, inline SaveIndicator)
  - ImportToast component (auto-dismiss, confidence display, error state)
  - readOnly mode for MedLengthTemplate and all sub-components
affects: [05-03-DirectEditPage-integration, 05-04-ApplyToJobScreen-rewrite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "readOnly prop threading pattern: MedLengthTemplate -> SectionWrapper/EntryWrapper/EditableField/EditableBulletList"
    - "SaveIndicator inline mode via optional prop and CSS class override"
    - "Conditional EntryDragContainer skip when readOnly (no hook instantiation)"

key-files:
  created:
    - frontend/src/features/direct-edit/components/EditorToolbar.tsx
    - frontend/src/features/direct-edit/components/EditorToolbar.module.css
    - frontend/src/features/direct-edit/components/ImportToast.tsx
    - frontend/src/features/direct-edit/components/ImportToast.module.css
  modified:
    - frontend/src/features/direct-edit/components/SaveIndicator.tsx
    - frontend/src/features/direct-edit/components/SaveIndicator.module.css
    - frontend/src/features/direct-edit/components/MedLengthTemplate.tsx
    - frontend/src/features/direct-edit/components/EditableField.tsx
    - frontend/src/features/direct-edit/components/EditableBulletList.tsx
    - frontend/src/features/direct-edit/components/SectionWrapper.tsx
    - frontend/src/features/direct-edit/components/EntryWrapper.tsx

key-decisions:
  - "SaveIndicator inline mode via optional boolean prop + CSS class (minimal change to existing component)"
  - "readOnly conditional rendering placed after hooks to comply with React rules of hooks"
  - "readOnly EntryDragContainer skip avoids unnecessary hook instantiation for DnD state"
  - "EditableField readOnly renders same Tag with same CSS classes but without contentEditable attribute"

patterns-established:
  - "readOnly prop pattern: parent passes readOnly boolean, child components suppress interactive UI without changing visual layout"
  - "EntryDragContainer skip pattern: readOnly ? renderEntries() : <EntryDragContainer>{entryDrag => renderEntries(entryDrag)}</EntryDragContainer>"

requirements-completed: [AI-01, AI-05]

# Metrics
duration: 10min
completed: 2026-04-05
---

# Phase 05 Plan 01: UI Primitives Summary

**EditorToolbar with Import/Download buttons, ImportToast with auto-dismiss and confidence display, and readOnly mode for MedLengthTemplate suppressing all editing UI**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-05T19:14:31Z
- **Completed:** 2026-04-05T19:25:10Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- EditorToolbar component with sticky 48px toolbar, ghost-style Import/Download buttons, loading states, and inline SaveIndicator
- ImportToast component with success/error states, entry count display, confidence level suffix, 8-second auto-dismiss, and slide-down/fade-out animations
- readOnly prop threaded through entire MedLengthTemplate component tree (EditableField, EditableBulletList, SectionWrapper, EntryWrapper), suppressing all contentEditable, add/delete/toggle/drag UI

## Task Commits

Each task was committed atomically:

1. **Task 1: EditorToolbar component with SaveIndicator integration** - `72746a7` (feat)
2. **Task 2: ImportToast component** - `18e8835` (feat)
3. **Task 3: MedLengthTemplate readOnly prop** - `bc4751c` (feat)

## Files Created/Modified
- `frontend/src/features/direct-edit/components/EditorToolbar.tsx` - Toolbar with Import CV, Download PDF, inline SaveIndicator
- `frontend/src/features/direct-edit/components/EditorToolbar.module.css` - 48px sticky toolbar, ghost button styles, spinner animation
- `frontend/src/features/direct-edit/components/ImportToast.tsx` - Dismissible toast with entry counts, confidence, auto-dismiss
- `frontend/src/features/direct-edit/components/ImportToast.module.css` - Fixed positioning, slideDown animation, fade-out dismiss
- `frontend/src/features/direct-edit/components/SaveIndicator.tsx` - Added inline prop for position: static mode
- `frontend/src/features/direct-edit/components/SaveIndicator.module.css` - Added .inline class
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` - Added readOnly prop, threaded to all sub-components
- `frontend/src/features/direct-edit/components/EditableField.tsx` - Added readOnly prop, renders plain element when true
- `frontend/src/features/direct-edit/components/EditableBulletList.tsx` - Added readOnly prop, renders plain list items when true
- `frontend/src/features/direct-edit/components/SectionWrapper.tsx` - Added readOnly prop, hides add/toggle/grip when true
- `frontend/src/features/direct-edit/components/EntryWrapper.tsx` - Added readOnly prop, hides delete/grip when true

## Decisions Made
- SaveIndicator inline mode via optional boolean prop + CSS class (minimal change, backward compatible)
- readOnly conditional rendering placed after hooks in EditableBulletList to comply with React rules of hooks
- readOnly EntryDragContainer skip avoids unnecessary useEntryDrag hook instantiation
- EditableField readOnly renders same Tag element with same CSS classes but without contentEditable, preserving visual layout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EditorToolbar, ImportToast, and readOnly MedLengthTemplate are ready for Plan 03 (DirectEditPage integration) and Plan 04 (ApplyToJobScreen rewrite)
- All components are pure UI primitives with no backend dependencies
- Pre-existing test failures (4 tests in 3 files) are unrelated to this plan's changes (import link label derivation, resize handle)

## Self-Check: PASSED

All files verified present. All 3 task commits verified in git history.

---
*Phase: 05-ai-integration*
*Completed: 2026-04-05*
