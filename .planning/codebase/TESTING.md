# Testing Patterns

**Analysis Date:** 2026-03-29

## Test Frameworks

### Frontend

**Runner:**
- Vitest 4.x
- Config: `frontend/vitest.config.ts`
- Environment: jsdom
- Globals: enabled (`globals: true` -- no need to import `describe`, `it`, `expect`)
- Setup file: `frontend/src/test-setup.ts` (imports `@testing-library/jest-dom/vitest`)

**Assertion Library:**
- Vitest built-in (`expect`, `toBe`, `toEqual`, `toHaveLength`, `toBeNull`, `not.toBeNull`)
- jest-dom matchers via `@testing-library/jest-dom` (`.toBeInTheDocument()`, `.not.toBeInTheDocument()`)

**Component Testing:**
- `@testing-library/react` (v16) for `render`, `screen`, `fireEvent`, `waitFor`
- `@testing-library/user-event` (v14) installed but not used in current tests
- `renderHook` and `act` from `@testing-library/react` for hook tests

**Run Commands:**
```bash
cd frontend && npm test          # Run all tests (vitest run)
cd frontend && npm run test:watch # Watch mode (vitest)
```

### Backend

**Runner:**
- pytest (version from requirements: `pytest>=7.0`)
- Config: `backend/pytest.ini`
- Custom marker: `slow` for compilation tests that take 2-5 seconds each

**Testing Libraries:**
- `unittest.mock` (stdlib) for `MagicMock`, `patch`, `AsyncMock`
- `fastapi.testclient.TestClient` for integration HTTP tests
- No third-party assertion library -- uses plain `assert` statements

**Run Commands:**
```bash
cd backend && python3 -m pytest tests/ -v                 # Run all tests
cd backend && python3 -m pytest tests/ -v -m "not slow"   # Skip compilation tests
cd backend && python3 -m pytest tests/test_cv_extractor.py -v  # Single file
```

## Test File Organization

### Frontend

**Location:** Centralized in `frontend/src/__tests__/` (not co-located with source).

**Files:**
- `frontend/src/__tests__/useFormBuilder.test.ts` -- Hook state init, CRUD operations, section ordering
- `frontend/src/__tests__/useImport.test.ts` -- JSON import flow, link label derivation, validation
- `frontend/src/__tests__/import-flow-state.test.tsx` -- Full app navigation flow integration tests
- `frontend/src/__tests__/resize-handle.test.tsx` -- UI interaction (mousedown/mousemove/mouseup on resize handle)
- `frontend/src/__tests__/deriveLinkLabel.test.ts` -- Pure function unit tests

**Naming:**
- `{hookName}.test.ts` for hook tests
- `{featureName}.test.tsx` for component integration tests
- `{utilName}.test.ts` for utility function tests

**CSS Module Strategy:**
- `vitest.config.ts` uses `css.modules.classNameStrategy: 'non-scoped'` so CSS classes resolve without hashing in tests

### Backend

**Location:** `backend/tests/` directory with `__init__.py`.

**Files:**
- `backend/tests/test_template_rendering.py` -- 21 tests: Jinja2 template rendering (no LaTeX compilation)
- `backend/tests/test_template_compilation.py` -- 18 tests: End-to-end LaTeX to PDF compilation (`@pytest.mark.slow`)
- `backend/tests/test_cv_extractor.py` -- ~55 tests: `_parse_extraction_response` parsing logic
- `backend/tests/test_cv_extractor_error_paths.py` -- ~80 tests: Error paths with mocked Bedrock
- `backend/tests/test_extract_docx_text.py` -- ~65 tests: DOCX text extraction with real python-docx
- `backend/tests/test_cv_import_integration.py` -- ~45 tests: HTTP route integration via TestClient

**Fixtures Directory:** `backend/tests/fixtures/`
- `sample_cv.json`, `minimal_cv.json`, `invalid.json`
- `sample_cv.docx`, `minimal_cv.docx`, `empty.docx`
- `not_a_cv.txt`

**Naming:**
- `test_{module_name}.py` pattern
- Test classes: `TestClassName` (e.g., `TestTemplateRendering`, `TestExtractFromPdf`, `TestJSONImport`)
- Test methods: `test_{behavior_description}` (e.g., `test_minimal_render`, `test_bedrock_returns_truncated_json`)

## Test Structure

### Frontend Hook Tests

**Suite Organization:**
```typescript
describe('useFormBuilder', () => {
  describe('initialization without importedData (Build path)', () => {
    it('creates blank form with empty personal info', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));
      expect(result.current.formData.personalInfo.fullName).toBe('');
    });
  });

  describe('initialization with importedData (Import path)', () => {
    const importedData: CVFormData = { ... };

    it('uses imported personal info', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv', importedData));
      expect(result.current.formData.personalInfo.fullName).toBe('John Doe');
    });
  });

  describe('CRUD operations on form data', () => {
    describe('personal info', () => { ... });
    describe('work experience', () => { ... });
  });
});
```

