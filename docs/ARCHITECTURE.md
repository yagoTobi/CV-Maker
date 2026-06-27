<!-- generated-by: gsd-doc-writer -->
# Architecture

## System Overview

CV-Maker is a web application where users edit their CV directly on a rendered, print-accurate web page and download a LaTeX-compiled PDF. The system is split into a React 19 frontend (Vite) and a Python FastAPI backend. The frontend renders the CV using web components styled to match the corresponding LaTeX template at ~95% visual fidelity; users type inline using `contentEditable` fields mapped directly to a `CVFormData` data structure. The backend generates LaTeX from that structure, compiles it to PDF, and provides AI-powered features (import, tailor, match analysis) via AWS Bedrock. There is no split-screen or form-builder flow: the CV document itself is the editor.

---

## Route Structure

Routes are defined in `frontend/src/App.tsx`. All working pages (non-landing) are nested inside `WorkingLayout`, which renders the persistent `NavBar` and scopes `EditorActionsContext` to those pages.

```
/                → LandingScreen          (template selection + build/tune entry)
/build           → TemplateSelector       (pick a CV template)
/build/form      → DirectEditPage         (inline CV editor — primary editing surface)
/apply           → redirect to /build/form with state { tune: true }
/dashboard       → Dashboard              (hierarchical version list, download, delete)
*                → NotFound               (404 catch-all)
```

`/apply` is a redirect to `/build/form` — the tune-for-job flow runs inside the editor page.

---

## Component Diagram

```
Browser
  └─ main.tsx (StrictMode + BrowserRouter + ErrorBoundary)
       └─ App.tsx (AppProvider + Routes)
            ├─ LandingScreen
            └─ WorkingLayout (NavBar + EditorActionsProvider + Outlet)
                 ├─ TemplateSelector
                 ├─ DirectEditPage  ──────────────────────────────┐
                 │    ├─ MedLengthTemplate                        │
                 │    │    ├─ EditableField (one per text field)   │
                 │    │    ├─ EditableBulletList                   │
                 │    │    ├─ SectionWrapper                       │
                 │    │    └─ EntryWrapper                         │
                 │    └─ [PageBreakIndicator, SaveIndicator]       │
                 │                                                 │
                 │    hooks: useDirectEditor, useAutoSave,         │
                 │           usePageBreak, useSectionDrag,         │
                 │           useEntryDrag, useScrollSync           │
                 │                                                 │
                 └─ Dashboard (version list + download)            │
                                                                   │
ApplyToJobScreen (at /apply, redirects to /build/form) ───────────┘
     ├─ MedLengthTemplate (readOnly preview)
     ├─ ChangePanel (AI tailor suggestions)
     └─ hooks: useTailor, useScrollSync
```

---

## Data Flow

### Editing flow (primary path)

1. User selects a template at `/build` → `selectedTemplateForBuild` is written to `CVContext`.
2. `DirectEditPage` mounts at `/build/form`. If `formData` is null (direct URL navigation or page refresh) it bootstraps by loading the most recent saved version via `api.getVersion`, or falls back to an empty `CVFormData` with placeholder values.
3. Every text field in `MedLengthTemplate` is an `EditableField`. The component uses the "uncontrolled while focused, controlled while blurred" pattern: the browser owns the DOM while the element is focused; on blur, `onFieldChange(path, value)` fires and `useDirectEditor.updateField` writes the change into `CVFormData` via `setAtPath` (dot-bracket path notation, e.g., `workExperience[0].bullets[2]`).
4. `useAutoSave` watches `formData` for changes. After 2.5 seconds of inactivity it calls `api.saveVersion` and reports `idle | saving | saved | error` status. `SaveIndicator` in the `NavBar` renders this status.
5. User clicks "Download PDF" in the `NavBar`. `DirectEditPage` calls `api.generateLatex(formData)` → `api.compileLatex(texContent, templateId)` → triggers a browser download of the base64-encoded PDF.

