# Phase 1: Data Model Prep - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Add stable unique IDs to all CVFormData array entry types and update all consumers (frontend types, backend Pydantic models, AI prompts, storage, import). Every array entry — down to individual bullets, skills, and links — gets an ID. Existing saved versions auto-migrate on load.

</domain>

<decisions>
## Implementation Decisions

### ID Scope
- **D-01:** IDs go on EVERYTHING — not just top-level entries. WorkEntry, EducationEntry, SkillCategory, Project, Award, AdditionalEntry, AdditionalSection all get `id` fields.
- **D-02:** Individual bullets (currently `string[]`) become `{ id: string, text: string }[]`. Same for `SkillCategory.skills`.
- **D-03:** `PersonalInfo.links` (currently `{ label, url }[]`) gets an `id` field added.
- **D-04:** IDs are internal-only — users never see them. Short random strings via nanoid (e.g., `V1StGXR8_Z5jdHi6B-myT`). No hierarchical scheme needed.

### Saved CV Migration
- **D-05:** Auto-generate IDs on load for versions that don't have them. No migration script needed.
- **D-06:** After auto-generating IDs, persist the updated version back to storage immediately. This ensures IDs are stable across sessions (generated once, not on every load).

### AI Path Format
- **D-07:** Claude's Discretion — decide whether the AI output format changes to ID-based paths or stays index-based with runtime resolution. Choose whatever works best with the editing surface.

### Claude's Discretion
- AI path format approach (D-07) — pick the approach that minimizes complexity while supporting the Phase 2 editing surface
- nanoid configuration (length, alphabet) — pick sensible defaults
- Backend migration approach — whether to add a dedicated migration endpoint or handle it transparently in the load path

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model (Frontend)
- `frontend/src/types/index.ts` — All CV type definitions (WorkEntry, EducationEntry, SkillCategory, Project, Award, AdditionalEntry, AdditionalSection, CVFormData, TailorChange). Lines 44-120 define the array entry types that need IDs.

### Data Model (Backend)
- `backend/routes/cv_versions.py` lines 30-98 — Pydantic mirrors of all CV types. Must stay in sync with frontend types.

### Path Resolution
- `frontend/src/utils/formDataPatch.ts` — parsePath() and setAtPath() use index-based addressing (`workExperience[0].bullets[2]`). May need updating depending on D-07.

### AI Prompts
- `backend/prompts/cv_agent.py` — TAILOR_SUGGEST_PROMPT instructs the AI to output index-based fieldPath values. May need updating depending on D-07.

### Storage
- `backend/services/file_storage.py` — FileStorage load/save paths where auto-migration (D-05, D-06) would trigger
- `backend/services/dynamo_storage.py` — DynamoStorage equivalent
- `backend/services/storage.py` — StorageBackend Protocol definition

### Import
- `backend/services/cv_extractor.py` — CV extraction creates CVFormData from imported documents. Must generate IDs for extracted entries.

### Tests
- `backend/tests/test_template_compilation.py` — Test fixtures include CVFormData without IDs; must be updated
- `frontend/src/__tests__/useFormBuilder.test.ts` — Frontend test fixtures also need ID fields

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/utils/formDataPatch.ts`: parsePath() and setAtPath() — well-tested path resolution. Candidate for ID-aware extension.
- `backend/services/storage.py`: StorageBackend Protocol — clean abstraction for adding migration logic to both FileStorage and DynamoStorage.

### Established Patterns
- Frontend types in `types/index.ts` mirror backend Pydantic models in `cv_versions.py`. Changes must be synchronized.
- `TailorChange.fieldPath` is the contract between AI output and frontend path resolution. Any format change must update both the AI prompt and the resolution code.
- Test fixtures in both frontend and backend contain inline CVFormData objects — all need updating.

### Integration Points
- `useFormBuilder` hook creates new entries (add work entry, add education, etc.) — must generate IDs on creation.
- `cv_extractor.py` creates CVFormData from imported documents — must generate IDs for all extracted entries.
- `applyTailorChanges()` in formDataPatch.ts resolves AI suggestions — must work with ID-bearing data.

</code_context>

<specifics>
## Specific Ideas

- IDs are purely internal plumbing — the user emphasized this is for the system's benefit, not user-facing.
- nanoid was specifically discussed and agreed on (compact random strings).
- Auto-migration + persist-on-load was chosen for zero-friction backward compatibility.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-data-model-prep*
*Context gathered: 2026-03-29*
