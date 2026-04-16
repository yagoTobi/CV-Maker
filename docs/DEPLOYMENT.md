<!-- generated-by: gsd-doc-writer -->
# Deployment

How to build, configure, and deploy the CV-Maker application for local development and production environments.

## Deployment Targets

CV-Maker consists of two independently deployable components:

| Component | Artifact | Config File |
|-----------|----------|-------------|
| **Backend** (FastAPI + TeX Live) | Docker container | `Dockerfile`, `docker-compose.yml` |
| **Frontend** (React SPA) | Static files (`frontend/dist/`) | `frontend/vite.config.ts` |

The backend runs as a Docker container that bundles Python 3.12, TeX Live (pdflatex + xelatex), and Microsoft fonts. The frontend produces a static build that can be served by any web server or CDN.

No platform-specific deployment config (Vercel, Fly.io, etc.) is present in the repository. Deployment target is determined by the operator.

## Backend: Docker Deployment

### Building the Image

```bash
docker build -t cv-maker-backend .
```

The Dockerfile uses a multi-layer build strategy for cache efficiency:

1. **Layer 1** -- TeX Live + system fonts (~2-3 GB, cached unless base image changes). Installs `texlive-base`, `texlive-latex-base`, `texlive-latex-recommended`, `texlive-latex-extra`, `texlive-xetex`, `texlive-fonts-recommended`, `texlive-fonts-extra`, `texlive-bibtex-extra`, `texlive-plain-generic`, `ttf-mscorefonts-installer`, and `fontconfig`.
2. **Layer 2** -- Python dependencies (cached unless `backend/requirements.txt` changes).
3. **Layer 3** -- Application code (`backend/` and `cv-templates/`).

The container runs as a non-root user `appuser` (UID/GID 1000) and exposes port 8000.

### Running with Docker Compose (Development)

Docker Compose starts the backend alongside a local DynamoDB instance:

```bash
docker compose up --build
```

This starts two services:

- **`backend`** on port `8000` -- the FastAPI application.
- **`dynamodb-local`** on port `8100` -- Amazon DynamoDB Local for persistence without an AWS account.

The backend depends on `dynamodb-local` with a health check, so it waits until DynamoDB is ready before starting.

Persistent volumes:

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `cv-maker-data` | `/app/user_data` | CV versions, user profiles (FileStorage mode) |
| `dynamodb-data` | `/data` (DynamoDB container) | DynamoDB Local database files |

### Running Standalone (Without Docker Compose)

To run only the backend container with file-based storage:

```bash
docker run -d \
  --name cv-maker-backend \
  -p 8000:8000 \
  -v cv-maker-data:/app/user_data \
  -e CORS_ORIGINS=http://localhost:5173 \
  -e AWS_DEFAULT_REGION=us-east-1 \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e STORAGE_BACKEND=file \
  cv-maker-backend
```

### Health Check

The container includes a built-in health check that polls `GET /api/health` every 30 seconds:

```
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3
```

The endpoint returns:

```json
{"status": "healthy"}
```

You can verify the backend is running with:

```bash
curl http://localhost:8000/api/health
```

## Frontend: Static Build

The frontend is a Vite-powered React SPA. Build it with:

```bash
cd frontend
npm install
npm run build
```

This runs `tsc -b && vite build` and outputs static files to `frontend/dist/`. Source maps are disabled in production (`sourcemap: false` in `vite.config.ts`).

### Serving the Frontend

The built files in `frontend/dist/` are plain HTML, CSS, and JavaScript. Serve them with any static file server:

```bash
# Using Vite's preview server (for testing the production build)
cd frontend
npm run preview
```

<!-- VERIFY: Production frontend hosting platform and URL -->

For production, serve `frontend/dist/` behind a web server (Nginx, Caddy, etc.) or a CDN. Configure the server to return `index.html` for all routes (SPA fallback) since the app uses client-side routing via React Router.

### API URL Configuration

The frontend reads its API base URL from the `VITE_API_URL` environment variable at **build time** (Vite inlines environment variables during the build). Set it before running `npm run build`:

