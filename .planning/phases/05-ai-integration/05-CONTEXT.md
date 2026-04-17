# Phase 5: AI Integration - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Adapt existing AI features (import, apply-to-job, tailor suggestions) to work seamlessly with the web CV editor. AI suggestions appear in a side panel with section-aligned change cards, not inline diffs. Import lands directly in the web CV editor. Apply to Job is triggered from the dashboard and uses the web CV (read-only) + side panel for review. An editor toolbar provides access to actions like Import and Download. AI responses target sub-2 second latency.

This phase does NOT include: route wiring or persistent nav bar (Phase 6), per-field AI writing assist (v2), or additional web templates (v2).

</domain>

<decisions>
## Implementation Decisions

### Change Review UI (AI-03, AI-04)
- **D-01:** AI-suggested changes appear in a **side panel** to the right of the web CV, not as inline diffs on the CV text. The CV stays clean and readable.
- **D-02:** Each change is a **card** with before/after text, aligned vertically with the corresponding section on the CV. When you scroll the CV, the panel scrolls in sync so cards stay next to their sections.
- **D-03:** The "after" text in each change card is **editable** — users can tweak the AI suggestion before accepting. Accepted version (original or user-edited) goes into CVFormData.
- **D-04:** Accept/reject buttons on each card. Accepting a change **immediately updates the live web CV** so the user sees the impact in context.
- **D-05:** Word-level diffing (existing `wordDiff.ts`) used within change cards to highlight what changed between before and after text.

### Import Flow (AI-01)
- **D-06:** After CV import (PDF/DOCX/JSON upload), extracted data loads **directly into the web CV editor**. No intermediate review step.
- **D-07:** A **dismissible toast/banner** at the top shows import summary: entry counts and overall confidence ("Imported 3 jobs, 2 education, 4 skill categories — high confidence"). User starts editing immediately.
- **D-08:** Per-field confidence hints for low-confidence extractions — **Claude's Discretion** (subtle underline or no hints, based on implementation complexity).

### Apply to Job Flow (AI-02)
- **D-09:** Apply to Job is **triggered from the dashboard** (selecting a base CV), not from within the editor. This preserves the version hierarchy: base CV → job application child.
- **D-10:** The tailoring view shows the **web CV (read-only)** on the left with the **side panel** (same component as D-01) on the right for reviewing changes. Users cannot type directly on the CV during tailoring — all changes come through the panel.
- **D-11:** The 3-step progressive flow is preserved: Job Details → Match Analysis → Review Changes (web CV + side panel). Match analysis score and gap pills display above or within the panel.
- **D-12:** After accepting/rejecting changes, "Save" creates a **child version** under the base CV with job metadata (company, role, match score, baseline score). Returns to dashboard.

### Editor Toolbar (Workflow Integration)
- **D-13:** A **slim toolbar** sits above the web CV in the editor with actions: "Import CV", "Download PDF", and the auto-save status indicator ("Saved" / "Saving..."). Always visible.
- **D-14:** The SaveIndicator (Phase 2) moves from its current corner position into the toolbar for a cohesive app feel.

### AI Speed (AI-05, AI-06, AI-07)
- **D-15:** Claude's Discretion — research and select the fastest model/provider for import extraction and tailor suggestions targeting sub-2 second response times. Evaluate Bedrock Llama, Groq, etc. Current setup uses Claude Haiku for extraction and Claude Sonnet for tailor/match.

### Persistent Navigation
- **D-16:** A **persistent top nav bar** across the whole app: logo/home, "My CVs" (dashboard link), "New CV". Always visible for easy navigation between editor and dashboard. **Note:** actual implementation is Phase 6 scope, but the decision is captured here so Phase 6 inherits it.

### Claude's Discretion
- Side panel width and responsive behavior (how it collapses on narrow screens)
- Change card visual design (borders, spacing, animation on accept)
- How match analysis score/gaps display relative to the side panel (above panel, inside panel header, etc.)
- Import toast duration and dismiss behavior
- Per-field confidence hint approach (D-08)
- AI model/provider selection for speed targets (D-15)
- How the side panel opens/closes (slide animation, toggle button placement)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing AI Hooks & Components
- `frontend/src/hooks/useImport.ts` — Current import flow state management. Returns CVImportResponse with formData, confidence, summary.
- `frontend/src/hooks/useTailor.ts` — Tailor suggestions with accept/skip/undo per change, queue-based application, alternative selection.
- `frontend/src/features/apply-to-job/ApplyToJobScreen.tsx` — Current 3-step Apply to Job flow. Will be adapted to use web CV + side panel for step 3.
- `frontend/src/features/cv-import/CVImportUpload.tsx` — Current import upload screen. Landing destination changes from form builder to web CV editor.
- `frontend/src/features/form-builder/ImportBanner.tsx` — Current import confidence banner. Replaced by toast in web CV editor.

