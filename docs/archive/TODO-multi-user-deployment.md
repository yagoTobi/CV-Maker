<!-- TL;DR: Cloud-refactor checklist. See `.planning/tmp/cloud-audit/PUNCH-LIST.md` for full audit context. This file tracks the actionable backlog. -->

# Cloud-Refactor Checklist

Last updated: 2026-05-23

---

## Already Done

~~**`get_current_user` dependency**~~ (done — `backend/dependencies.py`, shim reads `X-User-Id` header; real Cognito JWT integration is Phase C2 below)

~~**`StorageBackend` Protocol + `FileStorage`**~~ (done — ADR-019, `backend/services/storage/storage.py` + `file_storage.py` + `dynamo_storage.py`)

~~**Dockerfile + docker-compose**~~ (done — non-root user, TeX Live, DynamoDB Local, `cv-maker-data` volume)

---

## Phase C — Cloud-native correctness

### C1 — Non-blocking compilation
- [ ] Wrap `compiler.compile()` in `await asyncio.to_thread(...)` in `routes/compile.py`
- [ ] (Later) SQS + Fargate worker fleet + S3 presigned URL for compiled PDF

### C2 — Real auth: Cognito JWT
- [ ] Replace `get_current_user` shim with JWT signature verification against Cognito JWK set
- [ ] Return 401 for unverified requests
- [ ] Frontend: send `Authorization: Bearer <token>` header
- [ ] Gate old `X-User-Id` path behind `AUTH_MODE=dev` only
- [ ] Drop `allow_credentials=True` from CORS once Bearer tokens are in place

### C3 — Force DynamoDB in production
- [ ] Add startup assertion: if `ENV=production` and `STORAGE_BACKEND != dynamodb`, fail closed
- [ ] Document `FileStorage` as dev-only in `docs/CONFIGURATION.md`

### C4 — Atomic DDB updates
- [ ] Add `version` attribute to DDB items
- [ ] Switch `update_version` to `update_item` + `UpdateExpression` + `ConditionExpression`
- [ ] Return HTTP 409 Conflict on race condition

### C5 — DDB pagination
- [ ] Loop on `LastEvaluatedKey` in `list_versions` and `update_children_of_deleted_parent`
- [ ] Add GSI on `parentVersionId` for independent base-CV and job-application queries

### C6 — Distributed LLM cache
- [ ] Move `llm_cache` from in-memory to ElastiCache (Redis) or DDB-with-TTL
- [ ] Include `user_id` in cache key

### C7 — Voice session persistence
- [ ] Move in-memory voice session dict to DDB-with-TTL
- [ ] Remove app-level cleanup timer

### C8 — Drop static AWS creds in Pipecat
- [ ] Use ECS task role; verify `AWSNovaSonicLLMService` accepts a `boto3.Session`

### C9 — Pydantic `BaseSettings`
- [ ] Replace bare `os.getenv` calls with a `Settings` class from `pydantic-settings`
- [ ] Validate at startup — `STORAGE_BACKEND` typo no longer silently falls back to file storage

### C10 — Large blobs out of DDB
- [ ] Move `texContent` and full `formData` to S3; store S3 key in DDB row
- [ ] `list_versions` returns lightweight metadata only (stays under 400KB item limit)

---

## Phase D — Operational polish

### D1 — Structured logging + correlation IDs
- [ ] Configure stdlib `logging` for JSON output
- [ ] Add `X-Request-Id` middleware bound to a `contextvars.ContextVar`
- [ ] Include request ID in 500 responses

### D2 — boto3 timeouts + retries
- [ ] Apply `Config(connect_timeout=5, read_timeout=30, retries={"mode": "adaptive", "max_attempts": 3})` to Bedrock client and DDB resource

### D3 — Specific exception handling
- [ ] Replace bare `except Exception` with `botocore.exceptions.ClientError`, `json.JSONDecodeError`, `pydantic.ValidationError`
- [ ] Always `logger.exception()` before returning user-facing message

### D4 — LaTeX safety
- [ ] Add `-no-shell-escape` flag to `subprocess.run` in `latex_compiler.py`
- [ ] Compile in a locked-down container with read-only root FS and no IAM permissions

### D5 — Atomic file writes in `FileStorage`
- [ ] Write to `path.tmp` then `os.replace` (atomic on POSIX)
- [ ] Catch `json.JSONDecodeError` specifically

### D6 — Retry Bedrock throttles
- [ ] `parse_json_with_retry` currently retries `JSONDecodeError` only
- [ ] Also retry `ClientError` with `ThrottlingException` / `ServiceUnavailableException`

### D7 — Iterative cycle detection
- [ ] Replace recursion in `_validate_no_circular_reference` with explicit max-depth loop (e.g., depth ≤ 10)

### D8 — CORS whitespace bug
- [ ] Strip whitespace in `CORS_ORIGINS.split(",")` — one-line fix

### D9 — DDB empty-string filter
- [ ] Remove `_sanitize_for_dynamo` empty-string filter; DDB has accepted empty strings since 2020

### D10 — Production console-log gating
- [ ] Gate `VoiceWidget.tsx` lines 31–33, 41 with `import.meta.env.DEV` or remove
