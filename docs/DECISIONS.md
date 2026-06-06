# Architectural Decision Records (ADRs)

This document captures key architectural decisions made during development.

---

## ADR-001: LaTeX for CV Format

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Need to decide on the CV format. Options considered:
- HTML/CSS (web-native)
- Markdown (simple)
- LaTeX (professional typesetting)
- Word documents (widely used)

**Decision:**
Use LaTeX as the primary CV format.

**Rationale:**
- Professional typesetting quality
- Precise control over layout
- Standard in academia and tech
- Easy to version control (plain text)
- Can compile to PDF reliably

**Consequences:**
- Users need basic LaTeX knowledge to make manual edits
- Requires LaTeX distribution on the server
- Compilation adds latency to preview

---

## ADR-002: React + Vite for Frontend

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Choosing a frontend framework and build tool.

**Decision:**
Use React 19 with Vite for the frontend.

**Rationale:**
- React's component model fits the editor UI well
- Vite provides fast HMR during development
- TypeScript support out of the box
- Large ecosystem for editor components (CodeMirror)

**Consequences:**
- React 19 is relatively new; some libraries may lag
- Need to manage React's state for complex interactions

---

## ADR-003: FastAPI for Backend

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Need a backend framework that supports async operations and streaming.

**Decision:**
Use Python with FastAPI.

**Rationale:**
- Native async support
- Built-in streaming response support (for AI chat)
- Automatic API documentation
- Type hints align with TypeScript frontend

**Consequences:**
- Python ecosystem for LaTeX is limited (shell out to pdflatex)
- Need to manage Python virtual environment

---

## ADR-004: AWS Bedrock for AI

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Need an AI service for CV analysis and suggestions.

**Decision:**
Use AWS Bedrock with Claude models.

**Rationale:**
- Access to Claude models (strong at analysis and writing)
- Streaming support for real-time responses
- Enterprise-grade security and compliance
- Pay-per-use pricing

**Consequences:**
- Requires AWS account and configuration
- Adds external dependency and potential cost
- Need to handle API rate limits

---

## ADR-005: Local JSON for User Data

**Date:** 2026-02-21

**Status:** Accepted (temporary)

**Context:**
Need to store user profile data.

**Decision:**
Store user data in local JSON files.

**Rationale:**
- Simple to implement for MVP
- No database setup required
- Easy to inspect and debug

**Consequences:**
- Not suitable for multi-user production
- No data persistence across deployments
- Will need to migrate to proper database later

**Future consideration:** Replace with PostgreSQL or MongoDB when implementing user authentication.

---

## ADR-006: Server-side LaTeX Compilation

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Decide where to compile LaTeX to PDF.

**Decision:**
Compile LaTeX on the backend server.

**Rationale:**
- Users don't need LaTeX installed locally
- Consistent compilation environment
- Can cache or optimize compilation

**Consequences:**
- Server needs LaTeX distribution installed
- Compilation adds latency
- Need to handle compilation errors gracefully
- Security considerations with arbitrary LaTeX code

---

## ADR-007: Inline Edit Suggestions Format

**Date:** 2026-02-22

**Status:** Accepted

**Context:**
How should AI communicate suggested edits to the frontend?

**Decision:**
Use structured JSON blocks within AI responses with `find` and `replace` fields.

**Rationale:**
- Enables one-click apply functionality
- Clear delineation of what changes
- Easy to parse and apply
- Supports undo by storing previous state

**Consequences:**
- Need to train AI to output consistent format
- Frontend needs to parse and render edit blocks
- Edge cases when "find" text doesn't match exactly

---

## ADR-008: Form Builder as Separate Path from Raw LaTeX Editor

**Date:** 2026-03-02

**Status:** Accepted

**Context:**
Two user types emerged: those who want to build a CV from scratch (no LaTeX knowledge) and those who want to tune an existing CV for a specific job posting.

**Decision:**
Implement two distinct entry paths — "Build my CV" (structured form → generated LaTeX → editor) and "Tune for a job" (raw editor + AI chat). The form is the source of truth on the Build path; LaTeX is generated output.

