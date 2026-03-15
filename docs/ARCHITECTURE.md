# Architecture

## System Overview

CV Maker follows a client-server architecture with a React frontend and FastAPI backend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
│                                                                              │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐                 │
│  │  Landing /     │  │  Form Builder    │  │   Editor     │                 │
│  │  Dashboard     │  │  (Build/Import)  │  │  (all paths) │                 │
│  └────────────────┘  └──────────────────┘  └──────────────┘                 │
│                                                                              │
│  Screens: landing → template-select → form-builder → editor                 │
│           landing → import-upload → import-review → template-select         │
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
React Router v6 Routes:
/                → LandingScreen
/build/start     → BuildChoiceScreen
/build           → TemplateSelector
/build/form      → CVFormBuilder
/import          → CVImportUpload
/import/review   → CVImportReview
/dashboard       → Dashboard
/editor          → EditorScreen

landing (/)
  ├── "Build my CV"       → /build/start → "Start from scratch" → /build → /build/form → /editor
  │                                     → "Import existing CV" → /import → /import/review → /build → /build/form
  ├── "Tune for a job"    → /build/form (mode:'tune', Job Tuning tab default in right panel)
  ├── "My CVs & Applications" → /dashboard  [always shown; shows recent apps inline if versions exist]
  └── Recent Applications → inline cards grouped by base CV (3 most recent)

dashboard (/dashboard) — hierarchical view
  ├── Base CVs (expandable groups)
  │   ├── [+ New] button per base CV → /editor (creates job application from base)
  │   └── Job applications (nested under base)
  ├── Ungrouped versions → orphaned CVs without parent
  ├── click base CV → /editor (base CV content loaded)
  ├── click job application → /editor (job content + job panel pre-filled)
  ├── [Move...] action → re-parent job application to different base CV
  └── back → /

editor (/editor)
  ├── VersionSwitcher (header) → save current / switch to saved version
  ├── Save modal → choose "Base CV" or "Job Application" + select parent + job details
  ├── nav link → /dashboard
  └── breadcrumb → "From: Creative CV" (if derived from base)

build/form (/build/form) — CVFormBuilder
  ├── Right panel tabs: "Preview" (PDF) | "Job Tuning" (job description + AI match analysis)
  ├── Mode passed via location.state.mode: 'build' | 'tune'
  ├── "Advanced Editor" button in preview header → /editor (escape hatch for power users)
  └── VoiceWidget (overlay pill in sidebar) → voice interview session
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
│   ├── build-choice/         Build entry choice ("Start from scratch" | "Import existing CV")
│   │   ├── BuildChoiceScreen.tsx
│   │   ├── BuildChoiceScreen.module.css
│   │   └── index.ts
│   ├── template-selection/   Template picker (Build path)
│   │   ├── TemplateSelector.tsx
│   │   ├── TemplateSelector.css
│   │   └── index.ts
│   ├── form-builder/         Structured form builder
│   │   ├── CVFormBuilder.tsx
│   │   ├── CVFormBuilder.module.css
│   │   ├── JobTuningPanel.tsx
│   │   ├── JobTuningPanel.module.css
│   │   └── index.ts
│   ├── cv-import/            CV import upload + review
│   │   ├── CVImportUpload.tsx
│   │   ├── CVImportUpload.module.css
│   │   ├── CVImportReview.tsx
│   │   ├── CVImportReview.module.css
│   │   └── index.ts
│   ├── voice-widget/         Voice interview overlay
│   │   ├── VoiceWidget.tsx
│   │   ├── VoiceWidget.module.css
│   │   └── index.ts
│   ├── editor/               All editor-related components
│   │   ├── EditorScreen.tsx
│   │   ├── EditorScreen.module.css
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
├── contexts/                 React Context providers
│   └── AppContext.tsx        Global shared state (replaces App.tsx god component)
├── hooks/                    Custom React hooks
├── services/                 API client
├── styles/                   Design tokens (variables.css)
├── types/                    TypeScript type definitions
├── App.tsx                   React Router route definitions (~25 lines)
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
| `App.tsx` | - | React Router v6 route definitions only (~25 lines) |
| `AppContext.tsx` | contexts | Global shared state provider (replaces App.tsx god component) |
| `LandingScreen.tsx` | landing | Intent-based entry screen (Build / Tune / Import / My CVs) |
| `BuildChoiceScreen.tsx` | build-choice | Build entry choice ("Start from scratch" \| "Import existing CV") |
| `TemplateSelector.tsx` | template-selection | Template selection (Build path + Import path) |
| `CVFormBuilder.tsx` | form-builder | Structured form with 7 sections + right panel tabs (Preview \| Job Tuning) + DnD reordering |
| `JobTuningPanel.tsx` | form-builder | Job description input + AI match analysis (right panel tab in form builder) |
| `VoiceWidget.tsx` | voice-widget | Voice interview overlay with animated orb, transcript feed, mic controls |
| `CVImportUpload.tsx` | cv-import | Drag-and-drop file upload (PDF, DOCX, JSON) with progress indicator |
| `CVImportReview.tsx` | cv-import | Review and edit extracted CV data with confidence indicators and field-level warnings |
| `Dashboard.tsx` | dashboard | Hierarchical CV management — base CVs with nested job applications, move/re-parent actions, AI grouping suggestions |
| `VersionSwitcher.tsx` | dashboard | In-editor save / switch between saved versions, save modal with base CV picker |
| `EditorScreen.tsx` | editor | Advanced LaTeX editor screen (power-user escape hatch) |
| `LatexEditor.tsx` | editor | CodeMirror-based LaTeX editor component |
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
| `useImport` | CV import file upload (PDF/DOCX/JSON), AI extraction via Bedrock, progress tracking, confidence scoring, validation warnings |
| `useVoiceInterview` | Voice interview WebSocket connection, transcript collection, mic controls, session management |

