# Phase 2: Core Editing Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 2-core-editing-surface
**Areas discussed:** Editing experience, Page feel on screen, Auto-save UX

---

## Editing Experience

### Focus Style

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle highlight | Light background tint or thin border around editable area | ✓ |
| Cursor only | Just text cursor, no border/background change | |
| Underline glow | Subtle underline or bottom-border glow | |
| You decide | Claude picks | |

**User's choice:** Subtle highlight

### Field Bounds

| Option | Description | Selected |
|--------|-------------|----------|
| Match form data model | Each CVFormData field = one editable region | ✓ |
| Visual grouping | Group fields that appear together visually | |
| You decide | Claude picks | |

**User's choice:** Match form data model

---

## Page Feel on Screen

| Option | Description | Selected |
|--------|-------------|----------|
| Document in canvas | White page with drop shadow on gray background (Google Docs style) | |
| Full-bleed page | CV fills viewport width, no surrounding background (Notion style) | ✓ |
| You decide | Claude picks | |

**User's choice:** Full-bleed page

---

## Auto-save UX

### Save Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal text indicator | Small "Saved" / "Saving..." text in corner | ✓ |
| Icon-based | Cloud/checkmark icon that animates | |
| You decide | Claude picks | |

**User's choice:** Minimal text indicator

### Save Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| On blur + debounce | Save on click away + periodic 5-10s save | |
| Debounce only | Save after 2-3s of inactivity, fires while focused | ✓ |
| You decide | Claude picks | |

**User's choice:** Debounce only

---

## Claude's Discretion

- Component architecture for the web template
- Font loading strategy
- Exact CSS values for LaTeX margin matching
- Cursor/tab behavior between fields
- Placeholder text content
- Error handling for font loading

## Deferred Ideas

None — discussion stayed within phase scope.
