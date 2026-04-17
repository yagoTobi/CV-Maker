# Phase 1: Data Model Prep - Research

**Researched:** 2026-03-29
**Domain:** TypeScript/Python data model evolution, ID generation, backward-compatible migration
**Confidence:** HIGH

## Summary

Phase 1 adds stable unique IDs to every array entry in the CVFormData model -- from top-level entries (WorkEntry, EducationEntry, etc.) down to individual bullets, skills, and links. The current model uses positional indices (array offsets) as implicit identifiers, which is fragile when entries are reordered, added, or removed. Stable IDs are a prerequisite for Phase 2's direct-edit surface where DOM elements must map to data model entries without positional ambiguity.

The scope is well-bounded: type definitions (frontend + backend), factory functions, AI prompt/response format, storage migration on load, CV import output, and test fixtures. The Jinja2 LaTeX templates do NOT need changes because the `generate_latex` route can flatten ID-bearing data before passing to templates. The key risk is ensuring all consumers of CVFormData -- especially the AI tailor pipeline -- continue to produce valid output after the type changes.

**Primary recommendation:** Use nanoid (frontend) and Python's `secrets.token_urlsafe` (backend) for compact random IDs. Transform bullets from `string[]` to `{id, text}[]` and skills from `string[]` to `{id, text}[]`. Keep AI prompts index-based and resolve IDs at the backend boundary.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** IDs go on EVERYTHING -- not just top-level entries. WorkEntry, EducationEntry, SkillCategory, Project, Award, AdditionalEntry, AdditionalSection all get `id` fields.
- **D-02:** Individual bullets (currently `string[]`) become `{ id: string, text: string }[]`. Same for `SkillCategory.skills`.
- **D-03:** `PersonalInfo.links` (currently `{ label, url }[]`) gets an `id` field added.
- **D-04:** IDs are internal-only -- users never see them. Short random strings via nanoid (e.g., `V1StGXR8_Z5jdHi6B-myT`). No hierarchical scheme needed.
- **D-05:** Auto-generate IDs on load for versions that don't have them. No migration script needed.
- **D-06:** After auto-generating IDs, persist the updated version back to storage immediately. This ensures IDs are stable across sessions (generated once, not on every load).

### Claude's Discretion
- **D-07:** AI path format approach -- pick the approach that minimizes complexity while supporting the Phase 2 editing surface
- nanoid configuration (length, alphabet) -- pick sensible defaults
- Backend migration approach -- whether to add a dedicated migration endpoint or handle it transparently in the load path

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | All CVFormData array entry types have stable unique IDs (not positional indices) | Type changes + nanoid generation in factory functions (see Architecture Patterns, Standard Stack) |
| DATA-02 | Existing features (AI tailor, import, version save/load) work correctly with ID-bearing entries | AI prompt stays index-based; backend strips IDs before AI call and re-attaches after; generate_latex flattens before template render (see Architecture Patterns D-07 Decision, Common Pitfalls) |
| DATA-03 | Backend endpoints accept and preserve stable IDs on array entries | Pydantic model updates + auto-migration in storage load path (see Architecture Patterns Migration, Code Examples) |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nanoid | 5.1.7 | Frontend ID generation | De facto standard for compact unique IDs in JS/TS. 21-char URL-safe by default. ~130 bytes. Tree-shakeable ESM. |
| secrets (stdlib) | Python 3.12 | Backend ID generation | `secrets.token_urlsafe(16)` produces 22-char URL-safe random strings. No pip dependency needed. Cryptographically secure. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nanoid | uuid v4 | UUIDs are 36 chars (wasteful for internal IDs), nanoid is 21 chars. Both equally unique for this use case. |
| nanoid | cuid2 | cuid2 is sortable/monotonic which is unnecessary here. nanoid is simpler and smaller. |
| secrets.token_urlsafe | python-nanoid | Extra pip dependency for identical behavior. stdlib `secrets` is preferred per CLAUDE.md minimal-dependency convention. |

