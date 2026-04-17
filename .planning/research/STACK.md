# Technology Stack: WYSIWYG CV Editing Layer

**Project:** Direct-Edit Web CV Editor
**Researched:** 2026-03-29
**Overall confidence:** HIGH

---

## Executive Decision: Plain contentEditable, Not a Rich Text Framework

The single most important stack decision for this project: **do not use Tiptap, Lexical, Slate, ProseMirror, or Plate.** Use native `contentEditable` with React-controlled components.

**Why this is the right call:**

1. **CV fields are plain text, not rich text.** Every field in `CVFormData` is a `string` or `string[]`. No bold-within-bullets, no inline links within text, no nested formatting. The data model is flat typed fields, not a document tree.

2. **The editing surface is structured, not free-form.** Users edit "company name," "bullet point #3," "skill category" -- each mapped to a specific path in CVFormData (e.g., `workExperience[0].bullets[2]`). This is field-level editing on a visual layout, not document authoring.

3. **Rich text frameworks fight this model.** Tiptap/ProseMirror maintain their own document model (a node tree with marks). You'd constantly sync between ProseMirror's model and CVFormData -- two sources of truth, with impedance mismatch. Lexical has the same issue. These frameworks solve the wrong problem.

4. **Bundle cost for unused features.** Tiptap core + StarterKit + React bindings: ~80-120KB min+gzip. Lexical core + React: ~22KB min+gzip but still abstracts away direct DOM control you need. Plain contentEditable: 0KB.

5. **Cursor management is simpler than it sounds.** The `beforeinput` event (Baseline since March 2021) gives you `inputType` and `data` before DOM modification. Combined with `contenteditable="plaintext-only"` (strips rich formatting on paste), you get clean text input with full control.

---

## Recommended Stack

### Inline Editing Layer

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Native `contentEditable="plaintext-only"` | Browser API | Text input on CV fields | HIGH |
| `beforeinput` event | Browser API | Intercept and control text changes before DOM mutation | HIGH |
| Selection API (`window.getSelection()`) | Browser API | Cursor position save/restore during React re-renders | HIGH |
| React `useReducer` + action history | React 19 | CVFormData state management with undo/redo | HIGH |

**How it works:**
- Each editable text span on the CV is a React component wrapping a `contentEditable="plaintext-only"` element
- `onBeforeInput` captures text changes, updates CVFormData via reducer dispatch
- React re-renders the CV from CVFormData (single source of truth)
- Cursor position is saved before render and restored after via Selection API
- No DOM-as-truth -- React state is always the authority

**Key API details:**
- `contentEditable="plaintext-only"`: Strips formatting on paste, prevents rich text insertion. Supported in Chrome 84+, Firefox 120+, Safari 16.4+. Modern browsers only (per project constraints).
- `beforeinput` event: Provides `inputType` (insertText, deleteContentBackward, insertFromPaste, etc.) and `data` string. Cancelable. Baseline Widely Available since March 2021.

### Template Rendering (CSS)

| Technology | Purpose | Confidence |
|------------|---------|------------|
| CSS custom properties (variables) | Template-specific dimensions, spacing, colors | HIGH |
| CSS Grid + Flexbox | Layout matching LaTeX templates | HIGH |
| CSS `@media print` + `@page` | PDF-matching print output (bonus, not primary) | MEDIUM |
| `aspect-ratio` + fixed dimensions | Page-like container (8.5in x 11in) | HIGH |
| `text-rendering: optimizeLegibility` | Enable kerning and ligatures for LaTeX-quality typography | HIGH |
| `font-kerning: normal` | Force kerning in all cases | HIGH |
| `font-variant-ligatures` | Control ligature behavior per template | HIGH |
| `font-feature-settings` | OpenType feature access for fine typography control | HIGH |

**Page container approach:**
CSS `@page` is print-only, not usable for on-screen layout. Instead, create a fixed-size `div` that simulates a page:
```css
.cv-page {
  width: 8.5in;
  height: 11in;
  padding: /* match template margins */;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  /* Typography baseline */
  text-rendering: optimizeLegibility;
  font-kerning: normal;
  -webkit-font-smoothing: antialiased;
}
```

Scale the page container to fit viewport using CSS `transform: scale()` with a wrapper.

### Web Fonts (Template-Specific)

The three LaTeX templates use different fonts. Each web template needs matching web fonts.

#### med-length-proff-cv (pdflatex)
| LaTeX Font | Web Equivalent | Package | Version | Confidence |
|------------|---------------|---------|---------|------------|
| EB Garamond (`\usepackage{ebgaramond}`) | EB Garamond | `@fontsource-variable/eb-garamond` | 5.2.7 | HIGH |

