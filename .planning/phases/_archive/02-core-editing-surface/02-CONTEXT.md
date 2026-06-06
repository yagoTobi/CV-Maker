# Phase 2: Core Editing Surface - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Web-rendered CV with inline text editing for the med-length-proff-cv template. Users can click any text field and edit it in place. The web rendering visually matches the LaTeX PDF output (~95% fidelity). Edits sync to CVFormData in real-time without cursor jumps. Auto-save fires on debounce with a visible indicator. Empty fields show placeholder text.

This phase does NOT include: add/delete entries (Phase 3), drag-and-drop (Phase 4), AI integration (Phase 5), or route wiring (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Editing Experience
- **D-01:** Subtle highlight on focus — light background tint or thin border appears around the editable field when clicked. Clear but doesn't break the CV aesthetic.
- **D-02:** Each CVFormData field = one editable region. startDate, endDate, company, title are separate contentEditable elements. Granularity matches the data model, not visual grouping.
- **D-03:** contentEditable="plaintext-only" for all text fields (from research — no rich text).
- **D-04:** "Uncontrolled while focused, controlled while blurred" — React must not touch DOM of focused contentEditable elements. State sync happens on blur only (from research).

### Page Layout
- **D-05:** Full-bleed page layout — CV fills the viewport width (up to a max-width). No surrounding gray background or drop shadow. Clean, immersive, Notion-like feel.
- **D-06:** Page dimensions use CSS that matches LaTeX margins from resume.cls. Content scrolls naturally with the viewport (no inner scroll).

### Auto-Save
- **D-07:** Minimal text indicator for save status — small "Saved" / "Saving..." text in a corner, unobtrusive like Google Docs.
- **D-08:** Debounce-only save trigger — save after 2-3 seconds of inactivity. Fires while still focused if user pauses typing. No blur-triggered save.

### Visual Fidelity (from research — not discussed, carrying forward)
- **D-09:** Target ~95% visual match to LaTeX PDF. Same fonts (EB Garamond), margins, section structure, visual hierarchy. Accept text reflow differences (CSS greedy line-breaking vs LaTeX Knuth-Plass).
- **D-10:** Start with med-length-proff-cv template only. Single column, simplest layout.

### Claude's Discretion
- Component architecture (how to decompose the web template into React components)
- Font loading strategy (Google Fonts, Fontsource, or self-hosted)
- Exact CSS values for matching LaTeX margins/spacing (derive from resume.cls)
- Cursor behavior when tabbing between fields
- Placeholder text content for each field type
- Error handling for font loading failures

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Template Source
- `backend/latex_templates/med-length-proff-cv.tex.j2` — The LaTeX Jinja2 template whose visual output the web version must match. Contains section structure, font choices (EB Garamond, 11pt), color definitions (darkblue RGB 21,88,176), and layout.
- `cv-templates/med-length-proff-cv/resume.cls` — The LaTeX class file defining margins, spacing, font sizes, section headers. CSS values should derive from this.

### Data Model
- `frontend/src/types/index.ts` — CVFormData, BulletItem, SkillItem, all entry types with `id` fields (Phase 1 output)
- `frontend/src/utils/idHelpers.ts` — generateId() for new entries

### Existing Patterns
- `frontend/src/features/form-builder/sections/WorkSection.tsx` — Current work section rendering (for understanding data access patterns)
- `frontend/src/hooks/useFormBuilder.ts` — Form state management hooks, factory functions, CRUD operations
- `frontend/src/contexts/AppContext.tsx` — Shared state via useAppContext()
- `frontend/src/services/api.ts` — Backend API client for save operations

### Research
- `.planning/research/STACK.md` — contentEditable approach, font recommendations, CSS typography matching
- `.planning/research/ARCHITECTURE.md` — Component architecture, data flow, build order
- `.planning/research/PITFALLS.md` — React + contentEditable gotchas, browser inconsistencies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useFormBuilder` hook: Already manages CVFormData state with factory functions and CRUD. The web template components will use this for reads and writes.
- `useCompiler` hook: Handles LaTeX compilation — will be used for download-time PDF generation.
- `api.saveVersion()` / `api.listVersions()`: Existing save/load API for auto-save implementation.
- CSS Modules pattern: All existing components use `*.module.css` — web template should follow.

### Established Patterns
- Feature components live in `frontend/src/features/{feature-name}/` with co-located CSS modules.
- Contexts provide shared state; hooks encapsulate domain logic.
- TypeScript strict mode enabled — all types must be correct.

### Integration Points
- The web template component will eventually replace CVFormBuilder at `/build/form` (Phase 6).
- For now, it can be developed as a standalone component/feature directory.
- Must read CVFormData from context and write back via useFormBuilder's update functions.

</code_context>

<specifics>
## Specific Ideas

- Full-bleed layout like Notion — the page IS the viewport content, not a miniature document floating on a canvas.
- "Saved" / "Saving..." text indicator — minimal, not a toast or modal.
- Each form data field is its own editable region — no merged fields.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-core-editing-surface*
*Context gathered: 2026-03-29*
