# Phase 8: Streamlined Tune Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 08-streamlined-tune-flow-save-as-base-prompt-inline-tune-panel
**Areas discussed:** Save-as-Base Prompt, Tune Screen Layout, Post-Accept Navigation, NavBar on /apply

---

## Save-as-Base Prompt

| Option | Description | Selected |
|--------|-------------|----------|
| Only if no active version (unsaved) | If the user already has a saved version open, go straight to tune. Prompt only when CV is unsaved/anonymous. | ✓ |
| Always when clicking Tune | Always show the prompt. Even if already saved, confirm base CV name before starting. | |
| Only if version has no parentVersionId | Prompt when current version is a base CV (no parent). | |

**User's choice:** Only if no active version (unsaved)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Name only | Just ask for a name. Simple and fast. | ✓ |
| Name + base role/title | Name plus target role field. | |
| Name + target industry | Name plus broad industry field. | |

**User's choice:** Name only (Recommended)

---

## Tune Screen Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Right panel on editor page | Tune flow is a right panel on /build/form. CV stays on left throughout. No navigation to /apply. | ✓ |
| Similar but new route | New URL (e.g. /tune/:versionId) with the same two-panel layout. | |
| Right panel on editor + keep /apply | Right panel for editor Tune button. Keep /apply for Dashboard entry. Two entry points. | |

**User's choice:** Right panel on the editor page (Recommended)
**Notes:** User described a panel with "multiple tiers" — Tier 1 saves as base, Tier 2 is the job form, Tier 3 is match score + diffs. "That loads, and then once loaded minimises" — tiers collapse to summary rows automatically when complete.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect /apply to /build/form with tune panel open | One tune UX everywhere. Dashboard → Apply to Job opens editor with tune panel. | ✓ |
| Keep /apply as separate full-page flow | Dashboard uses old 3-step /apply page. Only editor Tune button gets new panel. | |
| Remove /apply, Dashboard opens editor then user clicks Tune | No dedicated Apply-to-Job entry point. | |

**User's choice:** Redirect /apply to /build/form with tune panel open (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Collapse to a summary row | Completed tiers collapse to show a clickable summary. User can re-expand. | ✓ |
| Fully hidden after completion | Completed tiers disappear. Only active tier visible. | |
| Stay expanded, stacked vertically | All tiers remain open, scrollable right panel. | |

**User's choice:** Collapse to a summary row (Recommended)

---

## Post-Accept Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Full Dashboard filtered to that base CV group | Navigate to /dashboard with ?baseId= or location.state. Shows only that base CV's group. | ✓ |
| Full Dashboard expanded to that group, no filtering | Full list visible, base CV group auto-expanded. | |
| Success screen in panel, stay on editor | Panel shows success state with score delta. No automatic navigation. | |

**User's choice:** Full Dashboard filtered to that base CV group (Recommended)

---

## NavBar on /apply

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Download PDF, add visual indicator tuning is active | NavBar right side unchanged. A badge or indicator on Tune button shows panel is open. User closes from within the panel. | ✓ |
| Replace Download+Tune with Close Tune Panel button | When tune panel is open, right side shows 'Exit Tune'. Download returns when panel closes. | |
| Hide right-side NavBar actions while tune panel is open | Clean header during tuning. User exits via button inside panel. | |

**User's choice:** Keep Download PDF, add a visual indicator that tuning is active

---

## Claude's Discretion

- Exact visual design of the right panel (width, animation)
- Progress indicator style for tier transitions
- CV left panel layout when right panel is open (narrow vs full-width with overlay)
- Animation for tier expand/collapse
- Exact text for "Tuning active" NavBar indicator
- Whether the tune panel is fixed-width sidebar or percentage split

## Deferred Ideas

- Live score updating as user accepts/rejects diffs (v2 AI-09)
- Multiple simultaneous tune sessions (future)
