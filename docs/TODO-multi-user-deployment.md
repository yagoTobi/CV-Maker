# TODO: Multi-User & Cloud Deployment Preparation

Tracks the work needed to take CV-Maker from a single-user localhost app to a multi-user cloud deployment.

---

## Do Now (before building more features)

### 1. Add `user_id` dependency to all data routes
- [ ] Create `backend/dependencies.py` with a `get_current_user` FastAPI dependency
  - Placeholder implementation: reads `X-User-Id` header, defaults to `"local"`
  - Single place to swap in real auth later (JWT, OAuth, etc.)
- [ ] Thread `user_id` into every data-touching route:
  - `cv_versions.py` — all 5 endpoints (list, create, get, delete, patch)
  - `user_data.py` — all 4 endpoints (get, save, add experience, clear)
  - `cv_import.py` — upload endpoint
- [ ] Namespace storage paths by user: `user_data/{user_id}/versions/`, `user_data/{user_id}/profile.json`

### 2. Storage abstraction layer
- [ ] Create `backend/services/storage.py` with a `StorageBackend` Protocol:
  - `save_version(user_id, version) -> None`
  - `load_version(user_id, version_id) -> dict`
  - `list_versions(user_id) -> list[dict]`
  - `delete_version(user_id, version_id) -> None`
  - `save_profile(user_id, profile) -> None`
  - `load_profile(user_id) -> dict`
- [ ] Implement `FileStorage` class wrapping current `os.path` / `json.load` logic
- [ ] Refactor `cv_versions.py` to use `StorageBackend` instead of direct file I/O (6 call sites)
- [ ] Refactor `user_data.py` to use `StorageBackend` instead of direct file I/O

### 3. Async compilation (quick win)
- [ ] Wrap `compiler.compile()` calls in `run_in_executor` in `compile.py` to stop blocking the async event loop
  ```python
  result = await asyncio.get_event_loop().run_in_executor(
      None, compiler.compile, tex_content, cls_content, template_id
  )
  ```

---

## Do Before Deploy

### 4. Real authentication
- [ ] Choose auth provider (Cognito, Clerk, Auth0, or self-hosted)
- [ ] Replace placeholder `get_current_user` with real JWT/token validation
- [ ] Add signup/login flow to frontend
- [ ] HTTPS everywhere (required for auth tokens)

### 5. PostgreSQL storage backend
- [ ] Implement `PostgresStorage` class conforming to `StorageBackend` Protocol
- [ ] Schema: `users`, `cv_versions` (with indexes on `user_id`, `parent_version_id`, `created_at`), `user_profiles`
- [ ] Migration tooling (Alembic or similar)
- [ ] Connection pooling (asyncpg or SQLAlchemy async)

### 6. Rate limiting
- [ ] Add rate limiting middleware (e.g., `slowapi`)
- [ ] Per-user limits on expensive endpoints:
  - `/api/chat` — AI inference
  - `/api/chat/match-analysis` — AI inference
  - `/api/compile` — CPU-bound subprocess
  - `/api/cv-import` — AI extraction (8192 tokens per call)
- [ ] Global request size limits beyond the existing 10MB import cap

### 7. Docker containerization
- [ ] Dockerfile for backend (Python + TeX Live + fonts)
- [ ] Docker Compose for local dev (backend + future Postgres)
- [ ] LaTeX compilation runs in sandboxed environment with resource limits
- [ ] Consider separate container/service for LaTeX compilation workers

### 8. Bedrock / AI cost controls
- [ ] Per-user usage tracking (token counts per request)
- [ ] Usage quotas or billing tiers
- [ ] Queue for burst traffic on AI endpoints (SQS or similar)

---

## Defer (only if needed at scale)

### 9. S3 for file storage
- [ ] Store compiled PDFs in S3 instead of returning base64 inline
- [ ] Store uploaded CV files (import) in S3 with pre-signed URLs
- [ ] Only needed if storage volume becomes a concern

### 10. LaTeX compilation workers
- [ ] Move compilation to Celery workers or AWS Lambda
- [ ] Job queue with status polling or WebSocket updates
- [ ] Only needed if concurrent compilation becomes a bottleneck

### 11. Frontend optimization
- [ ] Code splitting / lazy loading per screen
- [ ] CDN for static assets
- [ ] Service worker for offline form editing

---

## Reference: Current File I/O Hotspots

Files that directly touch the filesystem for user data (all need the abstraction):

| File | What it does | Call sites |
|------|-------------|------------|
| `backend/routes/cv_versions.py` | Read/write/list/delete `user_data/versions/*.json` | 6 |
| `backend/routes/user_data.py` | Read/write/delete `user_data/profile.json` | 4 |
| `backend/services/latex_compiler.py` | `tempfile.TemporaryDirectory` + `subprocess.run` | 1 (already isolated) |
| `backend/routes/cv_import.py` | Temp file for upload processing | 1 (already ephemeral) |
