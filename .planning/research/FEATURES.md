# Feature Landscape: Direct-Edit Web CV Editor

**Domain:** WYSIWYG CV/resume builder with inline editing
**Researched:** 2026-03-29
**Overall confidence:** MEDIUM-HIGH (based on analysis of Enhancv, Canva, Resume.io, FlowCV, Rezi, Standard Resume, Reactive Resume, Overleaf, Notion, Craft, and general WYSIWYG editor patterns from Tiptap/Slate/ProseMirror ecosystems)

---

## Table Stakes

Features users expect from a direct-edit CV experience. Missing any of these and the editor feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Click-to-edit text** | Core promise of WYSIWYG; every CV builder and doc editor supports this | Medium | `contenteditable` on text spans mapped to CVFormData fields. Must handle focus, blur, caret positioning. Biggest challenge: structured fields like dates, links |
| **Visual fidelity to PDF output** | Users must trust that what they see is what they download; if web version looks different from PDF, trust collapses | High | CSS matching LaTeX typography (fonts, spacing, margins). Perfect fidelity is unrealistic; "close enough" (95%+) is the bar. Start with simplest single-column template |
| **Add new entries** | Users need to add jobs, education, bullets, skills. Without this, the editor is read-only | Medium | Contextual "+" buttons that appear on hover/focus near each section. Must insert into the correct position in CVFormData array |
| **Delete entries** | Complement to add; users need to remove content they don't want | Low | X/trash icon on hover. Confirm for major entries (entire job), immediate for bullets |
| **Undo/redo** | Universal expectation from any editor; Cmd+Z is muscle memory | Medium | Must track CVFormData state changes. A simple state history stack (snapshots or commands) works. 50+ undo levels is the norm |
| **Keyboard shortcuts** | Bold (Cmd+B), undo (Cmd+Z), redo (Cmd+Shift+Z) are universal | Low-Medium | Map to formatting operations where relevant. CV content is mostly plain text, so this is mainly undo/redo + navigation shortcuts |
| **Auto-save / save indicator** | Users panic about losing work; every modern editor auto-saves | Low | Debounced save to backend on CVFormData changes. Show save status indicator (Saved / Saving...) |
| **Template switching** | Users expect to try different looks without re-entering data | Low (existing) | Already exists via CVFormData as source of truth. New: re-render web template component when template changes |
| **PDF download** | The whole point; user needs to get a real PDF out | Low (existing) | Already exists. Compile LaTeX at download time from CVFormData. No change needed |
| **Empty state guidance** | New users staring at a blank template need direction | Low | Placeholder text in empty fields ("Your Name", "Job Title at Company"). Ghost text that disappears on focus |
| **Section visibility toggles** | Users need to hide/show optional sections (Projects, Awards) without deleting data | Low | Toggle per section. Hidden sections are collapsed/invisible on the CV but data preserved in CVFormData |
| **Multi-line bullet editing** | Work experience bullets are the core of a CV; editing must feel natural | Medium | Enter creates new bullet, Backspace on empty bullet deletes it, Tab/Shift+Tab for indentation if supported. This is where contenteditable gets tricky |

---

## Differentiators