**Rationale:**
- Structured form removes the LaTeX barrier for most users
- Power users who want to tweak LaTeX still have the editor
- Keeping paths separate avoids a complex "sync" problem between form state and hand-edited LaTeX
- Form data enables richer version storage (structured diffs, field-level info)

**Consequences:**
- Once user opens editor and edits LaTeX manually, the form data is no longer in sync
- Template customisation from the form is deferred (form only controls content, not layout)

---

## ADR-009: Jinja2 with Custom Delimiters for LaTeX Templates

**Date:** 2026-03-02

**Status:** Accepted

**Context:**
LaTeX uses `{}` extensively. Jinja2's default `{{ }}` / `{% %}` delimiters clash with LaTeX braces, making templates unreadable and error-prone.

**Decision:**
Configure Jinja2 with custom delimiters: `(( ))` for variables, `(% %)` for blocks.

**Rationale:**
- LaTeX and template syntax no longer overlap — templates are readable
- Parentheses don't have special meaning in LaTeX
- Zero changes needed to the LaTeX template class macros

**Consequences:**
- Non-standard delimiters may confuse developers unfamiliar with the project
- Documented in ARCHITECTURE.md and key-learnings.md

---

## ADR-010: Single-Pass Regex for LaTeX Character Escaping

**Date:** 2026-03-02

**Status:** Accepted