### State Management (AppContext.tsx)

AppContext replaced the old App.tsx god component pattern. All shared state and handlers are now centralized in `contexts/AppContext.tsx`.

| State | Type | Purpose |
|-------|------|---------|
| `selectedTemplateForBuild` | `string \| null` | Template chosen in Build/Import path |
| `activeVersion` | `CVVersion \| null` | Currently loaded saved version |
| `savedVersions` | `CVVersionMeta[]` | Metadata for version switcher and dashboard |
| `formData` | `CVFormData \| null` | Form data from Build/Import path (passed to form-builder and editor) |
| `isSavingVersion` | `boolean` | Loading state for save |

Navigation handled by React Router v6 with browser history (back/forward support).

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
| `/api/ws/voice-interview` | WebSocket | Pipecat WebSocket pipeline (Nova Sonic S2S) |
| `/api/voice/extract-cv` | POST | Extract CV data from voice session transcript |
| `/api/voice/profile` | GET/POST | Get/save returning user's voice profile |
| `/api/health` | GET | Health check |

### Services & Routes

| File | Purpose |
|------|---------|
| `routes/compile.py` | LaTeX → PDF compilation (pdflatex / xelatex) |
| `routes/generate_latex.py` | CVFormData → LaTeX via Jinja2, `latex_escape` filter (all special chars), `latex_url_escape` filter (URLs: `%` and `#` only), `_build_personal_items` |
| `routes/cv_versions.py` | Version CRUD + all shared Pydantic models (PersonalInfo, WorkEntry, CVFormData, …) |
| `routes/cv_import.py` | CV import upload endpoint (PDF/DOCX/JSON) |
| `routes/voice_interview.py` | Voice interview WebSocket endpoint + transcript extraction + profile management |
| `routes/chat.py` | AI chat streaming |
| `routes/templates.py` | Template listing and file serving |
| `routes/user_data.py` | JSON-file user profile |
| `services/bedrock.py` | AWS Bedrock client wrapper |
| `services/cv_analyzer.py` | CV analysis and match scoring |
| `services/cv_extractor.py` | AI-powered CV extraction via Bedrock (PDF multimodal, DOCX text, JSON direct) |
| `services/latex_compiler.py` | pdflatex / xelatex subprocess wrapper |
| `prompts/cv_agent.py` | AI prompt templates |
| `prompts/voice_interview.py` | Voice interview system prompt and extraction prompt |

### Voice Interview Architecture

The voice interview feature provides an alternative to manual form filling through natural conversation.

**Pipeline (Pipecat + Amazon Nova Sonic):**

```
User audio → WebSocket transport → user_aggregator
                                  ↓
                           Nova Sonic LLM (S2S)
                                  ↓
           TranscriptCollector ← assistant audio → transport output
                                  ↓
                           assistant_aggregator
```

