# Architecture

**Analysis Date:** 2026-03-29

## Pattern Overview

**Overall:** Client-server monorepo with React 19 SPA frontend and FastAPI backend. The frontend owns user interaction and form data as the single source of truth for the "Build" path; the backend handles LaTeX generation, PDF compilation, AI interactions (via AWS Bedrock), and persistent storage.

**Key Characteristics:**
- React Router v6 for URL-based navigation (no server-side rendering)
- Context-based state management split into three domain contexts (Job, CV, Tools) with a backwards-compatible shim (`useAppContext`)
- Custom hooks encapsulate every domain concern (templates, compiler, chat, import, tailor, voice)
- Backend uses FastAPI routers with Pydantic models; storage abstracted behind a Protocol (Strategy pattern)
- AI calls go through a single `BedrockClient` singleton with model-per-task selection
- LaTeX generation uses Jinja2 templates with custom delimiters to avoid brace conflicts

## Layers

**Presentation Layer (Frontend):**
- Purpose: User interface, routing, form data collection, PDF preview
- Location: `frontend/src/`
- Contains: React components organized by feature, CSS Modules, route definitions
- Depends on: API service layer (`frontend/src/services/api.ts`), contexts, hooks
- Used by: End users via browser

**State Management Layer (Frontend):**
- Purpose: Holds all shared application state and orchestrates cross-feature communication
- Location: `frontend/src/contexts/`
- Contains: Three React contexts (JobContext, CVContext, ToolsContext) composed via AppProvider
- Depends on: API service, custom hooks
- Used by: All feature components via `useAppContext()` or domain-specific hooks

**Custom Hooks Layer (Frontend):**
- Purpose: Encapsulate domain logic, API calls, and state transitions
- Location: `frontend/src/hooks/`
- Contains: `useTemplates`, `useCompiler`, `useChat`, `useImport`, `useTailor`, `useVoiceInterview`, `useFormBuilder`
- Depends on: `frontend/src/services/api.ts`
- Used by: Context providers and feature components

**API Client Layer (Frontend):**
- Purpose: Single point of contact between frontend and backend
- Location: `frontend/src/services/api.ts`
- Contains: Axios-based HTTP client with SSE streaming support via native `fetch`
- Depends on: Backend REST API at `VITE_API_URL` (default `http://localhost:8000/api`)
- Used by: Hooks and contexts

**API Route Layer (Backend):**
- Purpose: HTTP endpoint definitions, request validation, response formatting
- Location: `backend/routes/`
- Contains: 9 route modules (compile, chat, cv_versions, generate_latex, cv_import, tailor, templates, user_data, voice_interview)
- Depends on: Services, prompts, dependencies
- Used by: Frontend API client

**Service Layer (Backend):**
- Purpose: Business logic, external integrations, data persistence
- Location: `backend/services/`
- Contains: `bedrock.py` (AI), `latex_compiler.py` (PDF), `cv_extractor.py` (import), storage backends, `json_utils.py`, `llm_cache.py`
- Depends on: AWS SDK (boto3), subprocess (LaTeX engines), Jinja2
- Used by: Route handlers

**Storage Layer (Backend):**
- Purpose: Persist CV versions, user profiles, voice profiles
- Location: `backend/services/storage.py` (Protocol), `backend/services/file_storage.py`, `backend/services/dynamo_storage.py`
- Contains: `StorageBackend` Protocol with two implementations
- Depends on: Filesystem (FileStorage) or DynamoDB (DynamoStorage)
- Used by: Route handlers via `get_storage()` FastAPI dependency

**Template Layer (Backend):**
- Purpose: Convert structured form data to LaTeX source code
- Location: `backend/latex_templates/*.tex.j2`, `backend/routes/generate_latex.py`
- Contains: 3 Jinja2 templates with custom delimiters `(( ))` / `(% %)`
- Depends on: Jinja2, custom `latex_escape` and `latex_url_escape` filters
- Used by: `generate_latex` route

**AI Prompt Layer (Backend):**
- Purpose: System prompts for all AI-powered features
- Location: `backend/prompts/cv_agent.py`, `backend/prompts/voice_interview.py`
- Contains: Chat prompts, match analysis prompts, tailor suggestion prompts, voice interview prompts
- Depends on: Nothing (pure data)
- Used by: Chat, tailor, and voice_interview route handlers