**Frontend installation:**
```bash
cd frontend && npm install nanoid
```

**Backend:** No installation needed -- `secrets` is part of Python stdlib.

**Version verification:**
- nanoid: 5.1.7 (verified via `npm view nanoid version` on 2026-03-29)
- secrets: Python 3.12 stdlib (verified in project runtime)

### nanoid Configuration Recommendation (D-04, Claude's Discretion)

Use default nanoid settings:
- **Length:** 21 characters (default)
- **Alphabet:** URL-safe (A-Za-z0-9_-)
- **Collision probability:** At 1000 IDs/second, it would take ~149 billion years to have a 1% probability of at least one collision

For backend, `secrets.token_urlsafe(16)` produces 22-character strings with equivalent entropy (128 bits).

A shared `generateId()` helper function should wrap nanoid on the frontend and `secrets.token_urlsafe` on the backend so the generation strategy is centralized and can be changed later.

## Architecture Patterns

### Type Changes (Frontend)

The core change is adding `id` fields and converting bare string arrays to structured arrays:

```typescript
// NEW: Bullet and Skill item types
export interface BulletItem {
  id: string;
  text: string;
}

export interface SkillItem {
  id: string;
  text: string;
}

// CHANGED interfaces (id field added to each)
export interface WorkEntry {
  id: string;           // NEW
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  bullets: BulletItem[]; // CHANGED from string[]
}

export interface EducationEntry {
  id: string;           // NEW
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  location: string;
  gpa?: string;
  details: BulletItem[]; // CHANGED from string[]
}

export interface SkillCategory {
  id: string;           // NEW
  category: string;
  skills: SkillItem[];  // CHANGED from string[]
}

export interface Project {
  id: string;           // NEW
  name: string;
  year: string;
  description: string;
  technologies?: string;
  bullets?: BulletItem[]; // CHANGED from string[]
}

export interface Award {
  id: string;           // NEW
  year: string;
  title: string;
  description?: string;
}

export interface AdditionalEntry {
  id: string;           // NEW
  title: string;
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  bullets: BulletItem[]; // CHANGED from string[]
}

export interface AdditionalSection {
  id: string;           // NEW
  title: string;
  entries: AdditionalEntry[];
}

// PersonalInfo.links gets id added
export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: Array<{ id: string; label: string; url: string }>; // id ADDED
  summary?: string;
  personalOrder?: string[];
}
```

### Type Changes (Backend Pydantic)

Mirror the frontend changes. Key difference: Pydantic models use `Optional[str]` for `id` to allow legacy data without IDs to pass validation. The auto-migration layer fills in missing IDs.

```python
from pydantic import BaseModel
from typing import List, Optional

class BulletItem(BaseModel):
    id: Optional[str] = None
    text: str = ""

class SkillItem(BaseModel):
    id: Optional[str] = None
    text: str = ""

class WorkEntry(BaseModel):
    id: Optional[str] = None
    company: str = ""
    title: str = ""
    startDate: str = ""
    endDate: str = ""
    location: str = ""
    bullets: List[BulletItem] = []

# ... same pattern for all other entry types
```

Making `id` Optional in Pydantic is critical: it allows old saved versions (without IDs) to deserialize without error. The migration layer then fills in IDs before returning data.

### AI Path Format Decision (D-07, Claude's Discretion)

**Recommendation: Keep AI prompts index-based. Resolve to IDs at the backend boundary.**

Rationale:
1. **AI reliability:** Claude models are trained on index-based JSON paths. Asking the AI to output IDs it has never seen would be error-prone -- it would need to copy exact ID strings from the input, adding hallucination risk.
2. **Prompt stability:** The existing `TAILOR_SUGGEST_PROMPT` works well with index paths. Changing it introduces regression risk.
3. **Clean boundary:** The backend `tailor.py` route already post-processes AI output (validates paths, assigns UUIDs to change objects). Adding an ID-resolution step there is natural.

