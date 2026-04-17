# External Integrations

**Analysis Date:** 2026-03-29

## APIs & External Services

**AI / LLM (AWS Bedrock):**
- Service: AWS Bedrock - Claude AI models for all AI-powered features
- SDK/Client: `boto3` via `backend/services/bedrock.py` (singleton `bedrock_client`)
- Auth: AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`)
- Models used:
  - `us.anthropic.claude-haiku-4-5-20251001-v1:0` - CV extraction from PDF/DOCX (fast, cheap). Referenced as `EXTRACTION_MODEL_ID` in `backend/services/cv_extractor.py`
  - `us.anthropic.claude-sonnet-4-6` - Quality tasks: chat, match analysis, tailor suggestions. Referenced as `MODEL_SONNET` in `backend/services/bedrock.py`
  - `us.anthropic.claude-3-5-haiku-20241022-v1:0` - Default model in `BedrockClient.__init__` (backward compatibility fallback)
- Capabilities:
  - Streaming responses via `invoke_model_with_response_stream` (SSE to frontend)
  - Non-streaming responses via `invoke_model`
  - Document attachment (multimodal) via `chat_with_document` for PDF extraction
- In-memory LLM response cache: `backend/services/llm_cache.py` (1-hour TTL, SHA-256 keyed)

**Voice Interview (AWS Nova Sonic) - Optional:**
- Service: AWS Nova Sonic via Pipecat framework
- SDK/Client: `pipecat-ai[aws]` (optional dependency, not in `requirements.txt`)
- Implementation: `backend/routes/voice_interview.py`
- Uses `AWSNovaSonicLLMService` from pipecat for speech-to-speech conversation
- WebSocket endpoint: `/ws/voice-interview`
- REST endpoint: `POST /api/voice/extract-cv` (extracts CV from transcript)
- Auth: Same AWS credentials as Bedrock
- Graceful degradation: `PIPECAT_AVAILABLE` flag; returns error message if not installed

## Data Storage

**Primary - File Storage (default):**
- Type: Local JSON files on filesystem
- Implementation: `backend/services/file_storage.py` (`FileStorage` class)
- Data location: `user_data/versions/*.json` (CV versions), `user_data/profile.json`, `user_data/voice_profile.json`
- Selected when: `STORAGE_BACKEND=file` (default)
- Single-user: "local" user maps to flat `user_data/` directory
- Multi-user: `user_data/{user_id}/` subdirectories

**Alternative - DynamoDB:**
- Type: AWS DynamoDB (single-table design)
- Implementation: `backend/services/dynamo_storage.py` (`DynamoStorage` class)
- Connection: `DYNAMODB_TABLE_NAME` (default: `cv-maker`), `DYNAMODB_ENDPOINT_URL` (optional, for local dev)
- Selected when: `STORAGE_BACKEND=dynamodb`
- Key schema: `PK=USER#{user_id}`, `SK=VERSION#{id}` | `PROFILE` | `VOICE_PROFILE`
- Billing: PAY_PER_REQUEST (on-demand)
- Table creation script: `backend/scripts/create_table.py`
- Migration script: `backend/scripts/migrate_to_dynamodb.py`
- Docker Compose includes `amazon/dynamodb-local` on port 8100

**Storage Abstraction:**
- Protocol: `backend/services/storage.py` (`StorageBackend` Protocol class)
- Factory: `backend/services/storage_factory.py` (`get_storage()` - cached singleton via `@lru_cache`)
- FastAPI dependency injection: routes use `Depends(get_storage)` for storage access
- Operations: CRUD for CV versions, user profiles, and voice profiles

**File Storage (Compiled PDFs):**
- Temporary only - LaTeX compilation uses `tempfile.TemporaryDirectory()` (`backend/services/latex_compiler.py`)
- PDFs returned as base64 in API responses, not persisted on disk

## Authentication & Identity

**Auth Provider:** Custom header-based (placeholder for future auth)
- Implementation: `backend/dependencies.py` (`get_current_user`)
- Mechanism: `X-User-Id` HTTP header, defaults to `"local"` for single-user mode
- FastAPI dependency: `user_id: str = Depends(get_current_user)`
- CORS allows `X-User-Id` in `allow_headers` (`backend/main.py`)
- Future plan: swap for JWT/Cognito validation (noted in code comment)
- No frontend auth implementation; all requests currently go as the default "local" user

## LaTeX Compilation

**TeX Live:**
- Engines: `pdflatex` (Professional CV template), `xelatex` (Deedy Resume, McDowell CV)
- Engine selection: based on template config in `backend/config/templates.py`
- Security: dangerous LaTeX commands sanitized before compilation (`backend/services/latex_compiler.py` - `DANGEROUS_PATTERNS` regex list)
- Compilation: runs engine twice for proper references, 90-second timeout
- Overflow detection: parses log for `Overfull \hbox` warnings

**Template System:**
- 3 templates configured in `backend/config/templates.py` (`TEMPLATES` dict)
- Template source files: `cv-templates/{folder}/` (cls files, fonts, bib files)
- Jinja2 templates: `backend/latex_templates/*.tex.j2` (3 files)
- Custom Jinja2 delimiters: `(( ))` for variables, `(% %)` for blocks, `(# #)` for comments

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Logging:**
- Backend: Python `logging` module (most routes) + `loguru` (voice interview route)
- Frontend: `console.error` / `console.log` (no structured logging)

**Health Check:**
- Endpoint: `GET /api/health` returns `{"status": "healthy"}` (`backend/main.py`)
- Docker healthcheck: polls `/api/health` every 30s (`Dockerfile`)

## CI/CD & Deployment

**Hosting:**
- Docker-based deployment (single backend container + optional DynamoDB Local)
- Frontend: static files (Vite build output `frontend/dist/`)
- No CI/CD pipeline configuration detected (no `.github/workflows/`, no `Makefile`)

**Container Orchestration:**
- `docker-compose.yml` at project root
- Services: `backend` (port 8000), `dynamodb-local` (port 8100)
- Named volumes: `cv-maker-data`, `dynamodb-data`
- Non-root container execution (appuser UID 1000)

## Security Headers

**Backend middleware (`backend/main.py`):**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- CORS: configurable origins via `CORS_ORIGINS` env var

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Frontend-Backend Communication

**REST API:**
- Base URL: `VITE_API_URL` env var or `http://localhost:8000/api` (default)
- HTTP client: axios with 30s default timeout (`frontend/src/services/api.ts`)
- Compile endpoint: 120s timeout
- Import/tailor endpoints: 60s timeout

**Streaming:**
- SSE (Server-Sent Events) for chat and job analysis (`text/event-stream`)
- Frontend uses native `fetch` + `ReadableStream` for SSE (not axios)
- Protocol: `data: {"text": "..."}\n\n` lines, terminated by `data: [DONE]\n\n`

**WebSocket:**
- Voice interview: `ws://host/api/ws/voice-interview` with Pipecat protobuf serialization

## Environment Configuration

**Required env vars (for full functionality):**
- `AWS_ACCESS_KEY_ID` - AWS IAM access key (Bedrock + optional DynamoDB)
- `AWS_SECRET_ACCESS_KEY` - AWS IAM secret key
- `AWS_DEFAULT_REGION` - AWS region (default: `us-east-1`)

**Optional env vars:**
- `CORS_ORIGINS` - Comma-separated allowed origins (default: `http://localhost:5173,http://127.0.0.1:5173`)
- `STORAGE_BACKEND` - `"file"` (default) or `"dynamodb"`
- `DYNAMODB_TABLE_NAME` - DynamoDB table name (default: `cv-maker`)
- `DYNAMODB_ENDPOINT_URL` - DynamoDB endpoint (set for local dev, omit for AWS)
- `VITE_API_URL` - Frontend API base URL (default: `http://localhost:8000/api`)

**Env file locations:**
- `backend/.env.example` - Template with all env vars documented
- `backend/.env` - Actual config (gitignored, loaded by `python-dotenv` in `backend/main.py`)
- `docker-compose.yml` - References `.env` at project root (optional, `required: false`)

**DynamoDB table setup:**
```bash
# Local (with DynamoDB Local running on port 8100)
DYNAMODB_ENDPOINT_URL=http://localhost:8100 python backend/scripts/create_table.py

# AWS (uses default credentials)
python backend/scripts/create_table.py
```

---

*Integration audit: 2026-03-29*