## Data Flow

**Build CV Flow (form data to PDF):**
1. User fills out `CVFormBuilder` (`frontend/src/features/form-builder/CVFormBuilder.tsx`); form state managed by `useFormBuilder` hook (`frontend/src/hooks/useFormBuilder.ts`)
2. On "Preview" / "Generate", frontend calls `api.generateLatex(formData)` which POSTs to `POST /api/generate-latex` (`backend/routes/generate_latex.py`)
3. Backend renders Jinja2 template with form data, applying `latex_escape` filter, returns raw `.tex` source
4. Frontend calls `api.compileLatex(texContent, templateId)` which POSTs to `POST /api/compile` (`backend/routes/compile.py`)
5. `LaTeXCompiler` (`backend/services/latex_compiler.py`) sanitizes content, writes to temp dir, copies template support files (cls, fonts), runs pdflatex/xelatex twice, returns base64-encoded PDF
6. Frontend displays PDF in an `<iframe>` via data URL

**Tailor CV for Job (Apply to Job):**
1. User selects a base CV on Dashboard, clicks "Apply to Job" -> navigates to `/apply` (`frontend/src/features/apply-to-job/ApplyToJobScreen.tsx`)
2. Step 1: User enters job description, company name, role
3. Step 2: Frontend calls `api.getMatchAnalysis()` -> `POST /api/chat/match-analysis` (`backend/routes/chat.py:131`). Backend sends CV + job description to Claude Sonnet via Bedrock, returns structured `MatchAnalysisResponse` (requirements, matching, missing, suggestions, score)
4. Step 3: Frontend calls `api.suggestTailorChanges()` -> `POST /api/tailor/suggest-changes` (`backend/routes/tailor.py:84`). Backend sends form data + job description to Claude, returns field-level `TailorChange` items with alternatives
5. User reviews changes (checkboxes), frontend applies selected changes via `applyTailorChanges()` (`frontend/src/utils/formDataPatch.ts`), then generates new LaTeX and saves version

**CV Import Flow:**
1. User uploads PDF/DOCX/JSON at `/import` (`frontend/src/features/cv-import/CVImportUpload.tsx`)
2. Frontend calls `api.importCV(file)` -> `POST /api/cv-import` (`backend/routes/cv_import.py`)
3. Backend dispatches to appropriate extractor (`backend/services/cv_extractor.py`): PDF uses Bedrock `chat_with_document`, DOCX extracts text then uses Bedrock, JSON parses directly
4. Returns `CVImportResponse` with `CVFormData`, confidence scores, and summary
5. Frontend loads form data into context and navigates to template selection -> form builder

**Version Save/Load:**
1. Save: `handleSaveVersion()` in `ToolsContext` (`frontend/src/contexts/ToolsContext.tsx:75`) calls `api.saveVersion()` -> `POST /api/cv-versions` (`backend/routes/cv_versions.py:228`)
2. Backend generates UUID, creates version record via `StorageBackend.create_version()`
3. Load: Dashboard calls `api.listVersions()` -> `GET /api/cv-versions` which returns hierarchical structure (base CVs with nested children)
4. Click version -> `handleSwitchVersion()` fetches full version via `GET /api/cv-versions/{id}`, loads into context

**State Management:**
- Three domain contexts composed in `AppProvider` (`frontend/src/contexts/AppContext.tsx:66`):
  - `JobContext` (`frontend/src/contexts/JobContext.tsx`): company name, role name, job description
  - `CVContext` (`frontend/src/contexts/CVContext.tsx`): user profile, active version, form data, saved versions, selected template
  - `ToolsContext` (`frontend/src/contexts/ToolsContext.tsx`): instantiates all hooks (useTemplates, useCompiler, useChat, useImport), provides version handlers
- `useAppContext()` is a backwards-compatible shim that merges all three contexts into one flat object
- New consumers should prefer `useJobContext()`, `useCVContext()`, or `useToolsContext()` directly

## Key Abstractions

