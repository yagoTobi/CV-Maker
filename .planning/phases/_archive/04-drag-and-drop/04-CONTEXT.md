# Phase 4: Drag and Drop - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can reorder their CV's sections and entries by dragging directly on the web CV, without conflicting with inline text editing. Section-level drag reorders top-level sections (sectionOrder). Entry-level drag reorders items within the same section (array positions). This phase does NOT include cross-section dragging, AI integration (Phase 5), or route wiring (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Grip Handle Placement
- **D-01:** Grip handles appear in a left gutter, outside the CV content area. Section grips sit left of section headers; entry grips sit left of entry header rows.
- **D-02:** Grip handles are hover-only — visible when hovering over the section or entry, invisible otherwise. Same pattern as Phase 3 hover controls (delete X, eye toggle, add button).
- **D-03:** Both section-level and entry-level grips use the same 6-dot grip icon. The scope (section vs entry) is implicit from position — section grips appear next to section headers, entry grips next to entry headers.

### Drag Visual Feedback
- **D-04:** A horizontal blue accent line (drop line indicator) appears between items to show where the dragged item will land. The dragged item stays in place with reduced opacity (~0.4).
- **D-05:** The browser's default drag ghost image is hidden (set invisible 1x1 drag image). Only the drop line indicator and opacity change provide feedback.

### Drag Scope
- **D-06:** Entries are reorderable within their own section only. No cross-section dragging. Jobs reorder within Work, degrees within Education, etc.
- **D-07:** Section-level drag reorders the entire section (header + all entries move as a unit) by updating `sectionOrder` in CVFormData. Entry-level drag reorders array positions within the section's data array.

### DnD Approach
- **D-08:** Reuse the existing native HTML DnD pattern from `useDrag.ts` — adapt it for the direct-edit context. No new library dependencies.
- **D-09:** The proven contentEditable-safe pattern applies: no `draggable` attribute in JSX; grip `onMouseDown` sets `draggable = true` on the nearest drag container; `onDragEnd` resets `draggable = false`. This prevents DnD from interfering with text cursor positioning (key learning #21).

### Claude's Discretion
- Exact grip icon sizing and gutter width for the web CV layout
- Drop line indicator color intensity and positioning (use --accent or similar)
- How to scope drag containers (data attributes) for section-level vs entry-level
- Transition/animation timing for the opacity change on dragged items
- Whether single-entry sections show a grip (no reorder possible within)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing DnD Pattern
- `frontend/src/features/form-builder/components/useDrag.ts` — The proven native HTML DnD hook with grip-based draggable toggling. Adapt this for direct-edit context.
- `frontend/src/features/form-builder/components/GripIcon.tsx` — 6-dot SVG grip icon. Reuse or adapt for the web CV.

### Direct-Edit Components (Phase 2 & 3 output)
- `frontend/src/features/direct-edit/components/SectionWrapper.tsx` — Section container with hover controls. Grip handle integrates into the header row.
- `frontend/src/features/direct-edit/components/EntryWrapper.tsx` — Entry container with hover delete button. Grip handle integrates alongside delete control.
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` — Web CV renderer. Sections rendered from `formData.sectionOrder`. Integration point for drag containers and drop targets.
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` — State controller. Needs `reorderSections` and `reorderEntries` functions added.

### Data Model
- `frontend/src/types/index.ts` — CVFormData with `sectionOrder` field and all entry types with stable IDs (Phase 1).
- `frontend/src/hooks/useFormBuilder.ts` — Has existing `reorderSections(from, to)` function that mutates `sectionOrder`. Direct-edit can adapt this pattern.

### UI Visual Language
- `.planning/phases/02-core-editing-surface/02-UI-SPEC.md` — Interaction colors, hover highlight values. Phase 4 should use the same visual language for grip handles and drop indicators.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useDrag` hook (`frontend/src/features/form-builder/components/useDrag.ts`): Complete native DnD implementation with `onHandleMouseDown`, `onDragStart`, `onDragEnter`, `onDragOver`, `onDrop`, `onDragEnd`. Index-based `onReorder(from, to)` callback. Can be adapted or extracted to a shared location.
- `GripIcon` component (`frontend/src/features/form-builder/components/GripIcon.tsx`): 6-dot SVG, 14x14. Can reuse directly or adapt sizing.
- `useFormBuilder.reorderSections(from, to)`: Already handles `sectionOrder` mutation with the `reorder()` utility.
- `reorder()` utility (used in `useFormBuilder.ts`): Generic array reorder function — splice-based `from`/`to` swap.

### Established Patterns
- Hover-only UI controls: Phase 3 established that all editing chrome (add, delete, toggle) is invisible until hover. Grip handles follow this pattern.
- CSS Modules: All direct-edit components use co-located `.module.css`.
- `data-drag-card` attribute: Used in form-builder to scope which element becomes draggable. Web CV needs equivalent attributes for sections and entries.
- `e.stopPropagation()` on all drag events: Prevents entry-level drags from bubbling up to section-level drag handlers.

### Integration Points
- `SectionWrapper`: Add grip handle to `sectionHeaderRow`. Wire up section-level drag events.
- `EntryWrapper`: Add grip handle alongside delete button. Wire up entry-level drag events.
- `MedLengthTemplate`: Wrap sections and entries with drag data attributes. Pass reorder callbacks.
- `useDirectEditor`: Add `reorderSections(from, to)` and `reorderEntries(sectionKey, from, to)` functions.

</code_context>

<specifics>
## Specific Ideas

- Left gutter grip handles — consistent with user's preference for left-side hover controls (noted in prior feedback).
- Drop line indicator (no ghost) — clean, minimal feedback. Blue accent line between items.
- Same 6-dot icon at both levels — simple, scope implied by position.
- Native HTML DnD — zero new dependencies, proven pattern already in the codebase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-drag-and-drop*
*Context gathered: 2026-04-04*