**Implementation approach:**
- When sending form data to AI: strip IDs and flatten `BulletItem[]` back to `string[]` so the AI sees the same schema it's trained on
- AI responds with index-based paths: `workExperience[0].bullets[2]`
- Backend resolves index paths to ID-aware paths before returning to frontend
- Frontend `formDataPatch.ts` gets a new `resolveByIdPath()` function alongside the existing `parsePath()` -- or alternatively, the path format itself can embed IDs

For Phase 1 specifically: keep the existing index-based path format entirely unchanged. The switch to ID-based resolution can happen in Phase 5 (AI Integration) when the editing surface needs it. Phase 1 only needs to ensure the tailor pipeline doesn't break when form data has IDs.

### Migration on Load (D-05, D-06)

**Recommendation: Handle transparently in the storage load path (not a dedicated endpoint).**

Both `FileStorage.get_version()` and `DynamoStorage.get_version()` should call a shared `ensure_ids(form_data_dict)` function that:

1. Walks the form data structure
2. For each entry/bullet/skill/link missing an `id` field, generates one
3. Returns a tuple `(migrated_data, was_modified)`
4. If `was_modified`, the caller persists the updated version back to storage

This happens transparently on every `get_version()` call. After the first load, IDs are persisted, so subsequent loads find IDs already present and `was_modified` is False.

### generate_latex Compatibility

The Jinja2 LaTeX templates iterate over bullets as strings: `(( bullet | latex_escape ))`. When bullets become `BulletItem` objects, the templates would break.

**Solution:** In `generate_latex.py`, flatten ID-bearing data before passing to templates:

```python
# In generate_latex.py, before template.render():
def _flatten_for_template(form_data):
    """Strip IDs and flatten BulletItem/SkillItem back to strings for Jinja2 templates."""
    # Convert BulletItem[] -> string[] (extract .text)
    # Convert SkillItem[] -> string[] (extract .text)
    # Strip id from top-level entries (templates don't use them)
```

This keeps the Jinja2 templates completely untouched -- zero risk of breaking PDF generation.

### Recommended Project Structure for Changes

```
frontend/src/
  types/index.ts              # BulletItem, SkillItem interfaces + updated entry types
  utils/
    idHelpers.ts              # NEW: generateId() wrapper around nanoid
    formDataPatch.ts          # Update to handle BulletItem/SkillItem in paths
  hooks/
    useFormBuilder.ts         # Update empty*() factories to generate IDs; update bullet/skill CRUD
  features/
    form-builder/sections/    # Update to read .text from bullets/skills
    editor/TailorPanel.tsx    # No change if AI paths stay index-based
    apply-to-job/             # No change if AI paths stay index-based

backend/
  utils/
    id_helpers.py             # NEW: generate_id(), ensure_ids() migration helper
  routes/
    cv_versions.py            # Updated Pydantic models with Optional[str] id fields
    generate_latex.py         # Add flattening step before template render
    tailor.py                 # Strip IDs before AI call; AI output unchanged
  services/
    cv_extractor.py           # Generate IDs for extracted entries
    file_storage.py           # Call ensure_ids() in get_version()
    dynamo_storage.py         # Call ensure_ids() in get_version()
```

### Anti-Patterns to Avoid

