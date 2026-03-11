# Architecture

## System Overview

CV Maker follows a client-server architecture with a React frontend and FastAPI backend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
│                                                                              │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐                 │
│  │  Landing /     │  │  Form Builder    │  │   Editor     │                 │
│  │  Dashboard     │  │  (Build path)    │  │  (both paths)│                 │
│  └────────────────┘  └──────────────────┘  └──────────────┘                 │
│                                                                              │
│  Screens: landing → template-select → form-builder → editor                 │
│           landing → editor (Tune path, Professional CV pre-loaded)          │
│           landing → dashboard → editor (load saved version)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend (FastAPI)                               │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Compile API  │  │ Generate LaTeX│  │   Chat API   │  │  Version API │    │
│  │ /compile     │  │ /generate-   │  │  /chat       │  │ /cv-versions │    │
│  │              │  │  latex       │  │  /match-     │  │              │    │
│  └──────────────┘  └──────────────┘  │  analysis    │  └──────────────┘    │
│         │                │           └──────────────┘         │            │
│  ┌──────────────┐        │                   ▼                 ▼            │
│  │  Import API  │        ▼            ┌──────────────┐  ┌──────────────┐    │
│  │  /cv-import  │  ┌──────────────┐  │ AWS Bedrock  │  │  JSON Files  │    │
│  └──────────────┘  │Jinja2 Engine │  │  (Claude)    │  │ user_data/   │    │
│         │          │(.tex.j2      │  │              │  │ versions/    │    │
│         ▼          │  templates)  │  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  └──────────────┘                                        │
│  │LaTeX Compiler│                                                           │
│  │(pdflatex/    │                                                           │
│  │ xelatex)     │                                                           │
│  └──────────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Flow

```
AppScreen = 'landing' | 'dashboard' | 'template-select' | 'form-builder' | 'editor' | 'import-upload' | 'import-review'

landing
  ├── "Build my CV"       → template-select → form-builder → (Generate CV) → editor
  ├── "Import existing CV" → import-upload → import-review → template-select → form-builder
  ├── "Tune for a job"    → editor (Professional CV pre-loaded, left job panel visible)
  └── "My Saved CVs"      → dashboard  [only shown when saved versions exist]

dashboard
  ├── click version card → editor (version content loaded)
  └── back → landing

editor
  ├── VersionSwitcher (header) → save current / switch to saved version
  └── nav link → dashboard
```

---

## Frontend Architecture

### Project Structure (Feature-Based)

```
frontend/src/
├── features/
│   ├── landing/              Landing screen
│   │   ├── LandingScreen.tsx
│   │   ├── LandingScreen.module.css
│   │   └── index.ts
│   ├── template-selection/   Template picker (Build path)
│   │   ├── TemplateSelector.tsx
│   │   ├── TemplateSelector.css
│   │   └── index.ts
│   ├── form-builder/         Structured form builder
│   │   ├── CVFormBuilder.tsx
│   │   ├── CVFormBuilder.module.css
│   │   └── index.ts
│   ├── cv-import/            CV import upload + review
│   │   ├── CVImportUpload.tsx
│   │   ├── CVImportUpload.module.css
│   │   ├── CVImportReview.tsx
│   │   ├── CVImportReview.module.css
│   │   └── index.ts
│   ├── editor/               All editor-related components
│   │   ├── LatexEditor.tsx
│   │   ├── LatexEditor.module.css
│   │   ├── PdfPreview.tsx
│   │   ├── PdfPreview.module.css
│   │   ├── ChatPanel.tsx
│   │   ├── ChatPanel.module.css
│   │   ├── JobInput.tsx
│   │   ├── JobInput.module.css
│   │   ├── MatchAnalysis.tsx
│   │   ├── MatchAnalysis.module.css
│   │   └── index.ts
│   ├── dashboard/            Saved versions management
│   │   ├── Dashboard.tsx
│   │   ├── Dashboard.module.css
│   │   ├── VersionSwitcher.tsx
│   │   ├── VersionSwitcher.module.css
│   │   └── index.ts
│   └── shared/               Reusable cross-feature components
│       ├── ErrorBoundary.tsx
│       └── index.ts
├── hooks/                    Custom React hooks
├── services/                 API client
├── styles/                   Design tokens (variables.css)
├── types/                    TypeScript type definitions
├── App.tsx                   Main app router
└── main.tsx                  React entry point
```

