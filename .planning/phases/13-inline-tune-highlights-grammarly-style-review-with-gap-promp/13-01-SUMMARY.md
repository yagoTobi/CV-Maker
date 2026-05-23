---
phase: 13
plan: 01
subsystem: tailor-pipeline-and-test-scaffolds
tags:
  - backend
  - tailor
  - prompt
  - llm-cache
  - frontend
  - vitest
  - wave-0
  - tdd
requirements:
  - D-07
  - D-12
  - D-04
  - D-05
  - D-06
  - D-17
  - D-18
  - D-19
  - D-25
dependency_graph:
  requires:
    - backend/services/llm_cache.py (cache_key contract)
    - backend/services/bedrock.py (BedrockClient.chat signature)
    - frontend/src/types/index.ts (TailorChange, MatchAnalysis, CVVersionMeta)
    - frontend/src/hooks/useTailor.ts (UseTailorReturn shape used in TuneRail mock)
  provides:
    - "POST /api/tailor/suggest-changes accepts optional user_clarifications: List[str]"
    - TAILOR_SUGGEST_PROMPT clarifications instruction block
    - clarifications-aware llm_cache.cache_key (T-13-01-01 mitigation)
    - 6 failing Vitest scaffolds defining the contract for plans 02/03/04
  affects:
    - downstream Plans 02 (api.ts + useTailor signature extension)
    - downstream Plan 04 (TuneRail clarifications wiring)
    - downstream Plan 03 (ChangePopover, severity) via Wave 0 scaffolds
tech_stack:
  added: []
  patterns:
    - Optional list field with whitespace-stripped server-side filtering
    - cache-key fingerprint folding for multi-tenant LLM cache safety
    - Wave 0 module-not-found scaffolds — tests exist before production code, planners commit to the contract upfront
key_files:
  created:
    - backend/tests/test_tailor.py
    - frontend/src/__tests__/severity.test.ts
    - frontend/src/__tests__/useChangeHighlights.test.ts
    - frontend/src/__tests__/ChangePopover.test.tsx
    - frontend/src/__tests__/GapPromptChips.test.tsx
    - frontend/src/__tests__/TuneRail.test.tsx
    - frontend/src/__tests__/PostSavePrompt.test.tsx
    - .planning/phases/13-inline-tune-highlights-grammarly-style-review-with-gap-promp/deferred-items.md
  modified:
    - backend/routes/tailor.py
    - backend/prompts/cv_agent.py
decisions:
  - "Filter empty/whitespace clarifications server-side rather than client-side: keeps the API resilient if other consumers POST raw arrays."
  - "cache-key takes a single 'clarifications fingerprint' positional arg (joined with '|') instead of one arg per clarification — keeps the cache_key signature compositional and stable across an unbounded list."
  - "Wave 0 scaffolds live in frontend/src/__tests__/ flat (not feature/__tests__/) — VALIDATION.md hinted at feature subdirs but the real codebase convention is flat. Plans 02-04 will use the same flat path."
  - "ChangePopover keyboard handlers attached to the popover root rather than window — keeps the test deterministic and avoids global key-listener leaks across renders."
metrics:
  duration_minutes: 9
  completed_date: "2026-05-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 2
  commits: 3
---

# Phase 13 Plan 01: Tailor Backend Wiring + Wave 0 Scaffolds Summary

**One-liner:** Added optional `user_clarifications: List[str]` to `POST /api/tailor/suggest-changes`, folded it into the LLM cache key (T-13-01-01 mitigation), augmented `TAILOR_SUGGEST_PROMPT` with a "User-Confirmed Clarifications" instruction block, and seeded six failing Vitest scaffolds that lock the contract for downstream Plans 02/03/04.

## What Was Built

### Backend (Task 1)

