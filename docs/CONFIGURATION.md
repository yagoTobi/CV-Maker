<!-- generated-by: gsd-doc-writer -->
# Configuration

CV-Maker uses environment variables for all runtime configuration. The backend loads variables
via `python-dotenv` from a `.env` file at startup (`backend/main.py`). The frontend uses Vite's
built-in `import.meta.env` mechanism for compile-time variable injection.

## Environment Variables

### Backend (`backend/.env`)

Copy the example file to get started:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `CORS_ORIGINS` | Optional | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed CORS origins. Add your frontend URL(s) here. |
| `AWS_DEFAULT_REGION` | Optional | `us-east-1` | AWS region for Bedrock AI and DynamoDB calls. |
| `AWS_PROFILE` | Optional | `default` | AWS CLI profile name. Used when `AWS_ACCESS_KEY_ID` is not set (falls back to the default credential chain). |
| `AWS_ACCESS_KEY_ID` | **Required** | *(none)* | AWS access key for Bedrock and DynamoDB. Required for any AI feature (import, tailor, match analysis). |
| `AWS_SECRET_ACCESS_KEY` | **Required** | *(none)* | AWS secret key, paired with `AWS_ACCESS_KEY_ID`. |
| `STORAGE_BACKEND` | Optional | `file` | Storage engine selection. Set to `"file"` for local JSON file storage or `"dynamodb"` for AWS DynamoDB. |
| `DYNAMODB_TABLE_NAME` | Optional | `cv-maker` | DynamoDB table name. Only used when `STORAGE_BACKEND=dynamodb`. |
| `DYNAMODB_ENDPOINT_URL` | Optional | *(none)* | DynamoDB endpoint URL. Set to `http://localhost:8100` for DynamoDB Local. Omit entirely to use real AWS DynamoDB. |
| `TAILOR_MODEL_ID` | Optional | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Override the AI model used for tailor suggestions. Defaults to Haiku for speed. Set to the Sonnet model ID for higher quality at the cost of latency. |

### Frontend (`frontend/.env`)

Copy the example file to get started:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Optional | `http://localhost:8000/api` | Backend API base URL. All HTTP requests from the frontend are sent to this URL. |

Vite injects these at build time. Variables must be prefixed with `VITE_` to be exposed to the frontend bundle.

## Config File Format

### Template Registry (`backend/config/templates.py`)

CV templates are registered as Python dataclasses in a dictionary, not via environment variables or external config files. Each entry maps a template ID to its metadata:

```python
TEMPLATES: dict[str, TemplateConfig] = {
    "med-length-proff-cv": TemplateConfig(
        id="med-length-proff-cv",
        name="Professional CV",
        engine="pdflatex",
        # ...
    ),
    "deedy-resume": TemplateConfig(
        id="deedy-resume",
        name="Deedy Resume",
        engine="xelatex",
        # ...
    ),
    "mcdowell-cv": TemplateConfig(
        id="mcdowell-cv",
        name="McDowell CV",
        engine="xelatex",
        # ...
    ),
}
```

To add a new template, add an entry to this dictionary with the template's folder name, LaTeX engine (`pdflatex` or `xelatex`), class file, and any extra support files or font directories.

### AI Model Selection (`backend/services/ai/bedrock.py`)

Model IDs are defined as module-level constants:

| Constant | Value | Used For |
|---|---|---|
| `MODEL_HAIKU` | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | CV import extraction, tailor suggestions (default) |
| `EXTRACTION_MODEL_ID` | Value of `CV_IMPORT_MODEL_ID`, `EXTRACTION_MODEL_ID`, or `MODEL_HAIKU` equivalent | CV import structuring for text-based PDF/DOCX |
| `MODEL_SONNET` | `us.anthropic.claude-sonnet-4-6` | Match analysis, tailor suggestions |
| `MODEL_TAILOR` | Value of `TAILOR_MODEL_ID` env var, or `MODEL_HAIKU` | Tailor suggestions (overridable) |

