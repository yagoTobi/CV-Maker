# Phase 4: Drag and Drop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 04-drag-and-drop
**Areas discussed:** Grip handle design, Drag visual feedback, Section vs entry drag, DnD approach

---

## Grip Handle Design

### Where should grip handles appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Left gutter | Grip handles in a narrow gutter left of entries/section headers on hover. Stays out of CV content area entirely. | ✓ |
| Inline with header row | Grip icon inside the section/entry header row, next to existing controls. Compact but crowded. | |
| Left edge of header only | Grip on left edge of header text (Notion-style). Handle IS the header's left margin. | |

**User's choice:** Left gutter
**Notes:** User noted the difference between left gutter and left edge of header was unclear — both position the grip on the left. Left gutter was chosen for keeping content undisturbed.

### When should grip handles be visible?

| Option | Description | Selected |
|--------|-------------|----------|
| Hover only | Grips appear on hover, same pattern as delete X and eye toggle. CV clean when not interacting. | ✓ |
| Always visible | Grips always shown. More discoverable but adds visual noise. | |
| You decide | Claude picks. | |

**User's choice:** Hover only
**Notes:** Consistent with Phase 3 hover-only control pattern.

---

## Drag Visual Feedback

### What should the user see while dragging?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop line indicator | Horizontal blue accent line between items shows drop target. Dragged item stays in place with reduced opacity. | ✓ |
| Gap placeholder | Items shift apart to create empty gap. Dragged item follows cursor as ghost. | |
| You decide | Claude picks simplest for CSS grid layout. | |

**User's choice:** Drop line indicator
**Notes:** None.

### Should the browser's default drag ghost show?

| Option | Description | Selected |
|--------|-------------|----------|
| Hide ghost | Set invisible 1x1 drag image. Only drop line provides feedback. | ✓ |
| Show default ghost | Browser renders semi-transparent snapshot. Familiar but messy. | |
| You decide | Claude picks. | |

**User's choice:** Hide ghost
**Notes:** None.

---

## Section vs Entry Drag

### Separate grip handles for section vs entry level?

| Option | Description | Selected |
|--------|-------------|----------|
| Same grip icon, different scope | Both use 6-dot grip. Section grips on section headers, entry grips on entry headers. Scope is implicit. | ✓ |
| Visually distinct handles | Section handles larger or different icon vs entry handles. | |
| You decide | Claude picks. | |

**User's choice:** Same grip icon, different scope
**Notes:** None.

### Entry reorder scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Within section only | Jobs within Work, degrees within Education. No cross-section. Matches DND-02. | ✓ |
| Cross-section too | Allow dragging between sections. More flexible but complex. | |

**User's choice:** Within section only
**Notes:** None.

---

## DnD Approach

### Native HTML DnD vs library?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse native DnD | Adapt existing useDrag.ts hook. Zero dependencies. Proven contentEditable-safe pattern. | ✓ |
| Adopt dnd-kit | Full-featured library. ~20KB. Sortable presets, keyboard accessibility, animations. | |
| You decide | Claude picks based on complexity analysis. | |

**User's choice:** Reuse native DnD
**Notes:** None.

---

## Claude's Discretion

- Exact grip icon sizing and gutter width
- Drop line indicator color intensity and positioning
- Drag container scoping (data attributes)
- Transition/animation timing
- Single-entry section grip behavior

## Deferred Ideas

None.
