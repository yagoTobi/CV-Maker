# Changelog

All notable changes to CV Maker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **Apply to Job**: 3-step progressive flow for job applications (`/apply` route)
  - Step 1: Job Details (company, role, description)
  - Step 2: Match Analysis (reuses `POST /chat/match-analysis`)
  - Step 3: Review Changes — AI-generated field-level suggestions with per-change checkboxes
  - "Open in Tune Screen" button to continue in editor tune mode
  - `ApplyToJobScreen.tsx` with step navigation and animations
- **AI tailoring endpoint**: `POST /api/tailor/suggest-changes` generates field-level CV change suggestions
  - Returns granular changes per-bullet, per-skill with section, type, description, old/new values
  - `TAILOR_SUGGEST_PROMPT` in `prompts/cv_agent.py`
  - `routes/tailor.py` route handler
- **Editor tune mode**: Guided CV tailoring in the editor screen
  - Collapsible job input section (company, role, description) with smooth animation
  - `MatchSummaryBar` — compact score bar with gap count, progress indicator, expandable details
  - `TailorPanel` — AI suggestion cards with accept/skip/undo, inline diff view, inline editing
  - Auto-collapse reviewed cards to compact single-line (recovers ~58px per card)
  - "Accept All Remaining" bulk action
  - PDF auto-recompiles after each accepted change
  - Auto-compile on tune mode entry
  - `useTailor` hook managing suggestions, applied/skipped/pending state, estimated score
- **Dashboard actions**: "Tune for a Job" and "Apply to Job" buttons per base CV group
  - "Tune for a Job" navigates to `/editor` with `mode: 'tune'` and base CV loaded
  - "Apply to Job" navigates to `/apply` with base CV loaded
  - On-demand PDF download button from any version row
  - `cvFilename.ts` utility generates formatted filenames (e.g., `John_Smith_Google_Staff_SWE_CV.pdf`)
- **Form data patching**: `formDataPatch.ts` resolves nested paths like `workExperience[0].bullets[2]` for granular form updates
- **Storage abstraction layer**: Pluggable storage backends for user data persistence
  - `StorageBackend` Protocol with 11-method async interface (`services/storage.py`)
  - `FileStorage` implementation wraps existing JSON file I/O — zero behavior change (`services/file_storage.py`)
  - `DynamoStorage` implementation for DynamoDB single-table design (`services/dynamo_storage.py`)
  - `get_storage()` FastAPI dependency reads `STORAGE_BACKEND` env var (defaults to `file`)
  - `get_current_user()` dependency reads `X-User-Id` header (defaults to `"local"`)
  - DynamoDB table creation script (`backend/scripts/create_table.py`)
  - Migration script from FileStorage to DynamoDB (`backend/scripts/migrate_to_dynamodb.py`)
  - `STORAGE_BACKEND`, `DYNAMODB_TABLE_NAME`, `DYNAMODB_ENDPOINT_URL` environment variables
  - DynamoDB Local service in `docker-compose.yml`

### Changed
- **CV Import workflow simplification**: Merged import review into form builder
  - Removed dedicated `/import/review` screen (~965 lines)
  - Import path now goes: upload → template selector → form builder (with inline indicators)
  - New `ImportBanner` component displays source badge, confidence indicator, warnings at top of form
  - Field-level confidence badges show amber left border + "Needs review" badge for low-confidence fields
  - Banner auto-dismisses on first successful PDF generation
  - Import state cleanup on form builder unmount via `cvImport.reset()`
- **CV extraction optimization**: Switched from Sonnet 3.5 to Haiku 4.5 for PDF/DOCX extraction (faster, cheaper)
- **Storage migration**: All routes now use `StorageBackend` abstraction
  - `routes/cv_versions.py`, `routes/user_data.py`, `routes/voice_interview.py` refactored to use storage dependency
  - Voice profile storage consolidated into main `user_data/` directory (was split to `backend/user_data/` previously)
  - `X-User-Id` header added to CORS `allow_headers` in `main.py`
- **Docker compose**: Consolidated to single data volume `cv-maker-data` (removed `cv-maker-voice-data`), added DynamoDB Local service

### Added
- **Voice interview feature**: Pipecat + Amazon Nova Sonic speech-to-speech pipeline
  - VoiceWidget in CVFormBuilder sidebar with animated orb, transcript feed, mic controls
  - WebSocket-based voice session (`WS /api/ws/voice-interview`) with Pipecat pipeline
  - Nova Sonic LLM for natural conversation (16kHz input, 24kHz output)
  - TranscriptCollector frame processor for session transcript aggregation
  - CV data extraction from voice transcript (`POST /api/voice/extract-cv`)
  - Voice profile persistence for returning users (`GET/POST /api/voice/profile`)
  - Alpha quality: optional dependency (`pip install 'pipecat-ai[aws]'`), no session persistence, no error recovery
- **React Router v6 navigation**: URL-based routing with browser back/forward support
  - 8 routes: `/`, `/build/start`, `/build`, `/build/form`, `/import`, `/apply`, `/dashboard`, `/editor`
  - `react-router-dom` v6 with `<Routes>` and `<Route>` components in App.tsx
  - Navigation via `useNavigate()` hook, state passed via `location.state`
- **AppContext refactor**: Centralized state management replacing App.tsx god component
  - `contexts/AppContext.tsx` holds all shared state (versions, formData, template selection)
  - `useAppContext()` hook provides state and handlers to all screens
  - App.tsx reduced to route definitions only (~25 lines)
- **BuildChoiceScreen**: New "Build my CV" entry flow
  - Choice screen with "Start from scratch" and "Import existing CV" options
  - Inline file upload in "Import" card for streamlined flow
  - Route: `/build/start`