### Tailor Data Model & Utilities
- `frontend/src/types/index.ts` — TailorChange, TailorResponse, TailorAlternative, MatchAnalysis, CVImportResponse, ImportConfidence, ImportSummary type definitions.
- `frontend/src/utils/formDataPatch.ts` — `applyTailorChanges()` applies selected changes to CVFormData. `parsePath`, `setAtPath`, `getAtPath` for field-level operations.
- `frontend/src/utils/wordDiff.ts` — `computeWordDiff()` LCS-based word-level diff. Use in change cards for before/after highlighting.

### Web CV Editor (Phase 2-4 output)
- `frontend/src/features/direct-edit/DirectEditPage.tsx` — Current web CV editor page. Will gain toolbar and side panel integration.
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` — Web CV rendering component. Used in both editor (editable) and tailoring view (read-only).
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` — State controller for web CV. Import flow will set formData through this.
- `frontend/src/features/direct-edit/hooks/useAutoSave.ts` — Auto-save hook. SaveIndicator moves to toolbar.
- `frontend/src/features/direct-edit/components/SaveIndicator.tsx` — Save status component. Relocated to toolbar.

### Backend AI Endpoints
- `backend/routes/cv_import.py` — POST /cv-import endpoint. No changes expected.
- `backend/routes/tailor.py` — POST /tailor/suggest-changes endpoint. No changes expected.
- `backend/routes/chat.py` — POST /chat/match-analysis endpoint. No changes expected.
- `backend/services/bedrock.py` — BedrockClient singleton, MODEL_SONNET, MODEL_HAIKU. Speed research (D-15) may change model selection.
- `backend/services/cv_extractor.py` — CV extraction logic. EXTRACTION_MODEL_ID may change per speed research.
- `backend/prompts/cv_agent.py` — TAILOR_SUGGEST_PROMPT, MATCH_ANALYSIS_PROMPT. May need tuning if model changes.

### Dashboard & Versions
- `frontend/src/features/dashboard/Dashboard.tsx` — Dashboard with hierarchical versions. "Apply to Job" button triggers tailoring flow.
- `frontend/src/contexts/CVContext.tsx` — CV state (versions, formData). Import and tailor flows write through this.
- `frontend/src/services/api.ts` — All backend API calls. Import, tailor, match analysis, save version methods.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTailor` hook: Complete accept/skip/undo/editChangeValue flow with queue-based sequential application. Core logic reusable — UI layer changes from TailorPanel cards to side panel cards.
- `useImport` hook: File upload + AI extraction state machine. Reusable as-is — only the destination changes (web CV editor instead of form builder).
- `applyTailorChanges()`: Selective change application with alternative selection. Powers the live CV update on accept.
- `computeWordDiff()`: LCS word-level diff already built. Use directly in change card before/after rendering.
- `MedLengthTemplate`: Can be rendered in read-only mode (no contentEditable handlers) for the tailoring view.
- `api.suggestTailorChanges()`, `api.getMatchAnalysis()`, `api.importCV()`: Backend API calls ready to use.

### Established Patterns
- Hover-only UI controls (Phases 3-4): Side panel and toolbar are always-visible chrome, distinct from hover-only editing controls.
- CSS Modules: All components use co-located `.module.css`.
- Feature directories: New side panel component goes in `frontend/src/features/direct-edit/components/`.
- Context-based state: Import and tailor state flows through CVContext/ToolsContext.

### Integration Points
- `DirectEditPage`: Gains toolbar (above CV) and side panel (right of CV). Layout changes from single-column to toolbar + content area.
- `MedLengthTemplate`: Needs a `readOnly` prop to disable contentEditable for the tailoring view.
- `ApplyToJobScreen`: Step 3 replaces checkbox list with web CV + side panel. Steps 1-2 can remain similar.
- `CVImportUpload`: After successful import, navigates to web CV editor (DirectEditPage) instead of form builder.
- `Dashboard`: "Apply to Job" button navigates to updated ApplyToJobScreen with baseVersionId.

</code_context>

<specifics>
## Specific Ideas

- Change cards aligned with their CV sections — "the edits are nice and clean, lined up with their sections"
- Side panel scrolls in sync with CV so cards stay next to their sections
- Read-only CV during tailoring but editable suggestion cards — "give the user as much power as possible, but keep the experience as simple as possible"
- Import goes straight to editing — no intermediate review step, just a confidence toast
- Apply to Job stays dashboard-triggered to preserve version hierarchy (base CV → child versions)
- Editor toolbar gives the web CV editor a complete app feel, not just a floating document

</specifics>

<deferred>
## Deferred Ideas

- **Persistent nav bar implementation** — Decision captured (D-16) but actual implementation is Phase 6 (Route Integration)
- **Per-field AI writing assist** (sparkle icon → alternatives) — v2 requirement (AI-08)
- **Real-time match score updates as user edits** — v2 requirement (AI-09)

</deferred>

---

*Phase: 05-ai-integration*
*Context gathered: 2026-04-05*