**`backend/routes/tailor.py`**
- `TailorRequest` gained `user_clarifications: Optional[List[str]] = None`. Backwards-compatible — existing clients omit the field.
- `suggest_changes` strips empty/whitespace entries (`c.strip()`), then renders surviving entries under a `## User-Confirmed Clarifications` markdown section appended to the user_message before the trailing analysis instruction.
- `llm_cache.cache_key(...)` now takes a fifth positional arg: `"|".join(cleaned_clarifications)`. Two distinct clarification sets generate distinct cache keys — closes T-13-01-01 (cache-collision information disclosure across users).

**`backend/prompts/cv_agent.py`**
- `TAILOR_SUGGEST_PROMPT` gained a `## User-Confirmed Clarifications` block placed between the Output Format JSON example and `## Prioritization`. The block instructs the model to:
  - Treat clarifications as user-confirmed truth.
  - PREFER `add` change_type when surfacing a clarification as new CV content.
  - Not fabricate beyond what the user volunteered.
  - Not pollute JD analysis with clarification text.
  - Override conservative "modify only" guidance when the user explicitly clarifies a JD requirement.

**`backend/tests/test_tailor.py` (new, 6 tests, all passing)**
- `test_user_clarifications_omitted_works` — back-compat: no field → no clarifications block in user_message.
- `test_user_clarifications_present_renders_in_user_message` — block appears with each entry.
- `test_user_clarifications_empty_strings_are_filtered` — whitespace entries stripped; no blank bullet rows.
- `test_user_clarifications_separate_cache_keys` — spies on `llm_cache.cache_key` and asserts distinct args for distinct clarification sets (the T-13-01-01 mitigation invariant).
- `test_user_clarifications_invalid_type_returns_422` — Pydantic rejects non-string list elements.
- `test_tailor_prompt_contains_clarifications_instruction` — pure string-content assertion on the prompt module.

Result: `cd backend && pytest tests/test_tailor.py -x -q` → `6 passed in 8.24s`.

### Frontend (Task 2 — Wave 0 scaffolds)

Six files under `frontend/src/__tests__/` that import still-missing production modules. Each fails with `Failed to resolve import "..."` — the intentional Wave 0 baseline. Plans 02/03/04 turn them green by creating the production modules to match these assertions, without modifying the tests.

| Scaffold | Target module (created later) | Rules under test |
|----------|-------------------------------|-------------------|
| `severity.test.ts` | `features/direct-edit/utils/severity` | D-12 word-overlap algorithm: `add`, `delete`, `minor` (high overlap), `strong` (low overlap) |
| `useChangeHighlights.test.ts` | `features/direct-edit/hooks/useChangeHighlights` | D-04, D-12, D-25: pendingChanges filter, documentOrderIds, advanceTo, getRangeForChange, severityMap |
| `ChangePopover.test.tsx` | `features/direct-edit/components/ChangePopover` | D-12, D-17, D-19: null-render, compact vs expanded body, ArrowLeft/Right + Escape + Enter, Skip/Accept buttons |
| `GapPromptChips.test.tsx` | `features/direct-edit/components/GapPromptChips` | D-04: chip per missing entry, empty-state heading, click-reveals-input, blur-emits-array, untouched chips not in array |
| `TuneRail.test.tsx` | `features/direct-edit/components/TuneRail` | D-04, D-06, D-17, D-18, D-25: save-as-base step, JD inputs, GapPromptChips integration, Run-CV-tune wiring (5-arg signature including `userClarifications`), shrunk/expanded states, section list, Skip section |
| `PostSavePrompt.test.tsx` | `features/direct-edit/components/PostSavePrompt` | D-18: isOpen false-render, three buttons (`Tune for another job`, `Back to original CV`, `View in Dashboard`), default focus, Escape and backdrop dismiss |

Result: `./node_modules/.bin/vitest run <six files>` → `Test Files: 6 failed (6)`. Each failure is `Failed to resolve import "..."` — the contract for Plans 02-04 to satisfy.

## Commits

| Hash | Type | Title |
|------|------|-------|
| `1d0e3f8` | test | RED — failing tests for user_clarifications wiring |
| `d9bce02` | feat | GREEN — wire user_clarifications into TailorRequest, prompt, and cache key |
| `e443ea4` | test | Wave 0 frontend scaffolds for plans 02-04 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Frontend node_modules missing in worktree**

