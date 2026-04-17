# Codebase Structure

**Analysis Date:** 2026-03-29

## Directory Layout

```
CV-Maker/
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # App entry point, CORS, routers
│   ├── dependencies.py         # FastAPI dependency injection (auth)
│   ├── config/                 # Centralized configuration
│   │   └── templates.py        # Template registry (TemplateConfig dataclass)
│   ├── routes/                 # API route handlers (one file per domain)
│   │   ├── chat.py             # AI chat + match analysis endpoints
│   │   ├── compile.py          # LaTeX compilation endpoints
│   │   ├── cv_import.py        # CV import (PDF/DOCX/JSON) endpoint
│   │   ├── cv_versions.py      # CRUD for CV versions + Pydantic models
│   │   ├── generate_latex.py   # Form data -> LaTeX generation + Jinja2 env
│   │   ├── tailor.py           # AI-powered tailor suggestions endpoint
│   │   ├── templates.py        # Template listing/preview/content endpoints
│   │   ├── user_data.py        # User profile CRUD
│   │   └── voice_interview.py  # WebSocket voice interview + extract-cv
│   ├── services/               # Business logic + external integrations
│   │   ├── bedrock.py          # AWS Bedrock client (singleton)
│   │   ├── cv_extractor.py     # PDF/DOCX/JSON -> CVFormData extraction
│   │   ├── dynamo_storage.py   # DynamoDB storage implementation
│   │   ├── file_storage.py     # File-based storage implementation
│   │   ├── json_utils.py       # AI response parsing utilities
│   │   ├── latex_compiler.py   # LaTeX -> PDF compilation (pdflatex/xelatex)
│   │   ├── llm_cache.py        # In-memory LLM response cache (1hr TTL)
│   │   ├── storage.py          # StorageBackend Protocol definition
│   │   └── storage_factory.py  # Storage backend factory (env-based)
│   ├── prompts/                # AI system prompts
│   │   ├── cv_agent.py         # Chat, match analysis, tailor prompts
│   │   └── voice_interview.py  # Voice interview prompts
│   ├── latex_templates/        # Jinja2 LaTeX templates (.tex.j2)
│   │   ├── deedy-resume.tex.j2
│   │   ├── mcdowell-cv.tex.j2
│   │   └── med-length-proff-cv.tex.j2
│   ├── scripts/                # Utility scripts
│   │   ├── create_table.py     # Create DynamoDB table
│   │   └── migrate_to_dynamodb.py  # Migrate file storage to DynamoDB
│   ├── tests/                  # Backend test suites
│   │   ├── fixtures/           # Test fixture data
│   │   ├── test_template_rendering.py   # 21 rendering tests
│   │   ├── test_template_compilation.py # 18 compilation tests (@slow)
│   │   ├── test_cv_extractor.py         # CV extractor unit tests
│   │   ├── test_cv_extractor_error_paths.py  # Error path tests
│   │   ├── test_cv_import_integration.py     # Import integration tests
│   │   └── test_extract_docx_text.py         # DOCX extraction tests
│   ├── requirements.txt
│   └── user_data/              # Runtime data (gitignored in prod)
├── frontend/                   # React 19 + TypeScript SPA
│   ├── src/
│   │   ├── main.tsx            # App bootstrap (StrictMode, BrowserRouter, ErrorBoundary)
│   │   ├── App.tsx             # Route definitions only (~32 lines)
│   │   ├── contexts/           # React context providers (state management)
│   │   │   ├── AppContext.tsx   # Composite provider + useAppContext shim
│   │   │   ├── JobContext.tsx   # Job input state (company, role, description)
│   │   │   ├── CVContext.tsx    # CV state (versions, form data, profile)
│   │   │   └── ToolsContext.tsx # Hook instances + version handlers
│   │   ├── hooks/              # Custom hooks (domain logic)
│   │   │   ├── index.ts        # Barrel export
│   │   │   ├── useTemplates.ts # Template listing + selection + content
│   │   │   ├── useCompiler.ts  # LaTeX compilation + PDF state
│   │   │   ├── useChat.ts      # AI chat + streaming
│   │   │   ├── useImport.ts    # CV import flow state
│   │   │   ├── useTailor.ts    # Tailor suggestions state
│   │   │   ├── useFormBuilder.ts  # Form state management (22K lines)
│   │   │   └── useVoiceInterview.ts  # Voice interview WebSocket
│   │   ├── features/           # Feature modules (one folder per screen/domain)
│   │   │   ├── landing/        # Landing screen
│   │   │   │   ├── LandingScreen.tsx
│   │   │   │   ├── LandingScreen.module.css
│   │   │   │   └── index.ts
│   │   │   ├── build-choice/   # Build entry choice screen
│   │   │   │   ├── BuildChoiceScreen.tsx
│   │   │   │   ├── BuildChoiceScreen.module.css
│   │   │   │   └── index.ts
│   │   │   ├── template-selection/  # Template picker
│   │   │   │   ├── TemplateSelector.tsx
│   │   │   │   ├── TemplateSelector.module.css
│   │   │   │   └── index.ts
│   │   │   ├── form-builder/   # CV form builder (largest feature)
│   │   │   │   ├── CVFormBuilder.tsx       # Main form builder component
│   │   │   │   ├── CVFormBuilder.module.css
│   │   │   │   ├── ImportBanner.tsx        # Import confidence banner
│   │   │   │   ├── ImportBanner.module.css
│   │   │   │   ├── types.ts               # Form builder local types
│   │   │   │   ├── components/            # Shared form UI primitives
│   │   │   │   │   ├── Field.tsx          # Reusable form field
│   │   │   │   │   ├── GripIcon.tsx       # Drag handle icon
│   │   │   │   │   └── useDrag.ts         # Drag-and-drop hook
│   │   │   │   ├── sections/             # Form section components
│   │   │   │   │   ├── PersonalSection.tsx
│   │   │   │   │   ├── WorkSection.tsx
│   │   │   │   │   ├── EducationSection.tsx
│   │   │   │   │   ├── SkillsSection.tsx
│   │   │   │   │   ├── ProjectsSection.tsx
│   │   │   │   │   ├── AwardsSection.tsx
│   │   │   │   │   ├── AdditionalSectionView.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── editor/         # Advanced LaTeX editor + tailor panel
│   │   │   │   ├── JobInput.tsx           # Job description input
│   │   │   │   ├── MatchAnalysis.tsx      # Match analysis display
│   │   │   │   ├── MatchSummaryBar.tsx    # Score bar + progress
│   │   │   │   ├── TailorPanel.tsx        # AI suggestion cards
│   │   │   │   ├── *.module.css
│   │   │   │   └── index.ts
│   │   │   ├── dashboard/      # Version management dashboard
│   │   │   │   ├── Dashboard.tsx          # Main dashboard
│   │   │   │   ├── SaveCVModal.tsx        # Save version modal
│   │   │   │   ├── VersionSwitcher.tsx    # Version list component
│   │   │   │   ├── *.module.css
│   │   │   │   └── index.ts
│   │   │   ├── cv-import/      # CV import upload
│   │   │   │   ├── CVImportUpload.tsx
│   │   │   │   ├── CVImportUpload.module.css
│   │   │   │   └── index.ts
│   │   │   ├── apply-to-job/   # 3-step apply-to-job flow
│   │   │   │   ├── ApplyToJobScreen.tsx
│   │   │   │   ├── ApplyToJobScreen.module.css
│   │   │   │   └── index.ts
│   │   │   ├── voice-widget/   # Voice interview widget
│   │   │   │   ├── VoiceWidget.tsx
│   │   │   │   ├── VoiceWidget.module.css
│   │   │   │   └── index.ts
│   │   │   └── shared/         # Shared feature utilities
│   │   │       ├── ErrorBoundary.tsx     # Global error boundary
│   │   │       ├── useFileUpload.ts      # File upload hook
│   │   │       └── index.ts
│   │   ├── components/         # App-level shared components
│   │   │   ├── FeatureErrorBoundary.tsx  # Per-route error boundary
│   │   │   └── FeatureErrorBoundary.module.css
│   │   ├── services/           # API client
│   │   │   └── api.ts          # All backend API calls (axios + fetch SSE)
│   │   ├── types/              # TypeScript type definitions
│   │   │   └── index.ts        # All shared types + utility functions
│   │   ├── utils/              # Pure utility functions
│   │   │   ├── formDataPatch.ts   # Apply tailor changes to form data
│   │   │   ├── cvFilename.ts      # Generate CV download filenames
│   │   │   ├── deriveLinkLabel.ts # Derive labels from URLs
│   │   │   └── wordDiff.ts        # Word-level diff for tailor panel
│   │   ├── styles/             # Global CSS
│   │   │   └── variables.css   # CSS custom properties (design tokens)
│   │   ├── assets/             # Static assets
│   │   │   └── react.svg       # React logo
│   │   └── __tests__/          # Frontend test files
│   │       ├── useFormBuilder.test.ts
│   │       ├── useImport.test.ts
│   │       ├── import-flow-state.test.tsx
│   │       ├── resize-handle.test.tsx
│   │       └── deriveLinkLabel.test.ts
│   ├── public/                 # Static public assets
│   ├── dist/                   # Build output (gitignored)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts (if exists)
├── cv-templates/               # LaTeX template source files
│   ├── deedy-resume/           # Deedy resume template
│   │   ├── deedy-resume-openfont.tex
│   │   ├── deedy-resume-openfont.cls
│   │   ├── publications.bib
│   │   └── fonts/              # Lato + Raleway font files
│   ├── mcdowell-cv-master/     # McDowell CV template
│   │   ├── McDowell_CV_Template.tex
│   │   ├── mcdowellcv.cls
│   │   ├── tabu.sty
│   │   └── varwidth.sty
│   └── med-length-proff-cv/    # Professional CV template
│       ├── CV - English.tex
│       └── resume.cls
├── user_data/                  # Runtime data directory
│   └── versions/               # Saved CV version JSON files
├── docs/                       # Project documentation
├── Dockerfile                  # Backend container (Python + TeX Live)
├── docker-compose.yml          # Backend + DynamoDB Local
├── .gitignore
├── .dockerignore
├── README.md
└── test-cv.json                # Sample CV data for testing
```

