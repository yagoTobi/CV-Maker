# CV Maker

An AI-powered CV editor that helps tailor your resume to specific job postings.

## Overview

CV Maker is a web application that combines a LaTeX-based CV editor with AI assistance to help job seekers optimize their resumes for specific positions. The application analyzes job descriptions and provides intelligent suggestions for improving CV content.

## Features

- **Template Selection**: Choose from multiple professionally-designed CV templates before editing
- **LaTeX CV Editor**: Full-featured code editor with syntax highlighting for editing LaTeX-based CVs
- **Live PDF Preview**: Real-time compilation and preview of your CV as a PDF
- **AI Chat Assistant**: Interactive AI that analyzes your CV against job postings and suggests improvements
- **Match Analysis**: Quantitative analysis showing how well your CV matches a job description
- **Edit Suggestions**: AI-generated inline edits that can be applied with one click
- **Undo Support**: Ability to undo AI-suggested edits

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- CodeMirror for LaTeX editing
- Axios for API communication

### Backend
- Python with FastAPI
- AWS Bedrock for AI (Claude models)
- LaTeX compilation service

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
├── cv-templates/      # LaTeX CV templates
│   ├── med-length-proff-cv/   # Professional CV (pdflatex)
│   ├── deedy-resume/          # Deedy resume (xelatex)
│   └── mcdowell-cv-master/    # McDowell CV (xelatex)
├── user_data/         # User profile data
└── docs/              # Project documentation
```

## Documentation

- [Architecture](./ARCHITECTURE.md) - Technical architecture details
- [Development Guide](./DEVELOPMENT.md) - Setup and development guidelines
- [Changelog](./CHANGELOG.md) - Version history and changes
- [Roadmap](./ROADMAP.md) - Future plans and TODO items
