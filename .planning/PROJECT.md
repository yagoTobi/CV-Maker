# CV-Maker: Direct-Edit Web CV

## What This Is

A CV builder where users edit directly on a web-rendered version of their CV that looks exactly like the final PDF. Users pick a template, type inline on the web CV, and download a LaTeX-compiled PDF. AI features (import, job tailoring, match analysis) work seamlessly with the new editing experience. The current form-builder split-screen is replaced entirely.

## Core Value

The CV itself is the editor. Users type directly on what they'll download — no form fields, no split screen, no mental mapping between inputs and output.

## Requirements

### Validated

- [x] LaTeX PDF compilation via pdflatex/xelatex with 3 templates (med-length-proff-cv, deedy-resume, mcdowell-cv) -- existing
- [x] Structured CVFormData model (personalInfo, workExperience, education, skills, projects, awards, additionalSections) -- existing
- [x] CV import from PDF/DOCX/JSON via AI extraction -- existing
- [x] AI match analysis (job fit scoring with structured response) -- existing
- [x] AI-powered tailor suggestions (field-level form data changes) -- existing
- [x] Hierarchical version management (base CVs with job application children) -- existing
- [x] Template selection with previews -- existing
- [x] Drag-and-drop section reordering -- existing
- [x] Storage abstraction (FileStorage + DynamoStorage) -- existing
- [x] Docker deployment with TeX Live -- existing
- [x] Stable unique IDs on all CVFormData array entries (BulletItem, SkillItem, entry-level IDs) -- Phase 1
- [x] Auto-migration of legacy saved versions (IDs generated on load, persisted) -- Phase 1
- [x] Backend accepts and preserves stable IDs across all endpoints -- Phase 1
- [x] Web CV editor with inline text editing (contentEditable on med-length-proff-cv) -- Phase 2
- [x] Visual fidelity to LaTeX PDF (~95% match with EB Garamond, resume.cls CSS) -- Phase 2
- [x] Multi-line bullet editing (Enter/Backspace) -- Phase 2
- [x] Placeholder text on empty fields -- Phase 2
- [x] Auto-save with debounce and "Saved"/"Saving..." indicator -- Phase 2
- [x] Contextual "+" buttons for adding new entries (jobs, education, skills, etc.) -- Phase 3
- [x] Delete entries with confirmation prompt (major) or instant deletion (minor) -- Phase 3
- [x] Toggle section visibility on/off without losing data -- Phase 3
- [x] Page overflow indicator (dashed "Page 2" line via ResizeObserver) -- Phase 3
- [x] Drag-and-drop reordering on the web CV (section + entry level, grip handles in left gutter) -- Phase 4
- [x] AI Import flow adapted to populate web CV editor (EditorToolbar → file picker → ImportToast) -- Phase 5
- [x] AI Tune for a Job flow adapted to apply changes on web CV (ChangePanel + ChangeCard with word-level diff) -- Phase 5
- [x] Apply to Job flow adapted to work with web CV editor (step 3 rewritten: read-only CV + ChangePanel) -- Phase 5
- [x] AI speed optimization: Haiku 4.5 default for tailor suggestions, configurable via TAILOR_MODEL_ID -- Phase 5

### Active

(All requirements validated — milestone v1.0 complete)

### Validated in Phase 6

- [x] CVFormData remains hidden source of truth (web CV reads/writes to it) -- Phase 6
- [x] LaTeX compilation fires only at download time -- Phase 6
- [x] Full replacement of CVFormBuilder (no form fields UI) -- Phase 6
- [x] Dashboard and version switching load into web CV editor -- Phase 6
- [x] Route structure updated (web CV editor replaces /build/form and /editor) -- Phase 6

### Out of Scope

- Web versions of all 3 templates in v1 -- start with 1, expand later
- Real-time collaboration / multi-user editing -- single-user focus
- Server-side rendering of web CV -- client-side React rendering
- Removing LaTeX compilation pipeline -- still needed for PDF download
- Mobile-optimized editing -- desktop-first for direct-edit experience

## Context

This is a brownfield project with a working CV builder (React 19 + FastAPI + LaTeX). The current UX uses a form-on-left / PDF-preview-on-right pattern. The core insight driving this work: users shouldn't fill out a form and watch a preview update -- they should just type on their CV.

The main technical challenge is creating a web-rendered CV component for each template that visually matches the LaTeX-compiled PDF output (fonts, spacing, layout). The first template proves the architecture; subsequent templates follow the same pattern.

The CVFormData model is well-established and used across AI features, storage, and LaTeX generation. Keeping it as the hidden source of truth means the backend, AI features, and compilation pipeline require minimal changes. The work is primarily frontend: a new rendering/editing layer that replaces CVFormBuilder.

Key unknowns:
- Which template to start with (simplest single-column layout likely easiest)
- How close "pixel-perfect" can realistically get with CSS vs LaTeX typography
- Interaction design for complex fields (date ranges, multi-line bullets, skill categories)

## Constraints

- **Data model**: CVFormData stays as-is -- web CV editor must read/write the same structure
- **Backend**: Minimal backend changes -- LaTeX generation and compilation pipeline unchanged
- **Templates**: Web template components must be maintainable alongside LaTeX templates
- **AI features**: Import, Tune, Apply to Job must all work with the new editor
- **Browser**: Modern browsers only (CSS grid, contenteditable, modern APIs acceptable)
- **AI speed**: CV import, tailor suggestions, and per-field AI assist must target sub-2 second response times to keep users in editing flow. Match analysis can take longer. Research fastest model/provider (Bedrock Llama, Groq, etc.) during AI integration phase.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace form builder entirely (not coexist) | Simpler UX, single editing paradigm, no confusion about which editor to use | -- Pending |
| CVFormData stays as hidden source of truth | Minimizes backend changes, AI features and LaTeX pipeline work unchanged | -- Pending |
| Start with 1 template web version | Proves the architecture before investing in all 3 | -- Pending |
| Inline editing (not popup/modal) | Most natural "typing on a document" experience | -- Pending |
| Contextual "+" buttons for adding content | Discoverable without cluttering the CV view | -- Pending |
| Prioritize AI speed over intelligence for in-flow features | Users in editing flow can't tolerate 10s AI calls; sub-2s keeps them engaged. Use fastest available models for import/tailor. | Haiku 4.5 default for tailor (Phase 5) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after Phase 6 completion — all 6 phases complete, milestone v1.0 done*