- **Found during:** Task 2 verify step (running vitest)
- **Issue:** `frontend/node_modules` does not exist in the worktree, so `npx vitest` and `./node_modules/.bin/vitest` both fail at config-load time with `Cannot find package 'vite'`.
- **Fix:** Symlinked `frontend/node_modules` from the main repo (`ln -s /<repo>/frontend/node_modules /<worktree>/frontend/node_modules`). The symlink is local-only — it's gitignored and is not part of the commit.
- **Files modified:** none (the symlink is outside git's tracked tree).
- **Logged for orchestrator:** see `.planning/phases/13-.../deferred-items.md`. Future parallel agents in this phase need either symlinks or `npm install` per worktree to run frontend tests.

### Plan-Action Discrepancies (intentional)

**1. [Plan vs Reality] Plan said "mock `bedrock_client.send_message`"; the actual method is `bedrock_client.chat`.**
The pytest fixture mocks `chat` on the imported singleton via `monkeypatch.setattr(bedrock_module.bedrock_client, "chat", fake_chat)`. The behavior matches what the plan asked for (capture rendered user_message); only the method name differs.

**2. [Plan vs Reality] Acceptance grep `grep -v '^#' backend/prompts/cv_agent.py | grep -c "User-Confirmed Clarifications"` returns 0 because the markdown header `## User-Confirmed Clarifications` itself starts with `#`, which the `grep -v '^#'` filter strips.**
The filter was meant to exclude Python comments (`#` start-of-line), not markdown headers inside docstrings. The substantive check (the prompt module contains the literal substring) is enforced programmatically by `test_tailor_prompt_contains_clarifications_instruction`, which passes. Plain `grep -c "User-Confirmed Clarifications" backend/prompts/cv_agent.py` returns `1`. No follow-up needed; the plan's grep snippet was overly aggressive but the behavior it was checking for is verified.

## Wave 0 Baseline

Module-not-found failures (expected, by design): **6 test files × 1 unresolved import each = 6 transform-time failures**. No tests in those files execute. Plans 02-04 will create the six production modules and turn this entire wave green without touching the test files.

## Threat Model — Mitigation Status

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-13-01-01 (cache-collision) | **Mitigated** | `cache_key` now folds in `"\|".join(cleaned_clarifications)`. `test_user_clarifications_separate_cache_keys` asserts distinct cache_key calls for distinct clarification sets. |
| T-13-01-02 (DoS payload size) | Accepted (per plan) | No additional cap added. |
| T-13-01-03 (prompt injection) | Mitigated (defense in depth) | Clarifications confined to a labeled section, prompt explicitly instructs the model to NOT fabricate. Output validation by `_resolve_path` and `_sanitize_content` unchanged. |
| T-13-01-04 (Pydantic validation) | **Mitigated** | `Optional[List[str]]` annotation enforces type. `test_user_clarifications_invalid_type_returns_422` asserts 422 on `[123]`. |
| T-13-01-05 (logged user_message) | Accepted (per plan) | No new exposure beyond JD logging. |

## Self-Check: PASSED

- All 8 created files exist (`backend/tests/test_tailor.py`, 6 frontend scaffolds, `deferred-items.md`).
- All 2 modified files exist (`backend/routes/tailor.py`, `backend/prompts/cv_agent.py`).
- All 3 commits exist on `worktree-agent-a1b563067a9d9410f`: `1d0e3f8`, `d9bce02`, `e443ea4`.
- `cd backend && pytest tests/test_tailor.py -x -q` → 6 passed.
- `vitest run <six scaffolds>` → 6 failed (intentional Wave 0 baseline).
- No CLAUDE.md violations: no `import type` mixed with value imports, relative paths only, hooks return memoized objects (route-level fix preserves existing memoization patterns), backend route uses generic 500 with `logger.exception()` already in place.
