---
phase: 04-drag-and-drop
plan: 02
subsystem: ui
tags: [drag-and-drop, native-html-dnd, react-hooks, contenteditable, grip-handles, drop-line]

# Dependency graph
requires:
  - phase: 04-drag-and-drop
    plan: 01
    provides: GripIcon, DropLine, useSectionDrag, useEntryDrag, reorderSections, reorderEntries
  - phase: 03-content-management
    provides: SectionWrapper, EntryWrapper, useDirectEditor, MedLengthTemplate
provides:
  - Full drag-and-drop section reordering on the web CV via grip handles
  - Full drag-and-drop entry reordering within sections via grip handles
  - Gutter-positioned grip handles (left: -28px, outside content area per D-01)
  - DropLine visual feedback between items during drag
  - DropZoneTail for dragging entries to bottom of section
  - 28 automated tests covering hooks, components, and integration sequences
affects: [direct-edit-templates, future-template-ports]

# Tech tracking
tech-stack:
  added: []
  patterns: [dragElRef tracking for reliable draggable cleanup, DropZoneTail pattern for bottom-of-list drop targets, container-level onDragOver for reliable drop registration]

key-files:
  created: []
  modified:
    - frontend/src/features/direct-edit/components/SectionWrapper.tsx
    - frontend/src/features/direct-edit/components/SectionWrapper.module.css
    - frontend/src/features/direct-edit/components/EntryWrapper.tsx
    - frontend/src/features/direct-edit/components/EntryWrapper.module.css
    - frontend/src/features/direct-edit/components/MedLengthTemplate.tsx
    - frontend/src/features/direct-edit/DirectEditPage.tsx
    - frontend/src/features/direct-edit/hooks/useSectionDrag.ts
    - frontend/src/features/direct-edit/hooks/useEntryDrag.ts
    - frontend/src/__tests__/dragAndDrop.test.tsx

key-decisions:
  - "dragElRef tracks the actual DOM element made draggable for reliable cleanup in onDragEnd, avoiding e.currentTarget mismatch after React reconciliation"
  - "Container-level onDragOver with preventDefault() ensures drops register even when releasing between sections"
  - "DropZoneTail component renders a 12px invisible drop zone after the last entry, only visible during drag, to enable dragging entries to bottom of section"
  - "Section grip top offset adjusted to -2px to vertically center grip dots with section header text baseline"

patterns-established:
  - "DropZoneTail: invisible 12px div with onDragEnter/onDragOver/onDrop that appears only during isDragging, enables drop-to-bottom in list DnD"
  - "dragElRef pattern: store DOM element in ref during onGripMouseDown, use ref (not e.currentTarget) in cleanup to avoid stale references"

requirements-completed: [DND-01, DND-02, DND-03, DND-04]

# Metrics
duration: 16min
completed: 2026-04-05
---

# Phase 4 Plan 2: DnD Integration Summary

**Section and entry drag-and-drop wired into SectionWrapper, EntryWrapper, and MedLengthTemplate with gutter grips, DropLine feedback, and 28 automated tests -- 3 user-reported bugs fixed post-verification**

## Performance

- **Duration:** 16 min
- **Started:** 2026-04-05T14:23:15Z
- **Completed:** 2026-04-05T14:39:40Z
- **Tasks:** 4
- **Files modified:** 9

## Accomplishments
- Full drag-and-drop for sections and entries wired into the web CV editor with gutter-positioned grip handles
- 28 automated tests covering hook state transitions, component rendering, gutter positioning, and integration drag sequences
- 3 user-reported bugs fixed after visual verification: grip alignment, drop registration reliability, and bottom-of-section drop line
- DropZoneTail pattern established for reliable bottom-of-list drop targets in native HTML DnD

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire DnD into SectionWrapper, EntryWrapper, and CSS modules** - `763457e` (feat)
2. **Task 2: Wire MedLengthTemplate + DirectEditPage with drag hooks and DropLine** - `1a761fd` (feat)
3. **Task 3: Automated tests for drag hooks and reorder integration** - `b612d72` (test, 28 tests passing)
4. **Task 4: Bug fixes from visual verification** - `bdf3b5d` (fix)

