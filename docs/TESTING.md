<!-- generated-by: gsd-doc-writer -->
# Testing

CV-Maker has two independent test suites: a **frontend** suite using Vitest with Testing Library, and a **backend** suite using pytest. Both suites cover unit tests, component tests, and integration tests.

## Test Framework and Setup

### Frontend

| Tool | Version | Purpose |
|------|---------|---------|
| [Vitest](https://vitest.dev/) | ^4.0.18 | Test runner and assertion library |
| [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) | ^16.3.2 | Component rendering and querying |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) | ^6.9.1 | Custom DOM matchers (`.toBeInTheDocument()`, etc.) |
| [jsdom](https://github.com/jsdom/jsdom) | ^28.1.0 | Browser environment simulation |

**Configuration files:**

- `frontend/vitest.config.ts` -- configures jsdom environment, global test APIs, CSS module handling, and the setup file.
- `frontend/src/test-setup.ts` -- imports `@testing-library/jest-dom/vitest` to register DOM matchers.

Vitest is configured with `globals: true`, so `describe`, `it`, `expect`, `vi`, and other test APIs are available without explicit imports. CSS Modules use the `non-scoped` class name strategy so class names in tests match the source.

### Backend

| Tool | Version | Purpose |
|------|---------|---------|
| [pytest](https://docs.pytest.org/) | (dev dependency) | Test runner and framework |
| FastAPI `TestClient` | (via `fastapi`) | HTTP-level integration testing |
| `unittest.mock` | (stdlib) | Mocking Bedrock AI and python-docx |

**Configuration files:**

- `backend/pytest.ini` -- registers the custom `slow` marker for tests requiring LaTeX compilation.

Backend tests add the `backend/` directory to `sys.path` at module level to import application code without installing the package.

## Running Tests

### Frontend

All commands must be run from the `frontend/` directory.

```bash
# Run the full test suite (single pass, exits after completion)
cd frontend && npm test

# Run tests in watch mode (re-runs on file changes)
cd frontend && npm run test:watch

# Run a specific test file
cd frontend && npx vitest run src/__tests__/formDataPatch.test.ts

# Run tests matching a name pattern
cd frontend && npx vitest run -t "applyTailorChanges"
```

### Backend

All commands must be run from the `backend/` directory.

```bash
# Run all backend tests (including slow compilation tests)
cd backend && python3 -m pytest tests/ -v

# Run only fast tests (skip LaTeX compilation)
cd backend && python3 -m pytest tests/ -v -m "not slow"

# Run a specific test file
cd backend && python3 -m pytest tests/test_cv_extractor.py -v

# Run a specific test class
cd backend && python3 -m pytest tests/test_cv_extractor.py::TestValidJsonResponse -v

# Run a specific test method
cd backend && python3 -m pytest tests/test_template_rendering.py::TestTemplateRendering::test_minimal_render -v
```

The `@pytest.mark.slow` marker is applied to all compilation tests in `test_template_compilation.py`. These tests invoke `pdflatex` or `xelatex` and take 2-5 seconds each. They are automatically skipped if the required LaTeX engine is not installed on the system.

### Type Checking

TypeScript type checking is a standalone step (not part of `npm test`). Run from the `frontend/` directory:

```bash
cd frontend && npx tsc --noEmit
```

This checks all `.ts` and `.tsx` files under `frontend/src/` using the strict TypeScript configuration in `frontend/tsconfig.app.json` (strict mode, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).

### Linting

```bash
cd frontend && npm run lint
```

This runs ESLint with the flat config defined in `frontend/eslint.config.js`. The config extends `js.configs.recommended`, `tseslint.configs.recommended`, React hooks rules, and React Refresh rules. It covers all `**/*.{ts,tsx}` files and ignores `dist/`.

No backend linter is configured.

## What Each Test Suite Covers

### Frontend Tests (`frontend/src/__tests__/`)

| Test File | What It Tests |
|-----------|---------------|
| `EditableField.test.tsx` | Core `contentEditable` component: rendering, tag selection, `data-field-path` attributes, placeholder behavior, blur-triggered `onFieldChange` callbacks |
| `EditableBulletList.test.tsx` | Bullet list editing component for work experience, education details, and project bullets |
| `EntryWrapper.test.tsx` | Entry wrapper component used to wrap individual CV entries (work, education, etc.) |
| `SectionWrapper.test.tsx` | Section wrapper component that groups CV sections with controls |
| `useDirectEditor.test.ts` | Central state controller hook: field change dispatch to `CVFormData`, entry add/remove, section toggle operations |
| `useAutoSave.test.ts` | Auto-save hook behavior and debounce logic |
| `useImport.test.ts` | CV import hook: file upload, response handling, error states |
| `usePageBreak.test.ts` | Page break detection and management for the direct-edit CV renderer |
| `formDataPatch.test.ts` | `applyTailorChanges` utility: path resolution with structured `BulletItem`/`SkillItem` types, add/modify operations, ID preservation |
| `deriveLinkLabel.test.ts` | URL-to-label derivation for personal links (GitHub, LinkedIn, etc.) |
| `entryFactories.test.ts` | Factory functions (`emptyWorkEntry`, `emptyEducationEntry`, etc.) produce correctly shaped empty entries with IDs |
| `dragAndDrop.test.tsx` | Drag-and-drop reordering for CV sections and entries |
| `import-flow-state.test.tsx` | Import flow state machine: file selection through import completion |

### Backend Tests (`backend/tests/`)

| Test File | What It Tests | Marker |
|-----------|---------------|--------|
| `test_template_rendering.py` | Jinja2 template rendering for all 3 CV templates across 7 data scenarios: minimal, maximal, special characters, empty sections, empty bullets, no contact info, section ordering. Also tests `latex_escape` and `latex_url_escape` filter functions directly. | -- |
| `test_template_compilation.py` | End-to-end LaTeX compilation to PDF via `pdflatex`/`xelatex` for all templates across 4 data scenarios plus Unicode and PDF size validation. | `@pytest.mark.slow` |
| `test_cv_extractor.py` | `_parse_extraction_response()` unit tests: valid JSON parsing, markdown fence stripping, truncation detection, malformed JSON handling, confidence/warning extraction, Pydantic validation behavior, summary calculation, edge cases. | -- |
| `test_cv_extractor_error_paths.py` | Async extraction functions (`extract_from_pdf`, `extract_from_docx`, `extract_from_json`) with mocked Bedrock: exception types, empty/truncated responses, argument verification, `_extract_docx_text` structural tests, pipeline confidence/warning passthrough. | -- |
| `test_extract_docx_text.py` | `_extract_docx_text()` with in-memory DOCX documents: heading detection and level capping, list detection via style name/XML numPr/left indent, nested list indentation, bold paragraph wrapping, table extraction, detection priority (heading > list > bold > plain), mixed content CV simulation. | -- |
| `test_cv_import_integration.py` | HTTP-level integration tests via FastAPI `TestClient` for the `/api/cv-import` endpoint: JSON/DOCX/PDF import flows, file validation (size limits, type restrictions, extension detection), response structure verification. Uses fixture files from `backend/tests/fixtures/`. | -- |
| `test_id_migration.py` | `ensure_ids` migration helper: legacy bare-string-to-structured-format migration, ID generation, idempotency, Pydantic backward compatibility, `_flatten_for_template` and `_strip_ids_for_ai` helpers. | -- |

## Writing New Tests

### Frontend Test Conventions

**File naming:** `*.test.ts` for utility/hook tests, `*.test.tsx` for component tests. All test files live in `frontend/src/__tests__/`.

**Imports:** Since `globals: true` is configured, you can import from `vitest` explicitly or use the globals directly. Existing tests consistently use explicit imports:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
```

**Testing components:** Use `render()` from Testing Library. Components that depend on React context (`useCVContext`, `useJobContext`) should either be wrapped in providers or have the context mocked with `vi.mock`:

```typescript
const mockSetFormData = vi.fn();
vi.mock('../contexts/CVContext', () => ({
  useCVContext: () => ({
    formData: mockFormData,
    setFormData: mockSetFormData,
  }),
}));
```

**Testing hooks:** Use `renderHook()` from Testing Library. Wrap state mutations in `act()`:

```typescript
const { result } = renderHook(() => useDirectEditor());
act(() => {
  result.current.handleFieldChange('personalInfo.fullName', 'Jane Doe');
});
expect(mockSetFormData).toHaveBeenCalled();
```

**Test data factories:** Create a `makeTestFormData()` helper function at the top of each test file that returns a complete `CVFormData` object with known values. This avoids repetition and makes tests self-contained.

### Backend Test Conventions

**File naming:** `test_*.py` with snake_case. All test files live in `backend/tests/`.

**Path setup:** Every test file adds the backend directory to `sys.path` at the top:

```python
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
```

**Test organization:** Use classes to group related tests. Class names use the `Test*` prefix. Fixture data builders are module-level functions prefixed with `_`:

```python
def _minimal_valid_response() -> dict:
    """Minimal valid CV JSON that passes Pydantic validation."""
    return { ... }

class TestValidJsonResponse:
    def test_minimal_response_succeeds(self):
        raw = json.dumps(_minimal_valid_response())
        result = _parse_extraction_response(raw, source="pdf")
        assert result.success is True
```

**Mocking external services:** Use `unittest.mock.patch` as a decorator on test methods to mock Bedrock AI calls and python-docx. The standard pattern:

```python
from unittest.mock import patch, MagicMock

class TestExtractFromPdf:
    @patch("services.cv_extractor.bedrock_client")
    def test_successful_extraction(self, mock_bedrock):
        mock_bedrock.chat_with_document.return_value = _make_valid_response()
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is True
```

**Running async functions in sync tests:** Use a helper to run coroutines:

```python
import asyncio

def run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
```

**Fixture files:** Place binary test fixtures (`.docx`, `.json`) in `backend/tests/fixtures/`. Load them with a helper:

```python
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")

def _load_fixture(filename: str) -> bytes:
    path = os.path.join(FIXTURES_DIR, filename)
    with open(path, "rb") as f:
        return f.read()
```

**Marking slow tests:** Tests that invoke LaTeX compilation must be marked with `@pytest.mark.slow` and should include a skip condition for missing engines:

```python
@pytest.mark.slow
@pytest.mark.skipif(not PDFLATEX_AVAILABLE, reason="pdflatex not installed")
def test_compilation(self, compiler):
    ...
```

## Coverage Requirements

No coverage threshold is configured for either the frontend or backend test suites. Coverage collection is not set up in the Vitest or pytest configurations.

## CI Integration

No CI/CD pipeline is detected in the repository. There are no GitHub Actions workflow files (`.github/workflows/`) present. Tests are run manually by developers using the commands documented above.
