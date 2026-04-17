# Development Guide

## Prerequisites

### Required Software

- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **LaTeX Distribution**: TeX Live (Linux), MacTeX (macOS), or MiKTeX (Windows)
- **AWS CLI** configured with Bedrock access

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

# Optional: Install voice interview feature (Pipecat + AWS dependencies)
pip install 'pipecat-ai[aws]'
```

**Note:** The voice interview feature is optional. The app will start and run normally without Pipecat installed; the voice feature will simply be disabled.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

### AWS Configuration

The backend uses AWS Bedrock for AI features. Ensure your AWS credentials are configured:

```bash
aws configure
# Or set environment variables:
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# AWS_REGION
```

Required IAM permissions:
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
npx tsc --noEmit  # Type check without building (from frontend/ dir, not project root)
```

### Backend

```bash
cd backend

# Run all tests
python3 -m pytest tests/ -v

# Run only fast tests (skip LaTeX compilation tests)
pytest -m "not slow"

# Run specific test file
pytest tests/test_template_rendering.py -v

# Run with coverage
pytest --cov=routes --cov=services tests/
```

**Test Suites:**
- `test_template_rendering.py` — 21 Jinja2 rendering tests (fast, ~2s)
- `test_template_compilation.py` — 18 pdflatex/xelatex compilation tests (marked `@pytest.mark.slow`, ~28s)

## Troubleshooting

### LaTeX Compilation Fails

1. Verify LaTeX is installed: `pdflatex --version`
2. Check the LaTeX template for syntax errors
3. Review backend logs for detailed error messages

### AWS Bedrock Errors

1. Verify AWS credentials are configured
2. Check IAM permissions for Bedrock access
3. Ensure the AWS region supports the requested model

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

## Build Commands

All frontend scripts are defined in `frontend/package.json`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server with hot reload on `http://localhost:5173` |
| `npm run build` | Run TypeScript type-checking (`tsc -b`) then produce a production build in `frontend/dist/` |
| `npm run preview` | Serve the production build locally for verification |
| `npm run lint` | Run ESLint (flat config) across all `.ts` and `.tsx` files |
| `npm run test` | Run the full Vitest test suite once (`vitest run`) |
| `npm run test:watch` | Run Vitest in watch mode, re-running tests on file changes |

Standalone type-checking without a full build:

```bash
cd frontend
npx tsc --noEmit
```

This must be run from the `frontend/` directory (not the project root) because `tsconfig.app.json` uses relative paths.

## Frontend Testing with Vitest

The frontend uses **Vitest 4.x** as its test runner, configured in `frontend/vitest.config.ts`.

### Configuration

- **Environment:** jsdom (browser-like DOM for component tests)
- **Globals:** enabled (`describe`, `it`, `expect` available without imports)
- **Setup file:** `frontend/src/test-setup.ts` (imports `@testing-library/jest-dom/vitest` matchers)
- **CSS Modules:** `classNameStrategy: 'non-scoped'` so class name assertions work in tests

### Running Frontend Tests

```bash
cd frontend

# Run all tests once
npm run test

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npx vitest run src/__tests__/somefile.test.tsx

# Run tests matching a name pattern
npx vitest run -t "renders the dashboard"
```

### Writing New Tests

- **Location:** place test files in `frontend/src/__tests__/` with a `.test.ts` or `.test.tsx` suffix.
- **Component tests** that use React contexts must be wrapped with both `<MemoryRouter>` and `<AppProvider>`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../contexts/AppContext';
import MyComponent from '../features/my-feature/MyComponent';

it('renders correctly', () => {
  render(
    <MemoryRouter>
      <AppProvider>
        <MyComponent />
      </AppProvider>
    </MemoryRouter>
  );
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});
```

- **DOM matchers** like `toBeInTheDocument()`, `toHaveTextContent()`, and `toBeVisible()` are available globally via the setup file.

## CSS Modules Conventions

Every React component has a co-located CSS Module file following this pattern:

```
frontend/src/features/my-feature/
  MyComponent.tsx
  MyComponent.module.css
