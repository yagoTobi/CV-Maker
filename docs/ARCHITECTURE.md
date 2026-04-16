# Architecture

## System Overview

CV Maker follows a client-server architecture with a React frontend and FastAPI backend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
│                                                                              │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐                 │
│  │  Landing /     │  │  Form Builder    │  │   Editor     │                 │
│  │  Dashboard     │  │  (Build/Import)  │  │  (Tune/Edit) │                 │
│  └────────────────┘  └──────────────────┘  └──────────────┘                 │
│                                                                              │
│  Screens: landing → build-choice → template-select → form-builder → editor  │
│           landing → build-choice → import-upload → template-select → form   │
│           landing → dashboard → "Tune for a Job" → editor (tune mode)       │
│           landing → dashboard → "Apply to Job" → apply (3-step flow)        │
│           landing → dashboard → click version → editor                      │
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
│  ┌──────────────┐  │(.tex.j2      │  │              │  │ versions/    │    │
│  │  Tailor API  │  │  templates)  │  └──────────────┘  └──────────────┘    │
│  │  /tailor     │  └──────────────┘                                        │
│  └──────────────┘                                                           │
│         │          ┌──────────────┐                                         │
│         ▼          │LaTeX Compiler│                                         │
│  Field-level AI    │(pdflatex/    │                                         │
│  suggestions       │ xelatex)     │                                         │
│                    └──────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Flow