## Directory Purposes

**`backend/routes/`:**
- Purpose: HTTP endpoint handlers, one file per domain
- Contains: FastAPI `APIRouter` instances, Pydantic request/response models
- Key files: `cv_versions.py` (largest at 349 lines, also defines shared Pydantic models like `CVFormData`)
- Convention: Each file exports a `router` variable included in `main.py`

**`backend/services/`:**
- Purpose: Business logic decoupled from HTTP concerns
- Contains: AI client, compiler, storage backends, utility functions
- Key files: `bedrock.py` (AI), `latex_compiler.py` (compilation), `cv_extractor.py` (import, largest at 17K)
- Convention: Module-level singletons (`bedrock_client`, `compiler`)

**`backend/prompts/`:**
- Purpose: AI system prompts (separate from code for readability)
- Contains: Multi-line string constants and prompt-building functions
- Key files: `cv_agent.py` (chat/match/tailor prompts), `voice_interview.py`

**`backend/latex_templates/`:**
- Purpose: Jinja2 templates that convert form data to LaTeX source
- Contains: `.tex.j2` files with custom delimiters `(( ))` / `(% %)`
- Note: These are different from `cv-templates/` which holds the raw LaTeX source files

**`backend/config/`:**
- Purpose: Centralized app configuration
- Contains: Template registry (`templates.py`) mapping IDs to file paths and engine settings