**Patterns:**
- `renderHook(() => useHook(args))` for hook testing
- `act(() => { result.current.someAction(); })` for state updates
- Test data defined inline or as local constants within `describe` blocks
- Assertions check multiple properties per test for comprehensive coverage

### Frontend Component Integration Tests

**Suite Organization:**
```typescript
// Mock setup at top of file
vi.mock('../services/api', () => ({
  api: {
    loadUserData: vi.fn().mockResolvedValue(null),
    listVersions: vi.fn().mockResolvedValue({ versions: [], ungrouped: [] }),
    fetchTemplates: vi.fn().mockResolvedValue([...]),
    // ... all methods that run on mount
  },
}));

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}

describe('Navigation Flow', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders landing screen', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByText('Build my CV')).toBeInTheDocument();
    });
  });
});
```

**Key pattern:** Always wrap components in `<MemoryRouter><AppProvider>...</AppProvider></MemoryRouter>` for tests that need routing and context.

### Backend Test Classes

**Suite Organization:**
```python
class TestTemplateRendering:
    """Test suite for LaTeX template rendering."""

    @pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
    def test_minimal_render(self, template_id: str, template_file: str):
        data = TestFixtures.minimal_data()
        data.templateId = template_id
        template = jinja_env.get_template(template_file)
        context = self._build_context(data)
        latex_output = template.render(**context)
        assert "\\begin{document}" in latex_output

    def _build_context(self, form_data: CVFormData) -> dict:
        """Helper shared across test methods."""
```

**Patterns:**
- Test classes group related tests (not required to inherit from anything)
- `_build_context` helper methods on test class (shared setup)
- `@pytest.mark.parametrize` for cross-template testing
- Static fixture methods in a `TestFixtures` class for reusable test data

## Mocking

### Frontend Mocking

**Framework:** Vitest `vi.mock` / `vi.fn` / `vi.spyOn`

**API Module Mock (most common pattern):**
```typescript
vi.mock('../services/api', () => ({
  api: {
    loadUserData: vi.fn().mockResolvedValue(null),
    listVersions: vi.fn().mockResolvedValue({ versions: [], ungrouped: [] }),
    fetchTemplates: vi.fn().mockResolvedValue([...templateData]),
    loadTemplateContent: vi.fn().mockResolvedValue({ content: '\\documentclass{article}', clsContent: null }),
    generateLatex: vi.fn().mockResolvedValue({ texContent: '...' }),
    compileLatex: vi.fn().mockResolvedValue({ success: true, pdf_base64: 'AAAA', page_count: 1 }),
    importCV: vi.fn(),
  },
}));
```

**Browser API Mocks (for resize tests):**
```typescript
vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
  rafCallbacks.push(cb as () => void);
  return rafIdCounter++;
});
```

**What to Mock:**
- The `api` service module (all external HTTP calls)
- `requestAnimationFrame` / `cancelAnimationFrame` for deterministic animation testing

**What NOT to Mock:**
- React hooks (`useState`, `useCallback`, etc.)
- Context providers (rendered as real components)
- React Router (use `MemoryRouter` with real routing)

### Backend Mocking

**Framework:** `unittest.mock` (`MagicMock`, `patch`, `AsyncMock`)

**Bedrock Client Mock (most common pattern):**
```python
@patch("services.cv_extractor.bedrock_client")
def test_successful_extraction(self, mock_bedrock):
    mock_bedrock.chat_with_document.return_value = _make_valid_response()
    result = run(extract_from_pdf(b"fake-pdf-bytes"))
    assert result.success is True
```

**DOCX Document Mock:**
```python
@patch("services.cv_extractor.bedrock_client")
@patch("services.cv_extractor.Document")
def test_successful_extraction(self, mock_document_cls, mock_bedrock):
    mock_document_cls.return_value = _make_mock_doc_with_text("Jane Doe")
    mock_bedrock.chat.return_value = _make_valid_response()
    result = run(extract_from_docx(b"fake-docx-bytes"))
```

**What to Mock:**
- `bedrock_client` (AWS AI service calls -- always mocked)
- `python-docx Document` class (when testing error paths; real DOCX used in `test_extract_docx_text.py`)

**What NOT to Mock:**
- Jinja2 template rendering (tests use real templates from `backend/latex_templates/`)
- LaTeX compilation (real `pdflatex`/`xelatex` in `test_template_compilation.py`)
- FastAPI TestClient (real HTTP processing)

## Fixtures and Factories

### Frontend Test Data

