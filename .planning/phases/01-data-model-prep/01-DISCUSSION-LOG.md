# Phase 1: Data Model Prep - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 1-data-model-prep
**Areas discussed:** ID scope & bullets, Saved CV migration, AI path format

---

## ID Scope & Bullets

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, IDs on everything | Bullets, skills, links all get IDs. Enables per-bullet AI suggestions, drag-and-drop reordering, stable undo | ✓ |
| IDs on entries only | WorkEntry, EducationEntry etc. get IDs, but bullets/skills stay as plain strings | |
| You decide | Claude picks the approach | |

**User's choice:** Yes, IDs on everything
**Notes:** User asked how IDs would help the application. Explained: position-independent addressing enables reliable AI suggestions, drag-and-drop, undo/redo, and stable inline editing mappings. User asked about ID structure (hierarchical vs random). Agreed on nanoid (internal random strings, not user-visible).

### Link IDs

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add id to links | Consistent with other array entries, enables stable link reordering | ✓ |
| Skip links | Links rarely change order, low priority | |

**User's choice:** Yes, add id to links

---

## Saved CV Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generate on load | When loading without IDs, silently generate them. No migration script. | ✓ |
| Migration script | One-time script to update all saved versions | |
| Break old data | Old versions incompatible, users start fresh | |

**User's choice:** Auto-generate on load

### Persist on Load

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, persist on load | Save back after generating IDs so they're stable across sessions | ✓ |
| Generate fresh each load | Don't persist, IDs regenerated each time | |
| You decide | Claude picks | |

**User's choice:** Yes, persist on load

---

## AI Path Format

| Option | Description | Selected |
|--------|-------------|----------|
| Keep indices, resolve at runtime | AI still outputs index-based paths, frontend resolves | |
| Switch AI to ID-based paths | Send IDs to AI, AI returns ID-based paths | |
| You decide | Claude picks based on editing surface needs | ✓ |

**User's choice:** You decide
**Notes:** Deferred to Claude's discretion — pick whatever works best with the Phase 2 editing surface.

---

## Claude's Discretion

- AI path format (index-based vs ID-based) — deferred to implementation
- nanoid configuration (length, alphabet)
- Backend migration approach details

## Deferred Ideas

None — discussion stayed within phase scope.