**`cv-templates/`:**
- Purpose: Original LaTeX template source files, cls files, fonts, and support files
- Contains: One subfolder per template with `.tex`, `.cls`, preview images, fonts
- Used by: `LaTeXCompiler._copy_template_files()` and `templates` route for content serving
- Generated: No (manually authored)
- Committed: Yes

**`frontend/src/features/`:**
- Purpose: Feature-based module organization (one folder per screen or domain)
- Contains: Screen components, CSS Modules, feature-local types, barrel `index.ts`
- Key pattern: Each feature folder is self-contained with component + styles + index

**`frontend/src/features/form-builder/`:**
- Purpose: CV form builder — the largest feature
- Contains: Main `CVFormBuilder.tsx` (34K), section components, shared form primitives
- Sub-structure: `sections/` for per-section form views, `components/` for reusable UI (Field, GripIcon, useDrag)

**`frontend/src/hooks/`:**
- Purpose: Custom React hooks encapsulating domain logic
- Contains: One hook per domain concern
- Key files: `useFormBuilder.ts` (22K — manages all form state and operations), `useChat.ts` (8K)

**`frontend/src/contexts/`:**
- Purpose: Global state management via React Context
- Contains: Three domain contexts + composite provider
- Pattern: `AppProvider` nests `JobProvider > CVProvider > ToolsProvider`