```bash
VITE_API_URL=https://api.your-domain.com/api npm run build
```

Default value (from `frontend/.env.example`): `http://localhost:8000/api`

## Environment Variables

### Backend

These are set via `.env` file, Docker Compose `environment` block, or your deployment platform's secret manager.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGINS` | No | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed frontend origins |
| `AWS_DEFAULT_REGION` | No | `us-east-1` | AWS region for Bedrock AI and DynamoDB |
| `AWS_ACCESS_KEY_ID` | Yes (for AI features) | *(none)* | AWS access key for Bedrock API calls |
| `AWS_SECRET_ACCESS_KEY` | Yes (for AI features) | *(none)* | AWS secret key for Bedrock API calls |
| `AWS_PROFILE` | No | `default` | AWS CLI profile name (alternative to explicit keys) |
| `STORAGE_BACKEND` | No | `file` | `"file"` for JSON file storage, `"dynamodb"` for DynamoDB |
| `DYNAMODB_TABLE_NAME` | No | `cv-maker` | DynamoDB table name (only when `STORAGE_BACKEND=dynamodb`) |
| `DYNAMODB_ENDPOINT_URL` | No | *(none)* | DynamoDB endpoint URL; set for DynamoDB Local, omit for real AWS |
| `TAILOR_MODEL_ID` | No | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Bedrock model ID for tailor suggestions; override for quality vs speed tradeoff |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000/api` | Backend API base URL (set at build time) |

See [CONFIGURATION.md](./CONFIGURATION.md) for the full configuration reference.

## Storage Backend Setup

CV-Maker supports two storage backends, selected via the `STORAGE_BACKEND` environment variable.

### File Storage (Default)

When `STORAGE_BACKEND=file` (or unset), data is stored as JSON files on disk:

- CV versions: `user_data/versions/{uuid}.json`
- User profile: `user_data/profile.json`
- Voice profile: `user_data/voice_profile.json`

In Docker, mount a persistent volume at `/app/user_data` to preserve data across container restarts. The Docker Compose config already defines a `cv-maker-data` volume for this.

### DynamoDB Setup

To use DynamoDB for multi-user persistence:

1. **Set the environment variable:**

   ```bash
   STORAGE_BACKEND=dynamodb
   ```

2. **Create the table** using the provided script:

   ```bash
   # For DynamoDB Local (started by docker compose):
   DYNAMODB_ENDPOINT_URL=http://localhost:8100 python backend/scripts/create_table.py

   # For real AWS DynamoDB:
   AWS_DEFAULT_REGION=us-east-1 python backend/scripts/create_table.py

   # From inside the Docker container:
   docker exec cv-maker-backend python scripts/create_table.py
   ```

   The script creates a table with the following schema:
   - **Table name:** value of `DYNAMODB_TABLE_NAME` (default: `cv-maker`)
   - **Partition key:** `PK` (String) -- e.g., `USER#local`
   - **Sort key:** `SK` (String) -- e.g., `VERSION#{uuid}`, `PROFILE`, `VOICE_PROFILE`
   - **Billing mode:** PAY_PER_REQUEST (on-demand)

3. **Migrate existing file data** (optional):

   ```bash
   # From host (DynamoDB Local):
   DYNAMODB_ENDPOINT_URL=http://localhost:8100 python backend/scripts/migrate_to_dynamodb.py

   # Specify a user ID (defaults to "local"):
   DYNAMODB_ENDPOINT_URL=http://localhost:8100 python backend/scripts/migrate_to_dynamodb.py myuser

   # From inside Docker:
   docker exec cv-maker-backend python scripts/migrate_to_dynamodb.py
   ```

   The migration script copies CV versions, user profile, and voice profile from `user_data/` into DynamoDB.

## AWS Bedrock Access

AI features (CV import, chat, match analysis, tailor suggestions) require AWS Bedrock access to Claude models. The backend uses two model tiers:

