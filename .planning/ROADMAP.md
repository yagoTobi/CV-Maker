# Roadmap: CV-Maker Direct-Edit Web CV

## Overview

Transform the CV-Maker from a form-builder/preview split-screen into a direct-edit experience where the CV itself is the editor. The journey starts with stabilizing the data model for reliable field-level operations, then builds the core editing surface (the hardest technical challenge), layers on content management and drag-and-drop, adapts existing AI features to the new editor, and finally wires everything into the existing route structure -- replacing the form builder entirely.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Model Prep** - Add stable IDs to CVFormData array entries and update all consumers
- [ ] **Phase 2: Core Editing Surface** - Web-rendered CV with inline text editing for med-length-proff-cv template
- [ ] **Phase 3: Content Management** - Add, delete, and toggle entries and sections on the web CV
- [ ] **Phase 4: Drag and Drop** - Reorder sections and entries by dragging on the web CV itself
- [ ] **Phase 5: AI Integration** - Adapt import, tailor, and apply-to-job flows to work with the web CV editor
- [ ] **Phase 6: Route Integration** - Replace form builder and editor with web CV editor across all routes

## Phase Details

### Phase 1: Data Model Prep
**Goal**: Every CVFormData array entry has a stable unique ID, and all existing features work correctly with ID-bearing data
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Every array entry type in CVFormData (WorkEntry, EducationEntry, SkillCategory, ProjectEntry, AwardEntry, additional section entries) has a stable `id` field that persists across save/load cycles
  2. Existing AI features (import, tailor suggestions, match analysis) produce correct results when operating on ID-bearing entries
  3. Backend endpoints accept, preserve, and return stable IDs without data loss or ID reassignment
  4. Saved CV versions load with their original IDs intact (no ID regeneration on load)
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- Type definitions + ID generation helpers (frontend types, backend Pydantic, nanoid, ensure_ids)
- [x] 01-02-PLAN.md -- Backend consumers (storage migration, generate_latex flatten, tailor strip, extractor, backend tests)
- [x] 01-03-PLAN.md -- Frontend consumers (useFormBuilder, formDataPatch, UI sections, frontend tests)

### Phase 2: Core Editing Surface
**Goal**: Users can view and directly edit their CV as a web-rendered document that visually matches the LaTeX PDF output
**Depends on**: Phase 1
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, UX-01
**Success Criteria** (what must be TRUE):
  1. User can click on any text field in the web-rendered CV (name, job title, company, bullet point, date, skill, etc.) and edit it inline without leaving the page
  2. The web-rendered med-length-proff-cv template is visually equivalent to its LaTeX PDF output (same fonts, margins, section structure, visual hierarchy -- ~95% fidelity)
  3. User can edit multi-line bullet points naturally: Enter creates a new bullet below, Backspace on an empty bullet deletes it and moves focus to the previous bullet
  4. Empty fields display context-appropriate placeholder text (e.g., "Your Name", "Job Title at Company") that disappears when the user focuses the field
  5. Edits sync to CVFormData in real-time without cursor jumps or focus loss, and auto-save fires on a debounce with a visible save status indicator
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md -- EditableField + EditableBulletList components + useDirectEditor hook (core editing primitives)
- [x] 02-02-PLAN.md -- MedLengthTemplate component (web CV rendering with CSS matching resume.cls)
- [x] 02-03-PLAN.md -- useAutoSave hook + SaveIndicator component (auto-save with status indicator)
- [x] 02-04-PLAN.md -- DirectEditPage assembly + EB Garamond font + visual verification checkpoint

### Phase 3: Content Management
**Goal**: Users can grow and reshape their CV by adding new entries, removing entries, and toggling section visibility -- all directly on the web CV
**Depends on**: Phase 2
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, UX-02
**Success Criteria** (what must be TRUE):
  1. User can add a new entry to any section (new job, education, skill category, project, award) via a contextual "+" button that appears at the appropriate insertion point
  2. User can delete any entry via a contextual delete control, with a confirmation prompt for major entries (entire job, education entry) and instant deletion for minor entries (single bullet, skill)
  3. User can toggle any section's visibility on/off, hiding it from the rendered CV without losing the underlying data (toggling back restores it)
  4. A visual warning appears when content exceeds the page boundary, so the user knows their CV is longer than one page
