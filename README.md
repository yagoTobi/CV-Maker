# CV Maker

An AI-powered web CV editor. The CV itself is the editor — click any field and type directly on a web-rendered page that matches the final PDF.

## Overview

CV Maker renders your CV as a styled web page and lets you edit it inline. There's no form-builder or split-screen preview: what you see on screen is what compiles to PDF. AI features handle import, job tailoring, and match analysis. The backend generates LaTeX from your structured CV data and compiles it server-side.

## Features

- **Direct-edit CV**: click any field — name, job title, bullet point, date — and type directly on the rendered CV. Drag sections and entries to reorder. Changes auto-save every 2.5 seconds.
- **Template selection**: three professionally designed LaTeX templates. Professional CV (`med-length-proff-cv`) is fully live in the web editor. Deedy Resume and McDowell CV are selectable but marked "Coming soon" — PDF compilation works, web editing is not yet wired up.
- **CV import**: upload a PDF, DOCX, or JSON file (up to 10 MB). AI extraction structures the content into the web editor automatically.
- **Tune for a role**: paste a job description to get a quantitative match score, then review AI-generated inline suggestions one card at a time — accept or skip each change. Accepted changes update a live read-only preview before you save.
- **Per-section AI bullet assist**: AI-generated bullet point suggestions per CV section.
- **Version dashboard**: base CVs with nested job-application versions. Download any version as a PDF, open it in the editor, or start a new tailoring flow from it.
- **PDF download**: server-side LaTeX compilation via pdflatex or xelatex depending on the template.
- **Auth**: AWS Cognito (email login) in production. Local dev can bypass auth with `VITE_DISABLE_AUTH=true`.

## Tech Stack

### Frontend
- React 19 with TypeScript (strict, `verbatimModuleSyntax: true`)
- Vite for build tooling
- CSS Modules for styling
- React Router v6

### Backend
- Python 3.12 with FastAPI
- AWS Bedrock for AI (Claude models via AWS Bedrock)
- LaTeX compilation service (pdflatex + xelatex)
- Jinja2 for LaTeX template generation with custom delimiters `(( ))` / `(% %)`

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- LaTeX distribution (TeX Live or MacTeX) with both pdflatex and xelatex
- AWS credentials configured for Bedrock access

### LaTeX Package Requirements

If using a minimal TeX installation (e.g., BasicTeX), install required packages:

```bash
sudo tlmgr install changepage ifplatform enumitem textpos isodate titlesec catchfile substr
```

### Running the Application

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env  # Configure AWS credentials
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

## Available Templates

| Template | Description | LaTeX Engine | Web Editor |
|----------|-------------|--------------|------------|
| **Professional CV** (`med-length-proff-cv`) | Clean, traditional layout ideal for corporate roles | pdflatex | Full support |
| **Deedy Resume** | Compact two-column design for tech roles | xelatex | Coming soon |
| **McDowell CV** | Minimalist single-column with elegant spacing | xelatex | Coming soon |

Templates requiring xelatex use the `fontspec` package for custom fonts.

## Project Structure

```
CV-Maker/
├── frontend/              # React frontend application
│   └── src/
│       ├── features/      # Feature folders (direct-edit, dashboard, landing, template-selection)
│       ├── contexts/      # React context providers (Job, CV, Tools, EditorActions)
│       ├── hooks/         # Shared hooks (useCompiler, useImport, useTemplates)
│       ├── services/      # api.ts — sole HTTP boundary
│       └── types/         # TypeScript interfaces (CVFormData, CVVersion, etc.)
├── backend/               # FastAPI backend server
│   ├── routes/            # API endpoints (thin handlers, Pydantic validation)
│   ├── services/          # Business logic (bedrock, latex_compiler, cv_extractor, storage)
│   ├── latex_templates/   # Jinja2 .tex.j2 templates
│   ├── latex_templates/_source/  # LaTeX template source files (cls/sty/tex)
│   │   ├── med-length-proff-cv/  # Professional CV (pdflatex)
│   │   ├── deedy-resume/         # Deedy Resume (xelatex)
│   │   └── mcdowell-cv-master/   # McDowell CV (xelatex)
│   ├── prompts/           # System prompts for all AI features
│   ├── tests/             # pytest test suite
│   ├── user_data/         # Runtime JSON storage (gitignored)
│   └── main.py            # FastAPI app entry point
└── docs/                  # Project documentation
```

## Documentation

Full documentation is in [`/docs`](./docs/):

- **[Architecture](./docs/ARCHITECTURE.md)** — Technical architecture, data flow, component diagram
- **[Development Guide](./docs/DEVELOPMENT.md)** — Setup and development guidelines
- **[Decisions](./docs/DECISIONS.md)** — Architectural Decision Records (ADRs)
- **[Changelog](./docs/CHANGELOG.md)** — Version history and changes
- **[Roadmap](./docs/ROADMAP.md)** — Future plans and feature backlog
- **[Key Learnings](./docs/key-learnings.md)** — Technical insights and gotchas

## Testing

**Frontend** (Vitest + Testing Library):
```bash
cd frontend
npm test
```

Tests live in `frontend/src/__tests__/`.

**Backend** (pytest):
```bash
cd backend

# Run all tests
python3 -m pytest tests/ -v

# Skip slow LaTeX compilation tests
pytest -m "not slow"

# Run with coverage
pytest --cov=routes --cov=services tests/
```

Tests live in `backend/tests/`.

## Usage Examples

### Building a CV from scratch

1. Open the app at `http://localhost:5173` and click **Build my CV**.
2. Choose **Start from scratch**, then select a template.
3. The direct-edit page loads a web-rendered CV that matches the final PDF layout. Click any field and type directly on the CV.
4. Changes auto-save. Click **Download PDF** in the nav bar to compile and download.

### Importing an existing CV

1. From the landing screen, click **Build my CV**, then choose **Import existing CV**.
2. Upload a PDF, DOCX, or JSON file (up to 10 MB). AI extraction parses your document into structured CV data.
3. Review the imported content in the direct-edit view and correct anything inline.

### Tailoring a CV for a job posting

1. Save at least one base CV version first (auto-save handles this during editing).
2. Click **Tune for a role** from the landing screen. Select a base CV if you have multiple.
3. Enter the company name, role title, and paste the full job description.
4. Review the **Match Analysis** score, then work through AI-generated change suggestions — accept or skip each one. The CV preview updates in real time.
5. Click **Save** to create a child version linked to the base CV with job metadata attached.

### Managing versions from the dashboard

1. Navigate to **My Saved CVs** from the landing screen.
2. The dashboard shows base CVs with nested job-application versions grouped underneath.
3. Click any version to open it in the editor, download it as a PDF, or start a new tailoring flow.

## Contributing

This is a personal project, but feedback and suggestions are welcome via issues.

## License

All rights reserved.
