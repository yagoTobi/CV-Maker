<!-- GSD:project-start source:PROJECT.md -->
## Project

**CV-Maker: Direct-Edit Web CV**

A CV builder where users edit directly on a web-rendered version of their CV that looks exactly like the final PDF. Users pick a template, type inline on the web CV, and download a LaTeX-compiled PDF. AI features (import, job tailoring, match analysis) work seamlessly with the new editing experience. The current form-builder split-screen is replaced entirely.

**Core Value:** The CV itself is the editor. Users type directly on what they'll download — no form fields, no split screen, no mental mapping between inputs and output.

### Constraints

- **Data model**: CVFormData stays as-is -- web CV editor must read/write the same structure
- **Backend**: Minimal backend changes -- LaTeX generation and compilation pipeline unchanged
- **Templates**: Web template components must be maintainable alongside LaTeX templates
- **AI features**: Import, Tune, Apply to Job must all work with the new editor
- **Browser**: Modern browsers only (CSS grid, contenteditable, modern APIs acceptable)
- **AI speed**: CV import, tailor suggestions, and per-field AI assist must target sub-2 second response times to keep users in editing flow. Match analysis can take longer. Research fastest model/provider (Bedrock Llama, Groq, etc.) during AI integration phase.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ~5.9.3 - Frontend application (`frontend/src/`)
- Python 3.12 - Backend application (`backend/`), specified in `Dockerfile` (`FROM python:3.12-slim`)
- LaTeX (pdflatex + xelatex) - CV template compilation (`cv-templates/`, `backend/latex_templates/*.tex.j2`)
- Jinja2 templating - LaTeX generation with custom delimiters `(( ))` / `(% %)` (`backend/routes/generate_latex.py`)
## Runtime
- Node.js (no `.nvmrc` present; use any modern LTS version)
- Package Manager: npm (lockfile: `frontend/package-lock.json`)
- Python 3.12 (Docker image: `python:3.12-slim`)
- No virtual environment manager enforced; `pip install -r requirements.txt`
## Frameworks
- React ^19.2.0 - Frontend UI framework (`frontend/package.json`)
- FastAPI >=0.115.0 - Backend API framework (`backend/requirements.txt`)
- Uvicorn >=0.30.0 - ASGI server (`backend/requirements.txt`)
- react-router-dom ^7.13.1 - Client-side routing (`frontend/package.json`)
- Vitest ^4.0.18 - Frontend test runner (`frontend/package.json`, config: `frontend/vitest.config.ts`)
- @testing-library/react ^16.3.2 - Component testing (`frontend/package.json`)
- @testing-library/jest-dom ^6.9.1 - DOM matchers (setup: `frontend/src/test-setup.ts`)
- @testing-library/user-event ^14.6.1 - User interaction simulation
- pytest - Backend tests (`backend/pytest.ini`), with `@pytest.mark.slow` for compilation tests
- jsdom ^28.1.0 - Browser environment for Vitest
- Vite ^7.3.1 - Frontend bundler and dev server (`frontend/vite.config.ts`)
- @vitejs/plugin-react ^5.1.1 - React Fast Refresh for Vite
- ESLint ^9.39.1 - Flat config format (`frontend/eslint.config.js`)
- typescript-eslint ^8.48.0 - TypeScript ESLint integration
- eslint-plugin-react-hooks ^7.0.1 - React hooks lint rules
- eslint-plugin-react-refresh ^0.4.24 - React Refresh lint rules
## Key Dependencies
- axios ^1.13.5 - HTTP client for API calls (`frontend/src/services/api.ts`)
- @uiw/react-codemirror ^4.25.4 - LaTeX code editor in EditorScreen
- codemirror-lang-latex ^0.2.0 - LaTeX syntax highlighting for CodeMirror
- @codemirror/lang-javascript ^6.2.4 - JavaScript language support for CodeMirror
- @lezer/highlight ^1.2.3 - Syntax highlighting framework
- boto3 >=1.34.0 - AWS SDK for Bedrock AI and DynamoDB (`backend/services/bedrock.py`, `backend/services/dynamo_storage.py`)
- jinja2 >=3.1.0 - LaTeX template rendering (`backend/routes/generate_latex.py`)
- pydantic >=2.9.0 - Data validation and serialization (used in all routes)
- loguru >=0.7.0 - Structured logging (`backend/routes/voice_interview.py`)
- python-multipart >=0.0.9 - File upload handling (CV import)
- python-dotenv >=1.0.0 - Environment variable loading (`backend/main.py`)
- PyPDF2 >=3.0.0 - PDF page count extraction (`backend/services/latex_compiler.py`)
- python-docx >=1.1.0 - DOCX text extraction for CV import (`backend/services/cv_extractor.py`)
- pipecat-ai (optional, not in requirements.txt) - Voice interview pipeline (`backend/routes/voice_interview.py`). Imported conditionally with `PIPECAT_AVAILABLE` flag. Includes AWS Nova Sonic LLM integration.
## TypeScript Configuration
## Build Configuration
- Plugin: @vitejs/plugin-react
- Source maps: disabled in production (`sourcemap: false`)
- Environment: jsdom
- Globals: true (no explicit imports needed for `describe`, `it`, `expect`)
- Setup file: `frontend/src/test-setup.ts` (imports `@testing-library/jest-dom/vitest`)
- CSS modules: non-scoped class name strategy
- Flat config format (ESLint 9.x)
- Extends: js.configs.recommended, tseslint.configs.recommended, reactHooks flat config, reactRefresh vite config
- Global ignores: `dist/`
- Files: `**/*.{ts,tsx}`
## Docker
- Base image: `python:3.12-slim`
- TeX Live packages: base, latex-base, recommended, extra, xetex, fonts-recommended, fonts-extra, bibtex-extra, plain-generic
- Microsoft fonts: ttf-mscorefonts-installer (EULA pre-accepted)
- Runs as non-root user `appuser` (UID/GID 1000)
- Healthcheck: Python HTTP check to `/api/health`
- Entrypoint: `uvicorn main:app --host 0.0.0.0 --port 8000`
- Services: `backend` (port 8000), `dynamodb-local` (port 8100)
- Volumes: `cv-maker-data` (persistent user data), `dynamodb-data` (DynamoDB local storage)
- Backend depends on dynamodb-local with health check
## Platform Requirements
- Node.js (modern LTS) + npm for frontend
- Python 3.12 for backend
- TeX Live (pdflatex + xelatex) installed locally for LaTeX compilation, or use Docker
- AWS credentials configured (for Bedrock AI)
- Docker (single container for backend + LaTeX)
- Frontend: static build served separately (Vite produces `frontend/dist/`)
- AWS Bedrock access (Claude models)
- Optional: DynamoDB table for multi-user storage
## Run Commands
# Frontend dev server
# Frontend build
# Frontend tests
# Frontend lint
# Frontend type-check (standalone)
# Backend dev server
# Backend tests
# Docker (full stack)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase (e.g., `LandingScreen.tsx`, `CVFormBuilder.tsx`, `FeatureErrorBoundary.tsx`)
- CSS Modules: match component name with `.module.css` suffix (e.g., `LandingScreen.module.css`)
- Hooks: camelCase with `use` prefix (e.g., `useFormBuilder.ts`, `useCompiler.ts`, `useImport.ts`)
- Utilities: camelCase (e.g., `formDataPatch.ts`, `cvFilename.ts`, `deriveLinkLabel.ts`)
- Contexts: PascalCase with `Context` suffix (e.g., `CVContext.tsx`, `JobContext.tsx`, `ToolsContext.tsx`)
- Types: single `index.ts` barrel file (`frontend/src/types/index.ts`)
- Tests (frontend): camelCase with `.test.ts` / `.test.tsx` suffix, stored in `frontend/src/__tests__/`
- Tests (backend): snake_case with `test_` prefix (e.g., `test_template_rendering.py`, `test_cv_extractor.py`)
- Backend routes: snake_case module names (e.g., `cv_import.py`, `cv_versions.py`, `generate_latex.py`)
- Backend services: snake_case module names (e.g., `cv_extractor.py`, `file_storage.py`, `latex_compiler.py`)
- camelCase for all functions and methods
- Event handlers: `handle` + action (e.g., `handleBuildCV`, `handleTuneForJob`, `handleFileSelected`)
- State updaters returned from hooks: verb + noun (e.g., `updatePersonalInfo`, `addWorkEntry`, `removeBullet`, `reorderSections`)
- Factory functions: `empty` + type (e.g., `emptyWorkEntry()`, `emptyPersonalInfo()`, `emptyProject()`)
- API methods: verb + noun (e.g., `compileLatex`, `fetchTemplates`, `saveVersion`, `importCV`)
- snake_case for all functions
- Private helpers: leading underscore (e.g., `_parse_extraction_response`, `_build_personal_items`, `_detect_extension`, `_extract_docx_text`)
- Route handlers: descriptive verb (e.g., `import_cv`, `health_check`)
- Test fixtures: `_minimal_valid_response()`, `_full_valid_response()`, `_make_valid_response()`
- TypeScript: camelCase (e.g., `formData`, `activeVersion`, `savedVersions`, `isGenerating`)
- Boolean state: `is` prefix (e.g., `isImporting`, `isSavingVersion`, `isDirty`, `isGenerating`)
- Python: snake_case (e.g., `file_bytes`, `form_data`, `template_id`)
- Constants (Python): UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `ALLOWED_EXTENSIONS`, `CORS_ORIGINS`, `TEMPLATE_FILES`)
- PascalCase for all types and interfaces
- Use `interface` for object shapes (e.g., `CVFormData`, `PersonalInfo`, `WorkEntry`, `TailorChange`)
- Use `type` for unions and derived types (e.g., `type FormSection = 'personal' | 'work' | ...`, `type CVVersionMeta = Omit<CVVersion, 'texContent' | 'formData'>`)
- Backend: Pydantic models in PascalCase (e.g., `CVFormData`, `PersonalInfo`, `WorkEntry`)
## Code Style
- No Prettier config detected -- uses ESLint for style enforcement
- ESLint config: `frontend/eslint.config.js` (flat config format)
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`
- TypeScript: strict mode enabled, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Target: ES2022
- Indentation: 2 spaces (TypeScript), 4 spaces (Python)
- Single quotes in TypeScript, double quotes in Python
- ESLint with `js.configs.recommended` and `tseslint.configs.recommended`
- React hooks lint rules enforced (`eslint-plugin-react-hooks`)
- No backend linter detected (no ruff/flake8/pylint config)
## Component Patterns
- All route-level components are lazy-loaded in `frontend/src/App.tsx`:
- Suspense fallback: `null` (no loading spinner for route transitions)
- `FeatureErrorBoundary` wraps most routes in `App.tsx`
- Located at `frontend/src/components/FeatureErrorBoundary.tsx`
- Shows retry button + go home button on error
## CSS/Styling Approach
- Every component has a co-located `.module.css` file
- Import pattern: `import styles from './ComponentName.module.css';`
- Class names in CSS: camelCase (e.g., `.cardPrimary`, `.cardBody`, `.savedLink`, `.cardArrow`)
- Composition via template literals: `` className={`${styles.card} ${styles.cardPrimary}`} ``
- Global CSS variables defined in `frontend/src/styles/variables.css`
- Color palette: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover`
- Accent: `--accent` (#3B82F6 blue), `--accent-hover`, `--accent-light`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Borders: `--border-color`, `--border-strong`
- Status: `--success`, `--warning`, `--error` (with `-light` variants)
- Spacing: `--radius` (8px), `--radius-sm` (6px), `--radius-lg` (12px)
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Font: IBM Plex Sans (body), IBM Plex Mono (code)
- CSS transitions for hover states: `transition: all 0.18s ease;`
- Keyframe animations for page enters: `fadeInUp` (opacity + translateY)
- `@keyframes spin` for loading spinners
- Smooth transitions for collapsible panels via CSS
- Mobile breakpoint: `@media (max-width: 680px)` for landing screen
- Flex layout: switches from row to column on mobile
- `min-width: 0` on flex children to prevent overflow
## TypeScript Patterns
- Use `interface` for data shapes with named properties (strongly preferred):
- Use `type` for unions, computed types, and type aliases:
- Minimal use of custom generics
- Generic helper function for reordering arrays:
- Hook return types inferred via `ReturnType<typeof useHook>` pattern
- Optional chaining used throughout: `result.current.formData.awards![0].title`
- Nullish coalescing for defaults: `formData.sectionOrder ?? DEFAULT_SECTION_ORDER`
- API methods return `null` on failure (not throw):
- `|| []` guard for optional arrays: `prev.projects || []`
- `strict: true` in `tsconfig.app.json`
- `verbatimModuleSyntax: true` -- requires explicit `type` keyword for type-only imports:
## Import Organization
- No path aliases configured (all imports use relative paths `../`, `../../`)
- Barrel files: `frontend/src/hooks/index.ts`, `frontend/src/features/template-selection/index.ts`, `frontend/src/features/form-builder/sections/index.ts`
- `sys.path.insert(0, ...)` hack used in tests to add backend to path
## Error Handling
- API methods in `frontend/src/services/api.ts` catch all errors internally and return typed failure values:
- Never throw from API methods; callers check `result.success` or `result !== null`
- `console.error` for unexpected failures in non-critical paths
- FastAPI `HTTPException` for validation errors (400 status code):
- Business logic errors return `success: False` in response body (not HTTP errors)
- `loguru` listed in requirements but `logging` stdlib used in route modules
- Service-level functions return typed result objects (e.g., `CVImportResult`) with `success`, `error`, `form_data` fields
- Broad `except Exception` catch in services to prevent unhandled crashes
- `FeatureErrorBoundary` class component wraps route-level components
- Logs with `console.error` in `componentDidCatch`
- Provides "Try Again" (re-render) and "Go Home" (navigate to `/`) actions
## Logging
- `console.error` for API failures and error boundary catches
- `console.log` with `[ModuleName:action]` prefix for dev-only debugging:
- `logging.getLogger(__name__)` used in route modules
- `logger.warning()` for failed operations, `logger.info()` for success
- `loguru` in requirements but not observed in route files
## Comments
- JSDoc `/** ... */` on exported functions and complex parameters:
- Inline comments for non-obvious behavior: `// filter(Boolean) removes empty strings`
- No comments for self-explanatory code
- Module-level docstrings at top of every file:
- Function docstrings for public API functions
- Inline comments for constants: `MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB`
- Both frontend and backend test files have detailed block comments at the top:
## Function Design
- Hooks return memoized objects via `useMemo` with all operations included
- All state updaters wrapped in `useCallback` for stable references
- Large hook return values are typed inline (not via separate interface)
- `useFormBuilder` is the canonical complex hook pattern (~700 lines)
- Thin route handler with business logic delegated to services:
- Helper functions prefixed with `_` for route-internal logic
## Module Design
- Default exports for route-level screen components
- Named exports for reusable components and utilities
- Barrel files (`index.ts`) used in `hooks/`, `features/template-selection/`, `features/form-builder/sections/`
- Types co-exported from barrel files: `export type { Template } from './TemplateSelector';`
- FastAPI `router = APIRouter()` pattern in every route module
- Services are plain functions and classes (no dependency injection framework)
- `__init__.py` files exist but are empty
- Split into domain contexts: `JobContext`, `CVContext`, `ToolsContext`
- Composed in `AppProvider` (nested providers):
- Backward-compatible `useAppContext()` shim merges all three contexts
- New code should prefer domain-specific hooks: `useCVContext()`, `useJobContext()`, `useToolsContext()`
## Git Conventions
- Feature branches: `feature/interface-redesign`
- Main branch: `main`
- Short descriptive statements: "Support 'add' change type in path resolution"
- Date-based shorthand for multi-change commits: "21/03"
- Verb-leading: "Implement lazy loading, refactor contexts, and extract form sections"
- No conventional commits prefix (no `feat:`, `fix:`, `chore:`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- React Router v6 for URL-based navigation (no server-side rendering)
- Context-based state management split into three domain contexts (Job, CV, Tools) with a backwards-compatible shim (`useAppContext`)
- Custom hooks encapsulate every domain concern (templates, compiler, chat, import, tailor, voice)
- Backend uses FastAPI routers with Pydantic models; storage abstracted behind a Protocol (Strategy pattern)
- AI calls go through a single `BedrockClient` singleton with model-per-task selection
- LaTeX generation uses Jinja2 templates with custom delimiters to avoid brace conflicts
## Layers
- Purpose: User interface, routing, form data collection, PDF preview
- Location: `frontend/src/`
- Contains: React components organized by feature, CSS Modules, route definitions
- Depends on: API service layer (`frontend/src/services/api.ts`), contexts, hooks
- Used by: End users via browser
- Purpose: Holds all shared application state and orchestrates cross-feature communication
- Location: `frontend/src/contexts/`
- Contains: Three React contexts (JobContext, CVContext, ToolsContext) composed via AppProvider
- Depends on: API service, custom hooks
- Used by: All feature components via `useAppContext()` or domain-specific hooks
- Purpose: Encapsulate domain logic, API calls, and state transitions
- Location: `frontend/src/hooks/`
- Contains: `useTemplates`, `useCompiler`, `useChat`, `useImport`, `useTailor`, `useVoiceInterview`, `useFormBuilder`
- Depends on: `frontend/src/services/api.ts`
- Used by: Context providers and feature components
- Purpose: Single point of contact between frontend and backend
- Location: `frontend/src/services/api.ts`
- Contains: Axios-based HTTP client with SSE streaming support via native `fetch`
- Depends on: Backend REST API at `VITE_API_URL` (default `http://localhost:8000/api`)
- Used by: Hooks and contexts
- Purpose: HTTP endpoint definitions, request validation, response formatting
- Location: `backend/routes/`
- Contains: 9 route modules (compile, chat, cv_versions, generate_latex, cv_import, tailor, templates, user_data, voice_interview)
- Depends on: Services, prompts, dependencies
- Used by: Frontend API client
- Purpose: Business logic, external integrations, data persistence
- Location: `backend/services/`
- Contains: `bedrock.py` (AI), `latex_compiler.py` (PDF), `cv_extractor.py` (import), storage backends, `json_utils.py`, `llm_cache.py`
- Depends on: AWS SDK (boto3), subprocess (LaTeX engines), Jinja2
- Used by: Route handlers
- Purpose: Persist CV versions, user profiles, voice profiles
- Location: `backend/services/storage.py` (Protocol), `backend/services/file_storage.py`, `backend/services/dynamo_storage.py`
- Contains: `StorageBackend` Protocol with two implementations
- Depends on: Filesystem (FileStorage) or DynamoDB (DynamoStorage)
- Used by: Route handlers via `get_storage()` FastAPI dependency
- Purpose: Convert structured form data to LaTeX source code
- Location: `backend/latex_templates/*.tex.j2`, `backend/routes/generate_latex.py`
- Contains: 3 Jinja2 templates with custom delimiters `(( ))` / `(% %)`
- Depends on: Jinja2, custom `latex_escape` and `latex_url_escape` filters
- Used by: `generate_latex` route
- Purpose: System prompts for all AI-powered features
- Location: `backend/prompts/cv_agent.py`, `backend/prompts/voice_interview.py`
- Contains: Chat prompts, match analysis prompts, tailor suggestion prompts, voice interview prompts
- Depends on: Nothing (pure data)
- Used by: Chat, tailor, and voice_interview route handlers
## Data Flow
- Three domain contexts composed in `AppProvider` (`frontend/src/contexts/AppContext.tsx:66`):
- `useAppContext()` is a backwards-compatible shim that merges all three contexts into one flat object
- New consumers should prefer `useJobContext()`, `useCVContext()`, or `useToolsContext()` directly
## Key Abstractions
- Purpose: Decouple persistence from route handlers
- Definition: `backend/services/storage.py`
- Implementations: `FileStorage` (`backend/services/file_storage.py`) for local dev, `DynamoStorage` (`backend/services/dynamo_storage.py`) for production
- Pattern: Strategy pattern via Python Protocol; resolved at startup by `storage_factory.py` based on `STORAGE_BACKEND` env var
- FileStorage stores each version as `user_data/versions/{uuid}.json`
- DynamoStorage uses single-table design: `PK=USER#{id}`, `SK=VERSION#{id}|PROFILE|VOICE_PROFILE`
- Purpose: Unified AI model access
- Definition: `backend/services/bedrock.py`
- Pattern: Singleton (`bedrock_client` module-level instance)
- Supports streaming and non-streaming chat, document-based chat (for PDF import)
- Model selection per task: `MODEL_HAIKU` for extraction (fast, cheap), `MODEL_SONNET` for analysis/rewriting (quality)
- Purpose: Centralized template metadata
- Definition: `backend/config/templates.py`
- Pattern: Registry pattern (dict of dataclass instances)
- Maps template IDs to folders, file paths, LaTeX engine (`pdflatex` vs `xelatex`), extra files/dirs
- Purpose: Canonical data model for CV content
- Frontend definition: `frontend/src/types/index.ts:168`
- Backend definition: `backend/routes/cv_versions.py:89` (Pydantic model)
- Used across: form builder, import, tailor, generate-latex, version storage
- Contains: templateId, sectionOrder, personalInfo, workExperience, education, skills, projects, awards, additionalSections
- Purpose: A saved snapshot of a CV (tex content + form data + job context)
- Frontend definition: `frontend/src/types/index.ts:202`
- Backend definition: `backend/routes/cv_versions.py:114`
- Hierarchical: `parentVersionId` links job applications to base CVs
- Contains: id, name, templateId, texContent, formData, jobDescription, companyName, role, matchScore, baselineMatchScore, parentVersionId, createdAt
## Entry Points
- Location: `frontend/src/main.tsx`
- Triggers: Browser loads `index.html` -> Vite serves `main.tsx`
- Responsibilities: Wraps `<App />` in `<StrictMode>`, `<BrowserRouter>`, and `<ErrorBoundary>`
- Location: `frontend/src/App.tsx`
- Triggers: URL navigation
- Responsibilities: Wraps all routes in `<AppProvider>` and `<Suspense>`, defines 7 lazy-loaded routes
- Routes:
- Location: `backend/main.py`
- Triggers: `uvicorn main:app`
- Responsibilities: Creates FastAPI app, configures CORS, registers security headers middleware, includes 9 routers under `/api` prefix, exposes `/api/health` endpoint
## Error Handling
- API methods in `frontend/src/services/api.ts` catch all errors and return fallback values (null, empty arrays, error objects) rather than throwing
- `FeatureErrorBoundary` (`frontend/src/components/FeatureErrorBoundary.tsx`) wraps per-route components, renders retry/home UI on crash
- Global `ErrorBoundary` (`frontend/src/features/shared/ErrorBoundary.tsx`) wraps the entire app in `main.tsx`
- AbortController used in `useCompiler` and API calls for cleanup on unmount
- Route handlers use try/except with `logger.exception()` and generic 500 responses (`"An internal error occurred"`) to avoid leaking internals
- `parse_json_with_retry()` (`backend/services/json_utils.py:32`) retries AI JSON parsing once on failure
- `_sanitize_content()` in `LaTeXCompiler` (`backend/services/latex_compiler.py:54`) strips dangerous LaTeX commands before compilation
- UUID validation on version IDs prevents path traversal (`backend/routes/cv_versions.py:16`)
- Circular parent reference detection on version updates (`backend/routes/cv_versions.py:144`)
## Cross-Cutting Concerns
- Backend: Python `logging` module (standard library); `loguru` used in `voice_interview.py`
- Frontend: `console.error()` / `console.warn()` in catch blocks
- Backend: Pydantic models on all route inputs (automatic 422 on invalid requests)
- Frontend: TypeScript interfaces enforce compile-time type safety; runtime validation is minimal
- LaTeX content sanitization in compiler (`backend/services/latex_compiler.py:26-50`)
- Current: `X-User-Id` header -> `get_current_user()` dependency (`backend/dependencies.py`), defaults to `"local"` for single-user mode
- Comment in code: "Swap this for JWT/Cognito validation when adding auth"
- No frontend auth flow exists; all requests go through without credentials
- In-memory LLM response cache (`backend/services/llm_cache.py`) with 1-hour TTL
- Used by match-analysis and tailor endpoints to avoid redundant AI calls
- Cache key: SHA-256 of concatenated inputs
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Set via middleware in `backend/main.py:39-45`
- Configurable via `CORS_ORIGINS` env var
- Default: `http://localhost:5173,http://127.0.0.1:5173`
- Allows `X-User-Id` custom header
## API Endpoint Map
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
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
