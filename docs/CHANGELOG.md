# Changelog

All notable changes to CV Maker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **Build flow**: New "Build my CV" path — template-select → form-builder → editor (auto-compile)
- **Form builder** (`CVFormBuilder.tsx`): structured form with 6 sections (Personal Info, Work Experience, Education, Skills, Projects, Awards)
- **In-form PDF preview**: compiled CV shown alongside the form; drag-to-resize panel (300–760px)
- **Drag-and-drop section ordering**: reorder CV sections in sidebar nav; order reflected in compiled LaTeX output via `sectionOrder` field in `CVFormData`
- **Drag-and-drop entry ordering**: reorder individual entries within Work, Education, Skills, Projects, Awards sections
- **Dirty indicator**: Regenerate button turns amber with "●" suffix when form has changed since last compile
- **JSON export/import**: export form data as `cv-data.json`; re-import to restore all fields
- **Version management**: "Save Version" button in editor, saved versions dashboard accessible from landing
- **Version switcher**: in-editor dropdown to switch between saved versions
- **Landing screen**: intent-based entry — "Build my CV", "Tune for a job", "My Saved CVs"
- **LaTeX generation**: Jinja2-powered backend endpoint (`POST /api/generate-latex`) producing valid LaTeX from form data
- **Dynamic section ordering in LaTeX templates**: `med-length-proff-cv` and `mcdowell-cv` templates now loop over `section_order` context variable
- Backend CRUD for CV versions (`GET/POST/DELETE /api/cv-versions`, `GET /api/cv-versions/{id}`)

### Fixed
- `latex_escape` sequential-replacement bug: backslash was replaced first, causing subsequent `{`/`}` passes to re-escape `\textbackslash{}`. Rewrote as single-pass regex.

### Changed
- App initial screen changed from `template-select` to `landing`
- `AppScreen` type expanded to `'landing' | 'dashboard' | 'template-select' | 'form-builder' | 'editor'`
- CORS `allow_methods` expanded to include `DELETE`
- Template selection screen now has a Back button (returns to landing)

---

## [0.0.5] - 2026-02-28

### Added
- Template selection screen with 3 CV templates (Professional CV, Deedy Resume, McDowell CV)
- Template preview images on selection screen
- Support for multiple LaTeX engines (pdflatex and xelatex)
- Backend API endpoints for template listing and content retrieval (`/api/templates`, `/api/templates/{id}/preview`, `/api/templates/{id}/content`)
- "Templates" button in editor header to change template
- Bundled fonts (Lato, Raleway) for Deedy Resume template
- Bundled LaTeX packages (tabu.sty, varwidth.sty) for McDowell CV template
- Improved error logging with context lines for LaTeX compilation failures
- Design system documentation in ARCHITECTURE.md

### Changed
- Reorganized CV templates into `cv-templates/` folder
- Updated LaTeX compiler to automatically select correct engine per template
- Compiler now copies font directories for templates that require them
- **UI Redesign**: Replaced dark theme with Zed-inspired light aesthetic
  - New color palette: soft gray-blue backgrounds (#F8FAFC), white cards, blue accent (#3B82F6)
  - Typography: IBM Plex Sans for UI, IBM Plex Mono for code
  - Template selector: subtle grid pattern background, clean card design
  - Editor: professional, minimal styling with consistent border treatments

### Fixed
- React hooks violation causing blank screen after template selection
- Preview images not loading due to relative URL issue

---

## [0.0.4] - 2026-02-24

### Added
- Unsaved changes indicator in PDF preview component
- User refinement options in CV agent prompt

### Changed
- Enhanced PDF preview styling

---

## [0.0.3] - 2026-02-23

### Added
- Hiring manager insights in CV agent prompt
- Undo functionality for AI-suggested edits in ChatPanel
- Undo support for edits applied from JobInput component

### Changed
- Improved PDF page count extraction logic

---

## [0.0.2] - 2026-02-22

### Added
- Enhanced CV editing features

### Changed
- Improved UI responsiveness across components

---

## [0.0.1] - 2026-02-21

### Added
- Initial project setup
- React frontend with Vite and TypeScript
- FastAPI backend with Python
- LaTeX editor with CodeMirror integration
- PDF preview with live compilation
- AI chat assistant using AWS Bedrock
- Match analysis feature for CV-job compatibility
- LaTeX CV template
- User profile storage

---

## Version Numbering

This project uses semantic versioning:
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

## How to Update This File

When making changes:
1. Add entries under `[Unreleased]` during development
2. When releasing, move unreleased items to a new version section
3. Use categories: Added, Changed, Deprecated, Removed, Fixed, Security