**Plans**: 5 plans
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md -- Entry factory extraction + useDirectEditor CRUD extensions (addEntry, removeEntry, toggleSection)
- [x] 03-02-PLAN.md -- SectionWrapper, EntryWrapper, ConfirmDialog components + MedLengthTemplate integration
- [x] 03-03-PLAN.md -- Page break indicator (usePageBreak hook + PageBreakIndicator component + visual checkpoint)
- [x] 03-04-PLAN.md -- [GAP CLOSURE] Fix skills crash, grid layout collapse, and date placeholder spacing
- [x] 03-05-PLAN.md -- [GAP CLOSURE] UX polish: bullet hint, dialog visual polish, control sizing

### Phase 4: Drag and Drop
**Goal**: Users can reorder their CV's sections and entries by dragging directly on the web CV, without conflicting with text editing
**Depends on**: Phase 3
**Requirements**: DND-01, DND-02, DND-03, DND-04
**Success Criteria** (what must be TRUE):
  1. User can reorder top-level sections (e.g., move Education above Work Experience) by dragging section headers
  2. User can reorder entries within a section (e.g., move second job above first job) by dragging individual items
  3. Drag interactions use dedicated grip handles that are visually distinct from editable content -- clicking on text always initiates editing, never dragging
  4. After any drag operation, the CVFormData model (sectionOrder and array positions) reflects the new order and persists correctly on save
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [x] 04-01-PLAN.md -- DnD infrastructure: GripIcon, DropLine, useSectionDrag, useEntryDrag hooks, useDirectEditor reorder functions + tests
- [x] 04-02-PLAN.md -- Integration: wire grip handles and drop lines into SectionWrapper, EntryWrapper, MedLengthTemplate, DirectEditPage + visual checkpoint

### Phase 5: AI Integration
**Goal**: Existing AI features (import, apply-to-job, tailor suggestions) work seamlessly with the web CV editor, with section-aligned change cards in a side panel, and AI responses are fast enough to keep users in editing flow
**Depends on**: Phase 4
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07
**Success Criteria** (what must be TRUE):
  1. CV Import flow (PDF/DOCX/JSON upload) populates the web CV editor with extracted data -- the user sees their imported CV rendered in the web template, ready to edit inline
  2. Apply to Job flow applies AI-generated changes that are visible on the web CV (user can see before/after of each change)
  3. AI tailor suggestions appear as section-aligned cards in a side panel to the right of the web CV, with accept/reject controls per card
  4. User can accept or reject individual AI suggestions one by one, with each accepted change immediately reflected in the rendered CV
  5. CV import extraction and tailor suggestions respond in under 2 seconds using the fastest available model/provider (research Bedrock Llama, Groq, etc. for best speed/quality tradeoff)
**Plans**: 5 plans
**UI hint**: yes

Plans:
- [x] 05-01-PLAN.md -- EditorToolbar, ImportToast, MedLengthTemplate readOnly prop (UI primitives)
- [x] 05-02-PLAN.md -- ChangeCard, ChangePanel, useScrollSync (side panel components)
- [x] 05-03-PLAN.md -- DirectEditPage toolbar + import + download integration
- [x] 05-04-PLAN.md -- ApplyToJobScreen step 3 rewrite with web CV + ChangePanel
- [x] 05-05-PLAN.md -- Backend model selection and timing instrumentation for AI speed

### Phase 6: Route Integration
**Goal**: The web CV editor fully replaces the form builder and LaTeX editor across all application routes, completing the end-to-end direct-edit experience
**Depends on**: Phase 5
**Requirements**: ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, ROUTE-05
**Success Criteria** (what must be TRUE):
  1. The /build/form route renders the web CV editor (not CVFormBuilder) -- the form builder UI is fully replaced
  2. The primary editing experience is the web CV editor everywhere -- EditorScreen (LaTeX editor) is no longer the default editing surface
  3. Clicking a version on the Dashboard loads it into the web CV editor with all data intact and ready to edit
  4. The complete build flow works end-to-end: Landing -> Template Select -> Web CV Editor -> edit inline -> Download PDF (LaTeX compiles from CVFormData at download time)
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 06-01-PLAN.md -- NavBar + WorkingLayout + EditorActionsContext + App.tsx route restructure (DirectEditPage replaces CVFormBuilder)
- [x] 06-02-PLAN.md -- TemplateSelector "Coming soon" badge + Dashboard handleApplyToJob navigation fix
- [x] 06-03-PLAN.md -- Dead code removal (form-builder, editor, cv-import, useFormBuilder) + end-to-end verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Model Prep | 3/3 | Complete | - |
| 2. Core Editing Surface | 4/4 | Complete | - |
| 3. Content Management | 5/5 | Complete | - |
| 4. Drag and Drop | 2/2 | Complete | - |
| 5. AI Integration | 4/5 | In Progress|  |
| 6. Route Integration | 0/3 | Not started | - |