- **Generating IDs on every render/load:** IDs must be generated once and persisted. If IDs are regenerated on load, they are not stable -- this breaks the entire purpose (D-05, D-06).
- **Making `id` required in Pydantic models:** Old saved data has no IDs. If `id` is required, old versions fail to deserialize. Use `Optional[str] = None` and fill in via migration.
- **Updating Jinja2 templates to handle BulletItem:** The templates should stay string-based. Flatten at the boundary in `generate_latex.py`.
- **Changing AI prompt to output IDs:** AI models produce more reliable output with the familiar index-based schema. Resolve IDs at the boundary.
- **Using React keys as stable IDs:** React `key` props are rendering hints, not data model identifiers. They must be derived from the data model's `id` field, not the other way around.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique ID generation (frontend) | Custom random string generator | nanoid 5.1.7 | Proper entropy, URL-safe, collision-resistant, 130 bytes |
| Unique ID generation (backend) | Custom random function | `secrets.token_urlsafe(16)` | Cryptographically secure, stdlib, no dependencies |
| Deep object traversal for migration | Recursive hand-written walker | Structured `ensure_ids()` with explicit type knowledge | The schema is known and fixed -- explicit field-by-field is clearer than generic traversal |

## Common Pitfalls

### Pitfall 1: Pydantic Validation Rejects Legacy Data
**What goes wrong:** Making `id: str` (required) in Pydantic models causes `ValidationError` when loading saved versions that have no IDs.
**Why it happens:** Saved JSON files on disk have the old schema (no `id` fields). Pydantic strict validation rejects them.
**How to avoid:** Use `id: Optional[str] = None` in all Pydantic models. The migration layer fills in None values.
**Warning signs:** 400/422 errors when loading existing saved CVs.

### Pitfall 2: Bullets Rendered as "[object Object]" in LaTeX
**What goes wrong:** Jinja2 templates receive `BulletItem` objects instead of strings, rendering them as `{'id': 'abc', 'text': 'Built stuff'}` in the PDF.
**Why it happens:** `generate_latex.py` passes form data directly to templates without flattening.
**How to avoid:** Add a flattening step in `generate_latex.py` that extracts `.text` from BulletItem/SkillItem before template rendering.
**Warning signs:** LaTeX compilation errors or garbled PDF output.

### Pitfall 3: Skills Comma-Split Breaks with SkillItem Objects
**What goes wrong:** `useFormBuilder.updateSkillsText()` splits a comma-separated string into `string[]`. After the type change, it needs to produce `SkillItem[]`.
**Why it happens:** The function does `value.split(',').map(s => s.trim())` which returns strings, not SkillItem objects.
**How to avoid:** Update `updateSkillsText()` to produce `SkillItem` objects with generated IDs for new items, and preserve IDs for existing items where possible.
**Warning signs:** TypeScript compilation errors in the skills section.

### Pitfall 4: AI Tailor Response Path Resolution Breaks
**What goes wrong:** `formDataPatch.ts` `setAtPath()` resolves `workExperience[0].bullets[2]` expecting a string at the leaf. After the type change, index 2 of bullets is a `BulletItem`, and the AI's suggested value is a string.
**Why it happens:** The path resolution doesn't account for the new intermediate object structure.
**How to avoid:** Update `setAtPath()` to handle BulletItem/SkillItem leaf nodes -- when the target is a BulletItem, set `target.text` instead of replacing the whole object (preserving the ID). Alternatively, update the AI response value format.
**Warning signs:** Tailor suggestions silently fail or produce malformed data.

### Pitfall 5: CV Import Produces Data Without IDs
**What goes wrong:** `cv_extractor.py` creates CVFormData from AI extraction. The AI response follows the old schema (no IDs, bullets as strings).
**Why it happens:** The extraction prompt instructs AI to output the old schema. Even if updated, AI reliability with IDs is low.
**How to avoid:** After parsing extraction results, run `ensure_ids()` on the form data. This is the same migration function used for loading old versions.
**Warning signs:** Imported CVs have no stable IDs, breaking Phase 2's editing surface.

### Pitfall 6: DynamoDB Empty String Rejection
**What goes wrong:** DynamoDB rejects items with empty string attribute values. If `id` is set to `""` (empty string) instead of being properly generated, DynamoDB writes fail.
**Why it happens:** The `_sanitize_for_dynamo()` method strips empty strings, which would strip the `id` field entirely.
**How to avoid:** Ensure `ensure_ids()` always generates non-empty IDs. The existing `_sanitize_for_dynamo()` filter (`if v != ""`) would not strip non-empty ID strings.
**Warning signs:** DynamoDB `ValidationException` errors on version save.