```

### Rules

- **File naming:** match the component name with a `.module.css` suffix (e.g., `Dashboard.module.css` for `Dashboard.tsx`).
- **Import pattern:** `import styles from './MyComponent.module.css';`
- **Class names in CSS:** use camelCase (e.g., `.cardPrimary`, `.cardBody`, `.savedLink`).
- **Composing classes:** use template literals: `` className={`${styles.card} ${styles.cardPrimary}`} ``.
- **Global variables:** defined in `frontend/src/styles/variables.css` and available in all modules. Use `var(--accent)`, `var(--bg-primary)`, `var(--text-secondary)`, etc.
- **Animations:** use `@keyframes` defined within the module file. Common patterns include `fadeInUp` for page transitions and `spin` for loading indicators.
- **Responsive breakpoints:** primary mobile breakpoint is `@media (max-width: 680px)`.

## Context and Hook Patterns

Application state is managed through domain-specific React contexts composed in `frontend/src/contexts/AppContext.tsx`.

### Contexts

| Context | File | Purpose |
|---------|------|---------|
| `CVContext` | `frontend/src/contexts/CVContext.tsx` | CV form data, version management, template selection |
| `JobContext` | `frontend/src/contexts/JobContext.tsx` | Job description, company name, role, match analysis |
| `ToolsContext` | `frontend/src/contexts/ToolsContext.tsx` | AI chat, import, tailor tool state |
| `EditorActionsContext` | `frontend/src/contexts/EditorActionsContext.tsx` | Direct-edit editor actions and state |

All four contexts are composed inside `<AppProvider>`. A backwards-compatible shim `useAppContext()` merges the first three into one flat object, but new code should use the domain-specific hooks directly:

```tsx
import { useCVContext } from '../contexts/CVContext';
import { useJobContext } from '../contexts/JobContext';

const { formData, activeVersion } = useCVContext();
const { jobDescription, companyName } = useJobContext();
```

### Custom Hooks

Domain logic and API interactions are encapsulated in hooks located in `frontend/src/hooks/`:

| Hook | Purpose |
|------|---------|
| `useTemplates` | Fetch and manage available CV templates |
| `useCompiler` | Compile LaTeX to PDF via the backend, with AbortController cleanup |
| `useChat` | AI chat and match analysis with streaming SSE support |
| `useImport` | CV import from PDF, DOCX, or JSON files |
| `useTailor` | AI-powered tailor suggestions for job applications |
| `useVoiceInterview` | Voice interview pipeline (WebSocket-based) |

When adding a new feature, create a hook in `frontend/src/hooks/` and wire it into the appropriate context provider.

## Adding a New API Endpoint (Updated)

The earlier "Adding a New API Endpoint" section references `frontend/src/hooks/useApi.ts`, which no longer exists. The current pattern is:

1. **Create the route handler** in `backend/routes/` as a new Python module (e.g., `backend/routes/my_feature.py`):

```python
from fastapi import APIRouter

router = APIRouter()

@router.post("/my-feature")
async def my_feature_handler(request: MyRequest):
    # Business logic here
    return {"success": True}
```

2. **Register the router** in `backend/main.py`:

```python
from routes.my_feature import router as my_feature_router

