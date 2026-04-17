# Phase 3: Content Management - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can add new entries, delete entries, toggle section visibility, and see page overflow indicators — all directly on the web CV. This phase builds on the Phase 2 editing surface (EditableField, EditableBulletList, MedLengthTemplate, useDirectEditor). It does NOT include drag-and-drop reordering (Phase 4) or AI integration (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Add Button Placement
- **D-01:** Contextual "+" buttons appear at the bottom of each section, visible only on hover. When not hovering, the CV looks clean with no UI chrome.
- **D-02:** The hover zone covers the area below the last entry in each section. The button text is contextual: "+ Add work entry", "+ Add education", "+ Add skill category", etc.

### Delete Experience
- **D-03:** Trash/X icon appears in the top-right corner of an entry when hovering over it. Click to trigger delete.
- **D-04:** Confirmation dialog for "major" entries only — deleting an entire job, education entry, project, or award shows a confirm prompt. Bullets and individual skills delete instantly without confirmation.

### Section Toggles
- **D-05:** Section visibility toggle appears in a hover toolbar on the section header. Not visible when not hovering — keeps the CV clean.
- **D-06:** Hidden sections collapse to a muted label (section name visible but content hidden). Data is preserved in CVFormData. Toggling back restores full content.

### Page Overflow
- **D-07:** Horizontal dashed line appears at the page break point (11 inches from top) with a "Page 2" label. Content continues below the line.
- **D-08:** The indicator is calculated based on the CV container's scroll height vs the page height (11in equivalent in px).

### Claude's Discretion
- Exact hover zone sizing and transition timing for add buttons
- Confirmation dialog styling (inline vs modal)
- Section toggle icon choice (eye, chevron, or similar)
- Page break calculation method (ResizeObserver, scroll height, etc.)
- Whether empty sections (0 entries) show the add button by default (not just on hover)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Components (build on these)
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` — The web CV component that renders all sections. Add/delete/toggle controls integrate into this.
- `frontend/src/features/direct-edit/components/MedLengthTemplate.module.css` — Existing CSS for the web CV layout.
- `frontend/src/features/direct-edit/components/EditableField.tsx` — Core editable component (hover states already defined here).
- `frontend/src/features/direct-edit/components/EditableBulletList.tsx` — Bullet list with keyboard handling.
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` — State controller bridging to CVFormData. Needs add/remove entry functions.

### Existing CRUD Functions
- `frontend/src/hooks/useFormBuilder.ts` — Already has addWorkEntry, removeWorkEntry, addEducationEntry, removeEducationEntry, addSkillCategory, removeSkillCategory, addProject, removeProject, addAward, removeAward, addAdditionalSection, etc. These can be adapted or called from useDirectEditor.

### Data Model
- `frontend/src/types/index.ts` — CVFormData with all entry types (WorkEntry, EducationEntry, etc. with id fields from Phase 1).

### UI-SPEC (Phase 2)
- `.planning/phases/02-core-editing-surface/02-UI-SPEC.md` — Interaction colors, hover highlight values, typography. Phase 3 should use the same visual language.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useFormBuilder` hook: Has complete add/remove/reorder CRUD for all entry types. useDirectEditor can delegate to these or replicate the logic.
- `generateId()` from `idHelpers.ts`: For creating new entries with stable IDs.
- EditableField hover states: Already has `:hover` background highlight (rgba(59, 130, 246, 0.04)) — add/delete controls can use similar visual language.

### Established Patterns
- Hover-based UI: Phase 2 uses hover for focus highlights. Phase 3 extends this pattern to add/delete/toggle controls.
- CSS Modules: All components use co-located `.module.css`.
- CVFormData as source of truth: All mutations go through setFormData in CVContext.

### Integration Points
- MedLengthTemplate: Add/delete buttons and section toggles render inside this component's section rendering.
- useDirectEditor: Needs new functions (addEntry, removeEntry, toggleSection) exposed alongside existing updateField/addBullet/removeBullet.
- DirectEditPage: May need to track hidden sections state (could be in CVFormData or separate state).

</code_context>

<specifics>
## Specific Ideas

- Clean CV look when not interacting — all controls (add, delete, toggle) are hover-only.
- Page break indicator as a dashed line with "Page 2" label inline.
- Confirmation only for "major" deletes (whole entries, not bullets/skills).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-content-management*
*Context gathered: 2026-03-30*