**Pattern: Inline factory functions:**
```typescript
function makeJsonFile(data: object, filename = 'cv.json'): File {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return new File([blob], filename, { type: 'application/json' });
}

function validCVData(overrides: Partial<CVFormData> = {}): object {
  return {
    personalInfo: { fullName: 'Test User', email: 'test@example.com', ... },
    workExperience: [],
    education: [],
    skills: [],
    ...overrides,
  };
}
```

**Location:** Defined at the top of each test file (not shared across files).

### Backend Test Data

**Pattern: Static methods on a `TestFixtures` class (for template tests):**
```python
class TestFixtures:
    @staticmethod
    def minimal_data() -> CVFormData:
        return CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(fullName="John Doe"),
            workExperience=[WorkEntry(company="Acme Corp", ...)],
        )

    @staticmethod
    def maximal_data() -> CVFormData: ...
    @staticmethod
    def special_chars_data() -> CVFormData: ...
    @staticmethod
    def empty_optional_sections() -> CVFormData: ...
    @staticmethod
    def empty_bullets() -> CVFormData: ...
    @staticmethod
    def no_contact_info() -> CVFormData: ...
```

**Fixture reuse:** `test_template_compilation.py` imports `TestFixtures` from `test_template_rendering.py`:
```python
from test_template_rendering import TestFixtures
```

**Pattern: Module-level fixture dicts (for extractor tests):**
```python
VALID_EXTRACTION_JSON = {
    "sectionOrder": ["work", "education", "skills"],
    "personalInfo": { ... },
    ...
}

def _make_valid_response(**overrides) -> str:
    data = {**VALID_EXTRACTION_JSON, **overrides}
    return json.dumps(data)
```

**File Fixtures:**
- Located in `backend/tests/fixtures/`
- Loaded via helper: `_load_fixture("sample_cv.json")` returns `bytes`
- Include real DOCX files created with python-docx for integration testing

**pytest fixtures (standard):**
```python
@pytest.fixture
def compiler(self):
    return LaTeXCompiler()

@pytest.fixture
def client():
    return TestClient(app)
```

## Async Test Pattern (Backend)

**Helper for running async functions in sync tests:**
```python
def run(coro):
    """Run an async coroutine synchronously."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

# Usage:
result = run(extract_from_pdf(b"fake-pdf-bytes"))
```

This pattern is used because extraction functions (`extract_from_pdf`, `extract_from_docx`, `extract_from_json`) are `async` but tests are sync. The FastAPI `TestClient` handles async routes automatically.

## Coverage

**Requirements:** No coverage targets enforced. No coverage configuration detected.

**View Coverage:** Not configured. To add:
```bash
# Frontend
cd frontend && npx vitest run --coverage

# Backend
cd backend && python3 -m pytest tests/ --cov=. --cov-report=html
```

## Test Types

### Unit Tests
- **Frontend:** Hook initialization, state updates, utility function behavior
  - `frontend/src/__tests__/useFormBuilder.test.ts` -- Hook CRUD operations
  - `frontend/src/__tests__/useImport.test.ts` -- Import hook logic
  - `frontend/src/__tests__/deriveLinkLabel.test.ts` -- Pure function tests
- **Backend:** Parser functions, text extraction, model validation
  - `backend/tests/test_cv_extractor.py` -- `_parse_extraction_response` unit tests
  - `backend/tests/test_extract_docx_text.py` -- `_extract_docx_text` with real python-docx documents

### Integration Tests
- **Frontend:** Full app navigation flows with mocked API
  - `frontend/src/__tests__/import-flow-state.test.tsx` -- Landing -> BuildChoice -> Template flow
  - `frontend/src/__tests__/resize-handle.test.tsx` -- Component with context + router wrappers
- **Backend:** HTTP route testing with FastAPI TestClient
  - `backend/tests/test_cv_import_integration.py` -- Full /api/cv-import endpoint testing
  - `backend/tests/test_template_rendering.py` -- Template rendering with real Jinja2 engine

### Compilation Tests (Backend only)
- `backend/tests/test_template_compilation.py` -- Real LaTeX compilation to PDF
- Marked `@pytest.mark.slow` -- each test takes 2-5 seconds
- Conditionally skipped if LaTeX engine not installed:
  ```python
  @pytest.mark.slow
  @pytest.mark.skipif(not PDFLATEX_AVAILABLE, reason="pdflatex not installed")
  def test_minimal_professional_cv(self, compiler): ...
  ```
- Tests verify: compilation success, non-empty PDF, page count, reasonable file size

### E2E Tests
- Not implemented. No Playwright/Cypress detected.

## Common Patterns