app.include_router(my_feature_router, prefix="/api", tags=["my-feature"])
```

3. **Add the frontend API call** in `frontend/src/services/api.ts`. All API methods live in this single file and follow the pattern of catching errors internally and returning typed results (never throwing):

```typescript
export const myFeature = async (data: MyData): Promise<MyResult | null> => {
  try {
    const response = await axiosInstance.post('/my-feature', data);
    return response.data;
  } catch {
    console.error('[api:myFeature] request failed');
    return null;
  }
};
```

4. **Consume the API** from a custom hook in `frontend/src/hooks/` or directly in a context provider.

## Adding a New LaTeX Template

CV templates consist of a LaTeX source template (Jinja2), a document class file, and metadata registered in the template config.

### Steps

1. **Create the template folder** under `cv-templates/` with the original `.tex` and `.cls` files, plus a preview image.

2. **Create the Jinja2 template** in `backend/latex_templates/` with a `.tex.j2` extension. Use the custom Jinja2 delimiters to avoid conflicts with LaTeX braces:
   - Variable output: `(( variable ))` instead of `{{ variable }}`
   - Block tags: `(% if condition %)` instead of `{% if condition %}`
   - Comments: `(# comment #)` instead of `{# comment #}`

3. **Register the template** in `backend/config/templates.py` by adding an entry to the `TEMPLATES` dict:

```python
"my-template": TemplateConfig(
    id="my-template",
    name="My Template",
    description="A brief description of the template style.",
    folder="my-template",           # folder name under cv-templates/
    tex_file="my-template.tex",     # original .tex filename
    cls_file="my-template.cls",     # document class filename
    preview_file="my-preview.png",  # preview image filename
    engine="pdflatex",              # "pdflatex" or "xelatex"
    extra_files=[],                 # additional files to copy (e.g., .bib, .sty)
    extra_dirs=[],                  # additional directories to copy (e.g., fonts/)
),
```

4. **Apply LaTeX escaping** in the Jinja2 template. Use the `latex_escape` filter for user text and `latex_url_escape` for URLs inside `\href{}`:
   - `(( entry.title | latex_escape ))`
   - `(( entry.url | latex_url_escape ))`
   - For lists: `(( items | map('latex_escape') | join(' \\\\\\\\  ') ))`

5. **Test the template** by running the backend test suite:

```bash
cd backend
pytest tests/test_template_rendering.py -v -k "my_template"
pytest tests/test_template_compilation.py -v -k "my_template"
```

## PR Process

No formal PR template or `CONTRIBUTING.md` is currently configured in this repository. When submitting a pull request:

- Create a feature branch from `main` (e.g., `feature/my-feature`).
- Keep changes focused on a single concern per PR.
- Run `npm run lint` and `npm run test` in `frontend/` before pushing to catch lint and test failures early.
- Run `pytest tests/ -v` in `backend/` to verify backend tests pass.
- Write a clear PR description explaining what changed and why.
- Request review from a maintainer before merging to `main`.

## Corrections and Errata

The "Adding New Features" section above contains two stale references that were written before the current architecture was in place. Do not follow those instructions as written — use the correct locations below.

### Stale reference: `frontend/src/hooks/useApi.ts` (line 190)

This file does not exist. All frontend API calls live in `frontend/src/services/api.ts` as named exports. See the "Adding a New API Endpoint (Updated)" section above for the correct pattern.

### Stale reference: `frontend/src/components/index.ts` (line 195)

This barrel file does not exist. The `frontend/src/components/` directory contains only a small set of shared layout and error-boundary components (`FeatureErrorBoundary.tsx`, `NavBar.tsx`, `WorkingLayout.tsx`) and has no index barrel. New feature components should be placed in a feature subdirectory under `frontend/src/features/`, not in `frontend/src/components/`. There is no barrel file to export from — import components directly by path.

## Direct-Edit Architecture

The direct-edit feature (`frontend/src/features/direct-edit/`) is the primary CV editing surface. Users type inline on a web rendering of the CV that visually mirrors the final PDF output, replacing the old split-screen form builder.

### Entry Point

`DirectEditPage` (`frontend/src/features/direct-edit/DirectEditPage.tsx`) is mounted at the `/build/form` route in `App.tsx`. It bootstraps `CVFormData` from context (or loads the most recent saved version if the user navigates directly to the URL), then assembles the template renderer and auto-save hook.

### Key Hooks (co-located in `frontend/src/features/direct-edit/hooks/`)

| Hook | File | Purpose |
|------|------|---------|
| `useDirectEditor` | `hooks/useDirectEditor.ts` | Bridges `EditableField` callbacks to `CVFormData` via `useCVContext`. Exposes `updateField`, `addBullet`, `removeBullet`, `addEntry`, `removeEntry`, `toggleSection`, `hiddenSections`, `reorderSections`, `reorderEntries`. |
| `useAutoSave` | `hooks/useAutoSave.ts` | Debounced auto-save (2.5 s inactivity) with `SaveStatus` type (`idle \| saving \| saved \| error`). Skips saves when `formData` is unchanged since last save. |
| `usePageBreak` | `hooks/usePageBreak.ts` | Measures the CV container height to compute where the A4 page break falls and returns the Y offset for `PageBreakIndicator`. |
| `useSectionDrag` | `hooks/useSectionDrag.ts` | Drag-and-drop reordering of top-level CV sections via HTML drag events. |
| `useEntryDrag` | `hooks/useEntryDrag.ts` | Drag-and-drop reordering of entries within a section (e.g., work experience entries). |
| `useScrollSync` | `hooks/useScrollSync.ts` | Keeps any scroll position in sync when the editor layout changes. |

### Core Component: `EditableField`

`EditableField` (`components/EditableField.tsx`) is the fundamental building block. It wraps a single `CVFormData` field in a `contentEditable` element using the "uncontrolled while focused, controlled while blurred" pattern:

- **While focused:** React does not touch the DOM; the browser owns the element.
- **On blur:** reads `textContent` (or `innerHTML` when `rich=true`) and fires `onFieldChange(path, value)` only if the value changed.
- **Paste handling:** uses `contentEditable="plaintext-only"` by default to strip rich-text on paste; the `rich` prop enables HTML-aware paste that normalises formatting to plain text.

The `fieldPath` prop is a dot-bracket string (e.g., `workExperience[0].bullets[2].text`) resolved via `setAtPath` / `getAtPath` from `frontend/src/utils/formDataPatch.ts`.

### Template Renderer: `MedLengthTemplate`

`MedLengthTemplate` (`components/MedLengthTemplate.tsx`) renders the entire CV document as HTML, placing an `EditableField` for every text field and an `EditableBulletList` for every bullet array. CSS in `MedLengthTemplate.module.css` targets ~95% visual fidelity with the `med-length-proff-cv` LaTeX template. Section order follows `formData.sectionOrder`.

Each section is wrapped in `SectionWrapper` (hover-reveal add button, visibility toggle, drag grip) and each entry in `EntryWrapper` (hover-reveal delete button with optional confirm dialog, drag grip).

Section-specific sub-components live in `components/sections/`: `WorkSection`, `EducationSection`, `SkillsSection`, `ProjectsSection`, `AwardsSection`, `AdditionalSection`.

### `EditorActionsContext` Integration

`DirectEditPage` registers its toolbar actions (Download PDF, Tune for Job, save status, loading flags) into `EditorActionsContext` via `useSetEditorActions()` on mount, and clears them on unmount. `NavBar` reads these via `useEditorActions()` to render the download button and save indicator only while the editor route is active.

### Adding a New Editable Section Type

1. Create a section component in `frontend/src/features/direct-edit/components/sections/` (e.g., `PublicationsSection.tsx`) using `EditableField` and `EditableBulletList` for all editable fields.
2. Register the section key in `components/sections/sectionTypes.ts`.
3. Add a `case` for the new key in `MedLengthTemplate.tsx`'s section renderer.
4. Add a corresponding empty-entry factory function in `frontend/src/utils/entryFactories.ts` and handle the new key in `useDirectEditor`'s `addEntry` / `removeEntry` callbacks.
5. Extend the `CVFormData` type in `frontend/src/types/index.ts` if the section introduces new data fields (avoid this where possible — `additionalSections` handles generic section types without a schema change).