**Organization Rationale:**
- Feature-based folders group related components, styles, and barrel exports
- Each feature folder has an `index.ts` for clean imports (e.g., `import { Dashboard } from './features/dashboard'`)
- `shared/` contains components used across multiple features
- `hooks/`, `services/`, `types/`, and `styles/` remain top-level (cross-cutting concerns)

### Components

| Component | Feature | Purpose |
|-----------|---------|---------|
| `App.tsx` | - | Main container, 5-screen router, all cross-screen state |
| `LandingScreen.tsx` | landing | Intent-based entry screen (Build / Tune / My CVs) |
| `TemplateSelector.tsx` | template-selection | Template selection (Build path only) |
| `CVFormBuilder.tsx` | form-builder | Structured form with 6 sections + live PDF preview + DnD reordering |
| `CVImportUpload.tsx` | cv-import | Drag-and-drop file upload for CV import |
| `CVImportReview.tsx` | cv-import | Review and edit extracted CV data with confidence indicators |
| `Dashboard.tsx` | dashboard | Saved versions grid (load, delete) |
| `VersionSwitcher.tsx` | dashboard | In-editor save / switch between saved versions |
| `LatexEditor.tsx` | editor | CodeMirror-based LaTeX editor (Tune path / fine-tuning) |
| `PdfPreview.tsx` | editor | PDF rendering via `<iframe>` with base64 source |
| `ChatPanel.tsx` | editor | AI conversation + inline edit suggestions with undo |
| `MatchAnalysis.tsx` | editor | CV-job match score display |
| `JobInput.tsx` | editor | Job description input |
| `ErrorBoundary.tsx` | shared | Graceful error handling |

### Custom Hooks

| Hook | Owns |
|------|------|
| `useFormBuilder` | All CVFormData state, section/entry CRUD, reorder helpers, isDirty tracking, export/import |
| `useTemplates` | Selected template, content fetch, `setTemplateId` (set without fetch) |
| `useCompiler` | Compile request, PDF state, markChanged |
| `useChat` | AI messages, analyzeJob, applyEdit, undo |
| `useImport` | CV import file upload, AI extraction, progress tracking, validation |

### State (App.tsx)

| State | Type | Purpose |
|-------|------|---------|
| `currentScreen` | `AppScreen` | Active screen |
| `selectedTemplateForBuild` | `string \| null` | Template chosen in Build path |
| `activeVersion` | `CVVersion \| null` | Currently loaded saved version |
| `savedVersions` | `CVVersionMeta[]` | Metadata for version switcher and dashboard |
| `formData` | `CVFormData \| null` | Form data from Build path (passed to editor for saving) |
| `isSavingVersion` | `boolean` | Loading state for save |

---

## Backend Architecture

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/compile` | POST | Compile LaTeX to PDF (engine selected per templateId) |
| `/api/generate-latex` | POST | Generate LaTeX from `CVFormData` via Jinja2 |
| `/api/chat` | POST | Stream AI responses (SSE) |
| `/api/chat/match-analysis` | POST | CV-job match score |
| `/api/templates` | GET | List available templates |
| `/api/templates/{id}/preview` | GET | Template preview image |
| `/api/templates/{id}/content` | GET | Raw LaTeX template content |
| `/api/user-data` | GET/POST | User profile CRUD |
| `/api/cv-versions` | GET/POST | List / create saved CV versions |
| `/api/cv-versions/{id}` | GET/DELETE | Load / delete a saved version |
| `/api/cv-import` | POST | Upload PDF/DOCX/JSON for AI extraction |
| `/api/health` | GET | Health check |

### Services & Routes

| File | Purpose |
|------|---------|
| `routes/compile.py` | LaTeX → PDF compilation (pdflatex / xelatex) |
| `routes/generate_latex.py` | CVFormData → LaTeX via Jinja2, `latex_escape` filter (all special chars), `latex_url_escape` filter (URLs: `%` and `#` only), `_build_personal_items` |
| `routes/cv_versions.py` | Version CRUD + all shared Pydantic models (PersonalInfo, WorkEntry, CVFormData, …) |
| `routes/cv_import.py` | CV import upload endpoint (PDF/DOCX/JSON) |
| `routes/chat.py` | AI chat streaming |
| `routes/templates.py` | Template listing and file serving |
| `routes/user_data.py` | JSON-file user profile |
| `services/bedrock.py` | AWS Bedrock client wrapper |
| `services/cv_analyzer.py` | CV analysis and match scoring |
| `services/cv_extractor.py` | AI-powered CV extraction via Bedrock (PDF multimodal, DOCX text, JSON direct) |
| `services/latex_compiler.py` | pdflatex / xelatex subprocess wrapper |
| `prompts/cv_agent.py` | AI prompt templates |

