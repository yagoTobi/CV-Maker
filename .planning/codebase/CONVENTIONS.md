# Coding Conventions

**Analysis Date:** 2026-03-29

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `LandingScreen.tsx`, `CVFormBuilder.tsx`, `FeatureErrorBoundary.tsx`)
- CSS Modules: match component name with `.module.css` suffix (e.g., `LandingScreen.module.css`)
- Hooks: camelCase with `use` prefix (e.g., `useFormBuilder.ts`, `useCompiler.ts`, `useImport.ts`)
- Utilities: camelCase (e.g., `formDataPatch.ts`, `cvFilename.ts`, `deriveLinkLabel.ts`)
- Contexts: PascalCase with `Context` suffix (e.g., `CVContext.tsx`, `JobContext.tsx`, `ToolsContext.tsx`)
- Types: single `index.ts` barrel file (`frontend/src/types/index.ts`)
- Tests (frontend): camelCase with `.test.ts` / `.test.tsx` suffix, stored in `frontend/src/__tests__/`
- Tests (backend): snake_case with `test_` prefix (e.g., `test_template_rendering.py`, `test_cv_extractor.py`)
- Backend routes: snake_case module names (e.g., `cv_import.py`, `cv_versions.py`, `generate_latex.py`)
- Backend services: snake_case module names (e.g., `cv_extractor.py`, `file_storage.py`, `latex_compiler.py`)

**Functions (TypeScript):**
- camelCase for all functions and methods
- Event handlers: `handle` + action (e.g., `handleBuildCV`, `handleTuneForJob`, `handleFileSelected`)
- State updaters returned from hooks: verb + noun (e.g., `updatePersonalInfo`, `addWorkEntry`, `removeBullet`, `reorderSections`)
- Factory functions: `empty` + type (e.g., `emptyWorkEntry()`, `emptyPersonalInfo()`, `emptyProject()`)
- API methods: verb + noun (e.g., `compileLatex`, `fetchTemplates`, `saveVersion`, `importCV`)

**Functions (Python):**
- snake_case for all functions
- Private helpers: leading underscore (e.g., `_parse_extraction_response`, `_build_personal_items`, `_detect_extension`, `_extract_docx_text`)
- Route handlers: descriptive verb (e.g., `import_cv`, `health_check`)
- Test fixtures: `_minimal_valid_response()`, `_full_valid_response()`, `_make_valid_response()`

**Variables:**
- TypeScript: camelCase (e.g., `formData`, `activeVersion`, `savedVersions`, `isGenerating`)
- Boolean state: `is` prefix (e.g., `isImporting`, `isSavingVersion`, `isDirty`, `isGenerating`)
- Python: snake_case (e.g., `file_bytes`, `form_data`, `template_id`)
- Constants (Python): UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `ALLOWED_EXTENSIONS`, `CORS_ORIGINS`, `TEMPLATE_FILES`)

**Types/Interfaces:**
- PascalCase for all types and interfaces
- Use `interface` for object shapes (e.g., `CVFormData`, `PersonalInfo`, `WorkEntry`, `TailorChange`)
- Use `type` for unions and derived types (e.g., `type FormSection = 'personal' | 'work' | ...`, `type CVVersionMeta = Omit<CVVersion, 'texContent' | 'formData'>`)
- Backend: Pydantic models in PascalCase (e.g., `CVFormData`, `PersonalInfo`, `WorkEntry`)

## Code Style

