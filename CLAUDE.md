## Project

**CV-Maker — Direct-Edit Web CV.** Users edit a web-rendered CV that looks identical to the final PDF, then download a LaTeX-compiled PDF. AI handles import, job tailoring, and match analysis.

**Core value:** the CV itself is the editor — no form/preview split, no mental mapping.

### Invariants

- `CVFormData` is the single source of truth. LaTeX is generated output. The shape (frontend `types/index.ts`, backend `cv_versions.py` Pydantic) must stay in sync.
- LaTeX generation/compilation pipeline is treated as stable. Avoid invasive backend changes unless the task is explicitly about that layer.
- Import / Tune / Apply-to-Job all operate on `CVFormData` — any new editor surface must read/write the same structure.
- AI latency budget: import, tailor suggestions, per-field assist target **sub-2s**. Match analysis can take longer.
- Modern browsers only (CSS grid, contenteditable, modern APIs are fair game).

## Stack

- **Frontend:** React 19 + TypeScript (strict, `verbatimModuleSyntax: true`) + Vite. CSS Modules. Vitest + Testing Library. React Router v6.
- **Backend:** FastAPI + Pydantic on Python 3.12. Uvicorn. pytest (slow tests gated by `@pytest.mark.slow`).
- **AI:** AWS Bedrock via `boto3` (`MODEL_HAIKU` for extraction, `MODEL_SONNET` for analysis/rewrite). Single `BedrockClient` singleton.
- **LaTeX:** Jinja2 with custom delimiters `(( ))` / `(% %)` to avoid brace conflicts. `pdflatex` and `xelatex` engines per template.
- **Storage:** `StorageBackend` Protocol with `FileStorage` (local JSON) and `DynamoStorage` (single-table). Selected via `STORAGE_BACKEND` env var.
- **Auth shim:** `X-User-Id` header → `get_current_user()` dep, defaults to `"local"`. **Not real auth** — slated for replacement.

## Conventions (the non-obvious bits)

Most rules are enforced by ESLint / TypeScript / Pydantic. The things you'd actually get wrong:

- **Imports:** `verbatimModuleSyntax` is on. Type-only imports must use `import type`. No path aliases — relative paths only.
- **API methods (`services/api.ts`) never throw** — they return `null` or `{ success: false, ... }`. Callers branch on the return value.
- **Hooks return memoized objects.** State updaters wrapped in `useCallback`. `useDirectEditor` (in `frontend/src/features/direct-edit/hooks/`) is the canonical (and admittedly large) example.
- **Contexts are split into `JobContext`, `CVContext`, `ToolsContext`.** New code uses the domain-specific hook. `useAppContext()` is a back-compat shim — don't add to it.
- **Drag-and-drop pattern (canonical):** no `draggable` in JSX. Add `data-drag-card` on the card. Grip `onMouseDown` flips `closest('[data-drag-card]').draggable = true`. `onDragEnd` flips it back. Anything else breaks text-cursor in child inputs.
- **LaTeX escape:** `latex_escape` is single-pass regex over all specials. `latex_url_escape` only handles `%` and `#` (for `\href{}`). Order of operations matters — escape *items* first, then `join` with raw LaTeX separators.
- **No `\begin{list}` without an `\item`** — empty lists are invalid LaTeX. Templates must guard.
- **Backend errors:** routes return generic 500s with `logger.exception()`. Don't leak internals.
- **Tests live in `frontend/src/__tests__/`** (camelCase `.test.tsx`) and `backend/tests/` (snake_case `test_*.py`). Wrap context-using components in `<MemoryRouter><AppProvider>...`.

## Architecture (orientation only - full map in `docs/ARCHITECTURE.md`, graph at `.planning/graphs/graph.html`)

**Layers:**
- `frontend/src/features/*` — feature folders: `landing` (build/tune entry panels), `template-selection` (template picker), `direct-edit` (inline CV editor — primary feature; also hosts the apply-to-job "tune" flow under `components/tune-tiers/`), `dashboard` (saved versions), `voice-widget` (gated, "coming soon"), `shared` (global ErrorBoundary).
- `frontend/src/contexts/` — three-context split + `AppProvider` composition.
- `frontend/src/hooks/` — shared hooks: `useCompiler`, `useChat`, `useImport`, `useTemplates`. (`useDirectEditor` + `useTailor` live in `features/direct-edit/hooks/`; `useVoiceInterview` in `features/voice-widget/hooks/`.)
- `frontend/src/services/api.ts` — sole HTTP boundary. Axios + native `fetch` for SSE.
- `backend/routes/` — thin FastAPI handlers. Validation via Pydantic.
- `backend/services/` — business logic. `bedrock.py`, `latex_compiler.py`, `cv_extractor.py`, `storage.py` (Protocol) + `file_storage.py` / `dynamo_storage.py`, `llm_cache.py` (in-memory, 1h TTL — **not horizontally scalable**).
- `backend/latex_templates/*.tex.j2` + `backend/routes/generate_latex.py` — LaTeX generation.
- `backend/prompts/` — pure-data system prompts.

**Key types:**
- `CVFormData` — canonical CV shape. Frontend `types/index.ts`, backend `cv_versions.py`.
- `CVVersion` — saved snapshot. `parentVersionId` links job applications to base CVs (job-centric versioning, ADR-016).

**Cloud-readiness gaps (known, intentional, on the work list):**
- `X-User-Id` shim is not auth.
- `llm_cache.py` is in-memory — won't survive multi-instance.
- `FileStorage` is local-disk — single-instance only.
- `latex_compiler.py` runs `subprocess` on the API thread — long compiles block the request.
- CORS allowlist comes from `CORS_ORIGINS` env var.