### LaTeX Templates

Templates live in `backend/latex_templates/` and use Jinja2 with custom delimiters
(`(( ))` for variables, `(% %)` for blocks) to avoid clashing with LaTeX `{}` syntax.

| Template file | Engine | Class | Notes |
|--------------|--------|-------|-------|
| `med-length-proff-cv.tex.j2` | pdflatex | `resume` (`rSection` / `rSubsection`) | Supports dynamic `section_order` |
| `mcdowell-cv.tex.j2` | xelatex | `mcdowellcv` (`cvsection` / `cvsubsection`) | Supports dynamic `section_order` |
| `deedy-resume.tex.j2` | xelatex | `deedy-resume` (two-column) | Fixed layout, does NOT use `section_order` |

All templates receive the following context variables from `generate_latex.py`:

| Variable | Source |
|----------|--------|
| `personal` | `form_data.personalInfo` (Pydantic model) |
| `personal_items` | Pre-built ordered list from `_build_personal_items()`, respects `personalOrder` |
| `work` | `form_data.workExperience` |
| `education` | `form_data.education` |
| `skills` | `form_data.skills` |
| `projects` | `form_data.projects` |
| `awards` | `form_data.awards` |
| `additional_sections` | `form_data.additionalSections` |
| `section_order` | `form_data.sectionOrder` (default: work, education, skills, projects, awards) |

**Jinja2 Filters:**
- `latex_escape` — Escapes all LaTeX special characters: `& % $ # _ { } ~ ^ \`
- `latex_url_escape` — Escapes only `%` and `#` (for use in `\href{}` URLs; other chars like `&` and `_` are valid in URLs)

---

## Data Models

### `CVFormData` (canonical form — `types/index.ts` + `cv_versions.py`)

```typescript
PersonalInfo {
  fullName, email, phone, location
  links: Array<{ label: string; url: string }>  // label auto-derived from URL
  summary?: string                               // intro paragraph
  personalOrder?: string[]                       // header line field order
}

WorkEntry      { company, title, startDate, endDate, location, bullets[] }
EducationEntry { school, degree, startDate, endDate, location, gpa?, details[] }
SkillCategory  { category, skills[] }
Project        { name, year, description, technologies?, bullets?: string[] }
Award          { year, title, description? }
AdditionalEntry { title, subtitle?, startDate?, endDate?, location?, description?, bullets: string[] }
AdditionalSection { title, entries: AdditionalEntry[] }

CVFormData {
  templateId: string
  sectionOrder?: string[]    // section display order
  personalInfo: PersonalInfo
  workExperience: WorkEntry[]
  education: EducationEntry[]
  skills: SkillCategory[]
  projects?: Project[]
  awards?: Award[]
  additionalSections?: AdditionalSection[]
}
```

### `CVVersion` (storage — `user_data/versions/{uuid}.json`)

```typescript
CVVersion {
  id, name, templateId, texContent
  formData?: CVFormData   // populated on Build path; null on Tune path
  jobDescription?, companyName?, matchScore?
  createdAt: string       // ISO-8601
}
CVVersionMeta = Omit<CVVersion, 'texContent' | 'formData'>
```