**Key Components:**
- **WebSocket transport**: `FastAPIWebsocketTransport` with `ProtobufFrameSerializer` for binary audio frames
- **Nova Sonic**: Amazon's speech-to-speech LLM service (16kHz input, 24kHz output sample rates)
- **TranscriptCollector**: Custom frame processor that collects `TranscriptionFrame` objects to build session transcript
- **Session storage**: In-memory dict `{session_id: [utterances]}` — cleared on restart (needs TTL cleanup for production)
- **Extraction endpoint**: `POST /api/voice/extract-cv` takes full transcript and uses Bedrock to extract structured `CVFormData`
- **Voice profile**: Returning user detection stores name/email in `user_data/voice_profile.json` for personalized greeting

**Dependencies:**
- Optional: `pip install 'pipecat-ai[aws]'` — app starts without it (feature disabled)
- Alpha quality: no error recovery, no session persistence, no rate limiting

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
  role?: string           // job role/title (e.g., "Senior Product Designer")
  parentVersionId?: string | null  // ID of base CV this application derives from
  createdAt: string       // ISO-8601
}
CVVersionMeta = Omit<CVVersion, 'texContent' | 'formData'>
```

**Version Types:**
- **Base CV**: `parentVersionId = null`, no job details — template to tailor for jobs (e.g., "Creative CV", "Consulting CV")
- **Job Application**: `parentVersionId = <base-cv-id>`, has job details — tailored version for specific role/company

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

### Version Save / Load (Job-Centric Model)

```
Save: POST /api/cv-versions → { name, templateId, texContent, formData?, parentVersionId?, role?, companyName?, jobDescription?, … }
      → user_data/versions/{uuid}.json
      → Auto-names if company/role provided: "{company} {role}" or "Application {date}"
List: GET  /api/cv-versions → sorted newest-first, grouped by parentVersionId
      → Base CVs (parentVersionId = null) with nested job applications
Load: GET  /api/cv-versions/{id} → full version → populate editor / form
      → If job application, pre-fill job panel with company/role/description
Move: PATCH /api/cv-versions/{id} → { parentVersionId } → re-parent job application
```

---

## File Structure

### Frontend (`/frontend/src`)

```
src/
├── features/
│   ├── landing/                # LandingScreen.tsx, .module.css, index.ts
│   ├── build-choice/           # BuildChoiceScreen.tsx, .module.css, index.ts
│   ├── template-selection/     # TemplateSelector.tsx, .css, index.ts
│   ├── form-builder/           # CVFormBuilder.tsx, JobTuningPanel.tsx, .module.css, index.ts
│   ├── cv-import/              # CVImportUpload.tsx, CVImportReview.tsx, .module.css, index.ts
│   ├── voice-widget/           # VoiceWidget.tsx, .module.css, index.ts
│   ├── editor/                 # EditorScreen.tsx, LatexEditor, PdfPreview, ChatPanel, JobInput, MatchAnalysis
│   ├── dashboard/              # Dashboard.tsx, VersionSwitcher.tsx, .module.css, index.ts
│   └── shared/                 # ErrorBoundary.tsx, index.ts
├── contexts/
│   └── AppContext.tsx          # Global shared state provider
├── hooks/
│   ├── useFormBuilder.ts       # CVFormData state + CRUD
│   ├── useTemplates.ts         # Template selection + content
│   ├── useCompiler.ts          # LaTeX compilation
│   ├── useChat.ts              # AI chat
│   ├── useImport.ts            # CV import file upload + extraction
│   └── useVoiceInterview.ts    # Voice interview WebSocket + transcript
├── services/
│   └── api.ts                  # All API calls (16 endpoints)
├── styles/
│   └── variables.css           # CSS design tokens
├── types/
│   └── index.ts                # All TypeScript types
├── App.tsx                     # React Router route definitions (~25 lines)
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
│   ├── voice_interview.py      # WS /ws/voice-interview, POST /voice/extract-cv, GET/POST /voice/profile
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
│   ├── cv_agent.py
│   └── voice_interview.py      # Voice interview system prompt + extraction prompt
├── config/
│   └── templates.py            # TemplateConfig entries (3 templates)
├── tests/
│   ├── __init__.py
│   ├── test_template_rendering.py    # Jinja2 rendering tests (21 tests, fast)
│   └── test_template_compilation.py  # pdflatex/xelatex compilation tests (18 tests, ~28s)
├── user_data/
│   ├── profile.json            # User profile
│   ├── voice_profile.json      # Voice interview returning user data
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
