# Project Research Summary

**Project:** WYSIWYG Direct-Edit Web CV Editor
**Domain:** In-line contentEditable CV editing with template-based rendering
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

This project aims to replace the current form-based CV builder with a direct-edit WYSIWYG experience where the CV itself is the editor. Research across technology stack, feature landscape, architecture, and pitfalls reveals a clear path forward, but with critical technical challenges that must be addressed from day one.

The recommended approach: **native contentEditable with React-controlled components, NOT a rich text editor framework.** CV fields are plain text strings mapped to CVFormData paths (e.g., `workExperience[0].bullets[2]`), not free-form rich text documents. Using Tiptap, Lexical, or Slate would create constant impedance mismatch between their document models and CVFormData. The right pattern is individual `contenteditable="plaintext-only"` spans per field, synced to state on blur, with an uncontrolled-while-focused pattern to avoid cursor position loss.

The key risks are well-understood: React's reconciler fighting contentEditable DOM mutations (Pitfall 1), cursor position loss on data sync (Pitfall 3), and CSS-to-LaTeX visual fidelity expectations (Pitfall 2). These must be designed correctly in Phase 1 — retrofitting is expensive. Start with the simplest single-column template (med-length-proff-cv), prove the architecture, then expand. The two-column Deedy template should be deferred to Phase 3+. Add stable IDs to CVFormData array entries immediately to prevent index drift when AI suggestions or undo operations reference entries. The architecture is clear, the pitfalls are documented, and the success criteria are achievable.

## Key Findings

### Recommended Stack