---

## Data Flow

### Build Path (form → PDF)

```
User fills form → CVFormBuilder
  → POST /api/generate-latex → Jinja2 renders .tex.j2 → LaTeX string
  → POST /api/compile         → pdflatex/xelatex      → PDF base64
  → inline preview in CVFormBuilder
  → "Open in Editor" → editor screen (auto-compile, PDF tab shown)
```

### Tune Path (raw LaTeX → AI → PDF)

```
"Tune for a job" → med-length-proff-cv pre-loaded in editor
User pastes job description → POST /api/chat/match-analysis → match score
User sends chat message     → POST /api/chat (streaming)    → AI suggestions
User applies edit           → LaTeX updated → POST /api/compile → PDF
```

### Version Save / Load

```
Save: POST /api/cv-versions → { name, templateId, texContent, formData?, … }
      → user_data/versions/{uuid}.json
List: GET  /api/cv-versions → sorted newest-first, metadata only
Load: GET  /api/cv-versions/{id} → full version → populate editor / form
```

---

## File Structure

### Frontend (`/frontend/src`)

```
src/
├── components/
│   ├── CVFormBuilder.tsx       # Build-path form with inline PDF preview
│   ├── CVFormBuilder.module.css
│   ├── Dashboard.tsx           # Saved versions grid
│   ├── Dashboard.module.css
│   ├── LandingScreen.tsx       # Entry screen
│   ├── LandingScreen.module.css
│   ├── VersionSwitcher.tsx     # In-editor save/switch widget
│   ├── VersionSwitcher.module.css
│   ├── TemplateSelector.tsx    # Template cards (Build path)
│   ├── TemplateSelector.css
│   ├── LatexEditor.tsx         # CodeMirror LaTeX editor
│   ├── PdfPreview.tsx          # iframe PDF viewer
│   ├── ChatPanel.tsx           # AI chat + edit suggestions
│   ├── MatchAnalysis.tsx       # Match score UI
│   ├── JobInput.tsx            # Job description input
│   ├── ErrorBoundary.tsx       # Error boundary
│   └── index.ts
├── hooks/
│   ├── useFormBuilder.ts       # CVFormData state + CRUD
│   ├── useTemplates.ts         # Template selection + content
│   ├── useCompiler.ts          # LaTeX compilation
│   └── useChat.ts              # AI chat
├── services/
│   └── api.ts                  # All API calls (13 endpoints)
├── styles/
│   └── variables.css           # CSS design tokens
├── types/
│   └── index.ts                # All TypeScript types
├── App.tsx                     # 5-screen router + cross-screen state
├── App.module.css
└── main.tsx
```

### Backend (`/backend`)

```
backend/
├── routes/
│   ├── compile.py              # POST /compile
│   ├── generate_latex.py       # POST /generate-latex
│   ├── cv_versions.py          # CRUD /cv-versions + shared Pydantic models
│   ├── cv_import.py            # POST /cv-import (upload + extraction)
│   ├── chat.py                 # POST /chat, /match-analysis
│   ├── templates.py            # GET /templates
│   └── user_data.py            # GET/POST /user-data
├── latex_templates/
│   ├── med-length-proff-cv.tex.j2
│   ├── mcdowell-cv.tex.j2
│   └── deedy-resume.tex.j2
├── services/
│   ├── bedrock.py
│   ├── cv_analyzer.py
│   ├── cv_extractor.py         # AI extraction (PDF/DOCX/JSON)
│   └── latex_compiler.py
├── prompts/
│   └── cv_agent.py
├── config/
│   └── templates.py            # TemplateConfig entries (3 templates)
├── tests/
│   ├── __init__.py
│   ├── test_template_rendering.py    # Jinja2 rendering tests (21 tests, fast)
│   └── test_template_compilation.py  # pdflatex/xelatex compilation tests (18 tests, ~28s)
├── user_data/
│   ├── profile.json            # User profile
│   └── versions/               # Saved CV versions ({uuid}.json)
├── pytest.ini                  # pytest config (slow marker)
└── main.py                     # FastAPI app + router registration
```

