# Phase 8: Streamlined Tune Flow - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the existing /apply 3-step flow with an inline right-panel tune experience on the editor page (/build/form). The right panel shows progressive tiers (save-as-base → job form → diffs) alongside the live CV on the left. After saving a tailored version, navigate to a scoped Dashboard view showing only that base CV's group. Remove the "+ New CV" NavBar button from any non-editor working pages.

This phase does NOT include: web templates for deedy-resume or mcdowell-cv, undo/redo, mobile optimization, or backend AI changes.

</domain>

<decisions>
## Implementation Decisions

### Save-as-Base Prompt
- **D-01:** The save-as-base prompt appears ONLY when clicking "Tune for Job" and there is no active saved version (CV is unsaved/anonymous). If the user already has an active version (activeVersion is non-null), skip the prompt and go straight to the tune panel.
- **D-02:** The save-as-base prompt collects name only (e.g. "Creative CV"). Role/company belong on the job application, not the base CV. Implement as an inline name input + save button directly within Tier 1's body div inside TunePanel — do NOT use SaveCVModal as a modal overlay (nested modal-in-panel is architecturally messy). The inline form owns the save action and calls `api.saveVersion` directly.
- **D-03:** After saving as base CV, the save panel tier collapses to a summary row and the job form tier automatically opens.

### Tune Screen Layout — Right Panel on Editor
- **D-04:** The entire tune flow lives in a right panel on /build/form. No navigation away from the editor. The CV stays visible on the left throughout all tiers.
- **D-05:** The panel has 3 progressive tiers:
  - Tier 1 (save-as-base): Name input + save action. Only shown if activeVersion is null (unsaved CV). Collapses to "Base CV: [name]" summary row after save.
  - Tier 2 (job form): Company, role, job description inputs + "Analyze Match" action. Collapses to "[Company] · [Role] · [score]%" summary row after analysis.
  - Tier 3 (diffs): Match score + ChangeCard list (scrollable, aligned to CV sections). Accept/reject controls per card. Save button at bottom of panel.
- **D-06:** Completed tiers collapse to clickable summary rows (user can re-expand to edit). Pattern matches the existing collapsed steps header in ApplyToJobScreen step 3.
- **D-07:** ChangePanel and ChangeCard components already exist — reuse them in Tier 3. useTailor hook already handles accept/reject/undo state.

### /apply Route Migration
- **D-08:** The /apply route is replaced: navigating to /apply redirects to /build/form with the tune panel open. Dashboard "Tune for a Job" button loads the version into the editor and opens the tune panel (via navigation state or query param like `?tune=1`).
- **D-09:** TuneExpansionPanel on LandingScreen: clicking a base CV navigates to /build/form with that version loaded and tune panel open. The /apply route no longer exists as a standalone 3-step page after this phase.
- **D-10:** The ApplyToJobScreen component is removed/replaced by the new inline panel.

### Post-Accept Navigation
- **D-11:** After saving the tailored CV, navigate to /dashboard with a filter state (e.g., `{ baseId: parentVersionId }` via React Router location.state). Dashboard renders filtered: shows only that base CV and its job application children. A visible "All CVs" or "← Back" control lets the user expand to the full list.

### NavBar During Tune
- **D-12:** When the tune panel is open, the NavBar right side keeps "Download PDF" and shows a visual indicator that tuning is active (e.g., a subtle "Tuning active" badge or the "Tune for Job" button becomes visually active/highlighted). The user closes the panel via an X button inside the panel itself.
- **D-13:** The "+ New CV" button is removed from the NavBar on all non-editor pages. Per scope notes, this removes focus distraction during tuning — but since tuning is now on the editor page, this mainly affects the Dashboard and other working pages. The NavBar right side on non-editor pages becomes empty (or just a minimal state).

### Claude's Discretion
- Exact visual design of the right panel (width, border, animation for open/close)
- Progress indicator style for the tier transitions (spinner, skeleton, or loading state)
- How the CV left panel handles layout when the right tune panel is open (whether the CV narrows or stays full-width with panel overlaying/beside it)
- Whether the tune panel is a fixed-width sidebar or a percentage-based split
- Animation for tier expand/collapse transitions
- Exact text for the "Tuning active" indicator in the NavBar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Tune/Apply Components (to be replaced or migrated)
- `frontend/src/features/apply-to-job/ApplyToJobScreen.tsx` — Current 3-step /apply flow. Phase 8 replaces this with the inline panel. Reference for all state logic (useTailor, scroll sync, save handler) to carry over.
- `frontend/src/features/apply-to-job/ApplyToJobScreen.module.css` — Current CSS for the 3-step flow.