EB Garamond is the same typeface in both LaTeX and web. Fontsource variable package supports weights 400-800 with `wght` axis. Self-hosted WOFF2 via npm -- no external CDN dependency.

```bash
npm install @fontsource-variable/eb-garamond
```
```css
/* Import in entry point */
@import "@fontsource-variable/eb-garamond";

.template-med-length {
  font-family: "EB Garamond Variable", "EB Garamond", Georgia, serif;
  font-size: 11pt; /* match \documentclass[11pt] */
}
```

**Layout specifics from resume.cls:**
- Margins: top 0.3in, bottom 0.3in, left 0.2in, right 0.2in
- Name: `\huge\bfseries` (centered)
- Section headers: `\MakeUppercase{\textbf{...}}` with `\hrule` below
- Subsection: bold title `\hfill` date, italic subtitle `\hfill` italic location
- Bullets: `$\cdot$` prefix, 1em left margin, -0.4em item separation

#### mcdowell-cv (xelatex)
| LaTeX Font | Web Equivalent | Package | Version | Confidence |
|------------|---------------|---------|---------|------------|
| Times New Roman (`\setmainfont{Times New Roman}`) | Times New Roman | System font stack | N/A | HIGH |

Times New Roman is a system font on Windows and macOS. No npm package needed -- use system font stack.

```css
.template-mcdowell {
  font-family: "Times New Roman", Times, "Liberation Serif", serif;
  font-size: 11pt;
  font-feature-settings: "kern" 1;
  font-variant-ligatures: common-ligatures;
  /* McDowell uses microtype for letterspacing on small caps */
}
```

**Layout specifics from mcdowellcv.cls:**
- Margins: left 0.75in, top 0.6in, right 0.75in, bottom 0.6in
- Header: 3-column tabu table (address | NAME | contacts)
- Name: `\LARGE\textsc` with letterspace 110 (`\textls[110]`)
- Section headers: `\textsc{\textbf{...}}` with `\hrule` below
- Subsection: 3-column layout (left-bold | center-bold | right-bold)
- Content indented by 9pt on each side

**CSS small caps with letter-spacing to match `\textls[110]`:**
```css
.mcdowell-name {
  font-variant-caps: small-caps;
  letter-spacing: 0.11em; /* \textls[110] = 110/1000em */
  font-weight: bold;
  font-size: /* LARGE ~ 17.28pt at 11pt base */;
}
```

#### deedy-resume (xelatex)
| LaTeX Font | Web Equivalent | Package | Version | Confidence |
|------------|---------------|---------|---------|------------|
| Lato Light (body) | Lato | `@fontsource/lato` | 5.2.7 | HIGH |
| Lato Hairline (first name) | Lato Thin (100) | `@fontsource/lato` | 5.2.7 | HIGH |
| Lato Bold (subheadings) | Lato Bold | `@fontsource/lato` | 5.2.7 | HIGH |
| Raleway ExtraLight (date, location) | Raleway ExtraLight | `@fontsource-variable/raleway` | 5.2.8 | HIGH |
| Raleway Medium (contact) | Raleway Medium | `@fontsource-variable/raleway` | 5.2.8 | HIGH |

```bash
npm install @fontsource/lato @fontsource-variable/raleway
```
```css
@import "@fontsource/lato/100.css";  /* Hairline/Thin */
@import "@fontsource/lato/300.css";  /* Light (body) */
@import "@fontsource/lato/400.css";  /* Regular */
@import "@fontsource/lato/700.css";  /* Bold */
@import "@fontsource-variable/raleway";

.template-deedy {
  font-family: "Lato", sans-serif;
  font-weight: 300; /* Light = body default */
  color: #333; /* primary color from cls */
}
```

**Layout specifics from deedy-resume-openfont.cls:**
- Margins: hmargin 1.25cm, vmargin 0.75cm
- Two-column: `\begin{minipage}[t]{0.33\textwidth}` and `{0.66\textwidth}`
- Name: 40pt Lato Hairline (first) + Lato Light (last)
- Section: 16pt Lato Light, uppercase, small-caps
- Subsection: 12pt Lato Bold, uppercase
- Location/date: Raleway Medium 11pt / Raleway ExtraLight 8pt
- Header rule: `\rule{\paperwidth}{0.4pt}`

### State Management

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| `useReducer` + action history array | React 19 built-in | CVFormData mutations with undo/redo | HIGH |
| Immer | latest (10.x) | Deep immutable updates to CVFormData | MEDIUM |

**Undo/redo pattern (~50 lines):**
```typescript
type EditorState = {
  past: CVFormData[];
  present: CVFormData;
  future: CVFormData[];
};
// Dispatch 'UPDATE' pushes present to past, sets new present
// Dispatch 'UNDO' pops past, pushes present to future
// Dispatch 'REDO' pops future, pushes present to past
```