### Pitfall 7: Test Fixture Bulk Update Misses a Spot
**What goes wrong:** One test fixture still has the old `bullets: ["string"]` format, causing test failures that are hard to trace.
**Why it happens:** There are test fixtures in multiple files across frontend and backend. Easy to miss one.
**How to avoid:** Systematic inventory of ALL test fixtures before starting. Use TypeScript compiler (`npx tsc --noEmit`) and pytest to catch mismatches.
**Warning signs:** One test suite passes, another fails with cryptic type errors.

## Code Examples

### ID Generation Helpers

**Frontend (`frontend/src/utils/idHelpers.ts`):**
```typescript
import { nanoid } from 'nanoid';

/** Generate a stable unique ID for a data model entry. */
export function generateId(): string {
  return nanoid();  // 21-char URL-safe string
}
```

**Backend (`backend/utils/id_helpers.py`):**
```python
import secrets

def generate_id() -> str:
    """Generate a stable unique ID for a data model entry."""
    return secrets.token_urlsafe(16)  # 22-char URL-safe string
```

### Migration Helper (Backend)

```python
def ensure_ids(form_data: dict) -> tuple[dict, bool]:
    """Add IDs to any entries/bullets/skills/links missing them. Returns (data, was_modified)."""
    modified = False

    def _ensure_id(obj: dict) -> bool:
        if not obj.get("id"):
            obj["id"] = generate_id()
            return True
        return False

    def _ensure_bullet_ids(bullets: list) -> bool:
        changed = False
        for i, b in enumerate(bullets):
            if isinstance(b, str):
                # Legacy format: bare string -> BulletItem
                bullets[i] = {"id": generate_id(), "text": b}
                changed = True
            elif isinstance(b, dict) and not b.get("id"):
                b["id"] = generate_id()
                changed = True
        return changed

    def _ensure_skill_ids(skills: list) -> bool:
        changed = False
        for i, s in enumerate(skills):
            if isinstance(s, str):
                # Legacy format: bare string -> SkillItem
                skills[i] = {"id": generate_id(), "text": s}
                changed = True
            elif isinstance(s, dict) and not s.get("id"):
                s["id"] = generate_id()
                changed = True
        return changed

    # Personal info links
    for link in form_data.get("personalInfo", {}).get("links", []):
        if isinstance(link, dict):
            modified |= _ensure_id(link)

    # Work experience
    for entry in form_data.get("workExperience", []):
        modified |= _ensure_id(entry)
        modified |= _ensure_bullet_ids(entry.get("bullets", []))

    # Education
    for entry in form_data.get("education", []):
        modified |= _ensure_id(entry)
        modified |= _ensure_bullet_ids(entry.get("details", []))

    # Skills
    for entry in form_data.get("skills", []):
        modified |= _ensure_id(entry)
        modified |= _ensure_skill_ids(entry.get("skills", []))

    # Projects
    for entry in form_data.get("projects", []) or []:
        modified |= _ensure_id(entry)
        modified |= _ensure_bullet_ids(entry.get("bullets", []) or [])

    # Awards
    for entry in form_data.get("awards", []) or []:
        modified |= _ensure_id(entry)

    # Additional sections
    for section in form_data.get("additionalSections", []) or []:
        modified |= _ensure_id(section)
        for entry in section.get("entries", []):
            modified |= _ensure_id(entry)
            modified |= _ensure_bullet_ids(entry.get("bullets", []))

    return form_data, modified
```

### Storage Load with Auto-Migration

