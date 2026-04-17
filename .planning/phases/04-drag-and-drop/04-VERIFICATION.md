---
phase: 04-drag-and-drop
verified: 2026-04-05T15:47:00Z
status: passed
score: 4/4 success criteria verified
re_verification: false
---

# Phase 4: Drag and Drop Verification Report

**Phase Goal:** Users can reorder their CV's sections and entries by dragging directly on the web CV, without conflicting with text editing

**Verified:** 2026-04-05T15:47:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can reorder top-level sections (e.g., move Education above Work Experience) by dragging section headers | ✓ VERIFIED | SectionWrapper renders grip at left: -28px with data-drag-section, useSectionDrag hooks wired, reorderSections updates CVFormData.sectionOrder, 28 integration tests pass |
| 2 | User can reorder entries within a section (e.g., move second job above first job) by dragging individual items | ✓ VERIFIED | EntryWrapper renders grip at left: -28px with data-drag-entry, useEntryDrag hooks wired per-section, reorderEntries updates array positions for all section types, 11 reorder tests + 28 drag tests pass |
| 3 | Drag interactions use dedicated grip handles that are visually distinct from editable content -- clicking on text always initiates editing, never dragging | ✓ VERIFIED | Grip handles positioned in left gutter (left: -28px) outside CV content area per D-01 decision, no draggable attribute in JSX per D-09, onGripMouseDown sets draggable dynamically, tests verify grip is direct child of drag container not inside editable content |
| 4 | After any drag operation, the CVFormData model (sectionOrder and array positions) reflects the new order and persists correctly on save | ✓ VERIFIED | reorderSections mutates sectionOrder via splice, reorderEntries mutates section arrays (work, education, skills, projects, awards, additional) via splice, all mutations trigger CVContext setFormData which auto-saves, 42 useDirectEditor tests pass including 11 reorder tests |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/features/direct-edit/components/GripIcon.tsx` | 6-dot SVG grip icon component | ✓ VERIFIED | 16x16 SVG with 6 circles at cx={9,15} cy={5,12,19} r=1.5, fill="currentColor", standalone (no form-builder imports) |
| `frontend/src/features/direct-edit/components/DropLine.tsx` | Horizontal drop line indicator | ✓ VERIFIED | Renders div with aria-hidden="true", imports DropLine.module.css |
| `frontend/src/features/direct-edit/components/DropLine.module.css` | Drop line styling | ✓ VERIFIED | .dropLine class with height: 2px, background: var(--accent), border-radius: 1px |
| `frontend/src/features/direct-edit/hooks/useSectionDrag.ts` | Section-level drag hook | ✓ VERIFIED | Returns 9 handlers/state values (onGripMouseDown, onDragStart, onDragEnter, onDragOver, onDrop, onDragEnd, dropIndex, isDragging, dragFromIndex), uses [data-drag-section] selector, ghost suppression via canvas, stopPropagation on all handlers |
| `frontend/src/features/direct-edit/hooks/useEntryDrag.ts` | Entry-level drag hook | ✓ VERIFIED | Same structure as useSectionDrag but scoped to [data-drag-entry], stopPropagation for entry isolation per D-06 |
| `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` | Extended state controller with reorder functions | ✓ VERIFIED | Exports reorderSections(from, to) and reorderEntries(sectionKey, from, to), local reorder<T> helper, handles all section types including additional sections |
| `frontend/src/features/direct-edit/components/SectionWrapper.tsx` | Section wrapper with grip handle in left gutter and drag events | ✓ VERIFIED | Grip button at left: -28px (gutter per D-01), top: -2px (text alignment), data-drag-section attribute, drag event handlers, isDragSource → .dragging class |
| `frontend/src/features/direct-edit/components/SectionWrapper.module.css` | Grip button styles with absolute positioning in gutter and dragging opacity | ✓ VERIFIED | .gripButton at left: -28px, opacity: 0 → hover opacity: 1, .sectionWrap:hover > .gripButton selector (grip is direct child), .dragging opacity: 0.4 |
| `frontend/src/features/direct-edit/components/EntryWrapper.tsx` | Entry wrapper with grip handle and drag events | ✓ VERIFIED | Grip button at left: -28px, data-drag-entry attribute, showGrip/showDropLine props, DropLine rendering, drag event handlers |
| `frontend/src/features/direct-edit/components/EntryWrapper.module.css` | Entry grip styles and dragging opacity | ✓ VERIFIED | .entryGrip at left: -28px, opacity: 0 → hover opacity: 1, .entryWrap:hover > .entryGrip, .dragging opacity: 0.4 |
| `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` | Template with reorder callbacks and DropLine rendering | ✓ VERIFIED | useSectionDrag integration, EntryDragContainer per section calling useEntryDrag, DropLine rendering between sections and entries, DropZoneTail for bottom-of-section drops, container-level onDragOver for reliable drop registration |
| `frontend/src/features/direct-edit/DirectEditPage.tsx` | Page passing reorder callbacks to MedLengthTemplate | ✓ VERIFIED | Destructures reorderSections and reorderEntries from useDirectEditor, passes both as props to MedLengthTemplate |
| `frontend/src/__tests__/useDirectEditor.test.ts` | Reorder function tests | ✓ VERIFIED | 11 reorder tests (section + entry for all types), 42 total tests passing |
| `frontend/src/__tests__/dragAndDrop.test.tsx` | Automated tests for drag hooks and reorder integration | ✓ VERIFIED | 28 tests covering useSectionDrag (8), useEntryDrag (3), SectionWrapper (6), EntryWrapper (8), integration sequences (3), all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `useSectionDrag.ts` | data-drag-section attribute | onGripMouseDown sets draggable on nearest [data-drag-section] | ✓ WIRED | Pattern "data-drag-section" found in useSectionDrag.ts, closest() selector verified |
| `useEntryDrag.ts` | data-drag-entry attribute | onGripMouseDown sets draggable on nearest [data-drag-entry] | ✓ WIRED | Pattern "data-drag-entry" found in useEntryDrag.ts, closest() selector verified |
| `useDirectEditor.ts` | CVFormData.sectionOrder | reorderSections splices sectionOrder array | ✓ WIRED | Pattern "reorderSections" found, mutates sectionOrder via splice |
| `SectionWrapper.tsx` | useSectionDrag | grip onMouseDown triggers section drag | ✓ WIRED | onGripMouseDown found at line 88, passed from dragHandlers prop |
| `EntryWrapper.tsx` | useEntryDrag | grip onMouseDown triggers entry drag | ✓ WIRED | onGripMouseDown found at line 103, passed from handlers prop |
| `MedLengthTemplate.tsx` | useDirectEditor reorder functions | onReorderSections and onReorderEntries prop callbacks | ✓ WIRED | Props defined at lines 49-50, useSectionDrag called with onReorderSections (line 115), EntryDragContainer calls with onReorderEntries per section |
| `DirectEditPage.tsx` | MedLengthTemplate | passes reorderSections and reorderEntries as props | ✓ WIRED | Destructuring at line 48, passed to MedLengthTemplate (verified via grep) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| reorderSections | sectionOrder | CVFormData.sectionOrder via CVContext | User editing in CVFormBuilder or direct-edit populates sectionOrder array | ✓ FLOWING |
| reorderEntries | section arrays (workExperience, education, etc.) | CVFormData section arrays via CVContext | User editing populates entries, import flow populates entries | ✓ FLOWING |
| useSectionDrag | dropIndex state | useState in hook, updated by onDragEnter | React state updated by drag events | ✓ FLOWING |
| useEntryDrag | dropIndex state | useState in hook, updated by onDragEnter | React state updated by drag events | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compilation | `cd frontend && npx tsc --noEmit` | No errors | ✓ PASS |
| useDirectEditor tests (including 11 reorder tests) | `npx vitest run src/__tests__/useDirectEditor.test.ts` | 42 tests passed | ✓ PASS |
| Drag and drop integration tests | `npx vitest run src/__tests__/dragAndDrop.test.tsx` | 28 tests passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DND-01 | 04-02-PLAN.md | User can reorder sections by dragging section headers on the web CV | ✓ SATISFIED | SectionWrapper + useSectionDrag + reorderSections + tests passing |
| DND-02 | 04-02-PLAN.md | User can reorder entries within a section by dragging individual items | ✓ SATISFIED | EntryWrapper + useEntryDrag + reorderEntries (all section types) + tests passing |
| DND-03 | 04-01-PLAN.md | Drag-and-drop updates sectionOrder and array positions in CVFormData | ✓ SATISFIED | reorderSections mutates sectionOrder, reorderEntries mutates section arrays, all verified by 11 reorder tests |
| DND-04 | 04-01-PLAN.md, 04-02-PLAN.md | Drag interactions do not conflict with inline text editing (grip handles separate from editable content) | ✓ SATISFIED | Grips positioned in left gutter (left: -28px) outside content per D-01, no draggable in JSX per D-09, tests verify grip is not inside editable fields |

**Coverage:** 4/4 requirements satisfied

### Anti-Patterns Found

No anti-patterns found. All grep checks for TODO/FIXME/placeholder/stub patterns returned only legitimate UI placeholder text in EditableField components.

### Human Verification Required

#### 1. Visual grip handle positioning and hover behavior

**Test:** Navigate to /build/form or DirectEditPage, hover over a section header and observe the grip icon in the left margin. Hover over an entry and observe entry-level grip.

**Expected:** 
- Grip icons appear in the left gutter (outside the CV content area, not inline with text)
- Grips are invisible until hover
- Section grip aligns vertically with section header text (6-dot icon centered on header baseline)
- Entry grip aligns with top of entry content
- Grip changes color to accent on hover with subtle background

**Why human:** Visual alignment, color transitions, and gutter positioning relative to CV content boundary cannot be verified programmatically. Requires actual browser rendering and hover interaction.

#### 2. Drag-and-drop interaction flow

**Test:** 
1. Drag the "Experience" section header down past "Education" — a blue horizontal line should appear between sections during drag
2. Drop — "Education" should now appear above "Experience"
3. Within a section, drag an entry (job, education, skill category) to reorder
4. Observe dragged item has reduced opacity during drag (0.4)
5. Try clicking on editable text (job title, company name) — should enter edit mode, NOT start a drag

**Expected:**
- Blue drop line (2px accent) appears at target position between items during drag
- Dragged item shows 0.4 opacity while dragging
- No browser ghost image during drag (suppressed via transparent canvas)
- Drop updates order and persists (auto-save triggers)
- Clicking text always enters edit mode, never drags — only grip handle initiates drag

**Why human:** Native HTML DnD visual feedback (drop line placement, opacity transition), browser drag ghost suppression, and text editing non-interference require user interaction testing. Automated tests verify state transitions but not pixel-level rendering and cursor behavior.

#### 3. Single-entry section grip hiding

**Test:** Navigate to a CV with a section containing only 1 entry (e.g., single education entry). Hover over the entry.

**Expected:** 
- Entry-level grip should NOT appear (nothing to reorder)
- Section-level grip should still be visible (can reorder relative to other sections)

**Why human:** Conditional rendering based on entries.length checked in code, but visual confirmation needed that UI respects showGrip={entries.length > 1} logic.

#### 4. Grid section drag behavior

**Test:** In the Skills section (2-column grid), drag a skill category to reorder. Similarly test Awards section if present.

**Expected:**
- DropLine spans full grid width (gridColumn: '1 / -1' in code)
- Skill categories reorder within the grid correctly
- Grid layout does not break during or after drag

**Why human:** CSS Grid layout behavior with absolutely-positioned grips and full-width drop lines requires visual verification. Grid reflow after reorder cannot be fully tested in jsdom.

#### 5. Bottom-of-section drop target

**Test:** In any section with multiple entries, drag an entry from the top and move it below the last entry (to the very bottom of the section).

**Expected:**
- A blue drop line should appear below the last entry
- Drop should place the entry at the end of the list

**Why human:** DropZoneTail component (12px invisible drop zone) exists in code, but visual confirmation needed that the drop line appears in the correct position and the interaction feels natural.

### Gaps Summary

No gaps found. All 4 ROADMAP success criteria are verified. All 4 requirements (DND-01, DND-02, DND-03, DND-04) are satisfied with evidence from code and passing tests. All artifacts exist, are substantive (not stubs), and are wired correctly. Data flows through reorder functions to CVFormData mutation. TypeScript compiles clean. 70 automated tests pass (42 useDirectEditor + 28 dragAndDrop).

Human verification items are standard UI interaction checks that apply to any drag-and-drop feature — they do not indicate gaps, but rather confirm the feature works as designed in a real browser with user input.

---

_Verified: 2026-04-05T15:47:00Z_
_Verifier: Claude (gsd-verifier)_