```
React Router v6 Routes (8 routes):
/                → LandingScreen
/build/start     → BuildChoiceScreen
/build           → TemplateSelector
/build/form      → CVFormBuilder
/import          → CVImportUpload
/apply           → ApplyToJobScreen
/dashboard       → Dashboard
/editor          → EditorScreen

landing (/)
  ├── "Build my CV"    → /build/start → "Start from scratch" → /build → /build/form → /editor
  │                                   → "Import existing CV" → /import → /build → /build/form (with ImportBanner)
  ├── "Tune for a role" → /dashboard (if saved CVs exist) or /build/start (if no CVs)
  └── "My Saved CVs"    → /dashboard  [shown only when savedVersions.length > 0]

dashboard (/dashboard) — hierarchical view
  ├── Base CVs (expandable groups)
  │   ├── "Tune for a Job" button → /editor (mode:'tune', base CV loaded)
  │   ├── "Apply to Job" button → /apply (3-step flow from base CV)
  │   └── Job applications (nested under base)
  ├── Ungrouped versions → orphaned CVs without parent
  ├── click any version → /editor (version loaded)
  ├── [Move...] action → re-parent job application to different base CV
  ├── Download PDF button → compile on-demand from any version
  └── back → /

editor (/editor) — two modes
  ├── Build mode: "Your CV Editor" header, general editing
  ├── Tune mode: "Tune your CV" header, job input + AI suggestions
  │   ├── Left panel: collapsible JobInput → MatchSummaryBar → TailorPanel (suggestion cards)
  │   └── Right panel: PDF preview (auto-compiles on entry)
  ├── VersionSwitcher (header) → save / switch / dashboard
  └── Save modal → "Base CV" or "Job Application" + parent picker + job details

apply (/apply) — 3-step progressive flow
  ├── Step 1: Job Details (company, role, job description)
  ├── Step 2: Match Analysis (score + gaps + suggestions) — reuses POST /chat/match-analysis
  ├── Step 3: Review Changes (field-level AI suggestions with checkboxes)
  └── "Open in Tune Screen" button → /editor (mode:'tune', job context pre-filled)

build/form (/build/form) — CVFormBuilder
  ├── Right panel: PDF preview
  ├── Mode passed via location.state.mode: 'build' | 'tune'
  ├── ImportBanner (when coming from import path) — source badge, confidence indicator, warnings, dismissible
  ├── Field-level confidence badges — amber border + badge on low/medium confidence fields
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
│   │   ├── ImportBanner.tsx
│   │   ├── ImportBanner.module.css
│   │   └── index.ts
│   ├── cv-import/            CV import upload
│   │   ├── CVImportUpload.tsx
│   │   ├── CVImportUpload.module.css
│   │   └── index.ts
│   ├── apply-to-job/         3-step job application flow
│   │   ├── ApplyToJobScreen.tsx
│   │   ├── ApplyToJobScreen.module.css
│   │   └── index.ts
│   ├── voice-widget/         Voice interview overlay
│   │   ├── VoiceWidget.tsx
│   │   ├── VoiceWidget.module.css
│   │   └── index.ts
│   ├── editor/               Editor + tune screen components
│   │   ├── EditorScreen.tsx
│   │   ├── EditorScreen.module.css
│   │   ├── TailorPanel.tsx       AI suggestion cards (accept/skip/undo)
│   │   ├── TailorPanel.module.css
│   │   ├── MatchSummaryBar.tsx   Score bar with progress + expandable details
│   │   ├── MatchSummaryBar.module.css
│   │   ├── MatchAnalysis.tsx     Gap/suggestion tag lists
│   │   ├── MatchAnalysis.module.css
│   │   ├── JobInput.tsx          Company/role/description input
│   │   ├── JobInput.module.css
│   │   ├── PdfPreview.tsx
│   │   ├── PdfPreview.module.css
│   │   ├── ChatPanel.tsx
│   │   ├── ChatPanel.module.css
│   │   ├── LatexEditor.tsx
│   │   ├── LatexEditor.module.css
│   │   └── index.ts
│   ├── dashboard/            Saved versions management
│   │   ├── Dashboard.tsx
│   │   ├── Dashboard.module.css
│   │   ├── VersionSwitcher.tsx
│   │   ├── VersionSwitcher.module.css
│   │   └── index.ts
│   └── shared/               Reusable cross-feature components
│       ├── ErrorBoundary.tsx
│       ├── useFileUpload.ts
│       └── index.ts
├── components/
│   └── FeatureErrorBoundary.tsx   Per-feature error boundary with retry
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
| `CVFormBuilder.tsx` | form-builder | Structured form with 7 sections + PDF preview + DnD reordering + inline import indicators |
| `ImportBanner.tsx` | form-builder | Dismissible import summary banner (source, confidence, warnings) shown at top of form builder when coming from import |
| `VoiceWidget.tsx` | voice-widget | Voice interview overlay with animated orb, transcript feed, mic controls |
| `CVImportUpload.tsx` | cv-import | Drag-and-drop file upload (PDF, DOCX, JSON) with progress indicator + direct navigation to template selector on success |
| `ApplyToJobScreen.tsx` | apply-to-job | 3-step job application flow: Job Details → Match Analysis → Review Changes |
| `Dashboard.tsx` | dashboard | Hierarchical CV management — base CVs with nested job applications, move/re-parent, tune/apply actions |
| `VersionSwitcher.tsx` | dashboard | In-editor save / switch between saved versions, save modal with base CV picker |
| `EditorScreen.tsx` | editor | CV editor + tune screen — left panel (job input, match bar, tailor cards) + right panel (PDF preview) |
| `TailorPanel.tsx` | editor | AI suggestion cards with accept/skip/undo, inline diff, inline edit, Accept All |
| `MatchSummaryBar.tsx` | editor | Compact match score bar with progress indicator, expandable gap/suggestion details |
| `MatchAnalysis.tsx` | editor | Gap tags + suggestion list (rendered inside MatchSummaryBar details) |
| `JobInput.tsx` | editor | Company, role, job description input with Analyze button |
| `PdfPreview.tsx` | editor | PDF rendering via `<iframe>` with base64 source |
| `ChatPanel.tsx` | editor | AI conversation + inline edit suggestions with undo |
| `LatexEditor.tsx` | editor | CodeMirror-based LaTeX editor component |
| `FeatureErrorBoundary.tsx` | components | Per-feature error boundary with retry button |
| `ErrorBoundary.tsx` | shared | Global graceful error handling |

### Custom Hooks

| Hook | Owns |
|------|------|
| `useFormBuilder` | All CVFormData state, section/entry CRUD, reorder helpers, isDirty tracking, export/import |
| `useTemplates` | Selected template, content fetch, `setTemplateId` (set without fetch) |
| `useCompiler` | Compile request, PDF state, markChanged |
| `useChat` | AI messages, analyzeJob, matchAnalysis, applyEdit, undo |
| `useTailor` | Tailor suggestions, applied/skipped/pending state, accept/skip/undo, Accept All, inline edit, estimated score |
| `useImport` | CV import file upload (PDF/DOCX/JSON), AI extraction via Bedrock, progress tracking, confidence scoring, validation warnings, import state reset |
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
| `/api/chat/analyze` | POST | AI CV analysis |
| `/api/chat/match-analysis` | POST | CV-job match score + gaps + suggestions |
| `/api/tailor/suggest-changes` | POST | AI field-level tailoring suggestions (returns `TailorChange[]`) |
| `/api/templates` | GET | List available templates |
| `/api/templates/{id}/preview` | GET | Template preview image |
| `/api/templates/{id}/content` | GET | Raw LaTeX template content |
| `/api/templates/{id}/files/{filename}` | GET | Template support files (cls, fonts) |
| `/api/user-data` | GET/POST/DELETE | User profile CRUD |
| `/api/user-data/experience` | POST | Add experience entry to profile |
| `/api/cv-versions` | GET/POST | List / create saved CV versions |
| `/api/cv-versions/{id}` | GET/PATCH/DELETE | Load / update / delete a saved version |
| `/api/cv-import` | POST | Upload PDF/DOCX/JSON for AI extraction |
| `/api/ws/voice-interview` | WebSocket | Pipecat WebSocket pipeline (Nova Sonic S2S) |
| `/api/voice/extract-cv` | POST | Extract CV data from voice session transcript |
| `/api/voice/profile` | GET/POST | Get/save returning user's voice profile |
| `/api/health` | GET | Health check |

### Storage Layer

All user data persistence (CV versions, profiles, voice profiles) is abstracted behind a `StorageBackend` Protocol, enabling multiple storage implementations without changing business logic.

**Architecture:**

```
Routes (cv_versions, user_data, voice_interview)
    ↓