**Immer rationale:** CVFormData has deeply nested structures (`workExperience[i].bullets[j]`). Immer's `produce()` makes updates readable: `draft.workExperience[i].bullets[j] = newText` instead of multi-level spread. Recommend adopting if more than 3 levels of spreading appear during implementation.

### Drag-and-Drop

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @dnd-kit/core | 6.x (latest) | Section and entry reordering on the CV | HIGH |
| @dnd-kit/sortable | 10.x (latest) | Sortable list behavior for ordered items | HIGH |

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

**Why @dnd-kit over the existing custom HTML5 DnD:**
- Better accessibility (keyboard reordering, screen reader announcements)
- Smoother animations (transform-based, not layout-shifting)
- The existing custom DnD pattern (data-drag-card + mousedown) works for the current form builder but is insufficient for reordering on a pixel-perfect CV surface where visual feedback matters

**Why NOT react-beautiful-dnd:** Unmaintained (last release 2022). The Atlassian team built a replacement (Pragmatic Drag and Drop) but it targets Atlassian products, not general use.

### Backend (No Changes)

| Technology | Version | Purpose | Why Unchanged |
|------------|---------|---------|---------------|
| FastAPI | >=0.115.0 | API server | Web editor reads/writes CVFormData -- same API |
| LaTeX (pdflatex/xelatex) | TeX Live | PDF compilation | Fires at download time, not on edit |
| AWS Bedrock | existing | AI features | Import, Tailor, Apply to Job -- all CVFormData-based |

---

## Why NOT Each Alternative

### Rich Text Editor Frameworks

| Framework | Version (current) | React 19 | Why Not |
|-----------|-------------------|----------|---------|
| **Tiptap 3** | 3.21.0 | Yes (`^17 \|\| ^18 \|\| ^19`) | ProseMirror-based document model is designed for free-form rich text. CV editing is structured field editing. You'd define custom nodes for every CV field type, then constantly sync ProseMirror's internal model with CVFormData. Two sources of truth = bugs. Pro extensions (comments, collaboration, version history) are paid and irrelevant here. |
| **Lexical** | 0.42.0 | Yes (devDeps pin `^19.1.1`) | Still pre-1.0. Meta's replacement for Draft.js. DecoratorNode for custom React components is powerful but means wrapping every CV field in a Lexical node -- overhead without benefit when the field is a plain text string. Custom node boilerplate (getType, clone, importJSON, createDOM, updateDOM) for each field type. |
| **Slate.js** | beta | Yes | Perpetually in beta. Breaking changes expected. Custom element model (`Element` / `Text` nodes) is another document tree that doesn't map to typed CVFormData fields. |
| **Plate** | v48+ | Yes (built on Slate) | Higher-level Slate wrapper with extensive plugins. Massive bundle. Designed for building editors like Notion. Total overkill for a CV with typed text fields. |
| **Draft.js** | deprecated | No | Deprecated by Meta. Do not use. |
| **ProseMirror (raw)** | 1.x | Framework-agnostic | Lower-level than Tiptap. Same document model mismatch problem, but now without Tiptap's React convenience layer. More work for the same wrong abstraction. |

### The Framework Temptation

It's tempting to reach for Tiptap because it handles cursor management, undo/redo, and keyboard shortcuts out of the box. But:

1. **Cursor management** with contentEditable + Selection API is ~30 lines of utility code for this use case (save offset, restore after React render). Tiptap adds 80KB+ for this.
2. **Undo/redo** is a state history array (~50 lines). Tiptap's undo/redo operates on its own document model, not CVFormData -- you'd need to bridge them.
3. **Keyboard shortcuts** (Tab to next field, Enter for new bullet, Escape to deselect) are `onKeyDown` handlers. Tiptap's keyboard shortcut system is more powerful than needed.

The complexity trade is: a few hundred lines of focused utility code vs. a framework dependency that requires constant translation between two data models.

### Alternative Editing Approaches

| Approach | Why Not |
|----------|---------|
| `<input>` / `<textarea>` overlays on the CV | Breaks the illusion of editing the document directly. Visible form controls on a visual CV is what we're trying to eliminate. |
| Popup/modal editing (click text, modal opens) | Extra clicks. Indirect editing. Defeats "the CV itself is the editor" principle. |
| Side-panel form synced with preview | This is the current architecture being replaced. |
| Full virtual DOM for contentEditable (like Lexical) | Over-engineered for plain text fields. Lexical's virtual DOM reconciler is for rich text documents. |

---

## Installation (New Dependencies Only)