**StorageBackend Protocol:**
- Purpose: Decouple persistence from route handlers
- Definition: `backend/services/storage.py`
- Implementations: `FileStorage` (`backend/services/file_storage.py`) for local dev, `DynamoStorage` (`backend/services/dynamo_storage.py`) for production
- Pattern: Strategy pattern via Python Protocol; resolved at startup by `storage_factory.py` based on `STORAGE_BACKEND` env var
- FileStorage stores each version as `user_data/versions/{uuid}.json`
- DynamoStorage uses single-table design: `PK=USER#{id}`, `SK=VERSION#{id}|PROFILE|VOICE_PROFILE`

**BedrockClient:**
- Purpose: Unified AI model access
- Definition: `backend/services/bedrock.py`
- Pattern: Singleton (`bedrock_client` module-level instance)
- Supports streaming and non-streaming chat, document-based chat (for PDF import)
- Model selection per task: `MODEL_HAIKU` for extraction (fast, cheap), `MODEL_SONNET` for analysis/rewriting (quality)

**TemplateConfig:**
- Purpose: Centralized template metadata
- Definition: `backend/config/templates.py`
- Pattern: Registry pattern (dict of dataclass instances)
- Maps template IDs to folders, file paths, LaTeX engine (`pdflatex` vs `xelatex`), extra files/dirs

**CVFormData:**
- Purpose: Canonical data model for CV content
- Frontend definition: `frontend/src/types/index.ts:168`
- Backend definition: `backend/routes/cv_versions.py:89` (Pydantic model)
- Used across: form builder, import, tailor, generate-latex, version storage
- Contains: templateId, sectionOrder, personalInfo, workExperience, education, skills, projects, awards, additionalSections

**CVVersion:**
- Purpose: A saved snapshot of a CV (tex content + form data + job context)
- Frontend definition: `frontend/src/types/index.ts:202`
- Backend definition: `backend/routes/cv_versions.py:114`
- Hierarchical: `parentVersionId` links job applications to base CVs
- Contains: id, name, templateId, texContent, formData, jobDescription, companyName, role, matchScore, baselineMatchScore, parentVersionId, createdAt

## Entry Points

**Frontend Entry:**
- Location: `frontend/src/main.tsx`
- Triggers: Browser loads `index.html` -> Vite serves `main.tsx`
- Responsibilities: Wraps `<App />` in `<StrictMode>`, `<BrowserRouter>`, and `<ErrorBoundary>`

**Frontend Router:**
- Location: `frontend/src/App.tsx`
- Triggers: URL navigation
- Responsibilities: Wraps all routes in `<AppProvider>` and `<Suspense>`, defines 7 lazy-loaded routes
- Routes:
  - `/` -> `LandingScreen`
  - `/dashboard` -> `Dashboard`
  - `/build/start` -> `BuildChoiceScreen`
  - `/build` -> `TemplateSelector`
  - `/build/form` -> `CVFormBuilder`
  - `/import` -> `CVImportUpload`
  - `/apply` -> `ApplyToJobScreen`

**Backend Entry:**
- Location: `backend/main.py`
- Triggers: `uvicorn main:app`
- Responsibilities: Creates FastAPI app, configures CORS, registers security headers middleware, includes 9 routers under `/api` prefix, exposes `/api/health` endpoint

## Error Handling

**Strategy:** Defensive returns with graceful degradation (no global error interceptors)

**Frontend Patterns:**
- API methods in `frontend/src/services/api.ts` catch all errors and return fallback values (null, empty arrays, error objects) rather than throwing
- `FeatureErrorBoundary` (`frontend/src/components/FeatureErrorBoundary.tsx`) wraps per-route components, renders retry/home UI on crash
- Global `ErrorBoundary` (`frontend/src/features/shared/ErrorBoundary.tsx`) wraps the entire app in `main.tsx`
- AbortController used in `useCompiler` and API calls for cleanup on unmount

**Backend Patterns:**
- Route handlers use try/except with `logger.exception()` and generic 500 responses (`"An internal error occurred"`) to avoid leaking internals
- `parse_json_with_retry()` (`backend/services/json_utils.py:32`) retries AI JSON parsing once on failure
- `_sanitize_content()` in `LaTeXCompiler` (`backend/services/latex_compiler.py:54`) strips dangerous LaTeX commands before compilation
- UUID validation on version IDs prevents path traversal (`backend/routes/cv_versions.py:16`)
- Circular parent reference detection on version updates (`backend/routes/cv_versions.py:144`)