**Context:**
LaTeX special characters (`& % $ # _ { } ~ ^ \`) must be escaped. Sequential `str.replace()` calls have a fatal flaw: replacing `\` first produces `\textbackslash{}`, then the `{` and `}` in that replacement get escaped in a later pass, corrupting the output.

**Decision:**
Use a single compiled regex with a dict lookup (`re.sub` + lambda) to escape all characters in one pass.

**Rationale:**
- Eliminates the double-escaping bug entirely
- Single compiled regex is also faster than N sequential string passes
- Pattern is a recognised idiom for multi-character substitution in Python

**Consequences:**
- All characters must be listed upfront in the escape map (easy to extend)

---

## ADR-011: Version Storage as JSON Files

**Date:** 2026-03-02

**Status:** Accepted (temporary)

**Context:**
Saved CV versions need persistent storage. Options: extend the existing `user_data/profile.json`, a new single JSON file, or one file per version.

**Decision:**
One JSON file per version in `user_data/versions/{uuid}.json`.

**Rationale:**
- Consistent with existing `user_data/profile.json` pattern — no new infrastructure
- One file per version means reads/writes/deletes don't require loading all versions into memory
- Easy to inspect and debug individual versions
- UUIDs prevent name collisions

**Consequences:**
- Not suitable for concurrent multi-user access
- Listing versions requires reading all files in the directory (acceptable at small scale)
- Will need to migrate to a database for multi-user production use

---

## ADR-012: `draggable` Set Imperatively via DOM, Not in JSX

**Date:** 2026-03-02

**Status:** Accepted

**Context:**
Drag-and-drop reordering is needed for CV sections and entries. Cards contain text inputs. Setting `draggable={true}` in JSX on a card caused the browser to alter mouse event handling for all children, preventing text cursor repositioning in inputs inside draggable cards — even when the drag was cancelled in `onDragStart`.

**Decision:**
Cards have no `draggable` attribute in JSX. The grip handle's `onMouseDown` imperatively sets `cardElement.draggable = true` via the DOM. `onDragEnd` resets it to `false`. The `data-drag-card` attribute marks drag containers for `closest()` lookup.

**Rationale:**
- When `draggable` is absent from the DOM, the browser treats mouse events on child inputs normally
- The draggable state is only active during the brief window between handle press and drag end
- No state or re-render required — pure DOM mutation

**Consequences:**
- Slightly non-idiomatic React (direct DOM mutation)
- The pattern is self-contained in `useDrag()` and clearly documented

---

## ADR-013: Separate URL Escape Filter for LaTeX `\href`

**Date:** 2026-03-10

**Status:** Accepted

**Context:**
URLs in `\href{}` commands were not being escaped. Characters like `%` and `#` (common in GitHub links, URL-encoded parameters) would break LaTeX compilation. The full `latex_escape` filter is too aggressive for URLs — hyperref handles most characters natively.

**Decision:**
Created a separate `latex_url_escape` filter that only escapes `%` → `\%` and `#` → `\#`. Applied to all `\href{}` first arguments across templates.

**Rationale:**
- Minimal escaping avoids breaking valid URL characters that hyperref handles
- Keeps URL escaping separate from text escaping concerns
- Hyperref's URL handling is robust for most special characters

**Consequences:**
- Two escape filters to maintain (`latex_escape` for text, `latex_url_escape` for URLs)
- Any new templates must use the correct filter in the right context
- Developers must remember which filter applies to which context

---

## ADR-014: Deedy Template Excluded from Section Reordering

**Date:** 2026-03-10

**Status:** Accepted

**Context:**
The Deedy resume uses a fixed two-column `minipage` layout — education/skills/awards are hardcoded in the left column, work/projects in the right. The `section_order` Jinja2 variable is not used. Allowing users to drag-reorder sections in the form builder when Deedy is selected has no effect on the PDF output, which is misleading.

**Decision:**
Disable section drag-and-drop in the form builder sidebar nav when `templateId === 'deedy-resume'`. Sections remain clickable for navigation, just not reorderable. Other templates retain full reordering.

**Rationale:**
- Honest UI — don't expose controls that have no effect
- Avoids user confusion when reordering doesn't change the output
- Template-specific behavior is clearly communicated through disabled drag handles

**Consequences:**
- Template-specific UI behavior — the form builder now needs to know which template is selected to decide whether to show drag handles
- If Deedy is later refactored to support dynamic ordering, this guard should be removed
- May need similar guards if more fixed-layout templates are added

---

## ADR-015: Generic Additional Sections Instead of Per-Section Types

**Date:** 2026-03-11

**Status:** Accepted

**Context:**
CVs contain many possible section types beyond the standard work/education/skills — Leadership, Certifications, Volunteer Work, Publications, Research, Languages, Hobbies, etc. Adding a dedicated typed section for each would require changes to types, Pydantic models, form builder, all 3 Jinja2 templates, and the extraction prompt — a cross-cutting change across 6+ files per new section type.

**Decision:**
Keep typed sections for content with unique rendering needs (work, education, skills). Add a generic `additionalSections: AdditionalSection[]` field to `CVFormData` for everything else. Each `AdditionalSection` has a user-defined title and an array of `AdditionalEntry` objects with a flexible shape (title, subtitle, dates, location, description, bullets).

**Rationale:**
- One schema addition handles all future section types
- The form builder renders them generically — user names the section
- Jinja2 templates use a single generic block (keyed as `additional-{index}` in `sectionOrder`)
- The extraction prompt maps any non-standard section to `additionalSections` with the original title preserved
- Standard sections retain their specific rendering (tabular skills, education with GPA, etc.)

**Consequences:**
- Additional sections have less specialized rendering than typed sections (no per-section template customization)
- The generic entry shape may not perfectly fit every possible section type (e.g., publications with authors/journals)
- If a section type becomes common enough to warrant specialized rendering, it can be "promoted" to a typed section later

---

## ADR-016: Job-Centric Version Management with Hierarchical Grouping

**Date:** 2026-03-11

**Status:** Accepted

**Context:**
Users were confused by the versioning workflow. The "My Saved CVs" dashboard showed a flat list of versions with no clear relationship to job applications. Version management was hidden behind a tiny icon in the editor header. Users couldn't easily understand: (1) which versions were base templates vs job-specific, (2) how versions related to each other, and (3) how to manage versions across multiple job applications.

User workflow research revealed: most users create 1-2 **base CVs** (e.g., "Creative CV", "Consulting CV") and then tailor them for specific **job applications** (e.g., "Spotify Product Designer", "McKinsey Consultant"). The mental model is **Base CV → Job Application → Tailored Version**, not a flat list of saved CVs.

**Decision:**
Reframe versioning as a **hierarchical, job-centric model** with base CVs as parents and job applications as children.

**Key Changes:**
1. **Data model**: Add `parentVersionId` to `CVVersion` schema
   - Base CVs have `parentVersionId = null`
   - Job applications have `parentVersionId = <base-cv-id>`
   - Add `role` field for job title (used in auto-naming)
2. **Dashboard redesign**: Show base CVs as expandable groups with nested job applications
   - Each base CV shows count: "Creative CV (3 applications)"
   - Job applications display: role/company, match score, date (no template name)
   - `[+ New]` button on each base CV to quickly create a job application from it
   - Ungrouped section for orphaned versions without parent
3. **Save flow**: Modal prompts for "Base CV" or "Job Application"
   - Job applications select parent base CV (dropdown of existing bases + "None")
   - Company and role fields optional but recommended
   - Auto-naming: `{company} {role}` → `{company} Application` → `{role}` → `Application {date}`
4. **"Tune for a job" flow**: Show base CV picker before opening editor
   - User selects which base CV to start from (or "Start from scratch")
   - Editor opens with base CV loaded + job panel visible
5. **Re-parenting**: `[Move...]` action on job applications to change parent base CV
6. **AI grouping suggestions**: For ungrouped versions, show similarity hint
   - "💡 Suggested: Group with Creative CV (78% similar)"
   - One-click `[Move to Creative CV]` action

**Rationale:**
- **Matches user mental model**: Base template → job-specific tailoring is how users naturally think
- **Reduces clutter**: 2 base CVs + 10 job applications is clearer than a flat list of 12 versions
- **Explicit relationships**: Parent-child model makes derivation clear
- **Better discoverability**: Dashboard is prominently featured on landing page, not hidden
- **Workflow-aligned**: Naming uses job details (company/role), not generic "Version 5"
- **Flexible**: Allows ungrouped versions for users who don't care about hierarchy
- **Intelligent nudges**: AI suggestions help organize without forcing rigid structure

**Consequences:**
- **Migration**: Existing versions have `parentVersionId = null` (become bases or ungrouped)
- **Backend changes**: Add `parentVersionId`, `role` fields; update list endpoint to group by parent
- **Frontend redesign**: Dashboard becomes hierarchical; save modal adds base CV picker
- **AI integration**: Grouping suggestions require Bedrock similarity analysis
- **Complexity**: More complex UI (expand/collapse, re-parenting) vs flat list
- **Edge cases**: Orphaned versions, circular references (prevented by validation), re-parenting chains

**Alternatives Considered:**
1. **Flat list with tags** — rejected; doesn't show relationships clearly
2. **Forced base CV selection** — rejected; too rigid, prevents quick saves
3. **No ungrouped versions** — rejected; users should be able to opt out of hierarchy
4. **Job applications as first-class entities (separate from CVs)** — rejected; too much conceptual overhead

---

## ADR-017: Voice Interview Architecture (Pipecat + Nova Sonic)

**Date:** 2026-03-15

**Status:** Accepted

**Context:**
Users need an alternative to manual form filling. Typing structured CV data into a form is tedious and interrupts the flow of thought. Voice is a more natural modality for storytelling and biographical information. Speech-to-speech AI (S2S) enables real-time conversation without separate transcription and synthesis steps.

**Decision:**
Use Pipecat framework with Amazon Nova Sonic for speech-to-speech voice interviews.

**Architecture:**
- **WebSocket transport**: `FastAPIWebsocketTransport` with `ProtobufFrameSerializer` for binary audio frames
- **Pipeline**: User audio → user_aggregator → Nova Sonic LLM (S2S) → assistant audio → transport output + transcript collection
- **Sample rates**: 16kHz input (user mic), 24kHz output (Nova Sonic)
- **Transcript collection**: Custom `TranscriptCollector` frame processor captures `TranscriptionFrame` objects to build session transcript
- **Session storage**: In-memory dict `{session_id: [utterances]}` — cleared on restart (no persistence)
- **CV extraction**: `POST /api/voice/extract-cv` takes full transcript and uses Bedrock (Claude) to extract structured `CVFormData`
- **Voice profile**: Returning user detection stores name/email in `user_data/voice_profile.json` for personalized greeting
- **Optional dependency**: `pip install 'pipecat-ai[aws]'` — app starts without it (voice feature disabled if not installed)

**Rationale:**
- **S2S over separate ASR+TTS**: Nova Sonic handles speech-to-speech natively, reducing latency and avoiding transcription errors
- **Pipecat framework**: Provides battle-tested WebSocket transport, frame serialization, and pipeline orchestration
- **In-memory sessions**: Simplest implementation for alpha; no database dependency
- **Transcript-based extraction**: Allows for correction and re-extraction; more flexible than real-time streaming extraction
- **Optional dependency**: App remains functional without Pipecat; feature is opt-in

**Consequences:**
- **Alpha quality**: No error recovery, no session persistence, no rate limiting
- **Session cleanup needed**: In-memory dict grows unbounded; needs TTL-based cleanup for production
- **WebSocket complexity**: Debugging WebSocket issues is harder than HTTP; requires browser dev tools network inspection
- **Audio format constraints**: Protobuf serialization and sample rate mismatch (16kHz vs 24kHz) can cause audio quality issues
- **Single dependency point**: If Pipecat or Nova Sonic has breaking changes, voice feature breaks
- **Cost**: Nova Sonic usage incurs per-second charges; no usage tracking implemented

---

## ADR-018: McDowell Template Auto Line Detection

**Date:** 2026-03-15

**Status:** Accepted

**Context:**
The McDowell CV template's `cvsubsection` environment accepts an optional `[n]` parameter to specify the number of lines in the section header. This controls the vertical space adjustment between the header and the bullet points below it. The Jinja2 template (`mcdowell-cv.tex.j2`) always passed the default `[1]`, which worked for single-line headers but caused bullet points to overlap with multi-line headers (e.g., "Software Engineer" + "Google, Mountain View, CA" + "June 2020 – Present" = 3 lines).

Manual calculation in Jinja2 was considered (count `\newline` commands) but rejected because:
1. LaTeX line wrapping depends on text width, which Jinja2 cannot measure
2. Long single lines may wrap to 2+ lines unpredictably
3. Would require template changes for every new field or layout adjustment

**Decision:**
Modify `mcdowellcv.cls` to auto-detect the header line count using `\savebox` to measure the actual rendered height of the header content.

**Implementation:**
- Use `\savebox` to render the header into a box and measure its height
- Compare measured height (`\ht\headerbox`) against thresholds:
  - `< 1.5x \baselineskip` → single-line (7pt vspace)
  - `< 2.5x \baselineskip` → double-line (5pt vspace)
  - `≥ 2.5x \baselineskip` → multi-line (3pt vspace)
- Thresholds use `1.5x` and `2.5x` multipliers to account for line spacing and font metrics
- Backward compatible: optional `[n]` parameter still accepted but ignored (deprecated)

**Rationale:**
- **Accurate measurement**: LaTeX measures the actual rendered height, accounting for line wrapping and font metrics
- **Template simplification**: Jinja2 template no longer needs to calculate line count or pass `[n]` parameter
- **Automatic adaptation**: Works for any header content without manual tuning
- **Single fix point**: Bug fixed in one place (`.cls` file) instead of requiring changes to Jinja2 template logic

**Consequences:**
- **Backward compatible**: Existing templates that pass `[n]` still work (parameter is ignored)
- **`.cls` complexity**: Adds LaTeX box manipulation logic to the class file (11 lines)
- **Threshold tuning**: The `1.5x` and `2.5x` multipliers are empirically derived; may need adjustment for different fonts
- **Performance**: Negligible — `\savebox` is fast and runs once per section
- **Edge cases**: Very tall headers (4+ lines) use the same vspace as 3-line headers (acceptable for typical CVs)

---

## ADR-019: Storage Abstraction Layer with Protocol-Based Architecture

**Date:** 2026-03-20

**Status:** Accepted

**Context:**

The app originally used direct file I/O (JSON files in `user_data/`) for all persistence. This approach worked for local single-user development but had limitations:
1. Not suitable for multi-user production deployments
2. No cloud-native storage option for scaling
3. All routes had file I/O logic tightly coupled to business logic
4. Testing required real filesystem operations
5. Adding new storage backends (DynamoDB, S3, Postgres) would require refactoring every route

The codebase needed to support both local file-based storage (for development) and cloud storage (for production) without changing business logic in routes.

**Decision:**

Implement a storage abstraction layer using Python's Protocol (structural typing) with pluggable backends.

**Architecture:**
1. **StorageBackend Protocol** (`services/storage/storage.py`): 11-method async interface defining all user data operations
   - CV versions: `list_versions`, `get_version`, `create_version`, `update_version`, `delete_version`, `update_children_of_deleted_parent`
   - User profile: `get_profile`, `save_profile`, `delete_profile`
   - Voice profile: `get_voice_profile`, `save_voice_profile`
2. **FileStorage** (`services/storage/file_storage.py`): Wraps existing JSON file I/O with zero behavior change
   - `user_id="local"` maps to flat `user_data/` directory (backward compatible)
   - Other user IDs get namespaced: `user_data/{user_id}/`
3. **DynamoStorage** (`services/storage/dynamo_storage.py`): DynamoDB single-table implementation
   - Composite keys: `PK=USER#{user_id}`, `SK=VERSION#{version_id} | PROFILE | VOICE_PROFILE`
   - PAY_PER_REQUEST billing, no GSIs needed
4. **Storage Factory** (`services/storage/storage_factory.py`): `get_storage()` dependency
   - Reads `STORAGE_BACKEND` env var (`file` | `dynamodb`)
   - Singleton via `@lru_cache`
5. **User ID dependency** (`dependencies.py`): `get_current_user()` reads `X-User-Id` header, defaults to `"local"`

**Rationale:**

- **Protocol over ABC**: Python's Protocol uses structural typing (duck typing) — implementations don't need to inherit from a base class. This is more Pythonic and avoids runtime overhead.
- **Zero behavior change for FileStorage**: Wraps existing file I/O code exactly as-is, ensuring no regression in local development workflow.
- **Backward compatibility**: `user_id="local"` preserves existing flat file structure (`user_data/versions/`, `user_data/profile.json`).
- **Single-table DynamoDB design**: All user data in one table with composite keys keeps queries simple (no cross-table joins or GSIs).
- **FastAPI dependency injection**: `get_storage()` uses FastAPI's `Depends()` to inject storage backend into routes, making testing easy (can swap in mock storage).
- **Environment-based selection**: `STORAGE_BACKEND` env var allows runtime selection without code changes.
- **WebSocket exception**: WebSocket handlers can't use `Depends()`, so they access storage singleton directly via `get_storage()`.

**Consequences:**

**Positive:**
- Routes are now storage-agnostic — business logic separated from persistence
- Can swap storage backends without changing route code
- Easy to add new backends (Postgres, S3, Redis) by implementing Protocol
- Testing is simpler — can use in-memory mock storage
- Production-ready cloud storage option (DynamoDB) available
- Maintains local file-based workflow for development

**Negative:**
- Added abstraction layer increases codebase complexity (4 new files)
- All storage operations are now async (requires `await` in routes)
- DynamoDB requires AWS credentials and table setup
- Migration from FileStorage to DynamoDB requires running migration script
- Two storage backends to maintain (FileStorage + DynamoDB)

**Neutral:**
- User ID is now required for all storage operations (passed via `X-User-Id` header)
- WebSocket handlers use storage singleton directly (can't use dependency injection)
- Voice profile storage consolidated into main `user_data/` directory (was split before)

**Alternatives Considered:**

1. **Abstract base class (ABC)** — rejected; Protocol is more Pythonic and doesn't require inheritance
2. **Repository pattern with classes** — rejected; Protocol achieves same goal with less boilerplate
3. **Direct DynamoDB integration without abstraction** — rejected; would make local development harder and lock us into DynamoDB
4. **SQLAlchemy ORM** — rejected; too heavy for simple key-value storage needs
5. **Keeping file storage only** — rejected; doesn't scale for production multi-user deployment

**Migration Path:**

Existing users on FileStorage (`user_id="local"`) continue working with zero changes. For DynamoDB:
1. Set `STORAGE_BACKEND=dynamodb` in environment
2. Run `python backend/scripts/create_table.py` to create DynamoDB table
3. Run `python backend/scripts/migrate_to_dynamodb.py` to copy data from file storage
4. Frontend sends `X-User-Id` header (from auth system in production)

---

## Template for New Decisions

```markdown
## ADR-XXX: [Title]

**Date:** YYYY-MM-DD

**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
What is the issue that we're seeing that motivates this decision?

**Decision:**
What is the change that we're proposing and/or doing?

**Rationale:**
Why is this the best choice among the alternatives?

**Consequences:**
What are the resulting context and trade-offs?
```