Features that set the product apart from the pack. Not expected by default, but create "wow" moments and competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Drag-and-drop section reordering on the CV itself** | Most builders use a sidebar list for reordering; doing it directly on the CV feels magical | High | Drag handles on section headers. Must update `sectionOrder` in CVFormData. Animation during drag. Constraint: Deedy template has fixed two-column layout (disable for that template) |
| **Drag-and-drop entry reordering within sections** | Reorder work entries, education entries, bullets by dragging them on the CV | High | Finer-grained than section reordering. Drag handles on individual entries. Must update array order in CVFormData |
| **AI inline suggestions (accept/reject on the CV)** | Existing tailor suggestions shown as inline diffs directly on the CV text, not in a side panel | High | Highlight changed text with accept/reject controls inline. Merges TailorPanel UX into the CV surface itself. Major differentiator vs. all competitors |
| **AI writing assist per-field** | Click a sparkle icon on any bullet/field to get AI-generated alternatives | Medium | Context menu or icon button per field. Calls AI with field context + job description. Shows alternatives inline. Rezi and Enhancv have this but in sidebar form |
| **Real-time match score updates** | Score badge updates live as user edits, showing impact of each change | Medium | Debounced re-analysis on edit. Shows score trending up/down. Currently computed once; making it reactive is the upgrade |
| **Content overflow warning** | Visual indicator when content exceeds page boundary (1-page vs 2-page) | Medium | Render page break indicators. Warn when content pushes past target length. Show page count in real-time |
| **Smart date entry** | Type "2020" and it formats as "2020", type "Jan 2020 - Present" and it parses correctly | Medium | Date fields with structured input that accepts natural language dates. Avoids separate month/year dropdowns that break flow |
| **Contextual formatting toolbar** | Select text, floating toolbar appears (bold, italic, link) like Notion/Medium | Medium | Only relevant for fields that support formatting (summary, bullet points). Most CV content is plain text, so scope is limited |
| **Keyboard-driven section navigation** | Tab/Shift+Tab to move between fields, Enter to advance to next logical field | Medium | Makes editing fast for power users. Field ordering must follow visual layout of the template |
| **Inline link editing** | Click a link field, edit URL and label inline without a modal | Low-Medium | Links in personalInfo.links need URL + label editing. Inline approach avoids the modal popup pattern |

---

## Anti-Features

Features to explicitly NOT build. These are tempting but wrong for this product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Rich text / arbitrary formatting** | CVs have a fixed visual design per template. Letting users change fonts, sizes, and colors per-field creates ugly, inconsistent CVs and breaks LaTeX compilation | Formatting comes from the template. Users choose a template for the look; they edit content, not style |
| **Free-form layout editing (Canva-style)** | Canva lets you drag text boxes anywhere. This is a design tool, not a CV tool. It makes output unpredictable and LaTeX compilation impossible | Fixed template layouts. Users choose a template; the layout is predetermined and professional |
| **Real-time LaTeX compilation preview** | Compiling LaTeX on every keystroke is expensive and slow. The whole point of web rendering is to avoid this | Web-rendered CV IS the preview. LaTeX compiles only at download time |
| **Collaborative / multi-user editing** | Massively complex (CRDT, OT), and CV editing is inherently single-user | Single-user focus. Share via PDF/link export |
| **Full page/margin customization** | Template authors set margins/spacing for professional output. User-adjustable margins lead to bad formatting | Templates control layout. Advanced users can use the existing LaTeX editor escape hatch |
| **Spell-check implementation** | Browser already provides spell-check on contenteditable elements. Reimplementing is waste | Rely on browser native spell-check. It works automatically with contenteditable |
| **Section type creation (user-defined section schemas)** | Allowing users to create arbitrary section types (beyond additionalSections) adds massive complexity | The existing additionalSections with title/subtitle/bullets/dates schema handles 95% of cases. Offer a few preset types |
| **Mobile editing** | Direct manipulation on a CV-sized document doesn't work on small screens. Touch targets are too small, the document is too wide | Desktop-first. Mobile can view/download but not inline-edit. Show a "use desktop to edit" message |
| **Version diffing UI** | Showing diffs between CV versions is complex and not what users actually need when editing | Focus on undo/redo within a session. Version management (already built) handles before/after comparison |

---

## Feature Dependencies

```
Visual fidelity to PDF     ──> Click-to-edit text (need the rendered CV before making it editable)
Click-to-edit text         ──> Add new entries (must have working edit before add)
Click-to-edit text         ──> Delete entries
Click-to-edit text         ──> Multi-line bullet editing
Click-to-edit text         ──> Undo/redo (need editable state changes to undo)
Add new entries            ──> Drag-and-drop entry reordering (need multiple entries to reorder)
Undo/redo                  ──> AI inline suggestions (accept/reject must be undoable)
Click-to-edit text         ──> AI writing assist per-field (need editable fields to write into)
Click-to-edit text         ──> Real-time match score (need editable content to score against)
Visual fidelity to PDF     ──> Content overflow warning (need accurate rendering to detect overflow)
Empty state guidance       ──> (standalone, no dependency)
Section visibility toggles ──> (standalone, no dependency)
Auto-save                  ──> (standalone, triggers on any CVFormData change)
Template switching         ──> (standalone, re-renders web template)
PDF download               ──> (standalone, already exists)
```

Critical path: **Visual fidelity** -> **Click-to-edit** -> **Add/Delete** -> **Undo/Redo** -> **AI integration**

