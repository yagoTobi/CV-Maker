# Phase 6: Route Integration - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

The web CV editor fully replaces the form builder and LaTeX editor across all application routes. End-to-end direct-edit experience: Landing -> Template Select -> Web CV Editor -> edit inline -> Download PDF. Dashboard version switching and Apply to Job flow wired to the web CV editor. Persistent navigation bar provides cohesive app feel. Old form builder UI components removed.

This phase does NOT include: web templates for deedy-resume or mcdowell-cv (future release), per-field AI writing assist (v2), undo/redo (v2), mobile optimization (out of scope), or backend changes.

</domain>

<decisions>
## Implementation Decisions

### Route URL Structure
- **D-01:** DirectEditPage replaces CVFormBuilder at `/build/form`. The web CV editor takes over the existing URL — all existing navigation links (dashboard Open, template select, import redirect) work without URL changes.
- **D-02:** `/direct-edit` route removed. DirectEditPage no longer has a standalone route.
- **D-03:** `/import` route removed. Import only happens through BuildChoiceScreen (`/build/start`) drag-and-drop or EditorToolbar's Import button. No standalone import page.
- **D-04:** Build flow preserved: Landing (`/`) -> BuildChoiceScreen (`/build/start`) -> TemplateSelector (`/build`) -> Web CV Editor (`/build/form`).

### Template Selector
- **D-05:** Template selector stays in the build flow. Three templates displayed.
- **D-06:** deedy-resume and mcdowell-cv cards show as disabled with a "Coming soon" badge. Only med-length-proff-cv is clickable. Other web templates deferred to future release.
- **D-07:** New CV starts with realistic placeholder content showing the template shape (e.g., "Your Name", "Software Engineer at Company", sample bullets). User replaces text inline. Phase 2 placeholder mechanism (EDIT-04) already exists — enrich placeholders to be more realistic.

### Persistent Navigation Bar
- **D-08:** Single merged bar across all working pages (not landing). Google Docs-style: logo/nav left, context-specific actions right. One bar, not two (no separate nav + toolbar).
- **D-09:** On editor page (`/build/form`): left side shows "CV Maker" logo + "My CVs" link. Right side shows Import button, Download PDF button, and save status indicator (Saved/Saving...). The current EditorToolbar is replaced by this merged bar.
- **D-10:** On dashboard and other working pages: left side shows "CV Maker" logo + "My CVs" link. Right side shows "+ New CV" button.
- **D-11:** Landing page (`/`) keeps its current standalone branded look with no nav bar. Nav bar appears only after the user starts working.
- **D-12:** Nav bar visual style matches existing design system (CSS variables, color palette, typography from `variables.css`).

### Navigation Wiring
- **D-13:** "+ New CV" button in nav bar navigates to `/build/start` (BuildChoiceScreen — import or start from scratch).
- **D-14:** Dashboard "Tune for a Job" button navigates to `/apply` (3-step Apply to Job flow). Currently navigates to `/build/form` with tune mode — this needs fixing.
- **D-15:** Dashboard "Open" button navigates to `/build/form` (now DirectEditPage). Loads version formData into CVContext, DirectEditPage reads from context.
- **D-16:** "CV Maker" logo in nav bar navigates to `/` (landing page).
- **D-17:** "My CVs" link in nav bar navigates to `/dashboard`.

### Dead Code Removal
- **D-18:** Remove CVFormBuilder component and all form-builder section components (`frontend/src/features/form-builder/`). The split-screen form editing UI is fully replaced.
- **D-19:** Remove old editor/ feature folder (`frontend/src/features/editor/` — JobInput, MatchAnalysis, MatchSummaryBar, TailorPanel). These old LaTeX editor components are replaced by DirectEditPage + ChangePanel.
- **D-20:** Remove CVImportUpload component (`frontend/src/features/cv-import/`). Import handled by BuildChoiceScreen and EditorToolbar.
- **D-21:** Visual design system (`variables.css`, CSS tokens, color palette), backend (LaTeX compilation, AI endpoints, storage), data model (CVFormData, additionalSections), and all hooks used by DirectEditPage are NOT removed.
- **D-22:** `useFormBuilder` hook — audit for any functions still used by DirectEditPage or other active code. Remove only unused portions. If useDirectEditor has taken over all responsibilities, the entire hook can be removed.

### Claude's Discretion
- Nav bar exact height, spacing, and responsive behavior
- "Coming soon" badge visual design on disabled template cards
- How the nav bar transitions between page contexts (e.g., subtle animation or instant swap of right-side actions)
- Exact placeholder content text for new CVs (make it realistic and professional)
- Whether to keep BuildChoiceScreen's current drag-and-drop import or simplify
- Order of dead code removal (remove routes first, then components, then hooks)
- How to handle the `editor/` folder's index.ts barrel exports that other code might reference

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Route Definitions
- `frontend/src/App.tsx` — Current route definitions. All 8 routes including /build/form (CVFormBuilder), /direct-edit (DirectEditPage), /import (CVImportUpload). Phase 6 restructures this.
- `frontend/src/features/landing/LandingScreen.tsx` — Landing page with Build/Tune navigation. Keeps standalone look.

