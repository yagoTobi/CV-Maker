# Requirements: CV-Maker Direct-Edit Web CV

**Defined:** 2026-03-29
**Core Value:** The CV itself is the editor. Users type directly on what they'll download.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Model

- [ ] **DATA-01**: All CVFormData array entry types (workExperience, education, skills, projects, awards, additionalSections) have stable unique IDs (not positional indices)
- [ ] **DATA-02**: Existing features (AI tailor, import, version save/load) work correctly with ID-bearing entries
- [ ] **DATA-03**: Backend endpoints accept and preserve stable IDs on array entries

### Core Editing

- [ ] **EDIT-01**: User can click on any text field in the web CV and edit it inline (contentEditable)
- [ ] **EDIT-02**: Web-rendered CV for med-length-proff-cv template visually matches LaTeX PDF output (~95% fidelity — same fonts, margins, layout, section structure)
- [ ] **EDIT-03**: User can edit multi-line bullet points naturally (Enter creates new bullet, Backspace on empty bullet deletes it)
- [ ] **EDIT-04**: Empty fields show placeholder text that disappears on focus ("Your Name", "Job Title at Company", etc.)
- [ ] **EDIT-05**: Edits to the web CV update the hidden CVFormData model in real-time
- [ ] **EDIT-06**: CVFormData changes re-render the web CV without losing cursor position or focus

### Content Management

- [ ] **CONT-01**: User can add a new entry to any section via contextual "+" button (new job, education, skill category, project, etc.)
- [ ] **CONT-02**: User can delete any entry via contextual delete control (with confirmation for major entries like entire jobs)
- [ ] **CONT-03**: User can toggle section visibility on/off without deleting underlying data
- [ ] **CONT-04**: New entries appear in the correct position with empty/placeholder content ready to edit

### Editor UX

- [ ] **UX-01**: CV auto-saves to backend on debounced CVFormData changes with visible save status indicator
- [ ] **UX-02**: Visual indicator appears when content exceeds the page boundary (page break / overflow warning)

### Drag and Drop

- [ ] **DND-01**: User can reorder sections by dragging section headers on the web CV
- [ ] **DND-02**: User can reorder entries within a section by dragging individual items (jobs, education entries, etc.)
- [ ] **DND-03**: Drag-and-drop updates sectionOrder and array positions in CVFormData
- [ ] **DND-04**: Drag interactions do not conflict with inline text editing (grip handles separate from editable content)

### AI Integration

- [ ] **AI-01**: CV Import flow populates the web CV editor (imported data loads into web template, not form builder)
- [ ] **AI-02**: Apply to Job flow works with the web CV editor (changes applied and visible on the web CV)
- [ ] **AI-03**: AI tailor suggestions appear as inline diffs on the web CV itself (not in a side panel)
- [ ] **AI-04**: User can accept or reject individual AI suggestions directly on the web CV

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

- **AI-05**: AI writing assist per-field (sparkle icon -> alternatives)
- **AI-06**: Real-time match score updates as user edits

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
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| EDIT-01 | TBD | Pending |
| EDIT-02 | TBD | Pending |
| EDIT-03 | TBD | Pending |
| EDIT-04 | TBD | Pending |
| EDIT-05 | TBD | Pending |
| EDIT-06 | TBD | Pending |
| CONT-01 | TBD | Pending |
| CONT-02 | TBD | Pending |
| CONT-03 | TBD | Pending |
| CONT-04 | TBD | Pending |
| UX-01 | TBD | Pending |
| UX-02 | TBD | Pending |
| DND-01 | TBD | Pending |
| DND-02 | TBD | Pending |
| DND-03 | TBD | Pending |
| DND-04 | TBD | Pending |
| AI-01 | TBD | Pending |
| AI-02 | TBD | Pending |
| AI-03 | TBD | Pending |
| AI-04 | TBD | Pending |
| ROUTE-01 | TBD | Pending |
| ROUTE-02 | TBD | Pending |
| ROUTE-03 | TBD | Pending |
| ROUTE-04 | TBD | Pending |
| ROUTE-05 | TBD | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after initial definition*
