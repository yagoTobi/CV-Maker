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
- [ ] 02-01-PLAN.md -- EditableField + EditableBulletList components + useDirectEditor hook (core editing primitives)
- [ ] 02-02-PLAN.md -- MedLengthTemplate component (web CV rendering with CSS matching resume.cls)
- [ ] 02-03-PLAN.md -- useAutoSave hook + SaveIndicator component (auto-save with status indicator)
- [ ] 02-04-PLAN.md -- DirectEditPage assembly + EB Garamond font + visual verification checkpoint

### Phase 3: Content Management
**Goal**: Users can grow and reshape their CV by adding new entries, removing entries, and toggling section visibility -- all directly on the web CV
**Depends on**: Phase 2
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, UX-02
**Success Criteria** (what must be TRUE):
  1. User can add a new entry to any section (new job, education, skill category, project, award) via a contextual "+" button that appears at the appropriate insertion point
  2. User can delete any entry via a contextual delete control, with a confirmation prompt for major entries (entire job, education entry) and instant deletion for minor entries (single bullet, skill)
  3. User can toggle any section's visibility on/off, hiding it from the rendered CV without losing the underlying data (toggling back restores it)
  4. A visual warning appears when content exceeds the page boundary, so the user knows their CV is longer than one page
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Drag and Drop
**Goal**: Users can reorder their CV's sections and entries by dragging directly on the web CV, without conflicting with text editing
**Depends on**: Phase 3
**Requirements**: DND-01, DND-02, DND-03, DND-04
**Success Criteria** (what must be TRUE):
  1. User can reorder top-level sections (e.g., move Education above Work Experience) by dragging section headers
  2. User can reorder entries within a section (e.g., move second job above first job) by dragging individual items
  3. Drag interactions use dedicated grip handles that are visually distinct from editable content -- clicking on text always initiates editing, never dragging
  4. After any drag operation, the CVFormData model (sectionOrder and array positions) reflects the new order and persists correctly on save
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: AI Integration
**Goal**: Existing AI features (import, apply-to-job, tailor suggestions) work seamlessly with the web CV editor, with inline diffs on the CV itself, and AI responses are fast enough to keep users in editing flow
**Depends on**: Phase 4
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07
**Success Criteria** (what must be TRUE):
  1. CV Import flow (PDF/DOCX/JSON upload) populates the web CV editor with extracted data -- the user sees their imported CV rendered in the web template, ready to edit inline
  2. Apply to Job flow applies AI-generated changes that are visible on the web CV (user can see before/after of each change)
  3. AI tailor suggestions appear as inline diffs directly on the web CV text (highlighted changed text with accept/reject controls), not in a separate side panel
  4. User can accept or reject individual AI suggestions one by one, with each accepted change immediately reflected in the rendered CV
  5. CV import extraction and tailor suggestions respond in under 2 seconds using the fastest available model/provider (research Bedrock Llama, Groq, etc. for best speed/quality tradeoff)
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Route Integration
**Goal**: The web CV editor fully replaces the form builder and LaTeX editor across all application routes, completing the end-to-end direct-edit experience
**Depends on**: Phase 5
**Requirements**: ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, ROUTE-05
**Success Criteria** (what must be TRUE):
  1. The /build/form route renders the web CV editor (not CVFormBuilder) -- the form builder UI is fully replaced
  2. The primary editing experience is the web CV editor everywhere -- EditorScreen (LaTeX editor) is no longer the default editing surface
  3. Clicking a version on the Dashboard loads it into the web CV editor with all data intact and ready to edit
  4. The complete build flow works end-to-end: Landing -> Template Select -> Web CV Editor -> edit inline -> Download PDF (LaTeX compiles from CVFormData at download time)
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Model Prep | 3/3 | Complete | - |
| 2. Core Editing Surface | 0/4 | Planning complete | - |
| 3. Content Management | 0/0 | Not started | - |
| 4. Drag and Drop | 0/0 | Not started | - |
| 5. AI Integration | 0/0 | Not started | - |
| 6. Route Integration | 0/0 | Not started | - |