```bash
cd frontend

# Web fonts (per-template, install for templates being built)
npm install @fontsource-variable/eb-garamond    # med-length-proff-cv
npm install @fontsource/lato @fontsource-variable/raleway  # deedy-resume
# mcdowell-cv: Times New Roman is a system font, no package needed

# Drag-and-drop (upgrade from custom HTML5 DnD)
npm install @dnd-kit/core @dnd-kit/sortable

# Optional: deep state updates
npm install immer
```

**What is NOT being installed:**
- No `@tiptap/*` packages
- No `lexical` or `@lexical/react`
- No `slate` or `slate-react`
- No `prosemirror-*` packages
- No rich text editor framework of any kind

---

## CSS Typography Reference

### Matching LaTeX Quality in CSS

LaTeX produces excellent typography because it runs Knuth's line-breaking algorithm and has extensive kerning tables. CSS can't replicate this exactly, but can get close:

```css
/* Base typography for all templates */
.cv-page {
  text-rendering: optimizeLegibility;
  font-kerning: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-variant-ligatures: common-ligatures;
  line-height: 1.2; /* LaTeX default is ~1.2x font size */
  hyphens: auto; /* CSS hyphenation, close to LaTeX */
  word-spacing: normal;
}

/* LaTeX font size commands (at 11pt base) */
/* \tiny: 6pt, \scriptsize: 8pt, \footnotesize: 9pt */
/* \small: 10pt, \normalsize: 11pt, \large: 12pt */
/* \Large: 14.4pt, \LARGE: 17.28pt, \huge: 20.74pt */
/* \Huge: 24.88pt */
```

### What CSS Cannot Replicate
| LaTeX Feature | CSS Limitation | Mitigation |
|---------------|---------------|------------|
| Knuth-Plass line breaking | CSS uses greedy line breaking | `text-wrap: pretty` (Chrome 117+) improves this |
| Micro-typography (protrusion) | No CSS equivalent | Accept the difference -- invisible at CV scale |
| `\textls[N]` (tracking) | `letter-spacing` is close | `letter-spacing: N/1000em` is a good approximation |
| `\vspace*{Xpt}` precision | CSS gap/margin in pt | Use `pt` units directly in CSS for exact values |
| `\hfill` (flexible space) | `justify-content: space-between` or `margin-left: auto` | Flexbox handles this well |

### LaTeX Unit to CSS Unit Mapping
| LaTeX | CSS | Notes |
|-------|-----|-------|
| `pt` | `pt` | Same unit (1pt = 1/72 inch) |
| `em` | `em` | Same concept (relative to font size) |
| `in` | `in` | Same unit |
| `cm` | `cm` | Same unit |
| `\textwidth` | `100%` (of content box) | After margins are applied |
| `\baselineskip` | `line-height * font-size` | Not a direct mapping |
| `\parskip` | `margin-bottom` on paragraphs | Use CSS custom property |

---

## Sources

| Source | Confidence | Verified |
|--------|------------|----------|
| Tiptap docs (tiptap.dev/docs) - v3 overview, React install, extensions, styling, performance, NodeViews, schema | HIGH | WebFetch 2026-03-29 |
| Tiptap @tiptap/react package.json - React peer dep `^17 \|\| ^18 \|\| ^19` | HIGH | WebFetch (GitHub) 2026-03-29 |
| Tiptap GitHub releases - v3.21.0 released March 27 2026 | HIGH | WebFetch 2026-03-29 |
| Lexical docs (lexical.dev) - intro, React setup, custom nodes | HIGH | WebFetch 2026-03-29 |
| Lexical package.json - React 19.1.1 in devDeps | HIGH | WebFetch (GitHub) 2026-03-29 |
| Lexical npm - v0.42.0 released March 19 2026 | HIGH | npm view 2026-03-29 |
| Slate.js docs - still in beta | MEDIUM | WebFetch 2026-03-29 |
| Plate (platejs.org) - v48+ on Slate | MEDIUM | WebFetch 2026-03-29 |
| ProseMirror guide (prosemirror.net) - architecture | HIGH | WebFetch 2026-03-29 |
| MDN contentEditable, beforeinput, Selection API, @page, font-kerning, text-rendering, font-feature-settings | HIGH | WebFetch 2026-03-29 |
| Fontsource docs and npm - EB Garamond 5.2.7, Lato 5.2.7, Raleway 5.2.8 | HIGH | npm view + WebFetch 2026-03-29 |
| Computer Modern web fonts (github.com/bitmaks/cm-web-fonts) - OFL license, CDN delivery | MEDIUM | WebFetch 2026-03-29 |
| LaTeX template .cls files (resume.cls, mcdowellcv.cls, deedy-resume-openfont.cls) | HIGH | Direct file read 2026-03-29 |
| CVFormData types (frontend/src/types/index.ts) - all fields are plain string/string[] | HIGH | Direct file read 2026-03-29 |