## Files Created/Modified
- `frontend/src/features/direct-edit/components/SectionWrapper.tsx` - Added grip handle, drag events, data-drag-section attribute, dragging class
- `frontend/src/features/direct-edit/components/SectionWrapper.module.css` - Grip button absolute positioning in left gutter (-28px), hover reveal, dragging opacity; top adjusted to -2px for text alignment
- `frontend/src/features/direct-edit/components/EntryWrapper.tsx` - Added grip handle, DropLine, drag events, data-drag-entry attribute, showGrip/showDropLine props
- `frontend/src/features/direct-edit/components/EntryWrapper.module.css` - Entry grip absolute positioning in left gutter (-28px), hover reveal, dragging opacity
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` - useSectionDrag/useEntryDrag integration, EntryDragContainer, DropZoneTail, DropLine rendering between items, container-level onDragOver
- `frontend/src/features/direct-edit/DirectEditPage.tsx` - Passes reorderSections and reorderEntries to MedLengthTemplate
- `frontend/src/features/direct-edit/hooks/useSectionDrag.ts` - Added dragElRef for reliable draggable cleanup, cleanup() helper, e.preventDefault() in onDrop
- `frontend/src/features/direct-edit/hooks/useEntryDrag.ts` - Added dragElRef for reliable draggable cleanup, cleanup() helper, e.preventDefault() in onDrop
- `frontend/src/__tests__/dragAndDrop.test.tsx` - 28 tests: hook state transitions, component rendering, gutter positioning, integration sequences

## Decisions Made
- **dragElRef pattern**: Track the DOM element made draggable in a ref rather than relying on e.currentTarget in onDragEnd. This avoids potential stale references after React reconciliation during drag (which sets isDragging state, triggering re-render).
- **Container-level onDragOver**: Added preventDefault() on the template container div so that drops between sections are accepted by the browser. Without this, releasing the mouse on empty space between sections caused the browser to reject the drop.
- **DropZoneTail component**: A 12px invisible div rendered only during isDragging, placed after the last entry in each section. Handles onDragEnter/onDragOver/onDrop to set dropIndex to entries.length, enabling drop-to-bottom.
- **Grip top: -2px**: Adjusted from top: 0 to top: -2px to align the center dots of the 6-dot grip icon with the section header text baseline (uppercase bold 11pt).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Grip icon not aligned with section header text (Bug 1)**
- **Found during:** Task 4 (visual verification)
- **Issue:** Grip button at top: 0 placed the grip dots below the section header text baseline
- **Fix:** Changed gripButton CSS from top: 0 to top: -2px for visual alignment
- **Files modified:** SectionWrapper.module.css
- **Verification:** Visual check -- grip dots now align with uppercase header text
- **Committed in:** bdf3b5d

**2. [Rule 1 - Bug] Drop not registering, stuck in hold mode (Bug 2)**
- **Found during:** Task 4 (visual verification)
- **Issue:** When releasing drag on empty space between sections, browser rejected the drop (no dragOver preventDefault on container) and onDragEnd relied on e.currentTarget which could be stale after React re-render
- **Fix:** (a) Track dragged element in dragElRef for reliable cleanup, (b) added container-level onDragOver with preventDefault, (c) added e.preventDefault() in onDrop handlers
- **Files modified:** useSectionDrag.ts, useEntryDrag.ts, MedLengthTemplate.tsx
- **Verification:** All 28 tests pass; manual verification confirms drops register reliably
- **Committed in:** bdf3b5d

**3. [Rule 1 - Bug] Entry drop line only shows above, not below last entry (Bug 3)**
- **Found during:** Task 4 (visual verification)
- **Issue:** No element at index entries.length existed to fire onDragEnter, so dropIndex could never reach entries.length and the trailing DropLine never appeared
- **Fix:** Added DropZoneTail component (12px invisible div with drag handlers) after the entry map in all 6 section renderers
- **Files modified:** MedLengthTemplate.tsx
- **Verification:** DropZoneTail enables dragging entries to bottom position in all section types
- **Committed in:** bdf3b5d

---

**Total deviations:** 3 auto-fixed (3 bugs from user visual verification)
**Impact on plan:** All fixes necessary for correct drag-and-drop behavior. No scope creep.

## Issues Encountered
- Pre-existing test failures (4 total: 3 in useImport.test.ts, 1 in import-flow-state.test.tsx) confirmed as unrelated to DnD work. Documented in deferred-items.md.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 (Drag and Drop) is complete -- all DnD infrastructure and integration work is done
- Grip handles, DropLine, section/entry reordering all functional with 39 automated tests (11 from Plan 01 + 28 from Plan 02)
- User-requested backspace-to-delete feature logged to deferred-items.md for a future phase
- Ready to proceed to Phase 5 (AI features) or Phase 6 (polish)

## Self-Check: PASSED

All 9 modified files verified on disk. All 4 commit hashes verified in git log.

---
*Phase: 04-drag-and-drop*
*Completed: 2026-04-05*