The default instance model (`BedrockClient.model_id`) is Haiku 3.5 (`us.anthropic.claude-3-5-haiku-20241022-v1:0`), used as a fallback when no `model_id` argument is passed to the `chat()` method.

### LLM Response Cache (`backend/services/ai/llm_cache.py`)

An in-memory TTL cache is used to avoid redundant AI calls for match analysis and tailor endpoints:

- **Max entries**: 256
- **TTL**: 3600 seconds (1 hour)
- **Cache key**: SHA-256 hash of concatenated inputs

These values are hardcoded constants in `llm_cache.py` and are not configurable via environment variables.

### Authentication (`backend/dependencies.py`)

User authentication uses **Cognito JWT verification** in production and a dev-mode header fallback for local development:

- **`AUTH_MODE=cognito`** (production): the `Authorization: Bearer <id-token>` header is verified against the configured Cognito User Pool JWKS. The `sub` claim becomes the user id. Returns 401 on missing/invalid/expired tokens.
- **`AUTH_MODE=dev`** (local development only): the `X-User-Id` header is trusted directly (defaults to `"local"`). This mode is **rejected at startup** when `ENV=production`.

Required settings for Cognito mode:

| Setting | Description |
|---|---|
| `AUTH_MODE` | `cognito` for production, `dev` for local development |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID (e.g. `us-east-1_XXXXXXXXX`) |
| `COGNITO_APP_CLIENT_ID` | Cognito App Client ID |

## Required vs Optional Settings

### Required for core functionality

The following settings must be present for the application to function beyond the most basic local-only usage:

| Setting | Failure Mode |
|---|---|
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | All AI features fail (import, tailor, match analysis). The backend starts but returns errors on AI-dependent endpoints. |

### Required for DynamoDB storage

When `STORAGE_BACKEND=dynamodb`:

| Setting | Failure Mode |
|---|---|
| `DYNAMODB_TABLE_NAME` | Falls back to `"cv-maker"` default. Only fails if the table does not exist under that name. |
| AWS credentials (above) | DynamoDB client cannot authenticate. All storage operations fail. |
| `DYNAMODB_ENDPOINT_URL` | If omitted, the boto3 client connects to the real AWS DynamoDB service. Set to `http://localhost:8100` for DynamoDB Local. |

The DynamoDB table must be created before first use. Run the setup script:

```bash
cd backend && python scripts/create_table.py
```

This creates a table with `PK` (partition key) and `SK` (sort key) using on-demand billing.

### Optional with defaults

All other settings have sensible defaults and the application runs without them:

| Setting | Default Behavior |
|---|---|
| `CORS_ORIGINS` | Allows `localhost:5173` and `127.0.0.1:5173` (Vite dev server). |
| `AWS_DEFAULT_REGION` | Defaults to `us-east-1`. |
| `STORAGE_BACKEND` | Defaults to `file` (JSON files in `backend/user_data/versions/`). |
| `VITE_API_URL` | Defaults to `http://localhost:8000/api`. |
| `TAILOR_MODEL_ID` | Defaults to Haiku for speed-optimized tailor suggestions. |

## Defaults

Defaults are defined inline in the source code using `os.getenv("VAR", "default")` or `os.environ.get("VAR", "default")` patterns:

| Variable | Default Value | Defined In |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | `backend/main.py:11` |
| `AWS_DEFAULT_REGION` | `us-east-1` | `backend/services/ai/bedrock.py:23`, `backend/services/storage/dynamo_storage.py:19` |
| `STORAGE_BACKEND` | `file` | `backend/services/storage/storage_factory.py:9` |
| `DYNAMODB_TABLE_NAME` | `cv-maker` | `backend/services/storage/dynamo_storage.py:14` |
| `CV_IMPORT_MODEL_ID` | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | `backend/services/cv_extractor/models.py:11` |
| `EXTRACTION_MODEL_ID` | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Legacy import-model override in `backend/services/cv_extractor/models.py:12` |
| `TAILOR_MODEL_ID` | `us.anthropic.claude-haiku-4-5-20251001-v1:0` (value of `MODEL_HAIKU`) | `backend/services/ai/bedrock.py:18` |
| `VITE_API_URL` | `http://localhost:8000/api` | `frontend/src/services/api.ts:5` |

