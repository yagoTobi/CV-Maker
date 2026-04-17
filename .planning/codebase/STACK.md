# Technology Stack

**Analysis Date:** 2026-03-29

## Languages

**Primary:**
- TypeScript ~5.9.3 - Frontend application (`frontend/src/`)
- Python 3.12 - Backend application (`backend/`), specified in `Dockerfile` (`FROM python:3.12-slim`)

**Secondary:**
- LaTeX (pdflatex + xelatex) - CV template compilation (`cv-templates/`, `backend/latex_templates/*.tex.j2`)
- Jinja2 templating - LaTeX generation with custom delimiters `(( ))` / `(% %)` (`backend/routes/generate_latex.py`)

## Runtime

**Frontend:**
- Node.js (no `.nvmrc` present; use any modern LTS version)
- Package Manager: npm (lockfile: `frontend/package-lock.json`)

**Backend:**
- Python 3.12 (Docker image: `python:3.12-slim`)
- No virtual environment manager enforced; `pip install -r requirements.txt`

## Frameworks

**Core:**
- React ^19.2.0 - Frontend UI framework (`frontend/package.json`)
- FastAPI >=0.115.0 - Backend API framework (`backend/requirements.txt`)
- Uvicorn >=0.30.0 - ASGI server (`backend/requirements.txt`)

**Routing:**
- react-router-dom ^7.13.1 - Client-side routing (`frontend/package.json`)

**Testing:**
- Vitest ^4.0.18 - Frontend test runner (`frontend/package.json`, config: `frontend/vitest.config.ts`)
- @testing-library/react ^16.3.2 - Component testing (`frontend/package.json`)
- @testing-library/jest-dom ^6.9.1 - DOM matchers (setup: `frontend/src/test-setup.ts`)
- @testing-library/user-event ^14.6.1 - User interaction simulation
- pytest - Backend tests (`backend/pytest.ini`), with `@pytest.mark.slow` for compilation tests
- jsdom ^28.1.0 - Browser environment for Vitest

**Build/Dev:**
- Vite ^7.3.1 - Frontend bundler and dev server (`frontend/vite.config.ts`)
- @vitejs/plugin-react ^5.1.1 - React Fast Refresh for Vite

**Linting:**
- ESLint ^9.39.1 - Flat config format (`frontend/eslint.config.js`)
- typescript-eslint ^8.48.0 - TypeScript ESLint integration
- eslint-plugin-react-hooks ^7.0.1 - React hooks lint rules
- eslint-plugin-react-refresh ^0.4.24 - React Refresh lint rules

## Key Dependencies

**Frontend - Critical:**
- axios ^1.13.5 - HTTP client for API calls (`frontend/src/services/api.ts`)
- @uiw/react-codemirror ^4.25.4 - LaTeX code editor in EditorScreen
- codemirror-lang-latex ^0.2.0 - LaTeX syntax highlighting for CodeMirror
- @codemirror/lang-javascript ^6.2.4 - JavaScript language support for CodeMirror
- @lezer/highlight ^1.2.3 - Syntax highlighting framework

**Backend - Critical:**
- boto3 >=1.34.0 - AWS SDK for Bedrock AI and DynamoDB (`backend/services/bedrock.py`, `backend/services/dynamo_storage.py`)
- jinja2 >=3.1.0 - LaTeX template rendering (`backend/routes/generate_latex.py`)
- pydantic >=2.9.0 - Data validation and serialization (used in all routes)
- loguru >=0.7.0 - Structured logging (`backend/routes/voice_interview.py`)

**Backend - Infrastructure:**
- python-multipart >=0.0.9 - File upload handling (CV import)
- python-dotenv >=1.0.0 - Environment variable loading (`backend/main.py`)
- PyPDF2 >=3.0.0 - PDF page count extraction (`backend/services/latex_compiler.py`)
- python-docx >=1.1.0 - DOCX text extraction for CV import (`backend/services/cv_extractor.py`)

**Backend - Optional:**
- pipecat-ai (optional, not in requirements.txt) - Voice interview pipeline (`backend/routes/voice_interview.py`). Imported conditionally with `PIPECAT_AVAILABLE` flag. Includes AWS Nova Sonic LLM integration.

## TypeScript Configuration

**Target:** ES2022 (`frontend/tsconfig.app.json`)
**Module:** ESNext with bundler resolution
**Strict mode:** Enabled (strict: true, noUnusedLocals, noUnusedParameters)
**JSX:** react-jsx (automatic runtime)
**Build:** `tsc -b && vite build` (type-check then bundle)

## Build Configuration

**Vite (`frontend/vite.config.ts`):**
- Plugin: @vitejs/plugin-react
- Source maps: disabled in production (`sourcemap: false`)

**Vitest (`frontend/vitest.config.ts`):**
- Environment: jsdom
- Globals: true (no explicit imports needed for `describe`, `it`, `expect`)
- Setup file: `frontend/src/test-setup.ts` (imports `@testing-library/jest-dom/vitest`)
- CSS modules: non-scoped class name strategy

**ESLint (`frontend/eslint.config.js`):**
- Flat config format (ESLint 9.x)
- Extends: js.configs.recommended, tseslint.configs.recommended, reactHooks flat config, reactRefresh vite config
- Global ignores: `dist/`
- Files: `**/*.{ts,tsx}`

## Docker

**Backend container (`Dockerfile`):**
- Base image: `python:3.12-slim`
- TeX Live packages: base, latex-base, recommended, extra, xetex, fonts-recommended, fonts-extra, bibtex-extra, plain-generic
- Microsoft fonts: ttf-mscorefonts-installer (EULA pre-accepted)
- Runs as non-root user `appuser` (UID/GID 1000)
- Healthcheck: Python HTTP check to `/api/health`
- Entrypoint: `uvicorn main:app --host 0.0.0.0 --port 8000`

**Docker Compose (`docker-compose.yml`):**
- Services: `backend` (port 8000), `dynamodb-local` (port 8100)
- Volumes: `cv-maker-data` (persistent user data), `dynamodb-data` (DynamoDB local storage)
- Backend depends on dynamodb-local with health check

## Platform Requirements

**Development:**
- Node.js (modern LTS) + npm for frontend
- Python 3.12 for backend
- TeX Live (pdflatex + xelatex) installed locally for LaTeX compilation, or use Docker
- AWS credentials configured (for Bedrock AI)

**Production:**
- Docker (single container for backend + LaTeX)
- Frontend: static build served separately (Vite produces `frontend/dist/`)
- AWS Bedrock access (Claude models)
- Optional: DynamoDB table for multi-user storage

## Run Commands

```bash
# Frontend dev server
cd frontend && npm run dev          # Vite dev server on http://localhost:5173

# Frontend build
cd frontend && npm run build        # tsc -b && vite build

# Frontend tests
cd frontend && npm test             # vitest run
cd frontend && npm run test:watch   # vitest (watch mode)

# Frontend lint
cd frontend && npm run lint         # eslint .

# Frontend type-check (standalone)
cd frontend && npx tsc --noEmit     # MUST run from frontend/ dir

# Backend dev server
cd backend && uvicorn main:app --reload --port 8000

# Backend tests
cd backend && pytest                # all tests
cd backend && pytest -m "not slow"  # skip compilation tests

# Docker (full stack)
docker compose up --build           # backend + DynamoDB Local
```

---

*Stack analysis: 2026-03-29*