### Tune-for-job flow

1. User clicks "Tune for Job" in the `NavBar` (only visible on `/build/form`). `DirectEditPage` navigates to `/apply` with `state.baseVersionId`.
2. `/apply` redirects to `/build/form` with `state.tune: true`.
3. `ApplyToJobScreen` mounts. Steps 1–2 collect job details and run match analysis (`api.matchAnalysis`). Step 3 renders a read-only `MedLengthTemplate` preview alongside a `ChangePanel` with AI-generated tailor suggestions (`api.tailorSuggestChanges`).
4. `useTailor` manages accepting/skipping/undoing individual `TailorChange` objects. Each accepted change calls `setAtPath` on a local copy of `formData` and re-generates LaTeX.
5. On save, a child `CVVersion` is created with `parentVersionId` pointing to the base version.

### CV Import flow

1. User uploads PDF/DOCX/JSON at `/import` (`CVImportUpload.tsx`).
2. Frontend calls `api.importCV(file)` → `POST /api/cv-import` (`backend/routes/cv_import.py`).
3. Backend dispatches to the appropriate extractor (`backend/services/cv_extractor.py`): text-based PDF and DOCX extract text locally then call Bedrock for structuring; JSON parses directly. PDF falls back to `BedrockClient.chat_with_document` only when local text extraction cannot read useful text.
4. Returns `CVImportResponse` with `CVFormData`, confidence scores, and a summary. Frontend loads form data into context and navigates to template selection → direct editor.

### Version save/load flow

1. **Save:** `handleSaveVersion()` in `ToolsContext` calls `api.saveVersion()` → `POST /api/cv-versions` (`backend/routes/cv_versions.py:228`). Backend generates a UUID and persists the record via `StorageBackend.create_version()`.
2. **List:** Dashboard calls `api.listVersions()` → `GET /api/cv-versions`, which returns a hierarchical structure: base CVs with nested job-application children.
3. **Load:** Clicking a version calls `handleSwitchVersion()`, which fetches the full version via `GET /api/cv-versions/{id}` and loads it into context.

### Backend request flow

```
Frontend api.ts (axios/fetch)
    → FastAPI /api/* router
         → Route handler (Pydantic validation)
              → Service layer
                   ├─ BedrockClient  → AWS Bedrock (Claude)
                   ├─ LaTeXCompiler  → pdflatex / xelatex subprocess
                   ├─ StorageBackend → FileStorage (local JSON files)
                   │                    or DynamoStorage (DynamoDB)
                   └─ CVExtractor    → PDF/DOCX/JSON import
```

---

## Key Abstractions