```python
# In file_storage.py get_version():
async def get_version(self, user_id: str, version_id: str) -> Optional[dict]:
    path = os.path.join(self._versions_dir(user_id), f"{version_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        data = json.load(f)

    # Auto-migrate: ensure all entries have stable IDs
    form_data = data.get("formData")
    if form_data:
        form_data, was_modified = ensure_ids(form_data)
        if was_modified:
            data["formData"] = form_data
            with open(path, "w") as f:
                json.dump(data, f, indent=2)

    return data
```

### generate_latex Flattening

```python
def _flatten_for_template(form_data: CVFormData) -> dict:
    """Flatten BulletItem/SkillItem back to strings for Jinja2 template consumption."""
    d = form_data.model_dump(exclude_none=True)

    def _flatten_bullets(items):
        return [b["text"] if isinstance(b, dict) else b for b in items]

    def _flatten_skills(items):
        return [s["text"] if isinstance(s, dict) else s for s in items]

    for work in d.get("workExperience", []):
        work["bullets"] = _flatten_bullets(work.get("bullets", []))
    for edu in d.get("education", []):
        edu["details"] = _flatten_bullets(edu.get("details", []))
    for skill in d.get("skills", []):
        skill["skills"] = _flatten_skills(skill.get("skills", []))
    for proj in d.get("projects", []) or []:
        proj["bullets"] = _flatten_bullets(proj.get("bullets", []) or [])
    for section in d.get("additionalSections", []) or []:
        for entry in section.get("entries", []):
            entry["bullets"] = _flatten_bullets(entry.get("bullets", []))

    return d
```

### Updated Factory Functions (Frontend)