| Task | Model | Model ID |
|------|-------|----------|
| CV extraction (import) | Claude Haiku | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| Tailor suggestions | Claude Haiku (default) | Configurable via `TAILOR_MODEL_ID` |
| Match analysis, Chat | Claude Sonnet | `us.anthropic.claude-sonnet-4-6` |

<!-- VERIFY: AWS account must have Bedrock model access enabled for the specified Claude models in the configured region -->

Ensure your AWS credentials have `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` permissions for the cross-region inference profile IDs listed above.

## Production Considerations

### CORS

Set `CORS_ORIGINS` to match your production frontend URL(s). The backend allows the following HTTP methods: `GET`, `POST`, `DELETE`, `PATCH`, `OPTIONS`. The custom header `X-User-Id` is permitted through CORS.

### Security Headers

The backend automatically adds the following security headers to all responses:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Authentication

The current authentication mechanism reads an `X-User-Id` header and defaults to `"local"` for single-user mode (`backend/dependencies.py`). This is a placeholder -- the code includes a comment: *"Swap this for JWT/Cognito validation when adding auth."*

For production multi-user deployment, replace `get_current_user` with real JWT or OAuth token validation. See `docs/TODO-multi-user-deployment.md` for the full checklist.

### LaTeX Compilation Security

The `LaTeXCompiler` (`backend/services/latex_compiler.py`) sanitizes all LaTeX content before compilation, stripping dangerous commands that could execute shell commands or access files (e.g., `\write18`, `\immediate`, `\input|` pipe syntax, `\openin`, `\openout`). Compilation runs in a temporary directory and has a 90-second timeout per compilation pass.

### LLM Response Cache

An in-memory TTL cache (`backend/services/llm_cache.py`) caches AI responses for 1 hour (max 256 entries). Cache keys are SHA-256 hashes of concatenated inputs. This reduces redundant Bedrock API calls for match analysis and tailor endpoints. Note: the cache is in-memory and resets on container restart.

## Build Pipeline

No CI/CD pipeline is detected in the repository (no `.github/workflows/` directory). Deployments are currently manual.

A typical deployment sequence:

1. **Build the backend Docker image:**

   ```bash
   docker build -t cv-maker-backend .
   ```

2. **Build the frontend:**

   ```bash
   cd frontend
   VITE_API_URL=https://api.your-domain.com/api npm run build
   ```

3. **Push the Docker image to your container registry:**

   <!-- VERIFY: Container registry URL and push commands depend on your hosting provider -->

   ```bash
   docker tag cv-maker-backend your-registry/cv-maker-backend:latest
   docker push your-registry/cv-maker-backend:latest
   ```

4. **Deploy the frontend static files** to your web server or CDN.

5. **Set production environment variables** in your deployment platform's secret manager.

## Rollback Procedure

Since there is no CI/CD pipeline or platform-specific deployment config, rollback depends on your deployment method:

- **Docker:** Redeploy the previous Docker image tag. If using `latest`, rebuild from the previous git commit:

  ```bash
  git checkout <previous-commit>
  docker build -t cv-maker-backend .
  ```

- **Frontend:** Redeploy the previous `frontend/dist/` build, or rebuild from the previous commit.

- **DynamoDB data:** DynamoDB does not have built-in rollback. Consider enabling DynamoDB point-in-time recovery for production tables. <!-- VERIFY: DynamoDB point-in-time recovery must be enabled manually in the AWS console or via AWS CLI -->

## Monitoring

No monitoring integration is detected in the application dependencies (no Sentry, Datadog, New Relic, or OpenTelemetry packages).

The backend uses Python's `logging` module in route handlers and `loguru` in the voice interview module. Logs are written to stdout, which Docker captures automatically.

To monitor the application:

- **Health check:** Poll `GET /api/health` from your monitoring system.
- **Container logs:** `docker logs cv-maker-backend` or configure your container orchestrator's log aggregation.
- **LaTeX compilation failures:** Logged at `WARNING` level with error details.
- **AI API failures:** Logged at `ERROR` level in route handlers.

<!-- VERIFY: Production monitoring dashboard URL and alerting configuration -->
