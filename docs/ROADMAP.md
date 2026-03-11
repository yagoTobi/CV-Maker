# Roadmap

## Current Status

CV-Maker is in **Phase 1: Nail the Creation Loop** (see [PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md) for full phased plan). The core Build and Tune flows are functional. CV Import feature is actively being built — backend extraction endpoint is complete, frontend review screen is wired up and in progress.

---

## Completed Features

**Core Editor & Compilation**
- [x] LaTeX CV editor with syntax highlighting (CodeMirror)
- [x] Live PDF compilation and preview
- [x] Support for 3 LaTeX engines: pdflatex (Professional CV) and xelatex (Deedy, McDowell)
- [x] Template-aware compiler with bundled fonts and packages

**AI Assistant**
- [x] AI chat assistant for CV refinement (AWS Bedrock / Claude 3.5 Sonnet v2)
- [x] Match analysis scoring (CV vs. job description)
- [x] One-click edit suggestions from AI
- [x] Undo functionality for applied edits
- [x] Streaming responses via SSE

**Templates**
- [x] 3 CV templates: Professional CV (med-length-proff-cv), Deedy Resume, McDowell CV
- [x] Template preview images on selection screen
- [x] LaTeX generation via Jinja2 templates with custom delimiters `(( ))` / `(% %)`
- [x] Dynamic section ordering (Professional CV and McDowell CV)
- [x] Template quality improvements: URL escaping, edge case guards, single-pass regex escape

**Form Builder (Build Path)**
- [x] Structured form with 6 standard sections: Personal Info, Work Experience, Education, Skills, Projects, Awards
- [x] Generic `additionalSections` support for custom sections (Leadership, Certifications, etc.)
- [x] Live PDF preview alongside form with drag-to-resize panel (300-760px)
- [x] Drag-and-drop section ordering in sidebar nav (reflected in compiled LaTeX via `sectionOrder`)
- [x] Drag-and-drop entry ordering within sections
- [x] Dirty indicator on Regenerate button (amber + "●" when form changed since last compile)
- [x] JSON export/import of form data (`cv-data.json` download/upload)

**Screen Flow & Navigation**
- [x] Landing screen with intent-based entry: "Build my CV", "Tune for a job", "My Saved CVs"
- [x] Template selection screen (Build path only)
- [x] Dashboard for saved versions (grid view, load, delete)
- [x] In-editor version switcher (save / switch between saved versions)

**Version Management**
- [x] Save versions with metadata (name, template, job description, company, match score)
- [x] Load saved versions into editor
- [x] Delete versions
- [x] Version storage as JSON files in `user_data/versions/`

**CV Import (In Progress)**
- [x] Backend: Upload endpoint (`POST /api/cv-import`) accepting PDF, DOCX, JSON (10MB limit)
- [x] Backend: AI extraction service for structured data extraction via Claude
- [x] Frontend: Upload screen (`CVImportUpload.tsx`)
- [x] Frontend: Review screen (`CVImportReview.tsx`) — wired up, polish in progress
- [ ] End-to-end testing and accuracy tuning across real CV formats
- [ ] Image-based PDF detection and graceful fallback messaging

**Testing**
- [x] Backend template rendering test suite (21 tests covering minimal, maximal, special chars, empty sections, section ordering, filters)
- [x] Backend template compilation test suite (18 tests with pdflatex/xelatex, unicode, PDF size validation)

**UI/UX**
- [x] Zed-inspired light design system (soft gray-blue backgrounds, clean typography)
- [x] Unsaved changes indicator in PDF preview
- [x] Page count warning (>1 page)

---

## Phase 1 Remaining (Current Focus)

See [PRODUCT_STRATEGY.md § Phase 1](PRODUCT_STRATEGY.md#phase-1--nail-the-creation-loop-current-focus) for full context.

**High Priority**
- [ ] CV Import end-to-end polish (review screen UX, confidence flagging, edge case handling)
- [ ] Auto-save functionality (localStorage or backend persistence)
- [ ] ATS optimization feedback built into match analysis (keyword gaps, formatting advice)
- [ ] Onboarding clarity / first-run experience (tooltips, guided flow, example data)

**Template Quality (Ongoing)**
- [ ] Additional template polish (consistent spacing, edge cases, date formatting)
- [ ] Template preview images accuracy (ensure previews match actual output)

---

## Phase 2: AI Sharpening (2–4 months out)

See [PRODUCT_STRATEGY.md § Phase 2](PRODUCT_STRATEGY.md#phase-2--sharpen-the-ai-layer-24-months-out).

- [ ] One-click tailored version generation (AI generates role-specific CV automatically)
- [ ] Skills gap analysis (flag missing skills from JD with suggestions)
- [ ] Section-by-section feedback (ranked feedback per section with reasoning)
- [ ] Cover letter generation tied to specific CV version and JD
- [ ] Industry-specific coaching (suggestions calibrated to role's industry norms)

---

## Phase 3: Version Intelligence (4–6 months out)

See [PRODUCT_STRATEGY.md § Phase 3](PRODUCT_STRATEGY.md#phase-3--version-intelligence-46-months-out).

- [ ] Version comparison (side-by-side diff of two CV versions)
- [ ] Version tagging (attach role, company, or JD to a saved version)
- [ ] Lightweight application log (note on version: "sent to Spotify, 14 Mar" — no status tracking)

---

## Phase 4: Platform & Growth (6+ months)

See [PRODUCT_STRATEGY.md § Phase 4](PRODUCT_STRATEGY.md#phase-4--platform--growth-6-months).

- [ ] User authentication and cloud storage
- [ ] LinkedIn profile import (OAuth-based)
- [ ] Import from previously exported CV-Maker PDF (high-fidelity round-trip)
- [ ] Shareable review links (send CV for feedback within tool)
- [ ] Application tracking (revisit based on user demand)
- [ ] Enterprise / team accounts (custom branding, API access)

---

## Technical Debt

**Frontend**
- [ ] Test suite (none yet — only backend has tests)
- [ ] Error handling improvements (more graceful failure modes, user-facing error messages)
- [ ] Accessibility audit (keyboard navigation, screen reader support, ARIA labels)

**Backend**
- [ ] Request validation and sanitization improvements
- [ ] Logging and monitoring (structured logs, error tracking)

**DevOps**
- [ ] CI/CD pipeline (automated tests on PR, deployment automation)
- [ ] Docker containerization (for simplified deployment and dev environment setup)

**Performance**
- [ ] LaTeX compilation caching (reduce redundant compiles for unchanged content)
- [ ] Frontend bundle size optimization (code splitting, lazy loading)

---

## Out of Scope (Explicitly Deferred)

The following are valuable but explicitly not part of the current roadmap. See [PRODUCT_STRATEGY.md § What We're Not Building (Right Now)](PRODUCT_STRATEGY.md#what-were-not-building-right-now) for reasoning.

- Application tracking (unless passive automation is viable)
- Job board integration
- Email client / LinkedIn messaging integration
- Multi-user collaboration features (until enterprise phase)