| Abstraction | Location | Description |
|---|---|---|
| `CVFormData` | `frontend/src/types/index.ts:126` | Canonical data model for all CV content. Single source of truth between web editor and LaTeX generation. |
| `CVVersion` | `frontend/src/types/index.ts:160` | Saved snapshot: id, name, templateId, texContent, formData, job metadata, parentVersionId. |
| `EditableField` | `frontend/src/features/direct-edit/components/EditableField.tsx` | Core `contentEditable` component. One instance per CVFormData text field. Uncontrolled while focused, controlled on blur. |
| `MedLengthTemplate` | `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` | Web rendering of the `med-length-proff-cv` LaTeX template. Accepts the full `CVFormData` + callback props from `useDirectEditor`. |
| `useDirectEditor` | `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` | Bridges `EditableField` callbacks to `CVFormData` mutations. Exposes `updateField`, `addBullet`, `removeBullet`, `addEntry`, `removeEntry`, `reorderSections`, `reorderEntries`, `toggleSection`, `removeSection`. |
| `useAutoSave` | `frontend/src/features/direct-edit/hooks/useAutoSave.ts` | Debounced (2.5 s) save hook. Tracks `idle | saving | saved | error` status. Skips saves when `formData` is unchanged or uses a sentinel `templateId`. |
| `usePageBreak` | `frontend/src/features/direct-edit/hooks/usePageBreak.ts` | `ResizeObserver`-based detector for CV content exceeding one US Letter page. Returns pixel Y offset of page 2 start (or null). |
| `useSectionDrag` / `useEntryDrag` | `frontend/src/features/direct-edit/hooks/` | HTML Drag-and-Drop hooks for reordering sections and entries. Use dynamic `draggable` toggling on `mousedown` to remain compatible with `contentEditable`. Ghost image suppressed via a 1x1 canvas. |
| `useScrollSync` | `frontend/src/features/direct-edit/hooks/useScrollSync.ts` | `IntersectionObserver`-based scroll sync from CV sections to `ChangePanel` cards (one-way; anti-jitter flag prevents feedback loops). |
| `StorageBackend` | `backend/services/storage/storage.py` | Python Protocol (Strategy) for persistence. `FileStorage` writes `user_data/versions/*.json`; `DynamoStorage` uses DynamoDB single-table design (`PK=USER#{id}`, `SK=VERSION#{id}`). Selected by `STORAGE_BACKEND` env var via `storage_factory.py`. |
| `BedrockClient` | `backend/services/ai/bedrock.py` | Singleton AWS Bedrock client. Model selection per task: `MODEL_HAIKU` for extraction (speed), `MODEL_SONNET` for match analysis and chat (quality), `MODEL_TAILOR` (defaults to Haiku, overridable via `TAILOR_MODEL_ID` env var). |
| `TEMPLATES` registry | `backend/config/templates.py` | Dict of `TemplateConfig` dataclasses mapping template IDs to folder paths, LaTeX engine (`pdflatex` vs `xelatex`), and extra files. Three templates: `med-length-proff-cv`, `deedy-resume`, `mcdowell-cv`. |
| `setAtPath` / `getAtPath` | `frontend/src/utils/formDataPatch.ts` | Dot-bracket path utilities for reading and writing nested `CVFormData` fields (e.g., `workExperience[0].bullets[2]`). ID-aware: updates `BulletItem.text` without generating a new ID. |

---

## Context Architecture

Four React contexts are composed in `AppProvider` (`frontend/src/contexts/AppContext.tsx`):

```
AppProvider
  └─ JobProvider        (companyName, roleName, jobDescription)
       └─ CVProvider    (userProfile, formData, activeVersion, savedVersions,
       │                 isSavingVersion, selectedTemplateForBuild)
            └─ ToolsProvider  (templates, compiler, chat, cvImport,
                               handleVersionLoad, handleSaveVersion, handleSwitchVersion)
```

`EditorActionsProvider` is scoped to `WorkingLayout` (not `AppProvider`) so it only exists when a working page is mounted:

```
WorkingLayout
  └─ EditorActionsProvider  (actions: { onDownload, onTuneForJob, saveStatus, isDownloading, isTuning })
       └─ NavBar  (reads actions via useEditorActions())
       └─ Outlet
            └─ DirectEditPage  (writes actions via useSetEditorActions())
```

`AppContext.tsx` also exports `useAppContext()`, a backwards-compatible shim that merges `JobContext`, `CVContext`, and `ToolsContext` into one flat object. New code should use the domain-specific hooks directly: `useJobContext()`, `useCVContext()`, `useToolsContext()`.

---

## Direct-Edit Feature Directory

