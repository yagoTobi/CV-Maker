---
quick_id: 260524-ws1
slug: repo-hygiene-tranche-2-directory-consoli
status: complete
date: 2026-05-24
---

# Summary — Repo Hygiene Tranche 2

## Moves
- `user_data/versions/` → `backend/user_data/versions/` (9 CV JSONs; gitignored — moved via plain `mv`, not `git mv`, since contents were untracked).
- `cv-templates/` → `backend/latex_templates/_source/` (`git mv`, full history preserved on cls/sty/tex/font/png files).

## Refs updated
- `Dockerfile` — dropped redundant `COPY cv-templates/`; simplified mkdir/chown to single `/app/backend/user_data/versions`.
- `docker-compose.yml` — volume mount `/app/user_data` → `/app/backend/user_data`.
- `backend/services/storage_factory.py` — dropped one `..` (now sibling of `services/`).
- `backend/services/latex_compiler.py` — `cv-templates` → `latex_templates/_source`.
- `backend/routes/templates.py` — same.
- `backend/scripts/migrate_to_dynamodb.py` — single `..`; collapsed redundant voice_paths fallback loop.
- `.gitignore` — `user_data/` rule replaced with `backend/user_data/versions/` + `backend/user_data/voice_profile.json`.
- Docs: `README.md`, `docs/README.md`, `docs/DEPLOYMENT.md`, `docs/CONFIGURATION.md`, `docs/GETTING-STARTED.md`.

## ⚠ Docker Volume Migration Required
`cv-maker-data` volume target moved from `/app/user_data` to `/app/backend/user_data`. Existing deployments must migrate:

```bash
# Option A — preserve data
docker compose down
docker run --rm -v cv-maker-data:/data busybox sh -c 'mkdir -p /data/backend && mv /data/versions /data/backend/user_data/ 2>/dev/null'
docker compose up -d --build

# Option B — clean slate
docker compose down -v   # DESTROYS volume
docker compose up -d --build
```

Local dev (no Docker volume): nothing to do.

## Tests
349 backend tests pass. 16 template-rendering tests fail — pre-existing (missing `html_latex` Jinja filter, Phase 13 in-flight). Verified failing on stash baseline before tranche 2 work; not caused by this tranche.

## Commit
Single atomic commit covers Tasks 1+2+3.

## Next
Tranche 3: components/ subfolder regroup (frontend/src/features/direct-edit/components/ has 25+ flat files).
