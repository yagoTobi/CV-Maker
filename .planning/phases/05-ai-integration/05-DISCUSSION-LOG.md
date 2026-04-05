# Phase 5: AI Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 05-ai-integration
**Areas discussed:** Inline diff presentation, Accept/reject interaction, Import landing experience, Apply to Job integration, Workflow integration

---

## Inline Diff Presentation

Initial question: "How should AI-suggested text changes appear on the web CV?"

User clarified before selecting: preferred a comparison/side-by-side approach over inline diffs — "it would be better to see the refinements, compare and then iterate if they like it."

Reformulated question: "How should the comparison/review experience work when viewing AI suggestions?"

| Option | Description | Selected |
|--------|-------------|----------|
| Side panel with change cards | CV on left, slide-out panel on right with before/after cards. Accept updates CV live. | ✓ |
| Full before/after toggle | Two full CV renders side by side or toggle. Less granular. | |
| Staged card review then apply | Full-screen review step with checkboxes, then batch apply. | |

**User's choice:** Side panel with change cards
**Notes:** "Cool! I like this approach as long as it's lined up with their sections, so that the edits are nice and clean."

### Follow-up: Card Scroll Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll with CV | Panel scrolls independently, cards anchored to section position. | ✓ |
| Sticky top cards | Unresolved cards float to top as sections scroll past. | |
| You decide | Claude picks. | |

**User's choice:** Scroll with CV

---

## Accept/Reject Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, edit in the card | "After" text is editable. User can tweak before accepting. | ✓ |
| Accept or reject only | Cards are read-only. Edit CV directly after accepting/rejecting. | |
| You decide | Claude picks. | |

**User's choice:** Yes, edit in the card

---

## Import Landing Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Straight to web CV with toast | Imported data loads directly into editor. Brief toast shows confidence summary. | ✓ |
| Review step before editing | Summary screen with per-section confidence, then "Edit in CV" button. | |
| Web CV with confidence hints on fields | Direct load with orange underline on low-confidence fields. | |

**User's choice:** Straight to web CV with toast

### Follow-up: Per-field Confidence Hints

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle underline on low-confidence fields | Faint orange dotted underline, disappears after edit. | |
| No per-field hints, toast only | Overall confidence in toast, no visual noise on fields. | |
| You decide | Claude picks based on complexity. | ✓ |

**User's choice:** You decide

---

## Apply to Job Integration

User clarified before options were presented: "I want one screen to be the base CV editor, and then in the dashboard once it's done to be able to tailor it, and we take the existing ones, in order to keep the appropriate versions, and then push it through."

This established the flow: Dashboard triggers tailoring on a base CV → web CV (read-only) + side panel for review → save as child version.

### Follow-up: CV Editability During Tailoring

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only during review | CV renders but no typing. Changes only through side panel. | ✓ |
| Fully editable during review | CV is live-editable alongside suggestion panel. | |
| You decide | Claude picks. | |

**User's choice:** Read-only during review
**Notes:** "I guess read only, but it's important that the suggestions and suggested edits can be editable and placed there you know, we need to be able to give the user as much power as possible, but keep the experience as simple as possible."

---

## Workflow Integration

### Editor AI Access

| Option | Description | Selected |
|--------|-------------|----------|
| Toolbar/action bar at top of editor | Slim toolbar with Import CV, Download PDF, save status. Always visible. | ✓ |
| Floating action button / menu | Small floating button that expands to show AI actions. | |
| You decide | Claude picks. | |

**User's choice:** Toolbar/action bar at top of editor

### Navigation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent nav bar | Minimal top nav across whole app: logo, My CVs, New CV. Always visible. | ✓ |
| Back links only | Each screen has back button. Current pattern. | |
| You decide | Claude picks. | |

**User's choice:** Persistent nav bar

---

## Claude's Discretion

- Side panel width, responsive behavior, open/close animation
- Change card visual design
- Match analysis score/gaps placement relative to side panel
- Import toast duration and dismiss behavior
- Per-field confidence hints for imported data
- AI model/provider selection for sub-2s speed target
- How toolbar items are arranged and styled

## Deferred Ideas

- Persistent nav bar implementation deferred to Phase 6 (Route Integration)
- Per-field AI writing assist (v2)
- Real-time match score updates as user edits (v2)