```
frontend/src/features/direct-edit/
  DirectEditPage.tsx          Top-level editor page; bootstraps formData, owns download + save lifecycle
  hooks/
    useDirectEditor.ts        CVFormData mutation surface for all EditableField callbacks
    useAutoSave.ts            Debounced save with status tracking
    usePageBreak.ts           Page overflow detection via ResizeObserver
    useSectionDrag.ts         Section-level HTML drag-and-drop reordering
    useEntryDrag.ts           Entry-level HTML drag-and-drop reordering
    useScrollSync.ts          IntersectionObserver-based CV-to-ChangePanel scroll sync
  components/
    MedLengthTemplate.tsx     Web CV renderer (med-length-proff-cv visual fidelity)
    EditableField.tsx         contentEditable text field mapped to a CVFormData path
    EditableBulletList.tsx    List of EditableFields for bullet arrays
    SectionWrapper.tsx        Hover-reveal section controls (add, toggle, drag grip)
    EntryWrapper.tsx          Hover-reveal entry controls (delete + confirm)
    DropLine.tsx              Visual drop target indicator during drag
    FloatingFormatToolbar.tsx Selection-triggered formatting toolbar (bold, italic, link)
    ChangePanel.tsx           AI tailor suggestion panel (also used in ApplyToJobScreen)
    ChangeCard.tsx            Single tailor suggestion card with accept/skip/undo/alternatives
    PageBreakIndicator.tsx    Visual dashed line at page 2 boundary
    SaveIndicator.tsx         Save status badge (idle/saving/saved/error)
    ImportToast.tsx           Post-import confirmation toast
    GripIcon.tsx              SVG grip handle icon for drag interactions
    ConfirmDialog.tsx         Confirmation modal for destructive actions
    sections/
      WorkSection.tsx         Work experience section
      EducationSection.tsx    Education section
      SkillsSection.tsx       Skills section
      ProjectsSection.tsx     Projects section
      AwardsSection.tsx       Awards section
      AdditionalSection.tsx   Generic additional sections
      EntryDragContainer.tsx  Drag wrapper for entry-level reordering
      DropZoneTail.tsx        Drop zone at the end of an entry list
      DateRange.tsx           Shared date range renderer
      sectionTypes.ts         Shared section key constants and label map
```

---

## Directory Structure

```
CV-Maker/
  frontend/                   React + TypeScript + Vite
    src/
      App.tsx                 Route definitions only
      main.tsx                App entry point (StrictMode + BrowserRouter + ErrorBoundary)
      contexts/               React context providers (Job, CV, Tools, EditorActions, AppContext shim)
      features/               Feature-scoped components
        direct-edit/          Inline CV editor (primary feature); apply-to-job "tune" flow lives under components/tune-tiers/
        dashboard/            Saved version list, download, delete, rename
        landing/              Home screen with build/tune entry panels
        template-selection/   Template picker
        voice-widget/         Voice interview widget
        shared/               Global ErrorBoundary
      hooks/                  Shared hooks: useTemplates, useCompiler, useChat, useImport, useTailor
      components/             Shared components: NavBar, WorkingLayout, FeatureErrorBoundary
      services/api.ts         Axios-based HTTP client; single point of contact to backend
      types/index.ts          All TypeScript interfaces and types
      utils/                  Pure utilities: formDataPatch, cvFilename, entryFactories, idHelpers, etc.
      styles/variables.css    Global CSS custom properties (colors, spacing, shadows, fonts)
  backend/                    Python + FastAPI
    main.py                   App factory, CORS, security headers, router registration
    routes/                   9 route modules (compile, chat, cv_versions, generate_latex,
                              cv_import, tailor, templates, user_data, voice_interview)
    services/                 Business logic (bedrock, latex_compiler, cv_extractor,
                              storage, file_storage, dynamo_storage, storage_factory,
                              json_utils, llm_cache)
    config/templates.py       Template registry (TEMPLATES dict)
    prompts/                  System prompts for all AI features
    latex_templates/          Jinja2 .tex.j2 templates with custom delimiters (( )) / (% %)
    dependencies.py           get_current_user (X-User-Id header, defaults to "local")
  cv-templates/               Original LaTeX template source directories
    med-length-proff-cv/
    deedy-resume/
    mcdowell-cv-master/
```

---

## Backend Layers

