# Phase 13 — Deferred Items

Out-of-scope discoveries surfaced during plan execution. Each item is unrelated
to the changes that surfaced it; they're logged here for follow-up.

## From 13-01 (Wave 0 backend + frontend scaffolds)

- **`backend/tests/test_template_rendering.py::test_minimal_render[med-length-proff-cv-...]` failing on main**.
  Discovered while running the full backend test suite as a regression check after
  modifying `backend/routes/tailor.py` and `backend/prompts/cv_agent.py`. The failure
  is in a template-rendering test for `med-length-proff-cv.tex.j2` and is unrelated
  to tailor.py / cv_agent.py changes — confirmed via `git diff` on the worktree base.
  Likely template/Jinja2 environment issue. Not in 13-01 scope; route to a quick
  task or an engineer working on the LaTeX template layer.

- **Worktree-isolation runtime gap: frontend `node_modules` is not provisioned in
  the worktree.** The worktree spawn currently has no `frontend/node_modules`, so
  `vitest` cannot run without a manual symlink to the repo root's `frontend/node_modules`.
  The 13-01 executor created the symlink locally to verify scaffold failure modes
  (Rule 3 auto-fix) but the symlink is gitignored and lost when the worktree is
  cleaned. If parallel agents in this phase need to run vitest, the orchestrator's
  worktree provisioning needs to symlink or `npm install` per worktree. Backend
  tests (`pytest`) work fine because the worktree inherits the project's Python env.