get_storage() dependency (storage_factory.py)
    ↓
StorageBackend Protocol (11 async methods)
    ↓
┌─────────────────┬──────────────────┐
│  FileStorage    │  DynamoStorage   │
│  (JSON files)   │  (single table)  │
└─────────────────┴──────────────────┘
```

**StorageBackend Protocol** (`services/storage.py`):
- 11-method async interface for all user data operations
- Python Protocol (structural typing, no base class)
- Methods: `list_versions`, `get_version`, `create_version`, `update_version`, `delete_version`, `update_children_of_deleted_parent`, `get_profile`, `save_profile`, `delete_profile`, `get_voice_profile`, `save_voice_profile`

**FileStorage** (`services/file_storage.py`):
- Wraps existing JSON file I/O — zero behavior change from previous implementation
- `user_id="local"` maps to flat `user_data/` directory for backward compatibility
- Other user IDs get namespaced subdirectories: `user_data/{user_id}/`
- Versions: `user_data/{user_id}/versions/{uuid}.json`
- Profile: `user_data/{user_id}/profile.json`
- Voice profile: `user_data/{user_id}/voice_profile.json`

**DynamoStorage** (`services/dynamo_storage.py`):
- Single-table design with composite keys: `PK=USER#{user_id}`, `SK=VERSION#{version_id} | PROFILE | VOICE_PROFILE`
- PAY_PER_REQUEST billing mode (no provisioned throughput)
- No GSIs needed (all queries by user_id)
- Table name from `DYNAMODB_TABLE_NAME` env var (default: `cv-maker`)
- Endpoint URL configurable via `DYNAMODB_ENDPOINT_URL` (for DynamoDB Local)

**Storage Factory** (`services/storage_factory.py`):
- `get_storage()` FastAPI dependency reads `STORAGE_BACKEND` env var (`file` | `dynamodb`)
- Singleton instance via `@lru_cache`
- Defaults to FileStorage for local development

**User ID Dependency** (`backend/dependencies.py`):
- `get_current_user()` reads `X-User-Id` header
- Defaults to `"local"` for single-user local tool
- Required for all routes that access user data
- CORS allows `X-User-Id` header