| Layer | Location | Responsibility |
|---|---|---|
| HTTP routes | `backend/routes/` | Request validation (Pydantic), response formatting, thin delegation to services |
| Services | `backend/services/` | Business logic, external integrations, data persistence |
| Storage | `backend/services/storage/storage.py` (Protocol) | Persistence abstraction — FileStorage or DynamoStorage |
| AI client | `backend/services/ai/bedrock.py` | Singleton Bedrock client, streaming + non-streaming, model-per-task selection |
| LaTeX pipeline | `backend/routes/generate_latex.py` + `backend/services/latex_compiler.py` | Form data -> Jinja2 -> .tex -> pdflatex/xelatex subprocess -> PDF |
| Template registry | `backend/config/templates.py` | Maps template IDs to folder paths, engine, and extra files |
| Prompts | `backend/prompts/` | System prompts for chat, match analysis, tailor, and voice interview |

---

## API Endpoint Map

| Method | Path | Route File | Purpose |
|---|---|---|---|
| GET | `/api/health` | `backend/main.py` | Health check |
| POST | `/api/compile` | `backend/routes/compile.py:27` | Compile LaTeX to PDF (base64) |
| POST | `/api/compile/pdf` | `backend/routes/compile.py:50` | Compile LaTeX, return raw PDF |
| GET | `/api/templates` | `backend/routes/templates.py:31` | List available templates |
| GET | `/api/templates/{id}/preview` | `backend/routes/templates.py:47` | Template preview image |
| GET | `/api/templates/{id}/content` | `backend/routes/templates.py:63` | Template LaTeX source |
| GET | `/api/templates/{id}/files/{name}` | `backend/routes/templates.py:90` | Template support files |
| POST | `/api/generate-latex` | `backend/routes/generate_latex.py:122` | Form data -> LaTeX source |
| POST | `/api/chat` | `backend/routes/chat.py:57` | AI chat (streaming SSE) |
| POST | `/api/chat/analyze` | `backend/routes/chat.py:93` | AI job analysis (streaming) |
| POST | `/api/chat/match-analysis` | `backend/routes/chat.py:131` | Structured match analysis |
| POST | `/api/tailor/suggest-changes` | `backend/routes/tailor.py:84` | AI tailor suggestions |
| POST | `/api/cv-import` | `backend/routes/cv_import.py:40` | Import CV from PDF/DOCX/JSON |
| GET | `/api/cv-versions` | `backend/routes/cv_versions.py:177` | List versions (hierarchical) |
| POST | `/api/cv-versions` | `backend/routes/cv_versions.py:228` | Create version |
| GET | `/api/cv-versions/{id}` | `backend/routes/cv_versions.py:276` | Get full version |
| DELETE | `/api/cv-versions/{id}` | `backend/routes/cv_versions.py:290` | Delete version |
| PATCH | `/api/cv-versions/{id}` | `backend/routes/cv_versions.py:311` | Update version (re-parent) |
| GET | `/api/user-data` | `backend/routes/user_data.py:34` | Load user profile |
| POST | `/api/user-data` | `backend/routes/user_data.py:48` | Save user profile |
| POST | `/api/user-data/experience` | `backend/routes/user_data.py:63` | Add single experience |
| DELETE | `/api/user-data` | `backend/routes/user_data.py:82` | Clear user data |
| WS | `/api/ws/voice-interview` | `backend/routes/voice_interview.py:120` | Voice interview pipeline |
| POST | `/api/voice/extract-cv` | `backend/routes/voice_interview.py:265` | Extract CV from transcript |
| GET | `/api/voice/profile` | `backend/routes/voice_interview.py:336` | Get voice profile |
| POST | `/api/voice/profile` | `backend/routes/voice_interview.py:345` | Save voice profile |

---

## Security and Cross-Cutting Concerns

**Authentication:** `X-User-Id` header -> `get_current_user()` dependency (`backend/dependencies.py`). Defaults to `"local"` for single-user mode. A comment in the code marks the swap point for JWT/Cognito.