**The single most important decision: use native `contentEditable` with React, NOT a rich text framework.** Tiptap, Lexical, Slate, and ProseMirror solve the wrong problem (free-form document editing) and would require constant translation between their document models and CVFormData. The CV editing surface is structured field editing (company name, bullet #3, skill category), not document authoring.

**Core technologies:**
- **Native `contenteditable="plaintext-only"`**: Text input on CV fields — 0KB bundle cost, strips rich formatting on paste, prevents HTML chaos. Supported in modern browsers (Chrome 84+, Firefox 120+, Safari 16.4+).
- **`beforeinput` event (Browser API)**: Intercept text changes before DOM mutation — provides `inputType` and `data` for controlled updates. Baseline since March 2021.
- **Selection API (`window.getSelection()`)**: Save/restore cursor position during React re-renders — critical for uncontrolled-while-focused pattern.
- **`useReducer` + action history (React 19)**: CVFormData state management with undo/redo — ~50 lines for full history stack.
- **CSS custom properties + Grid/Flexbox**: Template-specific dimensions, spacing, and layout matching LaTeX output — no CSS framework needed.
- **Web fonts**: EB Garamond (via `@fontsource-variable/eb-garamond`) for med-length-proff-cv, Times New Roman (system font) for mcdowell-cv, Lato + Raleway (via Fontsource) for deedy-resume.
- **@dnd-kit/core + @dnd-kit/sortable**: Section and entry reordering — better accessibility and animations than custom HTML5 DnD, avoids text selection conflicts.
- **Immer (optional)**: Deep immutable updates to CVFormData — recommended if more than 3 levels of spreading appear.

**What is NOT being installed:** No Tiptap, Lexical, Slate, ProseMirror, or any rich text editor framework.

### Expected Features

Research analyzed competitive CV builders (Enhancv, Resume.io, FlowCV, Rezi, Canva, Overleaf) and WYSIWYG editor patterns. Key gap in market: no builder offers true inline editing on a template-rendered CV with AI suggestions appearing as inline diffs on the document itself. Form-based builders dominate.

**Must have (table stakes):**
- Click-to-edit text on all CV fields — core promise of WYSIWYG
- Visual fidelity to PDF output — users must trust what they see is what they download (95%+ match acceptable, not pixel-perfect)
- Add/delete entries with contextual "+" buttons — without this, editor is read-only
- Multi-line bullet editing (Enter for new bullet, Backspace to delete empty) — bullets are the core of a CV
- Undo/redo (Cmd+Z / Cmd+Shift+Z) — universal expectation, 50+ undo levels is the norm
- Auto-save with save indicator — users panic about losing work
- Template switching — users expect to try different looks without re-entering data (already exists via CVFormData)
- PDF download — already exists, no change needed (compile LaTeX at download time only)
- Empty state guidance — placeholder text in empty fields so new users know where to type
- Section visibility toggles — hide optional sections without deleting data

**Should have (competitive differentiators):**
- Drag-and-drop section reordering on the CV itself — most builders use sidebar lists, doing it on the CV feels magical
- Drag-and-drop entry reordering within sections — finer-grained control, drag handles on individual entries
- AI inline suggestions (accept/reject on the CV) — existing tailor suggestions as inline diffs, not side panel
- AI writing assist per-field — sparkle icon on any bullet/field for AI-generated alternatives
- Real-time match score updates — score badge updates live as user edits
- Content overflow warning — visual indicator when content exceeds page boundary
- Smart date entry — type "2020" or "Jan 2020 - Present" and it formats/parses correctly
- Keyboard-driven section navigation — Tab/Shift+Tab to move between fields

**Defer (v2+):**
- Contextual formatting toolbar (select text, floating toolbar) — limited applicability since CV content is mostly plain text
- Drag-and-drop entry reordering within sections — high complexity, can ship after section reorder proves architecture
- Web templates for all 3 templates — start with 1 (med-length-proff-cv), prove architecture, then expand

**Anti-features (explicitly NOT build):**
- Rich text / arbitrary formatting per-field — breaks LaTeX compilation, creates ugly inconsistent CVs
- Free-form layout editing (Canva-style) — design tool, not a CV tool, makes output unpredictable
- Real-time LaTeX compilation preview — expensive, slow, defeats the purpose of web rendering
- Collaborative / multi-user editing — massively complex, CV editing is single-user
- Mobile editing — direct manipulation on CV-sized document doesn't work on small screens (desktop-first)

### Architecture Approach

The architecture is a **Model-View-Controller pattern adapted for React**: CVFormData is the immutable model, web template components are the view, and a new `useDirectEditor` hook is the controller that mediates between contentEditable DOM mutations and structured state updates.

**Major components:**
1. **WebCVTemplate** (per-template) — pure rendering of CVFormData into HTML/CSS matching LaTeX output. Receives CVFormData as props.
2. **EditableField** — wraps a single text span with `contentEditable="plaintext-only"`, handles focus/blur/input, syncs to data model. Uses uncontrolled-while-focused pattern (critical).
3. **EditableBulletList** — manages ordered list of editable bullets with Enter-to-add, Backspace-to-remove-empty, drag-to-reorder.
4. **ContextualControls** — hover-revealed "+" buttons, delete buttons, drag handles that appear on sections/entries.
5. **useDirectEditor** (hook) — central controller: holds CVFormData state, provides field-level update functions, manages undo/redo stack, handles section operations.
6. **DirectEditScreen** (page) — top-level route component: renders toolbar + WebCVTemplate + sidebar (for tune mode).
7. **WebCVPage** — A4/Letter-sized container with proper dimensions, margins, overflow handling. Fixed-size div simulating a page (not CSS `@page` which is print-only).

**Critical pattern: Uncontrolled-While-Focused EditableField.** contentEditable and React state are fundamentally at odds. The component behaves as controlled (React sets content) when not focused, and uncontrolled (browser manages content) when focused. Sync DOM-to-state on `blur` only. Never re-render contentEditable content while user is typing or cursor position is destroyed.

**Data flow:** CVFormData (CVContext) → useDirectEditor (local copy, undo stack) → WebCVTemplate → EditableField components → user edits → EditableField onBlur → useDirectEditor updates local formData → CVContext.setFormData (for save/version/AI features).

**Start with med-length-proff-cv template** (single-column, standard LaTeX commands, EB Garamond freely available, 112-line resume.cls, simplest) NOT Deedy (two-column complexity, fixed layout constraints).

### Critical Pitfalls

1. **React Reconciler Fights contentEditable DOM Mutations** — React's virtual DOM reconciler overwrites user edits or throws cursor to position 0 when it re-renders contentEditable elements. **Avoid:** Use `useRef` (not `useState`) for contentEditable innerHTML. Sync to CVFormData on `blur`, not every keystroke. Set `suppressContentEditableWarning={true}`. Use `contenteditable="plaintext-only"` to strip rich formatting. **Address in Phase 1** — this must be validated first in a spike.

2. **CSS Cannot Match LaTeX Typography (The "Pixel-Perfect" Illusion)** — LaTeX uses Knuth-Plass line-breaking, CSS uses greedy. Same paragraph wraps differently. Micro-typography (ligatures, kerning, optical margin alignment via `microtype`) differs. **Avoid:** Redefine "pixel-perfect" as "visually equivalent" (same font, margins, visual hierarchy, 95%+ match). Do NOT chase 1-2px line-height differences. Match visual structure, accept text reflow differences. **Address in Phase 1** — set visual fidelity bar explicitly at project start.

3. **Cursor Position Lost on Data Model Sync** — User typing, `input` event fires, component syncs to CVFormData, re-render destroys cursor position. **Avoid:** Never re-render contentEditable while focused. DOM is source of truth during editing, CVFormData updated on blur. Use React `key` strategy for stable field identity. Gate re-renders: if `document.activeElement` is inside component, skip re-render. **Address in Phase 1** — inseparable from Pitfall 1.

4. **Browser-Generated HTML Chaos in contentEditable** — Chrome produces `<div>`, Firefox produces `<br>` on Enter. Paste from Word produces nested `<span>` soup. **Avoid:** Use `contenteditable="plaintext-only"` for all fields (CV fields are plain text). Intercept paste events, extract `text/plain`, insert manually. Individual contentEditable per bullet, not one large block. Do NOT use deprecated `document.execCommand()`. **Address in Phase 1** — the `plaintext-only` vs `true` decision must be made per-field upfront.

5. **Undo/Redo Breaks Across React-ContentEditable Boundary** — Browser's native undo stack is destroyed by React re-renders or includes DOM mutations from React reconciliation (not just user edits). **Avoid:** Build custom undo/redo stack at CVFormData level. Intercept Cmd+Z/Cmd+Shift+Z via `onKeyDown`, `preventDefault()`, apply your own undo logic. Store CVFormData snapshots on each meaningful edit (blur, or debounced after typing pauses). **Address in Phase 2** — not needed for MVP editing but table-stakes UX.

6. **Data Model Sync Creates Phantom Entries via Index Drift** — CVFormData uses arrays with positional indices. AI suggestions reference `workExperience[2].bullets[1]`. User deletes `workExperience[1]`, suggestion now points to wrong entry. **Avoid:** Add stable IDs (`id: string` UUID) to every array entry in CVFormData. AI suggestion `fieldPath` should reference entries by ID, not index: `workExperience[id:abc123].bullets[2]`. Update `formDataPatch.ts` to resolve ID-based paths. **Address in Phase 1 (data model prep)** — adding IDs is prerequisite for reliable editing and AI integration.

7. **Drag-and-Drop Conflicts with contentEditable Text Selection** — When element is `draggable`, browser disables normal text selection. User clicks bullet expecting to edit, but initiates drag operation. **Avoid:** Never set `draggable` on elements containing contentEditable children. Use dedicated drag handle (grip icon) as the ONLY draggable element. Separate interaction zones: grip area = drag, content area = edit. Consider replacing HTML5 DnD with `@dnd-kit/core` (uses pointer events, no text selection conflict). **Address in Phase 2** — must be addressed when adding reordering.

8. **The Two-Column Template (Deedy) Makes contentEditable Layout Nearly Impossible** — Two-column layouts are fundamentally more complex for contentEditable (cursor navigation bizarre, section reordering constrained to within-column). **Avoid:** Start with single-column template (mcdowell-cv or med-length-proff-cv) for first implementation. For Deedy, treat each column as separate editing context, section reordering only within column (matching existing constraint). Do NOT use CSS `column-count` for two-column layout (use explicit grid/flexbox). **Address in Phase 3+** — defer Deedy until single-column architecture proven.

## Implications for Roadmap

Based on research, suggested phase structure follows critical path: **Visual fidelity → Click-to-edit → Add/Delete → Undo/Redo → AI integration**. Data model preparation (adding stable IDs) is a prerequisite for Phase 1.

### Phase 0: Data Model Prep
**Rationale:** Stable IDs on CVFormData array entries are a prerequisite for reliable editing, undo/redo, and AI integration. This must happen before building the editing layer.
**Delivers:** CVFormData with `id` field on every array entry (WorkEntry, EducationEntry, SkillCategory, etc.). Migration logic to assign IDs to existing saved versions. Updated `formDataPatch.ts` to resolve ID-based paths.
**Addresses:** Pitfall 6 (index drift). Foundation for all subsequent phases.
**Avoids:** Phantom entries, undo targeting wrong data, AI suggestions applying to wrong bullets.

### Phase 1: The Editable CV (Foundation)
**Rationale:** Prove the core editing architecture with the simplest template. This phase validates the uncontrolled-while-focused pattern, contentEditable-React contract, and CSS-to-LaTeX visual matching. If Phase 1 fails, the entire approach must be reconsidered.
**Delivers:** Read-only web CV template (med-length-proff-cv) with pixel-equivalent CSS, EditableField component with correct React-contentEditable contract, click-to-edit on all fields, add/delete entries, multi-line bullet editing, empty state placeholders, auto-save.
**Addresses:** Table stakes: click-to-edit, visual fidelity, add/delete, multi-line bullets, empty state, auto-save. Must address Pitfalls 1, 2, 3, 4 (critical).
**Uses:** Native contentEditable, Selection API, useDirectEditor hook, CSS custom properties + Grid/Flexbox, EB Garamond web font.
**Avoids:** React reconciler clobbering edits, cursor position loss, browser HTML chaos, CSS "pixel-perfect" scope creep.
**Research flag:** Phase 1 needs a technical spike (1-2 days) to validate the uncontrolled-while-focused pattern works reliably in Chrome/Firefox/Safari before committing to full implementation.

### Phase 2: Polish and Power
**Rationale:** Phase 1 proves "it works," Phase 2 makes "it feels good." Undo/redo is table-stakes UX that must be designed correctly (not retrofitted). Keyboard navigation and drag-and-drop reordering add power-user efficiency.
**Delivers:** Custom undo/redo stack with Cmd+Z/Cmd+Shift+Z, keyboard shortcuts and field navigation (Tab/Shift+Tab), section visibility toggles, content overflow warning (page count, page break indicators), drag-and-drop section reordering, smart date entry.
**Addresses:** Table stakes: undo/redo, keyboard shortcuts, section toggles. Differentiators: drag-and-drop section reordering, content overflow warning.
**Uses:** useReducer action history for undo stack, @dnd-kit/core for reordering (replaces custom HTML5 DnD).
**Avoids:** Pitfall 5 (undo/redo breaks), Pitfall 6 (drag-and-drop conflicts with text selection).
**Research flag:** Standard patterns for undo/redo and drag-and-drop libraries. No deep research needed.

### Phase 3: AI Integration
**Rationale:** Adapt existing AI features (tailor suggestions, import, apply-to-job) to work with the web CV editor. AI suggestions appear as inline diffs on the CV itself (not side panel) — major differentiator vs. all competitors.
**Delivers:** AI inline suggestions (accept/reject on CV with diff highlighting), AI writing assist per-field (sparkle icon → alternatives), real-time match score updates (debounced re-analysis on edit), adapt Import flow to populate web CV editor, adapt Apply to Job flow to work with web CV editor.
**Addresses:** Differentiators: AI inline suggestions, AI writing assist, real-time match score.
**Uses:** Existing AI endpoints (`/chat/match-analysis`, `/api/tailor/suggest-changes`), TailorChange model (fieldPath + currentValue + alternatives), formDataPatch utility (now ID-based paths).
**Avoids:** Applying AI suggestions while user is actively typing (check `document.activeElement`, queue changes, apply on blur). Integration gotcha from Pitfall research.
**Research flag:** No new AI research needed (backend endpoints exist). UX research for inline diff presentation may be needed (how to highlight changed text clearly without overwhelming the CV).

### Phase 4: Route Integration
**Rationale:** Replace the existing form builder (`/build/form` → CVFormBuilder) with the new direct edit screen. Version save/load, template switching, and PDF download already work through CVContext — minimal changes needed.
**Delivers:** DirectEditScreen route component, replace `/build/form` → DirectEditScreen, tune sidebar integration with useDirectEditor, version save/load through CVContext, download PDF button (compiles LaTeX from CVFormData at download time only).
**Addresses:** Integration with existing flows (Build, Tune, Dashboard).
**Uses:** Existing CVContext, version storage, LaTeX compilation endpoints.
**Avoids:** Pitfall 7 integration gotcha (version switching while field has unsaved edits — trigger blur first).
**Research flag:** No research needed. Standard React Router integration.

### Phase 5: Additional Templates (Future)
**Rationale:** Prove the architecture with one template first, then expand. McDowellTemplate next (single-column, Times New Roman system font, no font loading complexity). DeedyResumeTemplate last (two-column, hardest, fixed layout constraints).
**Delivers:** McDowellTemplate web version, DeedyResumeTemplate web version, template-specific CSS Modules, font loading for Lato + Raleway (Deedy).
**Addresses:** Template switching for all 3 templates.
**Uses:** CSS custom properties per template, Fontsource for Lato + Raleway, column-specific editing contexts for Deedy.
**Avoids:** Pitfall 8 (two-column template complexity — defer Deedy until single-column proven, use column-specific editing contexts, disable cross-column reordering).
**Research flag:** No deep research needed. Visual CSS matching effort per template (~2-3 days each).

### Phase Ordering Rationale

- **Phase 0 before Phase 1:** Stable IDs are a prerequisite for reliable editing, undo, and AI features. Adding them later requires retrofitting all path references.
- **Phase 1 is the critical path:** If the React-contentEditable contract is wrong, everything built on top fails. Phase 1 must be a technical spike that validates the architecture before committing to full implementation.
- **Phase 2 before Phase 3:** Undo/redo must handle user edits before it can handle AI-suggested edits. Keyboard navigation must work before AI inline suggestions can use it (Tab to next suggestion).
- **Phase 3 before Phase 4:** AI features should work in isolation (within DirectEditScreen) before integrating with existing routes. Easier to debug AI suggestion issues when not entangled with route navigation.
- **Phase 5 last:** Additional templates are an expansion, not a core feature. Proving the architecture with one template is the milestone. Deedy's two-column complexity should not block earlier phases.

This ordering avoids the critical pitfalls identified in research (Pitfalls 1-8 mapped to phases in PITFALLS.md). Dependencies from FEATURES.md are respected: visual fidelity → click-to-edit → add/delete → undo/redo → AI integration. Architecture components from ARCHITECTURE.md have clear build order: WebCVPage → TemplateStylesheet → WebCVTemplate → EditableField → useDirectEditor → ContextualControls → DirectEditScreen.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Technical spike (1-2 days) to validate uncontrolled-while-focused pattern across browsers. Test contentEditable cursor management, paste handling, Selection API save/restore in Chrome/Firefox/Safari before committing to full implementation.
- **Phase 3:** UX research for inline diff presentation (how to highlight AI-suggested changes clearly without overwhelming the CV visual design). May need design iteration.

Phases with standard patterns (skip research-phase):
- **Phase 0:** Data model migration is straightforward (assign UUID to each entry on load, update path resolution). Standard pattern, well-documented.
- **Phase 2:** Undo/redo stack and keyboard navigation are standard React patterns. @dnd-kit has excellent docs and examples.
- **Phase 4:** React Router integration is standard, no special research needed. Existing CVContext handles version management.
- **Phase 5:** CSS-to-LaTeX matching is manual effort, not research. Visual comparison testing, not technical unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Native contentEditable is well-documented (MDN, React docs, W3C specs). Web fonts via Fontsource are proven. @dnd-kit is actively maintained with React 19 support. The "do NOT use Tiptap/Lexical/Slate" decision is based on direct analysis of their document models vs. CVFormData structure. |
| Features | MEDIUM-HIGH | Competitive analysis of 7+ CV builders (Enhancv, Resume.io, FlowCV, Rezi, Canva, Overleaf, Reactive Resume) shows clear table stakes and differentiators. The "document IS the editor" approach is novel for CV space but follows patterns from Notion/Craft. Anti-features are well-justified. |
| Architecture | HIGH | The uncontrolled-while-focused pattern is documented in React docs and multiple contentEditable libraries (react-contenteditable, Slate migration guide). Component boundaries map cleanly to CVFormData structure. CSS-to-LaTeX mapping tables are derived from direct .cls file inspection. |
| Pitfalls | HIGH | Critical pitfalls (1-8) are sourced from MDN, W3C specs, Guardian Scribe inconsistencies doc, react-contenteditable warnings, and React docs caveats. These are known, documented problems with contentEditable, not speculation. Recovery strategies and phase mapping are explicit. |

**Overall confidence:** HIGH

The recommended approach (native contentEditable, NOT rich text framework) is technically sound and well-justified. The critical pitfalls are documented and preventable with correct architecture from Phase 1. The visual fidelity expectation is explicitly scoped to "visually equivalent" (not pixel-perfect). The phase ordering respects dependencies and avoids premature complexity (Deedy two-column deferred).

### Gaps to Address

- **Font metrics precision:** EB Garamond web font (Google Fonts OTF) vs. LaTeX T1-encoded Type 1 outlines may have different hinting/kerning. Accept this as "close enough" (95%+ visual match) or switch to med-length template with Times New Roman (exact match) for Phase 1. **Resolution:** Visual regression test with overlay comparison, set tolerance threshold at project start.

- **IME (CJK) input handling:** Research documents the pitfall (intercept `compositionstart`/`compositionend`, suppress sync during composition) but this needs validation with actual Chinese/Japanese/Korean text input. **Resolution:** Add IME testing to Phase 1 acceptance criteria. If not working, gate sync with composition event handlers.

- **Browser compatibility beyond Chrome:** Research cites `contenteditable="plaintext-only"` support (Chrome 84+, Firefox 120+, Safari 16.4+) but project constraints say "modern browsers only." Confirm minimum browser versions in PROJECT.md match these requirements. **Resolution:** Document browser support matrix in Phase 1, test in all three browsers during spike.

- **Existing drag-and-drop pattern reuse:** Current codebase uses custom HTML5 DnD with `data-drag-card` + grip `onMouseDown`. Research recommends @dnd-kit for better accessibility and text selection conflict avoidance. **Resolution:** Phase 2 evaluates whether existing pattern can be adapted (add text selection guards) or must be replaced with @dnd-kit. Both are viable, @dnd-kit is safer.

- **AI suggestion inline diff UX:** How to visually present AI-suggested text changes on the CV itself without overwhelming the design? No mockups exist. **Resolution:** Phase 3 needs UX design iteration. Start with simple approach (highlight changed text with accept/reject buttons inline, similar to Google Docs suggestions), iterate based on user feedback.

## Sources

### Primary (HIGH confidence)
- MDN Web Docs (contentEditable, beforeinput, Selection API, CompositionEvent, InputEvent, @page, font-kerning, text-rendering, font-feature-settings, Drag and Drop API)
- W3C Input Events Level 2 spec (46 input types including historyUndo/historyRedo)
- React official docs (contentEditable caveats, suppressContentEditableWarning)
- Tiptap docs (v3 overview, React install, extensions) — evaluated and rejected
- Lexical docs (intro, React setup, custom nodes) — evaluated and rejected
- Slate.js docs (interfaces) — evaluated and rejected
- ProseMirror Guide (architecture reference) — evaluated and rejected
- Fontsource docs and npm (EB Garamond 5.2.7, Lato 5.2.7, Raleway 5.2.8)
- @dnd-kit/core documentation
- Existing codebase (resume.cls, mcdowellcv.cls, deedy-resume-openfont.cls, CVFormData types, formDataPatch.ts)

### Secondary (MEDIUM confidence)
- Guardian Scribe: Browser inconsistencies in contentEditable (Chrome vs Firefox differences)
- react-contenteditable: useState incompatibility documentation
- Competitive analysis (Enhancv, Resume.io, FlowCV, Rezi, Reactive Resume, Standard Resume, Overleaf, Canva)
- NNGroup direct manipulation principles
- Smashing Magazine WYSIWYG editor patterns
- Smashing Magazine CSS for Print (older article but CSS paged media principles stable)
- Notion keyboard shortcuts and editor patterns
- Craft editor patterns

### Tertiary (LOW confidence)
- Training data synthesis of contentEditable patterns (MEDIUM-LOW confidence)

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