**`frontend/src/services/`:**
- Purpose: API communication layer
- Contains: Single `api.ts` file with all backend calls
- Pattern: Exported `api` object with method-per-endpoint

**`frontend/src/types/`:**
- Purpose: Shared TypeScript type definitions
- Contains: Single `index.ts` with all interfaces + utility functions (parseEditsFromResponse, applyEdit)

**`frontend/src/utils/`:**
- Purpose: Pure utility functions with no React dependencies
- Contains: `formDataPatch.ts`, `cvFilename.ts`, `deriveLinkLabel.ts`, `wordDiff.ts`

**`frontend/src/components/`:**
- Purpose: App-level shared React components (not feature-specific)
- Contains: `FeatureErrorBoundary.tsx` (per-route error boundary)

**`user_data/`:**
- Purpose: Runtime data storage for FileStorage backend
- Contains: `versions/` with `{uuid}.json` files
- Generated: Yes (at runtime)
- Committed: Directory structure only (contents gitignored)

## Key File Locations

**Entry Points:**
- `frontend/src/main.tsx`: Frontend bootstrap (React root, BrowserRouter, ErrorBoundary)
- `frontend/src/App.tsx`: Route definitions and AppProvider wrapper
- `backend/main.py`: FastAPI app creation, middleware, router registration

**Configuration:**
- `backend/config/templates.py`: Template registry (IDs, engines, files)
- `backend/dependencies.py`: Auth dependency (X-User-Id header)
- `backend/services/storage_factory.py`: Storage backend selection
- `frontend/src/styles/variables.css`: CSS design tokens
- `Dockerfile`: Backend container definition
- `docker-compose.yml`: Multi-service orchestration

**Core Logic:**
- `frontend/src/hooks/useFormBuilder.ts`: All form state management (22K lines)
- `frontend/src/contexts/ToolsContext.tsx`: Hook orchestration + version handlers
- `backend/services/latex_compiler.py`: LaTeX -> PDF pipeline
- `backend/routes/generate_latex.py`: Form data -> LaTeX via Jinja2
- `backend/services/bedrock.py`: AI model client
- `backend/services/cv_extractor.py`: CV import extraction (17K lines)

**Data Models:**
- `frontend/src/types/index.ts`: All TypeScript interfaces
- `backend/routes/cv_versions.py:26-139`: All Pydantic models (PersonalInfo, WorkEntry, CVFormData, CVVersion, etc.)