**LaTeX sanitization:** `LaTeXCompiler._sanitize_content()` (`backend/services/latex_compiler.py:54`) strips dangerous commands (shell escape, file I/O, `\def`, `\let`, `\special`) before compilation. UUID validation on version IDs prevents path traversal.

**Caching:** In-memory LLM response cache (`backend/services/ai/llm_cache.py`) with 1-hour TTL, keyed by SHA-256 of concatenated inputs. Used by match analysis and tailor endpoints to avoid redundant Bedrock calls.

**Security headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` applied via middleware in `backend/main.py`.

**Error handling:** API methods in `frontend/src/services/api.ts` catch all errors and return typed failure values (never throw). `FeatureErrorBoundary` wraps per-route components; a global `ErrorBoundary` wraps the entire app. Backend route handlers use try/except with `logger.exception()` and generic 500 responses to avoid leaking internals.

---

## External Integrations

### AWS Bedrock (AI)

All AI features route through a single `BedrockClient` singleton (`backend/services/ai/bedrock.py`). Auth uses `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`.

| Variable | Model ID | Used for |
|---|---|---|
| `EXTRACTION_MODEL_ID` | `CV_IMPORT_MODEL_ID`, `EXTRACTION_MODEL_ID`, or `us.anthropic.claude-haiku-4-5-20251001-v1:0` | CV import structuring from extracted PDF/DOCX text (fast, cheap) |
| `MODEL_SONNET` | `us.anthropic.claude-sonnet-4-6` | Chat, match analysis, tailor suggestions (quality) |
| Default init fallback | `us.anthropic.claude-3-5-haiku-20241022-v1:0` | Backward-compatibility default in `BedrockClient.__init__` |
| `TAILOR_MODEL_ID` (env) | defaults to Haiku | Overridable via env var |

Capabilities: streaming via `invoke_model_with_response_stream` (SSE to frontend), non-streaming via `invoke_model`, multimodal document attachment via `chat_with_document` (PDF fallback when no text layer is available).

### AWS DynamoDB (Storage)

DynamoDB storage is selected when `STORAGE_BACKEND=dynamodb`. Single-table design:

- `PK=USER#{user_id}`, `SK=VERSION#{id}` for CV versions
- `PK=USER#{user_id}`, `SK=PROFILE` for user profile
- `PK=USER#{user_id}`, `SK=VOICE_PROFILE` for voice profile
- Billing: PAY_PER_REQUEST (on-demand)
- Table name: `DYNAMODB_TABLE_NAME` env var (default: `cv-maker`)
- Local dev: `DYNAMODB_ENDPOINT_URL=http://localhost:8100` (docker-compose runs `amazon/dynamodb-local`)

Table creation: `DYNAMODB_ENDPOINT_URL=http://localhost:8100 python backend/scripts/create_table.py`

### Voice Interview (AWS Nova Sonic) — Optional

Pipecat-based speech-to-speech pipeline via `backend/routes/voice_interview.py`. Optional dependency (`pipecat-ai[aws]`, not in `requirements.txt`). Gracefully disabled if not installed (`PIPECAT_AVAILABLE` flag). WebSocket endpoint: `/api/ws/voice-interview`.

### Frontend–Backend Communication

**REST:** Base URL set by `VITE_API_URL` env var (default `http://localhost:8000/api`). HTTP client: axios with 30 s default timeout; compile endpoint uses 120 s; import and tailor endpoints use 60 s.

**SSE (streaming):** Chat and job analysis use `text/event-stream`. Frontend uses native `fetch` + `ReadableStream` (not axios). Protocol: `data: {"text": "..."}\n\n` lines terminated by `data: [DONE]\n\n`. Utility: `processSSEStream` in `frontend/src/services/api.ts` centralises SSE parsing.

**WebSocket:** Voice interview at `ws://host/api/ws/voice-interview` with Pipecat protobuf serialization.