### Phase 7: Navigation Flow Consolidation

**Goal:** Collapse BuildChoiceScreen into Landing inline expansion panels, eliminate /build/start route, add smart Tune-for-role branching by base CV count, and reframe Dashboard as management-only screen
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, NAV-07, NAV-08
**Depends on:** Phase 6
**Plans:** 3 plans
**UI hint**: yes

**Success Criteria** (what must be TRUE):
  1. Clicking "Build my CV" on landing expands an inline panel with import drop zone and "Start from scratch" option (no route navigation to /build/start)
  2. Clicking "Tune for a role" with exactly 1 base CV navigates directly to /apply (bypassing Dashboard)
  3. Clicking "Tune for a role" with 0 base CVs shows inline empty state, with 2+ shows inline CV picker
  4. /build/start route no longer exists (returns 404)
  5. NavBar "+ New CV" and TemplateSelector "Back" both navigate to / (not /build/start)
  6. Dashboard is accessible only via "My CVs" nav link, no longer an intermediate Tune step

Plans:
- [x] 07-01-PLAN.md -- BuildExpansionPanel + TuneExpansionPanel components and CSS modules
- [x] 07-02-PLAN.md -- LandingScreen integration + route/nav updates + dead code removal
- [ ] 07-03-PLAN.md -- Integration test rewrite (NAV-01 through NAV-08) + visual checkpoint

### Phase 8: Streamlined Tune Flow: Save-as-Base Prompt, Inline Tune Panel, Base CV Dashboard

**Goal:** Replace the standalone /apply 3-step flow with an inline right-panel tune experience on the editor page, with progressive tiers (save-as-base, job details, diff review), and navigate to a scoped Dashboard view after saving a tailored version
**Requirements**: TUNE-01, TUNE-02, TUNE-03, TUNE-04, TUNE-05, TUNE-06, TUNE-07, TUNE-08, TUNE-09
**Depends on:** Phase 7
**Plans:** 4 plans
**UI hint**: yes

**Success Criteria** (what must be TRUE):
  1. Clicking "Tune for Job" on the editor page opens an inline right panel with 3 progressive tiers (no navigation away from /build/form)
  2. If the CV is unsaved, Tier 1 prompts user to save as a base CV (name only); if already saved, Tier 1 is skipped
  3. Completed tiers collapse to clickable summary rows; re-expanding preserves form state
  4. Tier 3 reuses ChangePanel/ChangeCard for diff review with accept/reject per card
  5. After saving a tailored CV, user is navigated to a scoped Dashboard showing only that base CV and its children
  6. /apply route redirects to /build/form with tune panel open
  7. ApplyToJobScreen component is deleted (replaced by TunePanel)
  8. NavBar shows tuning-active indicator; "+ New CV" removed from non-editor pages

Plans:
- [x] 08-01-PLAN.md -- EditorActionsContext isTuning extension + NavBar tuning indicator + remove "+ New CV"
- [x] 08-02-PLAN.md -- Navigation rewiring: /apply redirect, LandingScreen, TuneExpansionPanel, Dashboard scoped view
- [x] 08-03-PLAN.md -- TunePanel component (3 tiers) + DirectEditPage integration + visual checkpoint
- [x] 08-04-PLAN.md -- Dead code removal: delete ApplyToJobScreen

### Phase 9: Implement CV-to-job match scoring pipeline redesign — CVFormData input, two-pass hybrid pipeline, Groq fast inference, dimensional scoring

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 8
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 9 to break down)

### Phase 10: CV import speed overhaul — reduce import time from 60+ seconds to under 15 seconds via Haiku/Groq model swap, streaming progress, parallel extraction, and content caching

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 9
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 10 to break down)

### Phase 11: CV Save Identity — Name on first create, iterate in-place

**Goal:** Establish a named CV identity at the moment of creation (import or scratch) and make auto-save update that same version in-place, so the Dashboard never accumulates silent duplicates from editing activity
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09
**Depends on:** Phase 8
**Plans:** 5 plans

Plans:
- [ ] 11-01-PLAN.md -- Backend PATCH extension + api.updateVersionFull (cv_versions.py + api.ts)
- [ ] 11-02-PLAN.md -- NamePromptDialog + CVSwitcherDropdown new components
- [ ] 11-03-PLAN.md -- useAutoSave POST/PATCH branching + test extension
- [ ] 11-04-PLAN.md -- EditorActionsContext extension + TunePanel onTuneDetailsChange prop
- [ ] 11-05-PLAN.md -- DirectEditPage wiring + NavBar CVNameButton + breadcrumb + logo-only