**Key Design Decisions:**
- Storage abstraction uses Protocol (no runtime base class overhead)
- `user_id="local"` preserves backward compatibility with existing file structure
- DynamoDB single-table design keeps queries simple (no cross-table joins)
- WebSocket handler uses storage singleton directly (FastAPI `Depends` doesn't work in WS handlers)

### Services & Routes

| File | Purpose |
|------|---------|
| `routes/compile.py` | LaTeX → PDF compilation (pdflatex / xelatex) |
| `routes/generate_latex.py` | CVFormData → LaTeX via Jinja2, `latex_escape` filter (all special chars), `latex_url_escape` filter (URLs: `%` and `#` only), `_build_personal_items` |
| `routes/cv_versions.py` | Version CRUD + all shared Pydantic models (PersonalInfo, WorkEntry, CVFormData, …); uses StorageBackend |
| `routes/cv_import.py` | CV import upload endpoint (PDF/DOCX/JSON) |
| `routes/voice_interview.py` | Voice interview WebSocket endpoint + transcript extraction + profile management; uses StorageBackend |
| `routes/chat.py` | AI chat streaming + match analysis |
| `routes/tailor.py` | `POST /tailor/suggest-changes` — AI field-level suggestions |
| `routes/templates.py` | Template listing and file serving |
| `routes/user_data.py` | User profile CRUD; uses StorageBackend |
| `services/storage.py` | StorageBackend Protocol (11-method async interface) |
| `services/file_storage.py` | FileStorage implementation (JSON files) |
| `services/dynamo_storage.py` | DynamoStorage implementation (DynamoDB single-table) |
| `services/storage_factory.py` | `get_storage()` dependency, reads `STORAGE_BACKEND` env var |
| `services/bedrock.py` | AWS Bedrock client wrapper |
| `services/cv_extractor.py` | AI-powered CV extraction via Bedrock (PDF multimodal, DOCX text, JSON direct) |
| `services/json_utils.py` | JSON parsing utilities (used by chat, tailor, voice routes) |
| `services/latex_compiler.py` | pdflatex / xelatex subprocess wrapper |
| `dependencies.py` | `get_current_user()` dependency, reads `X-User-Id` header |
| `prompts/cv_agent.py` | AI prompt templates (CV_AGENT_SYSTEM_PROMPT, MATCH_ANALYSIS_PROMPT, TAILOR_SUGGEST_PROMPT) |
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

### Tune Path (editor tune mode)

```
Dashboard → "Tune for a Job" → /editor (mode:'tune', base CV loaded, auto-compiles PDF)
User fills in company, role, job description → clicks "Analyze Position"
  → POST /api/chat/match-analysis → match score + gaps + suggestions (MatchSummaryBar)
  → POST /api/tailor/suggest-changes (background) → field-level change cards (TailorPanel)
User reviews cards: Accept / Skip / Edit each suggestion
  → Accept: formData updated → LaTeX regenerated → PDF recompiled → preview updates
  → Skip: card collapses, move to next
  → Undo: reverts accepted/skipped change
```

### Apply to Job Path (3-step wizard)

```
Dashboard → "Apply to Job" → /apply (base CV loaded)
  Step 1: Enter company, role, job description
  Step 2: POST /api/chat/match-analysis → score + gaps (can "Open in Tune Screen" → /editor)
  Step 3: POST /api/tailor/suggest-changes → field-level suggestions with checkboxes
  → Apply selected → save as job application version → /dashboard
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
│   ├── form-builder/           # CVFormBuilder.tsx, ImportBanner.tsx, .module.css, index.ts
│   ├── cv-import/              # CVImportUpload.tsx, .module.css, index.ts
│   ├── apply-to-job/           # ApplyToJobScreen.tsx, .module.css, index.ts
│   ├── voice-widget/           # VoiceWidget.tsx, .module.css, index.ts
│   ├── editor/                 # EditorScreen, TailorPanel, MatchSummaryBar, MatchAnalysis, JobInput, PdfPreview, ChatPanel, LatexEditor
│   ├── dashboard/              # Dashboard.tsx, VersionSwitcher.tsx, .module.css, index.ts
│   └── shared/                 # ErrorBoundary.tsx, index.ts
├── contexts/
│   └── AppContext.tsx          # Global shared state provider
├── hooks/
│   ├── useFormBuilder.ts       # CVFormData state + CRUD
│   ├── useTemplates.ts         # Template selection + content
│   ├── useCompiler.ts          # LaTeX compilation
│   ├── useChat.ts              # AI chat + match analysis
│   ├── useTailor.ts            # AI tailoring suggestions + accept/skip/undo
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
│   ├── chat.py                 # POST /chat, /chat/analyze, /chat/match-analysis
│   ├── tailor.py               # POST /tailor/suggest-changes
│   ├── templates.py            # GET /templates, /{id}/preview, /{id}/content, /{id}/files/{filename}
│   └── user_data.py            # GET/POST/DELETE /user-data, POST /user-data/experience
├── latex_templates/
│   ├── med-length-proff-cv.tex.j2
│   ├── mcdowell-cv.tex.j2
│   └── deedy-resume.tex.j2
├── services/
│   ├── storage.py              # StorageBackend Protocol (11-method interface)
│   ├── file_storage.py         # FileStorage implementation (JSON files)
│   ├── dynamo_storage.py       # DynamoStorage implementation (DynamoDB)
│   ├── storage_factory.py      # get_storage() dependency
│   ├── bedrock.py              # AWS Bedrock client wrapper
│   ├── cv_extractor.py         # AI extraction (PDF/DOCX/JSON)
│   ├── json_utils.py           # JSON parsing utilities
│   └── latex_compiler.py       # pdflatex / xelatex subprocess
├── prompts/
│   ├── cv_agent.py
│   └── voice_interview.py      # Voice interview system prompt + extraction prompt
├── config/
│   └── templates.py            # TemplateConfig entries (3 templates)
├── scripts/
│   ├── create_table.py         # DynamoDB table creation script
│   └── migrate_to_dynamodb.py  # Migration script (FileStorage → DynamoDB)
├── tests/
│   ├── __init__.py
│   ├── test_template_rendering.py    # Jinja2 rendering tests (21 tests, fast)
│   └── test_template_compilation.py  # pdflatex/xelatex compilation tests (18 tests, ~28s)
├── user_data/
│   ├── profile.json            # User profile (local user)
│   ├── voice_profile.json      # Voice interview returning user data (local user)
│   └── versions/               # Saved CV versions ({uuid}.json) (local user)
├── dependencies.py             # get_current_user() dependency
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

- CORS restricted to `localhost` origins; exact methods (`GET POST PUT DELETE`) specified; `X-User-Id` header allowed
- LaTeX input sanitised before compilation: `\write18`, `\openin`, `\catcode` and shell-escape patterns blocked
- AWS credentials via environment / IAM (never in source)
- No authentication — relies on `X-User-Id` header (trusted client); multi-user production requires auth + signed user ID
- User data isolation: all storage operations scoped by `user_id`
- DynamoDB access via IAM roles (no hardcoded credentials)
- Local development defaults to `user_id="local"` for backward compatibility

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

---

## Key Abstractions

The most significant interfaces, patterns, and design abstractions used across the system, with their file locations and roles.

### Data Model Interfaces

| Abstraction | Location | Description |
|-------------|----------|-------------|
| `CVFormData` | `frontend/src/types/index.ts`, `backend/routes/cv_versions.py` | Canonical CV content structure shared between frontend and backend. Contains all section data (personal info, work, education, skills, projects, awards, additional sections) plus template and ordering metadata. |
| `CVVersion` | `frontend/src/types/index.ts`, `backend/routes/cv_versions.py` | A saved snapshot of a CV including LaTeX source, form data, and optional job context. Supports hierarchical parent-child relationships for base CVs and job applications. |
| `CVVersionMeta` | `frontend/src/types/index.ts` | Lightweight version metadata (`Omit<CVVersion, 'texContent' | 'formData'>`) used in lists and dashboards to avoid loading full version content. |
| `TailorChange` | `frontend/src/types/index.ts` | A single AI-suggested field-level change with a `fieldPath` (dot-bracket path like `workExperience[0].bullets[2]`), rationale, and one or more `TailorAlternative` values. |
| `MatchAnalysis` | `frontend/src/types/index.ts` | Structured result of CV-to-job comparison: numeric score, gap list, and improvement suggestions. |

### Backend Patterns

| Abstraction | Location | Pattern | Description |
|-------------|----------|---------|-------------|
| `StorageBackend` | `backend/services/storage.py` | Strategy (Protocol) | 11-method async interface for all user data persistence. Two implementations: `FileStorage` (JSON files) and `DynamoStorage` (DynamoDB single-table). Resolved at startup by `storage_factory.py` based on `STORAGE_BACKEND` env var. |
| `BedrockClient` | `backend/services/bedrock.py` | Singleton | Unified AWS Bedrock access with per-task model selection. Module-level `bedrock_client` instance. Supports streaming and non-streaming chat, plus document-based chat for PDF import. Uses `MODEL_HAIKU` for fast extraction tasks and `MODEL_SONNET` for quality analysis/rewriting. |
| `TemplateConfig` | `backend/config/templates.py` | Registry | Dataclass holding template metadata (id, name, folder, engine, files). The `TEMPLATES` dict maps template IDs to their configs, serving as the single source of truth for template resolution. |
| `llm_cache` | `backend/services/llm_cache.py` | Cache (TTL) | In-memory TTL cache (1-hour, 256 entries max) for LLM responses. Cache keys are SHA-256 hashes of concatenated inputs. Used by match-analysis and tailor endpoints to avoid redundant AI calls. |
| `get_current_user()` | `backend/dependencies.py` | FastAPI Dependency | Extracts user identity from `X-User-Id` header, defaulting to `"local"` for single-user mode. All storage-accessing routes depend on this for user scoping. |
| `get_storage()` | `backend/services/storage_factory.py` | FastAPI Dependency + Singleton | Returns the singleton `StorageBackend` instance, created once via `@lru_cache` and reused across all requests. |

### Frontend Patterns

| Abstraction | Location | Pattern | Description |
|-------------|----------|---------|-------------|
| Domain Contexts | `frontend/src/contexts/JobContext.tsx`, `CVContext.tsx`, `ToolsContext.tsx` | Context + Provider | State split into three domain contexts (job input, CV/version state, shared tools) composed via `AppProvider`. A backwards-compatible `useAppContext()` shim merges all three into a single flat object. |
| `useFormBuilder` | `frontend/src/hooks/useFormBuilder.ts` | Custom Hook | The largest hook (~700 lines), encapsulating all `CVFormData` state management: section/entry CRUD, array reordering, dirty tracking, and import/export. Returns a memoized object with `useCallback`-wrapped updaters. |
| `api` object | `frontend/src/services/api.ts` | Facade | Single API client object exposing all backend calls. Methods catch errors internally and return typed failure values (null, empty arrays, error objects) rather than throwing. SSE streaming handled via native `fetch` with `processSSEStream` helper. |
| `formDataPatch` utilities | `frontend/src/utils/formDataPatch.ts` | Path Resolution | Functions (`parsePath`, `setAtPath`, `getAtPath`, `applyTailorChanges`) that resolve dot-bracket field paths (e.g., `workExperience[0].bullets[2]`) to navigate and mutate the `CVFormData` tree. Used by the tailor and apply-to-job features to apply AI-suggested changes. |
| Entry factories | `frontend/src/utils/entryFactories.ts` | Factory | Functions like `emptyWorkEntry()`, `emptyPersonalInfo()`, `emptyProject()` that create default-valued instances of each CV section entry type. Used by `useFormBuilder` when adding new entries. |
| `FeatureErrorBoundary` | `frontend/src/components/FeatureErrorBoundary.tsx` | Error Boundary | React class component wrapping per-route components. Catches render errors and displays retry/home UI, preventing a single feature crash from taking down the entire application. |