```typescript
import { generateId } from '../utils/idHelpers';
import type { BulletItem, WorkEntry } from '../types';

function emptyBullet(): BulletItem {
  return { id: generateId(), text: '' };
}

function emptyWorkEntry(): WorkEntry {
  return {
    id: generateId(),
    company: '', title: '', startDate: '', endDate: '', location: '',
    bullets: [emptyBullet()],
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Array index as identifier | Stable unique IDs (nanoid/cuid2) | Standard practice since ~2020 | Enables drag-and-drop, inline editing, optimistic updates without index fragility |
| UUID v4 for all IDs | nanoid for internal IDs, UUID for external/API IDs | nanoid popularized ~2019 | Compact IDs (21 vs 36 chars), lower payload size, equally unique |
| Migrating data via scripts | Auto-migration on load | Common in document-oriented apps | Zero-friction backward compatibility, no user action needed |

## Inventory of All Touch Points

Every file that needs modification, organized by concern:

### Type Definitions (2 files)
1. `frontend/src/types/index.ts` -- Add BulletItem, SkillItem interfaces; add `id` to all entry types; change bullet/skill arrays
2. `backend/routes/cv_versions.py` -- Mirror with Pydantic models (BulletItem, SkillItem, Optional id fields)

### ID Generation (2 new files)
3. `frontend/src/utils/idHelpers.ts` -- NEW: `generateId()` wrapping nanoid
4. `backend/utils/id_helpers.py` -- NEW: `generate_id()`, `ensure_ids()` migration helper

### Frontend Hooks & Utils (3 files)
5. `frontend/src/hooks/useFormBuilder.ts` -- Update all `empty*()` factories and CRUD ops (bullets, skills, links)
6. `frontend/src/utils/formDataPatch.ts` -- Update `setAtPath()` to handle BulletItem/SkillItem at leaf nodes
7. `frontend/src/hooks/useTailor.ts` -- No changes needed if AI paths stay index-based (but verify)

### Frontend UI Components (6 files)
8. `frontend/src/features/form-builder/sections/WorkSection.tsx` -- Access `bullet.text` instead of bare string
9. `frontend/src/features/form-builder/sections/EducationSection.tsx` -- Same for `detail.text`
10. `frontend/src/features/form-builder/sections/SkillsSection.tsx` -- Handle SkillItem objects
11. `frontend/src/features/form-builder/sections/ProjectsSection.tsx` -- Same for project bullets
12. `frontend/src/features/form-builder/sections/AdditionalSectionView.tsx` -- Same for additional bullets
13. `frontend/src/features/form-builder/ImportBanner.tsx` -- May reference entry counts; verify

### Backend Routes (2 files)
14. `backend/routes/generate_latex.py` -- Add `_flatten_for_template()` before template render
15. `backend/routes/tailor.py` -- Strip IDs from form data before sending to AI; re-resolve paths after

### Backend Services (3 files)
16. `backend/services/file_storage.py` -- Call `ensure_ids()` in `get_version()`, persist if modified
17. `backend/services/dynamo_storage.py` -- Call `ensure_ids()` in `get_version()`, persist if modified
18. `backend/services/cv_extractor.py` -- Call `ensure_ids()` on extracted form data

### AI Prompts (1 file)
19. `backend/prompts/cv_agent.py` -- No changes to TAILOR_SUGGEST_PROMPT (stays index-based). The EXTRACTION_SYSTEM_PROMPT schema should remain string-based; `ensure_ids()` handles the conversion.

### Test Fixtures (multiple files)
20. `frontend/src/__tests__/useFormBuilder.test.ts` -- Update importedData fixture and assertion expectations
21. `backend/tests/test_template_rendering.py` -- Update TestFixtures class (minimal_data, maximal_data, etc.)
22. `backend/tests/test_template_compilation.py` -- Shares TestFixtures from rendering tests; verify
23. `backend/tests/fixtures/sample_cv.json` -- Add IDs to all entries and convert bullets/skills
24. `backend/tests/fixtures/minimal_cv.json` -- Add IDs (or verify migration handles it)
25. `backend/tests/test_cv_extractor.py` -- Verify extractor output passes through ensure_ids()

### Package Config (2 files)
26. `frontend/package.json` -- Add nanoid dependency
27. `frontend/package-lock.json` -- Auto-updated by npm install

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 4.0.18 |
| Framework (backend) | pytest 9.0.2 |
| Config file (frontend) | `frontend/vitest.config.ts` |
| Config file (backend) | `backend/pytest.ini` |
| Quick run (frontend) | `cd frontend && npx vitest run --reporter=verbose` |
| Quick run (backend) | `cd backend && python3 -m pytest tests/ -m "not slow" -v` |
| Full suite (frontend) | `cd frontend && npx vitest run` |
| Full suite (backend) | `cd backend && python3 -m pytest tests/ -v` |
| Type check | `cd frontend && npx tsc --noEmit` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | All entry types have stable id field | unit | `cd frontend && npx vitest run src/__tests__/useFormBuilder.test.ts` | Exists (needs update) |
| DATA-01 | BulletItem/SkillItem structure correct | unit | `cd backend && python3 -m pytest tests/test_template_rendering.py -v` | Exists (needs update) |
| DATA-01 | IDs persist across save/load cycle | unit | `cd backend && python3 -m pytest tests/test_id_migration.py -v` | Does not exist (Wave 0) |
| DATA-02 | LaTeX generation works with ID-bearing data | unit | `cd backend && python3 -m pytest tests/test_template_rendering.py -v` | Exists (needs update) |
| DATA-02 | LaTeX compilation works with ID-bearing data | integration (slow) | `cd backend && python3 -m pytest tests/test_template_compilation.py -v` | Exists (needs update) |
| DATA-02 | CV import produces ID-bearing output | unit | `cd backend && python3 -m pytest tests/test_cv_extractor.py -v` | Exists (needs update) |
| DATA-02 | Tailor path resolution works with BulletItem | unit | `cd frontend && npx vitest run src/__tests__/formDataPatch.test.ts` | Does not exist (Wave 0) |
| DATA-03 | Pydantic models accept data with and without IDs | unit | `cd backend && python3 -m pytest tests/test_id_migration.py -v` | Does not exist (Wave 0) |
| DATA-03 | Auto-migration generates IDs for legacy data | unit | `cd backend && python3 -m pytest tests/test_id_migration.py -v` | Does not exist (Wave 0) |
| DATA-03 | Auto-migration persists IDs back to storage | unit | `cd backend && python3 -m pytest tests/test_id_migration.py -v` | Does not exist (Wave 0) |

### Sampling Rate
- **Per task commit:** `cd frontend && npx tsc --noEmit && npx vitest run` + `cd backend && python3 -m pytest tests/ -m "not slow" -v`
- **Per wave merge:** Full suite (including slow compilation tests)
- **Phase gate:** Full suite green + TypeScript compiles before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_id_migration.py` -- covers DATA-01 (persistence), DATA-03 (migration, backward compat)
- [ ] `frontend/src/__tests__/formDataPatch.test.ts` -- covers DATA-02 (tailor path resolution with BulletItem)
- [ ] `backend/utils/__init__.py` -- empty init for new utils module
- [ ] `backend/utils/id_helpers.py` -- the migration logic itself (tested by test_id_migration.py)