## Cross-Cutting Concerns

**Logging:**
- Backend: Python `logging` module (standard library); `loguru` used in `voice_interview.py`
- Frontend: `console.error()` / `console.warn()` in catch blocks

**Validation:**
- Backend: Pydantic models on all route inputs (automatic 422 on invalid requests)
- Frontend: TypeScript interfaces enforce compile-time type safety; runtime validation is minimal
- LaTeX content sanitization in compiler (`backend/services/latex_compiler.py:26-50`)

**Authentication:**
- Current: `X-User-Id` header -> `get_current_user()` dependency (`backend/dependencies.py`), defaults to `"local"` for single-user mode
- Comment in code: "Swap this for JWT/Cognito validation when adding auth"
- No frontend auth flow exists; all requests go through without credentials

**Caching:**
- In-memory LLM response cache (`backend/services/llm_cache.py`) with 1-hour TTL
- Used by match-analysis and tailor endpoints to avoid redundant AI calls
- Cache key: SHA-256 of concatenated inputs

**Security Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Set via middleware in `backend/main.py:39-45`

**CORS:**
- Configurable via `CORS_ORIGINS` env var
- Default: `http://localhost:5173,http://127.0.0.1:5173`
- Allows `X-User-Id` custom header

## API Endpoint Map

All endpoints are prefixed with `/api`.

| Method | Path | Route File | Purpose |
|--------|------|-----------|---------|
| GET | `/health` | `backend/main.py:60` | Health check |
| POST | `/compile` | `backend/routes/compile.py:27` | Compile LaTeX to PDF (base64) |
| POST | `/compile/pdf` | `backend/routes/compile.py:50` | Compile LaTeX, return raw PDF |
| GET | `/templates` | `backend/routes/templates.py:31` | List available templates |
| GET | `/templates/{id}/preview` | `backend/routes/templates.py:47` | Template preview image |
| GET | `/templates/{id}/content` | `backend/routes/templates.py:63` | Template LaTeX source |
| GET | `/templates/{id}/files/{name}` | `backend/routes/templates.py:90` | Template support files |
| POST | `/generate-latex` | `backend/routes/generate_latex.py:122` | Form data -> LaTeX source |
| POST | `/chat` | `backend/routes/chat.py:57` | AI chat (streaming SSE) |
| POST | `/chat/analyze` | `backend/routes/chat.py:93` | AI job analysis (streaming) |
| POST | `/chat/match-analysis` | `backend/routes/chat.py:131` | Structured match analysis |
| POST | `/tailor/suggest-changes` | `backend/routes/tailor.py:84` | AI-powered tailor suggestions |
| POST | `/cv-import` | `backend/routes/cv_import.py:40` | Import CV from PDF/DOCX/JSON |
| GET | `/cv-versions` | `backend/routes/cv_versions.py:177` | List versions (hierarchical) |
| POST | `/cv-versions` | `backend/routes/cv_versions.py:228` | Create version |
| GET | `/cv-versions/{id}` | `backend/routes/cv_versions.py:276` | Get full version |
| DELETE | `/cv-versions/{id}` | `backend/routes/cv_versions.py:290` | Delete version |
| PATCH | `/cv-versions/{id}` | `backend/routes/cv_versions.py:311` | Update version (re-parent) |
| GET | `/user-data` | `backend/routes/user_data.py:34` | Load user profile |
| POST | `/user-data` | `backend/routes/user_data.py:48` | Save user profile |
| POST | `/user-data/experience` | `backend/routes/user_data.py:63` | Add single experience |
| DELETE | `/user-data` | `backend/routes/user_data.py:82` | Clear user data |
| WS | `/ws/voice-interview` | `backend/routes/voice_interview.py:120` | Voice interview pipeline |
| POST | `/voice/extract-cv` | `backend/routes/voice_interview.py:265` | Extract CV from transcript |
| GET | `/voice/profile` | `backend/routes/voice_interview.py:336` | Get voice profile |
| POST | `/voice/profile` | `backend/routes/voice_interview.py:345` | Save voice profile |

---

*Architecture analysis: 2026-03-29*
