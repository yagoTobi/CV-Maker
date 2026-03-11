# Development Guide

## Prerequisites

### Required Software

- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **LaTeX Distribution**: TeX Live (Linux), MacTeX (macOS), or MiKTeX (Windows)
- **One AI provider** for live cover letter generation:
  - Gemini API key, or
  - AWS credentials with Bedrock access

### Recommended Tools

- VS Code with extensions:
  - ESLint
  - Prettier
  - Python
  - LaTeX Workshop

## Environment Setup

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

### AI Provider Configuration

Copy `.env.example` to `.env` and choose your provider:

```bash
cp .env.example .env
```

Example Gemini setup:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Example Bedrock setup:

```env
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
# Optional:
# AWS_PROFILE=your-profile
```

If using Bedrock, required IAM permissions include:
- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access the app at `http://localhost:5173`

### API Documentation

When the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Code Style

### Frontend (TypeScript/React)

- Use functional components with hooks
- TypeScript strict mode enabled
- ESLint for linting: `npm run lint`

### Backend (Python)

- Follow PEP 8 style guide
- Type hints encouraged
- Use async/await for I/O operations

## Project Conventions

### File Naming

- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Python modules: `snake_case.py`

### Git Workflow

1. Create feature branches from `main`
2. Use descriptive commit messages
3. Keep commits focused and atomic

### Commit Message Format

```
<type>: <short description>

<optional longer description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Testing

### Frontend

```bash
cd frontend
npm run lint  # Lint check
npm run build # Type check + build
```

### Backend

```bash
cd backend
# Add test commands when tests are implemented
```

## Troubleshooting

### LaTeX Compilation Fails

1. Verify LaTeX is installed: `pdflatex --version`
2. Check the LaTeX template for syntax errors
3. Review backend logs for detailed error messages

### AI Provider Errors

1. Verify `LLM_PROVIDER` matches the provider you actually configured
2. For Gemini: check that `GEMINI_API_KEY` is present and valid
3. For Bedrock: check credentials, IAM permissions, and region/model availability

### Frontend Build Issues

1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Check for TypeScript errors: `npx tsc --noEmit`

## Adding New Features

### Adding a New API Endpoint

1. Create route handler in `backend/routes/`
2. Register router in `backend/main.py`
3. Add corresponding frontend API call in `frontend/src/hooks/useApi.ts`

### Adding a New Component

1. Create component file in `frontend/src/components/`
2. Export from `frontend/src/components/index.ts`
3. Add types to `frontend/src/types/index.ts` if needed