### Async Testing (Frontend)
```typescript
it('parses valid JSON and produces a successful result', async () => {
  const { result } = renderHook(() => useImport());
  const file = makeJsonFile(validCVData());

  await act(async () => {
    await result.current.handleFileSelected(file);
  });

  expect(result.current.importResult).not.toBeNull();
  expect(result.current.importResult!.success).toBe(true);
});
```

### Error Testing (Frontend)
```typescript
it('rejects invalid JSON syntax', async () => {
  const { result } = renderHook(() => useImport());
  const blob = new Blob(['{ invalid json'], { type: 'application/json' });
  const file = new File([blob], 'bad.json', { type: 'application/json' });

  await act(async () => {
    await result.current.handleFileSelected(file);
  });

  expect(result.current.importError).toContain('Failed to parse JSON');
  expect(result.current.importResult).toBeNull();
});
```

### Parametrized Testing (Backend)
```python
@pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
def test_minimal_render(self, template_id: str, template_file: str):
    data = TestFixtures.minimal_data()
    data.templateId = template_id
    template = jinja_env.get_template(template_file)
    context = self._build_context(data)
    latex_output = template.render(**context)
    assert "\\begin{document}" in latex_output
```

### Known Bug Documentation Pattern (Backend)
```python
def test_json_array_instead_of_object_raises_unhandled_error(self):
    """BUG: A JSON array is valid JSON but not the expected dict shape.
    The function calls data.pop("_confidence", default) which fails on a
    list because list.pop() only accepts an index, not a key+default.
    This raises an unhandled TypeError.

    This is a real bug -- the function should guard against non-dict JSON
    responses (e.g., with `if not isinstance(data, dict): return failure`).
    """
    raw = "[1, 2, 3]"
    with pytest.raises(TypeError):
        _parse_extraction_response(raw, source="pdf")
```

Tests document known bugs with `BUG:` prefix in docstrings and use `pytest.raises` to assert the current (broken) behavior, making it clear what should be fixed.

### Navigation Testing (Frontend)
```typescript
it('"Build my CV" navigates to BuildChoiceScreen', async () => {
  renderApp();

  await waitFor(() => {
    expect(screen.getByText('Build my CV')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText('Build my CV'));

  await waitFor(() => {
    expect(screen.getByText('Build your CV')).toBeInTheDocument();
  });
});
```

### HTTP Integration Testing (Backend)
```python
def test_valid_json_import(self, client):
    data = _load_fixture("sample_cv.json")
    resp = _upload(client, data, "my_cv.json", "application/json")

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["source"] == "json"
    assert body["formData"]["personalInfo"]["fullName"] == "Jane Smith"
```

## Test Helpers

### Frontend

**`renderApp(initialPath)` -- Render full app at a route:**
```typescript
function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}
```
Located in: `frontend/src/__tests__/import-flow-state.test.tsx`

**`renderFormBuilder()` -- Render component with providers:**
```typescript
function renderFormBuilder() {
  return render(
    <MemoryRouter initialEntries={['/build/form']}>
      <AppProvider>
        <CVFormBuilder />
      </AppProvider>
    </MemoryRouter>
  );
}
```
Located in: `frontend/src/__tests__/resize-handle.test.tsx`

**`flushRaf()` -- Flush requestAnimationFrame callbacks:**
```typescript
function flushRaf() {
  act(() => {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach(cb => cb());
  });
}
```
Located in: `frontend/src/__tests__/resize-handle.test.tsx`

### Backend

**`run(coro)` -- Sync wrapper for async functions:**
```python
def run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
```
Located in: `backend/tests/test_cv_extractor_error_paths.py`

**`_load_fixture(filename)` -- Load test fixture file as bytes:**
```python
def _load_fixture(filename: str) -> bytes:
    path = os.path.join(FIXTURES_DIR, filename)
    with open(path, "rb") as f:
        return f.read()
```
Located in: `backend/tests/test_cv_import_integration.py`

**`_upload(client, file_bytes, filename, content_type)` -- POST file to import endpoint:**
```python
def _upload(client, file_bytes, filename, content_type=None):
    files = {"file": (filename, BytesIO(file_bytes), content_type or "application/octet-stream")}
    return client.post("/api/cv-import", files=files)
```
Located in: `backend/tests/test_cv_import_integration.py`

**`_make_mock_doc_with_text(text)` -- Create mock DOCX Document:**
```python
def _make_mock_doc_with_text(text_content: str):
    mock_doc = MagicMock()
    if text_content.strip():
        mock_para = MagicMock()
        mock_para.text = text_content
        # ... setup style, runs, etc.
        mock_doc.paragraphs = [mock_para]
    else:
        mock_doc.paragraphs = []
    mock_doc.tables = []
    return mock_doc
```
Located in: `backend/tests/test_cv_extractor_error_paths.py`

---

*Testing analysis: 2026-03-29*