### Web CV Editor (replaces form builder)
- `frontend/src/features/direct-edit/DirectEditPage.tsx` — Web CV editor page. Becomes the /build/form component. Currently has EditorToolbar, ImportToast, MedLengthTemplate assembly.
- `frontend/src/features/direct-edit/components/EditorToolbar.tsx` — Current editor toolbar (Import, Download, SaveIndicator). Will be replaced by the merged nav bar on editor page.
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` — State controller for web CV. Confirm it handles all formData operations without useFormBuilder dependency.
- `frontend/src/features/direct-edit/hooks/useAutoSave.ts` — Auto-save hook. SaveIndicator integration moves into nav bar.

### Dashboard & Navigation
- `frontend/src/features/dashboard/Dashboard.tsx` — Version management. handleOpen navigates to /build/form. handleApplyToJob currently navigates to /build/form with tune mode (needs to go to /apply).
- `frontend/src/features/template-selection/TemplateSelector.tsx` — Template picker. Navigates to /build/form. Needs disabled "Coming soon" state for non-supported templates.
- `frontend/src/features/build-choice/BuildChoiceScreen.tsx` — Import/scratch choice. Navigates to /build (template selector) after import or scratch selection.

### Apply to Job
- `frontend/src/features/apply-to-job/ApplyToJobScreen.tsx` — 3-step flow. Dashboard "Tune for a Job" should navigate here.

### Design System
- `frontend/src/styles/variables.css` — CSS design tokens. Nav bar must use these.
- `frontend/src/components/FeatureErrorBoundary.tsx` — Per-route error boundary. Stays for all routes.

### Dead Code Targets
- `frontend/src/features/form-builder/` — CVFormBuilder + sections + components. Remove entirely.
- `frontend/src/features/editor/` — Old LaTeX editor components (JobInput, MatchAnalysis, TailorPanel). Remove entirely.
- `frontend/src/features/cv-import/CVImportUpload.tsx` — Standalone import. Remove.
- `frontend/src/hooks/useFormBuilder.ts` — Audit for active dependencies before removal.

### Context from AI Integration (Phase 5)
- `frontend/src/features/direct-edit/components/ImportToast.tsx` — Import feedback toast.
- `frontend/src/hooks/useTailor.ts` — Tailor suggestions hook (used by ApplyToJobScreen step 3).
- `frontend/src/hooks/useImport.ts` — Import flow hook (used by DirectEditPage and BuildChoiceScreen).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DirectEditPage`: Complete web CV editor assembly with EditorToolbar, ImportToast, MedLengthTemplate, auto-save, page break indicator. Ready to serve as /build/form.
- `EditorToolbar`: Current Import/Download/SaveIndicator bar. Will be replaced by merged nav bar but its logic (import click, download handler, save status display) is reusable.
- Design tokens in `variables.css`: --accent, --bg-primary, --text-primary, --shadow-sm, --radius. Nav bar should use these for consistent visual language.
- `FeatureErrorBoundary`: Per-route error boundary. Wrap all routes including the restructured ones.
- `useDirectEditor`: Full CRUD + reorder + toggle operations on CVFormData. May have already replaced all useFormBuilder functionality.

### Established Patterns
- Lazy-loaded route components in App.tsx with `React.lazy()` and `Suspense fallback={null}`.
- CSS Modules for all components — nav bar should follow `NavBar.module.css` pattern.
- Context-based state: CVContext holds formData and versions. DirectEditPage reads from context on mount, bootstraps from API if context is empty.
- `handleVersionLoad` in AppContext: sets formData + activeVersion in context. Dashboard Open calls this before navigating.

### Integration Points
- `App.tsx`: Route definitions — swap CVFormBuilder for DirectEditPage at /build/form, remove /direct-edit and /import routes.
- `App.tsx` or layout wrapper: Add NavBar component that wraps all routes except landing.
- `Dashboard.tsx`: Fix handleApplyToJob to navigate to /apply instead of /build/form with tune mode.
- `TemplateSelector.tsx`: Add disabled state + "Coming soon" badge for non-med-length-proff-cv templates. Keep navigating to /build/form on valid selection.
- `BuildChoiceScreen.tsx`: After import success, navigate to /build (template selector) then /build/form. Flow stays the same.

</code_context>

<specifics>
## Specific Ideas

- "Focused MS Word for CVs" — the web CV editor should feel like a purpose-built document editor. Minimal chrome, maximum content space. Research showed Google Docs, Canva, and Resumake all use minimal top bars with context-specific actions.
- "Integrate into the existing visual style" — the nav bar and all route changes should feel like a natural part of the existing app, not a new design language. Use the same CSS variables, font choices, and subtle animations.
- "Simplify the pipeline for job applications" — the flow from base CV to job application should be as frictionless as possible: Dashboard → pick base CV → "Tune for a Job" → /apply (3-step) → save child version → back to dashboard.
- "Enough value for the user to use this tool" — the combination of direct editing + AI import + AI tailoring + one-click PDF download is the value proposition. The route integration makes this a cohesive product, not a collection of features.

</specifics>

<deferred>
## Deferred Ideas

- **Web templates for deedy-resume and mcdowell-cv** — "Coming soon" in template selector. Future release.
- **Per-field AI writing assist** (sparkle icon) — v2 requirement (AI-08)
- **Undo/redo** — v2 requirement (POLISH-01)
- **Mobile optimization** — out of scope (desktop-first)

</deferred>

---

*Phase: 06-route-integration*
*Context gathered: 2026-04-06*
