---
phase: 04-drag-and-drop
plan: 01
subsystem: ui
tags: [drag-and-drop, native-html-dnd, react-hooks, contenteditable, svg]

# Dependency graph
requires:
  - phase: 03-content-management
    provides: SectionWrapper, EntryWrapper, useDirectEditor with add/remove/toggle
provides:
  - GripIcon SVG component (16x16 6-dot grip)
  - DropLine component (2px accent horizontal indicator)
  - useSectionDrag hook (section-level native DnD)
  - useEntryDrag hook (entry-level native DnD)
  - reorderSections(from, to) on useDirectEditor
  - reorderEntries(sectionKey, from, to) on useDirectEditor
affects: [04-02-integration, direct-edit-templates]

# Tech tracking
tech-stack:
  added: []
  patterns: [contentEditable-safe DnD with dynamic draggable toggling, ghost suppression via transparent canvas, splice-based array reorder]

key-files:
  created:
    - frontend/src/features/direct-edit/components/GripIcon.tsx
    - frontend/src/features/direct-edit/components/DropLine.tsx
    - frontend/src/features/direct-edit/components/DropLine.module.css
    - frontend/src/features/direct-edit/hooks/useSectionDrag.ts
    - frontend/src/features/direct-edit/hooks/useEntryDrag.ts
  modified:
    - frontend/src/features/direct-edit/hooks/useDirectEditor.ts
    - frontend/src/__tests__/useDirectEditor.test.ts

key-decisions:
  - "reorder<T> helper duplicated locally in useDirectEditor (not shared with useFormBuilder) to maintain clean module separation between direct-edit and form-builder features"
  - "dragFromIndex tracked as state (not ref) so consumers can apply .dragging CSS class via re-render"

patterns-established:
  - "Ghost suppression: lazy-initialized 1x1 canvas ref shared across drag operations"
  - "Entry isolation: e.stopPropagation() on all DnD handlers prevents entry drag bubbling to section handlers"
  - "contentEditable-safe DnD: no draggable attribute in JSX, onGripMouseDown sets draggable=true dynamically, onDragEnd resets"

requirements-completed: [DND-03, DND-04]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 4 Plan 1: DnD Infrastructure Summary

**GripIcon, DropLine, useSectionDrag/useEntryDrag hooks, and reorderSections/reorderEntries on useDirectEditor with 11 new test cases**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T14:01:00Z
- **Completed:** 2026-04-05T14:05:04Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- GripIcon renders a 16x16 6-dot SVG with currentColor fill, standalone from form-builder
- DropLine renders a 2px accent horizontal line with aria-hidden="true" for visual-only drop feedback
- useSectionDrag and useEntryDrag implement native HTML DnD with ghost suppression and contentEditable-safe dynamic draggable toggling
- useDirectEditor extended with reorderSections and reorderEntries covering all section types (work, education, skills, projects, awards, additional)
- 11 new test cases covering all reorder operations, all 42 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: GripIcon + DropLine + reorder functions (TDD)**
   - `f0c555d` (test: failing tests for reorderSections and reorderEntries)
   - `3ea1cf9` (feat: GripIcon, DropLine, reorder functions implementation)
2. **Task 2: useSectionDrag + useEntryDrag hooks** - `d8bd71f` (feat)

## Files Created/Modified
- `frontend/src/features/direct-edit/components/GripIcon.tsx` - 16x16 6-dot SVG grip icon, standalone
- `frontend/src/features/direct-edit/components/DropLine.tsx` - 2px accent drop line with aria-hidden
- `frontend/src/features/direct-edit/components/DropLine.module.css` - Drop line styling (2px, var(--accent), 1px radius)
- `frontend/src/features/direct-edit/hooks/useSectionDrag.ts` - Section-level DnD hook with [data-drag-section] scoping
- `frontend/src/features/direct-edit/hooks/useEntryDrag.ts` - Entry-level DnD hook with [data-drag-entry] scoping
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` - Added reorder<T> helper, reorderSections, reorderEntries
- `frontend/src/__tests__/useDirectEditor.test.ts` - 11 new reorder test cases (42 total)

## Decisions Made
- reorder<T> helper duplicated locally in useDirectEditor rather than shared with useFormBuilder -- maintains clean feature separation
- dragFromIndex tracked as state (not just ref) so consumers can conditionally apply .dragging CSS class

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All DnD primitives ready for Plan 02 integration into SectionWrapper, EntryWrapper, and MedLengthTemplate
- GripIcon, DropLine are standalone components ready to import
- useSectionDrag and useEntryDrag hooks accept onReorder callback and return all event handlers + state
- reorderSections and reorderEntries on useDirectEditor handle all section types

## Self-Check: PASSED

All 5 created files verified on disk. All 3 commit hashes verified in git log.

---
*Phase: 04-drag-and-drop*
*Completed: 2026-04-05*