### Existing Components to Reuse
- `frontend/src/features/direct-edit/components/ChangePanel.tsx` — Pure renderer for Tier 3 diffs. Already accepts all needed props.
- `frontend/src/features/direct-edit/components/ChangeCard.tsx` — Individual change card with word-level diff.
- `frontend/src/hooks/useTailor.ts` — Accept/reject/undo state for change cards. Reuse in the new panel.
- `frontend/src/features/dashboard/SaveCVModal.tsx` — Modal with forceBaseCV prop for Tier 1 save. Note: may need to be converted to an inline panel form rather than a modal overlay.

### Editor Page
- `frontend/src/features/direct-edit/DirectEditPage.tsx` — The editor page where the tune panel will live. handleTuneForJob currently navigates to /apply — change to open the right panel instead.
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` — Editor state controller. Panel reads formData from here.
- `frontend/src/features/direct-edit/hooks/useAutoSave.ts` — Auto-save hook. Save status used in panel.

### Navigation and Landing
- `frontend/src/features/landing/TuneExpansionPanel.tsx` — Navigates to /apply — update to navigate to /build/form with tune panel state.
- `frontend/src/features/landing/LandingScreen.tsx` — handleTuneClick logic (1 base CV → navigate directly).
- `frontend/src/components/NavBar.tsx` — Add "Tuning active" indicator and remove "+ New CV" from non-editor pages.
- `frontend/src/App.tsx` — Route definitions. /apply route needs update/redirect.

### Dashboard
- `frontend/src/features/dashboard/Dashboard.tsx` — Receives navigation state. Needs to support baseId filter from location.state for post-save scoped view.

### Design System
- `frontend/src/styles/variables.css` — CSS tokens for the new panel.

### Prior Phase Context
- `.planning/phases/06-route-integration/06-CONTEXT.md` — D-08 through D-17: NavBar decisions, route structure decisions. Phase 8 extends and modifies these.
- `.planning/phases/05-ai-integration/05-CONTEXT.md` — ChangePanel/ChangeCard patterns, useTailor design, scroll sync pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ChangePanel` + `ChangeCard` + `useTailor`: Complete diff review system. ChangePanel is already a pure renderer — passes all state via props. Reuse as-is in Tier 3.
- `SaveCVModal` with `forceBaseCV=true`: Can serve as Tier 1 form, but likely needs to be rendered inline (not as an overlay modal) within the right panel.
- `useScrollSync(cvPreviewRef, changePanelRef, enabled)`: Already implemented scroll sync between CV preview and change panel. Carry over to the new panel.
- The current Step 3 two-panel layout in `ApplyToJobScreen` is very close to the target — the collapsedSteps header pattern (tiers that collapse to summary rows) maps directly to D-06.

### Established Patterns
- EditorActionsContext: Used to lift editor actions (download, tune, save status) into the NavBar. Can extend to include tune panel open/close state.
- Phase 6 D-08: Single merged NavBar. Phase 8 extends the right-side actions for the tune-active state.
- Phase 5: ChangePanel is pure renderer — all state from useTailor. This pattern must be preserved in the new panel.

### Integration Points
- `DirectEditPage.tsx handleTuneForJob`: Change from `navigate('/apply', ...)` to `setTunePanelOpen(true)`. Panel reads `activeVersion` + `formData` from context.
- `App.tsx`: Update /apply route to redirect to /build/form (or handle via navigation state).
- `Dashboard.tsx`: Read `location.state.baseId` to filter the version list view.
- `TuneExpansionPanel.tsx`: Change `navigate('/apply', { state: { baseVersionId: cv.id } })` to load version into editor context and navigate to `/build/form?tune=1` or with state.

</code_context>

<specifics>
## Specific Ideas

- "Right panel with multiple tiers" — the user's mental model is a panel that progressively reveals: save → job form → diffs. Each completed tier stays visible as a collapsed summary row, collapsible/expandable.
- "That loads, and then once loaded minimises" — the job form tier should collapse automatically once analysis is complete and Tier 3 is ready. No explicit "Next" button needed if the transition is automatic.
- "Scoped Dashboard showing only that base CV" — the filtered Dashboard post-save is explicitly about showing the parent CV and all its job application children. An "All CVs" escape hatch prevents the user from getting stuck in the filtered view.

</specifics>

<deferred>
## Deferred Ideas

- **Score updating live as user edits in the CV** — re-computing match score in real-time as user accepts/rejects diffs. This is a nice-to-have (v2 AI-09) and out of scope here.
- **Multiple simultaneous tune sessions** — only one tune panel open at a time is the v1 model.

</deferred>

---

*Phase: 08-streamlined-tune-flow-save-as-base-prompt-inline-tune-panel*
*Context gathered: 2026-04-16*
