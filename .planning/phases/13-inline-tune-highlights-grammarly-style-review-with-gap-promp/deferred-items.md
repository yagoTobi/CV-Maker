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

## From 13-02 (highlight foundation)

- **Pre-existing unrelated frontend test failures observed under
  `cd frontend && vitest run src/__tests__/`:**
  - `useImport.test.ts` — 3 failures in "Test 4: JSON Import Link Label Derivation"
    (asserts that labels NOT starting with `http(s)://` are preserved verbatim, but
    code currently mutates them).
  - `SectionWrapper.test.tsx` — 1 failure: "clicking remove button applies
    sectionConfirming class to wrapper".
  - `entryFactories.test.ts` — 1 failure: "emptyEducationEntry returns
    EducationEntry with empty strings and empty details array".

  The remaining failures reproduce on `main` without any of the 13-02 changes touching
  the offending modules. They are out of scope for 13-02 (SCOPE BOUNDARY: only
  auto-fix issues caused by current task changes). Route to a quick task or the
  feature owners.

  Note: the old `useDirectEditor.test.ts` failure for "removeBullet on last
  remaining bullet does nothing (minimum 1 bullet)" has since been cleared by the
  empty-bullet editing UX quick fix.

- **`vitest --reporter=basic` fails to load in this Vitest 4 toolchain.** The plan's
  acceptance command uses `--reporter=basic`; the executor dropped the flag and used
  the default reporter, which produces equivalent test summary output. No code
  impact, but plans that wave through Vitest commands should drop `--reporter=basic`
  going forward (the canonical reporter is fine).

- **ESLint react-hooks/refs rule trips on the established codebase pattern of
  reading `someRef.current` inside `useMemo`.** This rule is already failing across
  the existing codebase (e.g., `frontend/src/hooks/useTailor.ts` lines 70–76 access
  `baselineScoreRef.current` and mutate `selectedAltsRef.current` during render).
  The new `useChangeHighlights` hook follows the same pattern (live DOM read inside
  a memo). Future plans should either (a) configure ESLint to allow the codebase's
  established ref-read-during-render pattern, or (b) coordinate a sweep that
  refactors all such cases to `useLayoutEffect`-snapshot pattern.
