<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide walks you through setting up CV-Maker for local development. By the end, you will have both the frontend and backend running and be able to open the application in your browser.

## Prerequisites

Install the following before proceeding:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | Any modern LTS (20+) | Frontend dev server and build tooling |
| npm | Bundled with Node.js | Frontend package manager |
| Python | 3.12 | Backend runtime |
| TeX Live | Latest | LaTeX compilation (pdflatex + xelatex) |
| AWS credentials | N/A | Bedrock AI features (chat, import, tailor) |

**TeX Live packages required for local development (non-Docker):**

- `texlive-base`, `texlive-latex-base`, `texlive-latex-recommended`, `texlive-latex-extra`
- `texlive-xetex`, `texlive-fonts-recommended`, `texlive-fonts-extra`
- `texlive-bibtex-extra`, `texlive-plain-generic`

On macOS, installing [MacTeX](https://www.tug.org/mactex/) covers all of the above. On Ubuntu/Debian:

```bash
sudo apt-get install texlive-base texlive-latex-base texlive-latex-recommended \
  texlive-latex-extra texlive-xetex texlive-fonts-recommended texlive-fonts-extra \
  texlive-bibtex-extra texlive-plain-generic
```

**AWS credentials** are needed for AI-powered features (CV import, chat, job tailoring, match analysis). The backend uses `boto3` which reads credentials from the standard AWS credential chain (`~/.aws/credentials`, environment variables, or IAM roles). Core CV editing and PDF compilation work without AWS credentials.

## Installation Steps

### 1. Clone the repository

```bash
git clone <repository-url>
cd CV-Maker
```

### 2. Backend setup

Create a Python virtual environment and install dependencies:

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the environment example file and edit it with your values:

```bash
cp .env.example .env
```

The `.env` file contains:

```
# CORS — no change needed for local dev
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# AWS — required for AI features
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here

# Storage — "file" stores CV versions as JSON files in backend/user_data/
STORAGE_BACKEND=file
```

At minimum, replace `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` with valid credentials if you want AI features. See [CONFIGURATION.md](CONFIGURATION.md) for the full variable reference including DynamoDB options.

### 3. Frontend setup

From the project root:

```bash
cd frontend
npm install
```

Optionally copy the frontend environment file (defaults work for local development):

```bash
cp .env.example .env
```

The only frontend variable is `VITE_API_URL`, which defaults to `http://localhost:8000/api`.

## First Run

You need two terminal sessions, one for each server.

### Terminal 1 — Backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag enables auto-restart on code changes during development.

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Vite starts a dev server with hot module replacement.

## Verifying It Works

1. **Health check** — Open [http://localhost:8000/api/health](http://localhost:8000/api/health) in your browser or run:

   ```bash
   curl http://localhost:8000/api/health
   ```

   Expected response: `{"status":"healthy"}`

2. **Frontend** — Open [http://localhost:5173](http://localhost:5173) in your browser. You should see the landing screen with "Build my CV" and "Tune for a role" cards.

3. **Template listing** — Verify the backend serves templates:

   ```bash
   curl http://localhost:8000/api/templates
   ```

   This should return JSON listing three templates: `med-length-proff-cv`, `deedy-resume`, and `mcdowell-cv`.

## Docker Alternative

If you prefer not to install Python and TeX Live locally, use Docker Compose to run the full backend stack (backend + DynamoDB Local):

```bash
docker compose up --build
```

This builds the backend image with Python 3.12 and a full TeX Live installation, then starts:

- **cv-maker-backend** on port `8000` — the FastAPI backend with LaTeX compilation
- **cv-maker-dynamodb** on port `8100` — DynamoDB Local for version storage

The Docker setup reads AWS credentials from a root `.env` file if present, or from the environment variables passed in `docker-compose.yml`.

You still need to run the frontend separately:

```bash
cd frontend
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) as usual.

To stop the containers:

```bash
docker compose down
```

Data is persisted across restarts via Docker volumes (`cv-maker-data` and `dynamodb-data`).

## Common Setup Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| `ModuleNotFoundError` when starting backend | Virtual environment not activated | Run `source backend/venv/bin/activate` before starting uvicorn |
| `pdflatex: command not found` during PDF compilation | TeX Live not installed locally | Install TeX Live (see Prerequisites) or use Docker |
| `xelatex` errors with Deedy or McDowell templates | Missing XeTeX or font packages | Ensure `texlive-xetex` and `texlive-fonts-extra` are installed |
| Frontend shows network errors | Backend not running or wrong port | Verify backend is running on port 8000; check `VITE_API_URL` in `frontend/.env` |
| AI features return errors | Missing or invalid AWS credentials | Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `backend/.env` with valid Bedrock-enabled credentials |
| Port 8000 already in use | Another process on that port | Stop the conflicting process or change the uvicorn port with `--port 8001` (update `VITE_API_URL` accordingly) |

## Next Steps

- [DEVELOPMENT.md](DEVELOPMENT.md) — Build commands, code style, and contribution workflow
- [CONFIGURATION.md](CONFIGURATION.md) — Full environment variable reference and per-environment overrides
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design, component diagram, and data flow
