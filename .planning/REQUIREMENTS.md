# Requirements: CV-Maker Direct-Edit Web CV

**Defined:** 2026-03-29
**Core Value:** The CV itself is the editor. Users type directly on what they'll download.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Model

- [x] **DATA-01**: All CVFormData array entry types (workExperience, education, skills, projects, awards, additionalSections) have stable unique IDs (not positional indices)
- [x] **DATA-02**: Existing features (AI tailor, import, version save/load) work correctly with ID-bearing entries
- [x] **DATA-03**: Backend endpoints accept and preserve stable IDs on array entries

### Core Editing

- [x] **EDIT-01**: User can click on any text field in the web CV and edit it inline (contentEditable)
- [x] **EDIT-02**: Web-rendered CV for med-length-proff-cv template visually matches LaTeX PDF output (~95% fidelity — same fonts, margins, layout, section structure)
- [x] **EDIT-03**: User can edit multi-line bullet points naturally (Enter creates new bullet, Backspace on empty bullet deletes it)
- [x] **EDIT-04**: Empty fields show placeholder text that disappears on focus ("Your Name", "Job Title at Company", etc.)
- [x] **EDIT-05**: Edits to the web CV update the hidden CVFormData model in real-time
- [x] **EDIT-06**: CVFormData changes re-render the web CV without losing cursor position or focus

### Content Management

- [x] **CONT-01**: User can add a new entry to any section via contextual "+" button (new job, education, skill category, project, etc.)
- [x] **CONT-02**: User can delete any entry via contextual delete control (with confirmation for major entries like entire jobs)
- [x] **CONT-03**: User can toggle section visibility on/off without deleting underlying data
- [x] **CONT-04**: New entries appear in the correct position with empty/placeholder content ready to edit

### Editor UX

- [x] **UX-01**: CV auto-saves to backend on debounced CVFormData changes with visible save status indicator
- [x] **UX-02**: Visual indicator appears when content exceeds the page boundary (page break / overflow warning)

### Drag and Drop

- [x] **DND-01**: User can reorder sections by dragging section headers on the web CV
- [x] **DND-02**: User can reorder entries within a section by dragging individual items (jobs, education entries, etc.)
- [x] **DND-03**: Drag-and-drop updates sectionOrder and array positions in CVFormData
- [x] **DND-04**: Drag interactions do not conflict with inline text editing (grip handles separate from editable content)

### AI Integration

- [x] **AI-01**: CV Import flow populates the web CV editor (imported data loads into web template, not form builder)
- [x] **AI-02**: Apply to Job flow works with the web CV editor (changes applied and visible on the web CV)
- [x] **AI-03**: AI tailor suggestions appear as inline diffs on the web CV itself (not in a side panel)
- [x] **AI-04**: User can accept or reject individual AI suggestions directly on the web CV
- [x] **AI-05**: CV import extraction responds in under 2 seconds using fastest available model/provider
- [x] **AI-06**: Tailor suggestion generation targets sub-2 second response using fast model/provider
- [x] **AI-07**: AI integration phase researches and selects fastest model/provider for each AI task (Bedrock Llama, Groq, etc.)

### Route Integration

- [ ] **ROUTE-01**: Web CV editor replaces CVFormBuilder at /build/form route
- [ ] **ROUTE-02**: Web CV editor replaces EditorScreen as the primary editing experience
- [ ] **ROUTE-03**: Dashboard version switching loads selected version into web CV editor
- [ ] **ROUTE-04**: Template selection navigates to web CV editor (not form builder)
- [ ] **ROUTE-05**: Build flow end-to-end works: Landing -> Template Select -> Web CV Editor -> Download PDF

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Editor Polish

- **POLISH-01**: Undo/redo (Cmd+Z / Cmd+Shift+Z) with custom state history stack
- **POLISH-02**: Keyboard shortcuts for common actions
- **POLISH-03**: Keyboard-driven field navigation (Tab/Shift+Tab between fields)
- **POLISH-04**: Smart date entry (natural language date parsing)
- **POLISH-05**: Contextual formatting toolbar (select text -> floating toolbar)
- **POLISH-06**: Inline link editing without modal

### AI Enhancements

- **AI-08**: AI writing assist per-field (sparkle icon -> alternatives)
- **AI-09**: Real-time match score updates as user edits

### Additional Templates

- **TMPL-01**: Web template for mcdowell-cv (single column, Times New Roman)
- **TMPL-02**: Web template for deedy-resume (two-column, Lato + Raleway)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rich text / arbitrary formatting | Templates control visual design; users edit content, not style |
| Free-form layout editing (Canva-style) | Fixed template layouts ensure professional output and LaTeX compatibility |
| Real-time LaTeX compilation | Web rendering IS the preview; LaTeX only at download |
| Collaborative / multi-user editing | CV editing is single-user; massive CRDT/OT complexity |
| Page/margin customization | Templates control layout; advanced users use LaTeX editor |
| Mobile inline editing | Desktop-first; touch targets too small for CV-scale document |
| Version diffing UI | Undo/redo within session + version management covers this |
| User-defined section schemas | additionalSections handles 95% of cases |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1: Data Model Prep | Complete |
| DATA-02 | Phase 1: Data Model Prep | Complete |
| DATA-03 | Phase 1: Data Model Prep | Complete |
| EDIT-01 | Phase 2: Core Editing Surface | Complete |
| EDIT-02 | Phase 2: Core Editing Surface | Complete |
| EDIT-03 | Phase 2: Core Editing Surface | Complete |
| EDIT-04 | Phase 2: Core Editing Surface | Complete |
| EDIT-05 | Phase 2: Core Editing Surface | Complete |
| EDIT-06 | Phase 2: Core Editing Surface | Complete |
| UX-01 | Phase 2: Core Editing Surface | Complete |
| CONT-01 | Phase 3: Content Management | Complete |
| CONT-02 | Phase 3: Content Management | Complete |
| CONT-03 | Phase 3: Content Management | Complete |
| CONT-04 | Phase 3: Content Management | Complete |
| UX-02 | Phase 3: Content Management | Complete |
| DND-01 | Phase 4: Drag and Drop | Complete |
| DND-02 | Phase 4: Drag and Drop | Complete |
| DND-03 | Phase 4: Drag and Drop | Complete |
| DND-04 | Phase 4: Drag and Drop | Complete |
| AI-01 | Phase 5: AI Integration | Complete |
| AI-02 | Phase 5: AI Integration | Complete |
| AI-03 | Phase 5: AI Integration | Complete |
| AI-04 | Phase 5: AI Integration | Complete |
| AI-05 | Phase 5: AI Integration | Complete |
| AI-06 | Phase 5: AI Integration | Complete |
| AI-07 | Phase 5: AI Integration | Complete |
| ROUTE-01 | Phase 6: Route Integration | Pending |
| ROUTE-02 | Phase 6: Route Integration | Pending |
| ROUTE-03 | Phase 6: Route Integration | Pending |
| ROUTE-04 | Phase 6: Route Integration | Pending |
| ROUTE-05 | Phase 6: Route Integration | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap creation*
