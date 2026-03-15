# CV Maker

An AI-powered CV editor that helps tailor your resume to specific job postings.

## Overview

CV Maker is a web application that combines a LaTeX-based CV editor with AI assistance to help job seekers optimize their resumes for specific positions. The application analyzes job descriptions and provides intelligent suggestions for improving CV content.

## Features

- **Form Builder**: Structured form with drag-and-drop section ordering and inline PDF preview
- **Voice Interview (Alpha)**: Natural conversation-based CV creation using Amazon Nova Sonic speech-to-speech AI
- **Template Selection**: Choose from 3 professionally-designed CV templates (Professional CV, Deedy Resume, McDowell CV)
- **LaTeX CV Editor**: Full-featured code editor with syntax highlighting for fine-tuning
- **Live PDF Preview**: Real-time compilation and preview of your CV as a PDF
- **AI Chat Assistant**: Interactive AI that analyzes your CV against job postings and suggests improvements
- **Match Analysis**: Quantitative analysis showing how well your CV matches a job description
- **Edit Suggestions**: AI-generated inline edits that can be applied with one click
- **Version Management**: Save and switch between multiple CV versions with hierarchical job application tracking
- **JSON Export/Import**: Export your CV data as JSON and re-import to restore
- **CV Import**: Upload existing CVs from PDF, DOCX, or JSON with AI-powered extraction
- **Clean UI**: Zed-inspired light theme with professional, minimal aesthetics
- **React Router Navigation**: URL-based routing with browser back/forward support

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- CodeMirror for LaTeX editing
- CSS Modules for styling

### Backend
- Python 3.10+ with FastAPI
- AWS Bedrock for AI (Claude 3.5 Sonnet v2)
- LaTeX compilation service (pdflatex + xelatex)
- Jinja2 for LaTeX template generation

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

### Optional: Voice Interview Feature

The voice interview feature requires the Pipecat framework with AWS dependencies:

```bash
cd backend
pip install 'pipecat-ai[aws]'
```

**Note:** This is optional. The app will start and run normally without Pipecat; the voice feature will simply be unavailable.

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

| Template | Description | LaTeX Engine |
|----------|-------------|--------------|
| **Professional CV** | Clean, traditional layout ideal for corporate roles | pdflatex |
| **Deedy Resume** | Compact two-column design for tech roles | xelatex |
| **McDowell CV** | Minimalist single-column with elegant spacing | xelatex |

Each template includes a preview image and all necessary class files. Templates requiring xelatex use the `fontspec` package for custom fonts.

## Project Structure

```
CV-Maker/
├── frontend/          # React frontend application
├── backend/           # FastAPI backend server
│   ├── routes/        # API endpoints
│   ├── services/      # Business logic (Bedrock, LaTeX compiler)
│   ├── latex_templates/  # Jinja2 .tex.j2 templates
│   ├── tests/         # pytest test suite
│   └── main.py        # FastAPI app
├── cv-templates/      # LaTeX CV templates with class files
│   ├── med-length-proff-cv/   # Professional CV (pdflatex)
│   ├── deedy-resume/          # Deedy resume (xelatex)
│   └── mcdowell-cv-master/    # McDowell CV (xelatex)
├── user_data/         # User profile and saved CV versions (JSON files)
└── docs/              # Project documentation
```

## Documentation

📖 **Full documentation available in [`/docs`](./docs/):**

- **[Architecture](./docs/ARCHITECTURE.md)** - Technical architecture, data flow, design system
- **[Development Guide](./docs/DEVELOPMENT.md)** - Setup and development guidelines
- **[Decisions](./docs/DECISIONS.md)** - Architectural Decision Records (ADRs)
- **[Changelog](./docs/CHANGELOG.md)** - Version history and changes
- **[Roadmap](./docs/ROADMAP.md)** - Future plans and feature backlog
- **[Key Learnings](./docs/key-learnings.md)** - Technical insights and gotchas
- **[PRD: CV Import](./docs/PRD-cv-import.md)** - Product requirements for CV import feature

## Testing

Run the backend test suite:

```bash
cd backend

# Run all tests
python3 -m pytest tests/ -v

# Run only fast tests (skip LaTeX compilation tests)
pytest -m "not slow"

# Run with coverage
pytest --cov=routes --cov=services tests/
```

## Contributing

This is a personal project, but feedback and suggestions are welcome via issues.

## License

All rights reserved.