- **Job-centric version management**: Hierarchical dashboard with base CVs and nested job applications
  - Base CVs (e.g., "Creative CV", "Consulting CV") act as templates for job applications
  - Job applications (e.g., "Spotify Product Designer") are derived from base CVs with job-specific tailoring
  - Dashboard groups versions by parent base CV: "Creative CV (3 applications)"
  - `[+ New]` button on each base CV to quickly create a job application from it
  - `[Move...]` action to re-parent job applications to different base CVs
  - Ungrouped section for orphaned versions without parent
  - AI grouping suggestions: "💡 Suggested: Group with Creative CV (78% similar)"
  - Auto-naming for job applications: uses company + role or auto-generates "Application {date}"
- "Tune for a job" flow now shows base CV picker (select existing base or start from scratch)
- Save modal redesigned: choose "Base CV" or "Job Application" + select parent + job details
- `parentVersionId` and `role` fields added to CVVersion schema
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
- `latex_url_escape` Jinja2 filter for safe URL escaping in `\href{}` commands (only escapes `%` and `#`, lighter than full `latex_escape`)
- Template rendering test suite (`backend/tests/test_template_rendering.py`) — 21 tests covering minimal, maximal, special characters, empty sections, empty bullets, no contact info, section ordering, and filter functions
- Template compilation test suite (`backend/tests/test_template_compilation.py`) — 18 tests that render templates then compile through pdflatex/xelatex, covering unicode, PDF size validation; marked `@pytest.mark.slow`
- `backend/pytest.ini` with `slow` marker registration
- Deedy template: section drag-and-drop disabled in form builder sidebar (fixed two-column layout ignores `sectionOrder`)
- Generic `additionalSections` schema — supports any CV section type (Leadership, Certifications, Volunteer Work, etc.) without per-section schema changes
- `AdditionalEntry` and `AdditionalSection` types (frontend + backend)
- `Project.bullets` field for detailed project achievements
- Additional sections rendering in all 3 Jinja2 templates (Professional + McDowell via `section_order`, Deedy in right column)
- Form builder UI for additional sections (add/remove sections, editable titles, full entry CRUD)
- "Add Section" button in form builder sidebar nav
- Custom favicon (`favicon.svg`) replacing default Vite icon
- Page title changed to "CV Maker" in `index.html`

### Fixed
- **McDowell CV template**: Bullet points overlapping with multi-line section headers
  - Root cause: `cvsubsection` environment required manual `[n]` line count parameter; Jinja2 template always passed default `[1]`
  - Solution: Auto-detect header line count using `\savebox` to measure header height in `mcdowellcv.cls`
  - Compare measured height against `1.5x` and `2.5x` `\baselineskip` thresholds to select correct vspace (single/double/multi-line)
  - Backward compatible: optional `[n]` parameter still accepted but ignored
  - Eliminates need for Jinja2 template to calculate line count
- `latex_escape` sequential-replacement bug: backslash was replaced first, causing subsequent `{`/`}` passes to re-escape `\textbackslash{}`. Rewrote as single-pass regex.
- Deedy template: skills `\textbullet{}` separator was being mangled by `latex_escape` — fixed with `map('latex_escape')` before `join`
- Deedy template: contact header line could have leading/trailing `\,|\,` separators when fields were missing — rebuilt with `contact_parts` array + `join`
- Professional CV: `\href{}` URLs now escaped with `latex_url_escape` to handle `%` and `#` in URLs
- Deedy template: `\href{}` URLs now escaped with `latex_url_escape`
- Professional CV: empty bullets array no longer renders inside `rSubsection` (was valid but inconsistent with other templates)
- Professional CV: empty `\address{}` no longer rendered when no contact info exists
- Professional CV: education entries with no GPA and no details no longer produce empty `\begin{list}` (invalid LaTeX) — renders header directly instead
- McDowell CV: empty `\address{}` and `\contacts{}` blocks guarded with conditionals
- Deedy template: removed `\lastupdated` command (was printing misleading compilation date)

### Changed
- **Navigation architecture**: Replaced screen-based state machine with React Router v6
  - App.tsx is now route definitions only; removed `currentScreen` state
  - Navigation via `useNavigate()` and URL changes (enables browser back/forward)
  - State passed between routes via `location.state` object
- **State management**: App.tsx god component pattern replaced with AppContext
  - All shared state moved to `contexts/AppContext.tsx`
  - Components access state via `useAppContext()` hook
- **Form builder right panel**: PDF preview with "Advanced Editor" escape hatch to `/editor`
- CORS `allow_methods` expanded to include `DELETE`
- Template selection screen now has a Back button (returns to landing)
- Landing page layout: two-column (branding left, actions right), responsive collapse on mobile
- `sectionOrder` now supports `additional-{index}` keys for dynamic additional sections
- Form builder sidebar now includes VoiceWidget pill trigger with overlay portal

---

## [0.0.6] - 2026-03-11

### Added
- **CV Import feature**: upload existing CV from PDF, DOCX, or JSON formats
- CV Import upload endpoint (`POST /api/cv-import`) accepting PDF, DOCX, JSON
- CV Import AI extraction via AWS Bedrock (`cv_extractor.py`) with structured prompt
- CV Import review screen (`CVImportReview.tsx`) with per-field confidence indicators and inline editing
- CV Import upload screen (`CVImportUpload.tsx`) with drag-and-drop file upload
- "Import existing CV" card on landing screen
- DOCX extraction preserves list markers, bold text, heading levels, and indentation
- Extraction prompt includes bullet granularity preservation, entry order preservation, section order detection
- `max_tokens` configurable on Bedrock client (8192 for extraction, 4096 default for chat)
- Truncation detection in extraction response parsing
- Comprehensive test suite for CV extraction and import pipeline (`backend/tests/test_cv_extraction.py`)

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