**Formatting:**
- No Prettier config detected -- uses ESLint for style enforcement
- ESLint config: `frontend/eslint.config.js` (flat config format)
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`
- TypeScript: strict mode enabled, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Target: ES2022
- Indentation: 2 spaces (TypeScript), 4 spaces (Python)
- Single quotes in TypeScript, double quotes in Python

**Linting:**
- ESLint with `js.configs.recommended` and `tseslint.configs.recommended`
- React hooks lint rules enforced (`eslint-plugin-react-hooks`)
- No backend linter detected (no ruff/flake8/pylint config)

## Component Patterns

**React Component Structure:**
1. Default export for route-level components (pages/screens)
2. Named export for reusable components (e.g., `export { TemplateSelector }` via barrel `index.ts`)
3. Function declarations preferred over arrow function components for top-level components:
   ```tsx
   export default function LandingScreen() { ... }
   ```
4. Class components used only for error boundaries (`FeatureErrorBoundary`)

**Component Anatomy (typical order):**
1. Imports (hooks, context, styles, types)
2. Function declaration with props destructuring
3. Hook calls (useNavigate, useAppContext, local state)
4. Event handler definitions
5. Return JSX

**Lazy Loading:**
- All route-level components are lazy-loaded in `frontend/src/App.tsx`:
  ```tsx
  const LandingScreen = lazy(() => import('./features/landing/LandingScreen'));
  ```
- Suspense fallback: `null` (no loading spinner for route transitions)

**Error Boundaries:**
- `FeatureErrorBoundary` wraps most routes in `App.tsx`
- Located at `frontend/src/components/FeatureErrorBoundary.tsx`
- Shows retry button + go home button on error

## CSS/Styling Approach

**CSS Modules:**
- Every component has a co-located `.module.css` file
- Import pattern: `import styles from './ComponentName.module.css';`
- Class names in CSS: camelCase (e.g., `.cardPrimary`, `.cardBody`, `.savedLink`, `.cardArrow`)
- Composition via template literals: `` className={`${styles.card} ${styles.cardPrimary}`} ``

**Design Tokens:**
- Global CSS variables defined in `frontend/src/styles/variables.css`
- Color palette: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover`
- Accent: `--accent` (#3B82F6 blue), `--accent-hover`, `--accent-light`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Borders: `--border-color`, `--border-strong`
- Status: `--success`, `--warning`, `--error` (with `-light` variants)
- Spacing: `--radius` (8px), `--radius-sm` (6px), `--radius-lg` (12px)
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Font: IBM Plex Sans (body), IBM Plex Mono (code)

**Animation Patterns:**
- CSS transitions for hover states: `transition: all 0.18s ease;`
- Keyframe animations for page enters: `fadeInUp` (opacity + translateY)
- `@keyframes spin` for loading spinners
- Smooth transitions for collapsible panels via CSS

**Responsive Design:**
- Mobile breakpoint: `@media (max-width: 680px)` for landing screen
- Flex layout: switches from row to column on mobile
- `min-width: 0` on flex children to prevent overflow

## TypeScript Patterns

**Types vs Interfaces:**
- Use `interface` for data shapes with named properties (strongly preferred):
  ```typescript
  export interface WorkEntry {
    company: string;
    title: string;
    // ...
  }
  ```
- Use `type` for unions, computed types, and type aliases:
  ```typescript
  export type FormSection = 'personal' | 'work' | 'education' | 'skills' | string;
  export type CVVersionMeta = Omit<CVVersion, 'texContent' | 'formData'>;
  ```

**Generics:**
- Minimal use of custom generics
- Generic helper function for reordering arrays:
  ```typescript
  function reorder<T>(arr: T[], from: number, to: number): T[] { ... }
  ```
- Hook return types inferred via `ReturnType<typeof useHook>` pattern

**Null Handling:**
- Optional chaining used throughout: `result.current.formData.awards![0].title`
- Nullish coalescing for defaults: `formData.sectionOrder ?? DEFAULT_SECTION_ORDER`
- API methods return `null` on failure (not throw):
  ```typescript
  async getVersion(id: string): Promise<CVVersion | null> { ... }
  ```
- `|| []` guard for optional arrays: `prev.projects || []`

**Strict Mode:**
- `strict: true` in `tsconfig.app.json`
- `verbatimModuleSyntax: true` -- requires explicit `type` keyword for type-only imports:
  ```typescript
  import type { CVFormData, PersonalInfo } from '../types';
  ```

## Import Organization

**Order (TypeScript):**
1. React/library imports (`react`, `react-router-dom`)
2. Internal contexts/providers
3. Internal hooks
4. Internal services/utils
5. Type imports (separate `import type` lines)
6. CSS module imports (last)

**Example from `frontend/src/features/landing/LandingScreen.tsx`:**
```typescript
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import styles from './LandingScreen.module.css';
```

**Path Aliases:**
- No path aliases configured (all imports use relative paths `../`, `../../`)
- Barrel files: `frontend/src/hooks/index.ts`, `frontend/src/features/template-selection/index.ts`, `frontend/src/features/form-builder/sections/index.ts`

**Python Imports (backend):**
```python
# Standard library
import os, sys, json

# Third-party
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Local
from services.cv_extractor import extract_from_pdf
from routes.generate_latex import latex_escape
```
- `sys.path.insert(0, ...)` hack used in tests to add backend to path

## Error Handling

**Frontend API Errors:**
- API methods in `frontend/src/services/api.ts` catch all errors internally and return typed failure values:
  ```typescript
  async compileLatex(...): Promise<CompileResponse> {
    try { ... }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      return { success: false, error: message, page_count: 0 };
    }
  }
  ```
- Never throw from API methods; callers check `result.success` or `result !== null`
- `console.error` for unexpected failures in non-critical paths

**Backend Error Handling:**
- FastAPI `HTTPException` for validation errors (400 status code):
  ```python
  raise HTTPException(status_code=400, detail="File is empty.")
  ```
- Business logic errors return `success: False` in response body (not HTTP errors)
- `loguru` listed in requirements but `logging` stdlib used in route modules
- Service-level functions return typed result objects (e.g., `CVImportResult`) with `success`, `error`, `form_data` fields
- Broad `except Exception` catch in services to prevent unhandled crashes

**Frontend Error Boundaries:**
- `FeatureErrorBoundary` class component wraps route-level components
- Logs with `console.error` in `componentDidCatch`
- Provides "Try Again" (re-render) and "Go Home" (navigate to `/`) actions

## Logging

**Frontend:**
- `console.error` for API failures and error boundary catches
- `console.log` with `[ModuleName:action]` prefix for dev-only debugging:
  ```typescript
  if (import.meta.env.DEV) {
    console.log("[FormBuilder:sync] imported data changed...", { ... });
  }
  ```

**Backend:**
- `logging.getLogger(__name__)` used in route modules
- `logger.warning()` for failed operations, `logger.info()` for success
- `loguru` in requirements but not observed in route files

## Comments

**When to Comment (TypeScript):**
- JSDoc `/** ... */` on exported functions and complex parameters:
  ```typescript
  /** Parse a path like "workExperience[0].bullets[2]" into segments */
  /** Ordered list of header fields: 'phone' | 'email' | 'location' | 'links' */
  ```
- Inline comments for non-obvious behavior: `// filter(Boolean) removes empty strings`
- No comments for self-explanatory code

**When to Comment (Python):**
- Module-level docstrings at top of every file:
  ```python
  """
  CV import route -- accepts PDF, DOCX, or JSON uploads
  and returns structured CVFormData via AI extraction.
  """
  ```
- Function docstrings for public API functions
- Inline comments for constants: `MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB`

**Test File Headers:**
- Both frontend and backend test files have detailed block comments at the top:
  ```python
  """
  Test LaTeX template rendering across various data scenarios.

  Test Coverage:
  - All 3 templates (...)
  - Minimal data (...)
  ...
  Run with: python3 -m pytest tests/test_template_rendering.py -v
  """
  ```

## Function Design

**Hook Pattern (TypeScript):**
- Hooks return memoized objects via `useMemo` with all operations included
- All state updaters wrapped in `useCallback` for stable references
- Large hook return values are typed inline (not via separate interface)
- `useFormBuilder` is the canonical complex hook pattern (~700 lines)

**Backend Route Handlers:**
- Thin route handler with business logic delegated to services:
  ```python
  @router.post("/cv-import")
  async def import_cv(file: UploadFile = File(...)):
      ext = _detect_extension(...)
      result = await EXTRACTORS[ext](file_bytes)
      return { "success": True, "formData": result.form_data, ... }
  ```
- Helper functions prefixed with `_` for route-internal logic

## Module Design

**Exports (TypeScript):**
- Default exports for route-level screen components
- Named exports for reusable components and utilities
- Barrel files (`index.ts`) used in `hooks/`, `features/template-selection/`, `features/form-builder/sections/`
- Types co-exported from barrel files: `export type { Template } from './TemplateSelector';`

**Exports (Python):**
- FastAPI `router = APIRouter()` pattern in every route module
- Services are plain functions and classes (no dependency injection framework)
- `__init__.py` files exist but are empty

**Context Architecture (frontend):**
- Split into domain contexts: `JobContext`, `CVContext`, `ToolsContext`
- Composed in `AppProvider` (nested providers):
  ```tsx
  <JobProvider><CVProvider><ToolsProvider>{children}</ToolsProvider></CVProvider></JobProvider>
  ```
- Backward-compatible `useAppContext()` shim merges all three contexts
- New code should prefer domain-specific hooks: `useCVContext()`, `useJobContext()`, `useToolsContext()`

## Git Conventions

**Branch Naming:**
- Feature branches: `feature/interface-redesign`
- Main branch: `main`

**Commit Messages:**
- Short descriptive statements: "Support 'add' change type in path resolution"
- Date-based shorthand for multi-change commits: "21/03"
- Verb-leading: "Implement lazy loading, refactor contexts, and extract form sections"
- No conventional commits prefix (no `feat:`, `fix:`, `chore:`)

---

*Convention analysis: 2026-03-29*