## Environment Availability

Step 2.6: No external dependencies beyond what the project already uses. nanoid is an npm package (npm available), secrets is Python stdlib (Python 3.12 available). No new services, databases, or CLI tools required.

## Open Questions

1. **Should `list_versions()` also migrate?**
   - What we know: `list_versions()` loads all version JSON files. It extracts metadata only (no formData), so migration is not needed there.
   - What's unclear: If a consumer later needs formData from the list endpoint, they'd get unmigrated data.
   - Recommendation: Only migrate in `get_version()` (single version load). This is where formData is actually used. The list endpoint only returns metadata (no formData).

2. **Skills comma-split UX during transition**
   - What we know: `updateSkillsText()` currently splits "TypeScript, Python, Go" into `["TypeScript", "Python", "Go"]`. After the change, it needs to produce `SkillItem[]`.
   - What's unclear: Should it preserve IDs for skills that haven't changed text, or regenerate all IDs on every edit?
   - Recommendation: On edit, try to match existing skills by text. Preserve IDs for unchanged skills, generate new IDs only for genuinely new skills. This maintains ID stability.

3. **formDataPatch.ts handling of `add` change type with BulletItem**
   - What we know: The tailor AI can suggest `changeType: "add"` to add a new bullet. Currently `setAtPath` sets a string at the path.
   - What's unclear: After the type change, adding a bullet means inserting a BulletItem (with ID and text), not just a string.
   - Recommendation: Update `setAtPath()` to detect when the target container holds BulletItem objects and wrap the incoming string value in `{ id: generateId(), text: value }`. This keeps the AI response format unchanged.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `frontend/src/types/index.ts`, `backend/routes/cv_versions.py` -- current schema without IDs
- Codebase analysis: `frontend/src/utils/formDataPatch.ts` -- path resolution logic
- Codebase analysis: `backend/routes/generate_latex.py` -- template rendering pipeline
- Codebase analysis: `backend/latex_templates/*.tex.j2` -- Jinja2 template iteration patterns
- Codebase analysis: `backend/services/file_storage.py`, `dynamo_storage.py` -- storage load/save flow
- Codebase analysis: `backend/services/cv_extractor.py` -- import extraction pipeline
- Codebase analysis: `backend/routes/tailor.py` -- AI tailor response processing
- npm registry: nanoid 5.1.7 (verified 2026-03-29)
- Python stdlib: `secrets.token_urlsafe` documentation

### Secondary (MEDIUM confidence)
- nanoid collision probability: based on nanoid's documented calculations (21 chars, 64 char alphabet = ~126 bits entropy)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- nanoid is the obvious choice, well-established, verified current version
- Architecture: HIGH -- all touch points identified from direct codebase analysis, patterns are straightforward
- Pitfalls: HIGH -- identified from reading actual code paths, not hypothetical scenarios

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain, no fast-moving dependencies)