---

## MVP Recommendation

### Phase 1: The Editable CV (must ship first)

Prioritize:
1. **Visual fidelity to PDF** for one template (med-length-proff-cv, single column, simplest layout)
2. **Click-to-edit text** on all fields
3. **Add/delete entries** with contextual buttons
4. **Multi-line bullet editing** (Enter for new bullet, Backspace to delete empty)
5. **Undo/redo** (Cmd+Z / Cmd+Shift+Z)
6. **Empty state guidance** (placeholder text)
7. **Auto-save**

This is the "it works" phase. Users can create a CV by typing directly on it.

### Phase 2: Polish and Power

8. **Keyboard shortcuts** and field navigation
9. **Section visibility toggles**
10. **Content overflow warning**
11. **Smart date entry**
12. **Drag-and-drop section reordering**

This is the "it feels good" phase. Power users are efficient, the experience is polished.

### Phase 3: AI Integration

13. **AI inline suggestions** (adapt existing tailor flow to work on web CV)
14. **AI writing assist per-field**
15. **Real-time match score updates**
16. **Adapt Import flow** to populate web CV editor
17. **Adapt Apply to Job flow** to work with web CV editor

This is the "it's smart" phase. AI features that already exist in the backend get new, better UX on the web CV surface.

### Defer

- **Drag-and-drop entry reordering within sections**: High complexity, limited value compared to add/delete + section reorder. Can ship later.
- **Contextual formatting toolbar**: Limited applicability since CV content is mostly plain text. Nice-to-have polish.
- **Inline link editing**: Can use a simple popover/inline form initially.
- **Web templates for all 3 templates**: Start with 1, prove architecture, then expand.

---

## Competitive Landscape Summary

| Builder | Editing Model | Inline Edit | D&D Reorder | AI Integrated | Key Differentiator |
|---------|--------------|-------------|-------------|---------------|-------------------|
| Enhancv | Hybrid (form + preview) | Partial | Yes (sections) | Yes (content gen, tailoring) | One-click job tailoring |
| Resume.io | Form-based with preview | No | Yes (sections) | Yes (summary gen) | Guided step-by-step |
| FlowCV | Form-based with preview | No | Unknown | Yes (AI writer, paid) | 50+ templates |
| Rezi | Form-based | No | Unknown | Yes (AI agent, scoring, keywords) | AI resume agent chat |
| Reactive Resume | Form-based with preview | No | Yes | Limited | Open source, self-hostable |
| Standard Resume | Simplified form | No | No | No | Minimalist, auto-formatting |
| Canva | Full WYSIWYG design tool | Yes (design-level) | Yes (elements) | Yes (Magic Write) | Design freedom (anti-pattern for CVs) |
| Overleaf | Code + Visual toggle | Visual mode only | No | No | LaTeX editing |
| **CV-Maker (target)** | **Direct-edit on CV** | **Full inline** | **Yes (sections + entries)** | **Yes (inline suggestions)** | **"The CV IS the editor"** |

The key gap in the market: no builder offers true inline editing on a template-rendered CV with AI suggestions appearing as inline diffs on the document itself. Form-based builders dominate. Canva offers inline editing but as a generic design tool, not a structured CV tool. The "document IS the editor" approach is genuinely novel for the CV space.

---

## Sources

- Enhancv resume builder features (enhancv.com/resume-builder/) - MEDIUM confidence
- Resume.io builder features (resume.io) - MEDIUM confidence
- FlowCV builder features (flowcv.com) - MEDIUM confidence
- Rezi AI features (rezi.ai) - MEDIUM confidence
- Reactive Resume features (rxresu.me) - MEDIUM confidence
- Standard Resume features (standardresume.co) - MEDIUM confidence
- Overleaf editor features (overleaf.com) - HIGH confidence
- Tiptap editor framework (tiptap.dev) - HIGH confidence (Context7-level official docs)
- Notion keyboard shortcuts (notion.com/help) - HIGH confidence
- Craft editor patterns (craft.do) - MEDIUM confidence
- NNGroup direct manipulation principles (nngroup.com) - HIGH confidence
- Smashing Magazine WYSIWYG editor patterns (smashingmagazine.com) - HIGH confidence
- Training data synthesis of contenteditable patterns - MEDIUM confidence