## Per-Environment Overrides

CV-Maker does not use per-environment `.env` files (no `.env.development`, `.env.production`, or `.env.test`). All environment-specific configuration is handled through a single `.env` file or through the deployment platform's secret/environment management.

### Local Development

Use the `.env.example` files as a starting point:

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your AWS credentials

# Frontend
cp frontend/.env.example frontend/.env
# Defaults are usually fine for local dev
```

The default configuration connects the frontend to `localhost:8000` and uses file-based storage with no external dependencies beyond AWS Bedrock.

### Docker Compose

The `docker-compose.yml` file provides its own environment variable configuration:

```yaml
environment:
  - CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
  - AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - STORAGE_BACKEND=${STORAGE_BACKEND:-file}
  - DYNAMODB_TABLE_NAME=${DYNAMODB_TABLE_NAME:-cv-maker}
  - DYNAMODB_ENDPOINT_URL=${DYNAMODB_ENDPOINT_URL:-http://dynamodb-local:8000}
```

Variables with `${VAR:-default}` syntax are read from the host environment or a root `.env` file, with fallbacks. Inside Docker Compose, the DynamoDB endpoint URL defaults to `http://dynamodb-local:8000` (the container name used by the `dynamodb-local` service, mapped to host port 8100).

Docker Compose also provisions:

- **`cv-maker-data` volume**: Persistent storage for `backend/user_data/` (version JSON files, profiles).
- **`dynamodb-data` volume**: Persistent storage for DynamoDB Local data files.

### Production Deployment

<!-- VERIFY: Production deployment platform and secret management approach -->

For production, set environment variables through your hosting platform's secret manager (e.g., AWS ECS task definition, Railway variables, Fly.io secrets). Key changes from local development:

- Set `CORS_ORIGINS` to your production frontend URL(s).
- Set `STORAGE_BACKEND=dynamodb` and configure `DYNAMODB_TABLE_NAME` (omit `DYNAMODB_ENDPOINT_URL` to use real AWS DynamoDB).
- Provide `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` with appropriate IAM permissions for both Bedrock and DynamoDB, or use IAM roles attached to the compute instance.
- Build the frontend with the production `VITE_API_URL` pointing to the deployed backend.

### Docker Configuration

The `Dockerfile` defines the following non-configurable runtime properties:

| Property | Value |
|---|---|
| Base image | `python:3.12-slim` |
| TeX Live packages | base, latex-base, recommended, extra, xetex, fonts-recommended, fonts-extra, bibtex-extra, plain-generic |
| Microsoft fonts | `ttf-mscorefonts-installer` (EULA pre-accepted) |
| Non-root user | `appuser` (UID/GID 1000) |
| Exposed port | 8000 |
| Health check | HTTP GET to `http://localhost:8000/api/health` (every 30s, 10s timeout, 15s start period) |
| Entrypoint | `uvicorn main:app --host 0.0.0.0 --port 8000` |

### Hardcoded Application Constants

Several application-level settings are defined as constants in the source code and are not overridable via environment variables:

| Constant | Value | Location | Description |
|---|---|---|---|
| `MAX_FILE_SIZE` | 10 MB (10,485,760 bytes) | `backend/routes/cv_import.py:14` | Maximum upload size for CV import |
| `ALLOWED_EXTENSIONS` | `.pdf`, `.docx`, `.json` | `backend/routes/cv_import.py:15` | Accepted file types for CV import |
| Axios timeout | 30,000 ms (30 seconds) | `frontend/src/services/api.ts:9` | Default HTTP request timeout |
| LaTeX compilation timeout | 90 seconds | `backend/services/latex_compiler.py:113` | Maximum time for a single LaTeX compilation pass |
| LLM cache maxsize | 256 entries | `backend/services/ai/llm_cache.py:6` | Maximum cached AI responses |
| LLM cache TTL | 3,600 seconds (1 hour) | `backend/services/ai/llm_cache.py:6` | Time before cached AI responses expire |