**Testing:**
- `frontend/src/__tests__/`: Frontend tests (vitest)
- `backend/tests/`: Backend tests (pytest)

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `CVFormBuilder.tsx`, `MatchSummaryBar.tsx`)
- CSS Modules: `ComponentName.module.css` (co-located with component)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useFormBuilder.ts`)
- Python modules: `snake_case.py` (e.g., `cv_versions.py`, `file_storage.py`)
- Jinja2 templates: `template-name.tex.j2` (e.g., `med-length-proff-cv.tex.j2`)
- Tests (frontend): `name.test.ts` or `name.test.tsx` in `__tests__/`
- Tests (backend): `test_name.py` in `tests/`

**Directories:**
- Feature modules: `kebab-case/` (e.g., `form-builder/`, `apply-to-job/`)
- Backend modules: `snake_case/` (e.g., `latex_templates/`, `cv_templates/`)
- Each feature folder has an `index.ts` barrel export

## Where to Add New Code

**New Feature Screen:**
- Create folder: `frontend/src/features/{feature-name}/`
- Add component: `FeatureName.tsx` + `FeatureName.module.css` + `index.ts`
- Add route: `frontend/src/App.tsx` (lazy import + Route)
- Wrap with `<FeatureErrorBoundary>` in the route definition

**New Backend Endpoint:**
- Create or extend route file: `backend/routes/{domain}.py`
- Add Pydantic models for request/response in the route file
- Register router in `backend/main.py` with `app.include_router(...)`
- Add frontend API method in `frontend/src/services/api.ts`

**New Custom Hook:**
- Create: `frontend/src/hooks/use{Name}.ts`
- Export from: `frontend/src/hooks/index.ts`
- If it needs global state, add to `ToolsContext` (`frontend/src/contexts/ToolsContext.tsx`)

**New Form Section:**
- Create section component: `frontend/src/features/form-builder/sections/{Name}Section.tsx`
- Export from: `frontend/src/features/form-builder/sections/index.ts`
- Add to `CVFormBuilder.tsx` render logic
- Add types to `frontend/src/types/index.ts` (TypeScript) and `backend/routes/cv_versions.py` (Pydantic)
- Update Jinja2 templates in `backend/latex_templates/`

**New AI Feature:**
- Add prompt to: `backend/prompts/cv_agent.py` (or create new prompt file)
- Add route handler: `backend/routes/{feature}.py`
- Add Bedrock call using: `from services.bedrock import bedrock_client, MODEL_SONNET` (or MODEL_HAIKU)
- Use `parse_json_with_retry()` from `backend/services/json_utils.py` for structured AI responses
- Consider adding `llm_cache` for expensive calls

**New Storage Entity:**
- Add methods to Protocol: `backend/services/storage.py`
- Implement in both: `backend/services/file_storage.py` and `backend/services/dynamo_storage.py`
- DynamoDB: Use existing single-table design (`PK=USER#{id}`, `SK={ENTITY_TYPE}#{id}` or `{ENTITY_TYPE}`)

**New LaTeX Template:**
- Add template folder: `cv-templates/{template-name}/` with `.tex`, `.cls`, preview image
- Add Jinja2 template: `backend/latex_templates/{template-name}.tex.j2`
- Register in: `backend/config/templates.py` (add `TemplateConfig` entry)
- Add to mapping in: `backend/routes/generate_latex.py` (`_TEMPLATE_FILE_MAP`)

**Utilities:**
- Frontend pure functions: `frontend/src/utils/{name}.ts`
- Backend shared utilities: `backend/services/{name}.py`

## Special Directories

**`cv-templates/`:**
- Purpose: Raw LaTeX template source files, class files, fonts, preview images
- Generated: No (manually authored and curated)
- Committed: Yes
- Note: Copied to temp dirs at compile time by `LaTeXCompiler._copy_template_files()`

**`backend/latex_templates/`:**
- Purpose: Jinja2 templates that transform form data into LaTeX
- Generated: No (manually authored)
- Committed: Yes
- Note: Different from `cv-templates/` -- these are the Jinja2 versions with `(( ))` delimiters

**`user_data/`:**
- Purpose: FileStorage backend data (versions, profiles)
- Generated: Yes (at runtime by FileStorage)
- Committed: Directory skeleton only; contents gitignored

**`frontend/dist/`:**
- Purpose: Vite build output
- Generated: Yes (`npm run build`)
- Committed: No (gitignored)

**`.claude/`:**
- Purpose: Claude Code agent memory and worktree configurations
- Generated: Yes (by Claude Code)
- Committed: Partial (agent-memory yes, worktrees no)

**`.planning/`:**
- Purpose: Project planning and codebase analysis documents
- Generated: Yes (by GSD workflow)
- Committed: Yes

---

*Structure analysis: 2026-03-29*