---

## Design System

CV Maker uses a Zed-inspired light theme — soft, professional, minimal.

### Color Tokens (`variables.css`)

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-primary` | `#F8FAFC` | App background |
| `--bg-secondary` | `#FFFFFF` | Cards, panels |
| `--bg-tertiary` | `#F1F5F9` | Section backgrounds, chips |
| `--bg-hover` | `#E2E8F0` | Hover state backgrounds |
| `--accent` | `#3B82F6` | Primary actions, focus rings, active nav |
| `--accent-hover` | `#2563EB` | Hover on accent elements |
| `--accent-light` | `#DBEAFE` | Accent background tints |
| `--text-primary` | `#1E293B` | Main text |
| `--text-secondary` | `#64748B` | Labels, secondary |
| `--text-muted` | `#94A3B8` | Placeholders, hints |
| `--border-color` | `#E2E8F0` | Default borders |
| `--border-strong` | `#CBD5E1` | Hover / emphasis borders |
| `--warning` | `#F59E0B` | Dirty-state indicator on Regenerate button |
| `--error` | `#EF4444` | Error text and borders |
| `--error-light` | `#FEF2F2` | Error background tints |

### Typography

- **Primary**: IBM Plex Sans (400, 500, 600)
- **Monospace**: IBM Plex Mono (LaTeX editor, error output)

### Key Patterns

- **CSS Modules** for all new components — scoped class names, no global leakage
- **Design tokens** (`var(--xxx)`) everywhere — never hardcoded hex in component CSS
- **Cards**: `bg-secondary`, 1px `border-color` border, `--radius` (8px), `--shadow-sm`
- **Inputs**: `bg-secondary`, blue focus ring via `border-color: var(--accent)`
- **Labels**: 0.75rem, 600 weight, uppercase, `0.04em` letter-spacing

---

## Security Considerations

- CORS restricted to `localhost` origins; exact methods (`GET POST PUT DELETE`) specified
- LaTeX input sanitised before compilation: `\write18`, `\openin`, `\catcode` and shell-escape patterns blocked
- AWS credentials via environment / IAM (never in source)
- No authentication — single-user local tool; multi-user requires auth + per-user data isolation
- User data stored as local JSON files — not suitable for production multi-user deployment

---

## Testing

The backend includes comprehensive test coverage for LaTeX template rendering and compilation.

### Test Suites

| Test File | Purpose | Count | Speed |
|-----------|---------|-------|-------|
| `test_template_rendering.py` | Jinja2 rendering tests (no TeX required) | 21 tests | Fast (~2s) |
| `test_template_compilation.py` | Full pdflatex/xelatex compilation | 18 tests | Slow (~28s) |

### Test Coverage

**Rendering Tests** (`test_template_rendering.py`):
- All 3 templates (med-length-proff-cv, deedy-resume, mcdowell-cv)
- Minimal data (name + 1 work entry)
- Maximal data (all sections filled)
- Special LaTeX character escaping (`& % $ # _ { } ~ ^ \`)
- Empty optional sections (no projects/awards/summary)
- Work entries with empty bullet arrays
- CV with only name (no contact info)
- Section ordering (`sectionOrder` field respected)
- Direct filter testing (`latex_escape`, `latex_url_escape`)

**Compilation Tests** (`test_template_compilation.py`):
- Minimal, maximal, special chars, and empty sections for all 3 templates
- Unicode characters (accented names, international symbols)
- PDF size validation (10KB–500KB range)
- Marked `@pytest.mark.slow` (2–5 seconds per test)
- Auto-skip if pdflatex/xelatex not installed

### Running Tests

```bash
cd backend

# Run all tests
python3 -m pytest tests/ -v

# Run only fast tests (skip compilation)
pytest -m "not slow"

# Run specific test file
pytest tests/test_template_rendering.py -v

# Run with coverage
pytest --cov=routes --cov=services tests/
```

### Configuration

`pytest.ini` defines the `slow` marker for compilation tests. Use `-m "not slow"` to skip slow tests during development.
