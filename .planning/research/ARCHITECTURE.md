# Architecture Patterns

**Domain:** WYSIWYG direct-edit CV editor with template-based rendering
**Researched:** 2026-03-29

## Recommended Architecture

The architecture follows a **Model-View-Controller** pattern adapted for React, where CVFormData is the immutable model, web template components are the view, and a new `useDirectEditor` hook is the controller that mediates between contentEditable DOM mutations and structured state updates.

### High-Level Component Map

```
                     CVContext (existing)
                         |
                    CVFormData (source of truth)
                         |
              +----------+----------+
              |                     |
       useDirectEditor          LaTeX Pipeline (existing)
       (new controller)         (download-time only)
         /    |    \
        /     |     \
  WebCV     EditableField    ContextualControls
  Template   Components       (+ buttons, drag
  Component  (contentEditable)  handles, delete)
```

### Why Not Use a Rich Text Editor Library (Tiptap/Slate/Lexical/ProseMirror)

The temptation is to reach for Tiptap, Slate, or Lexical. **Do not.** These libraries solve a fundamentally different problem: editing a document whose structure IS the content (paragraphs, headings, lists in freeform order). This project has:

1. **A fixed, known schema** (CVFormData) that defines exactly what fields exist.
2. **No freeform content** -- users cannot create arbitrary paragraphs or headings; they edit specific fields (company name, bullet text, skill category).
3. **Template-driven layout** -- the visual structure comes from the template, not from user formatting choices.

Using a rich text editor would require mapping its document model to/from CVFormData on every keystroke, fighting the library's own schema system, and losing the direct correspondence between visual elements and data fields. The result would be more complex, not less.

**The right approach is controlled `contentEditable` fields** on individual text spans within a template component. Each editable span maps to exactly one field path in CVFormData (e.g., `workExperience[0].company`). This is closer to an editable spreadsheet than a document editor.

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **WebCVTemplate** (per-template) | Pure rendering of CVFormData into HTML/CSS that visually matches the LaTeX output | Receives CVFormData as props; emits nothing |
| **EditableField** | Wraps a single text span with `contentEditable="plaintext-only"`, handles focus/blur/input events, syncs back to data model | Receives field value + field path; calls `onFieldChange(path, value)` |
| **EditableBulletList** | Manages an ordered list of editable bullets with Enter-to-add, Backspace-to-remove-empty, drag-to-reorder | Receives bullets array + path prefix; calls `onBulletsChange` |
| **ContextualControls** | Hover-revealed "+" buttons, delete buttons, drag handles that appear on sections/entries | Calls add/remove/reorder callbacks on useDirectEditor |
| **useDirectEditor** (hook) | Central controller: holds CVFormData state, provides field-level update functions, manages undo/redo stack, handles section operations | Reads/writes CVFormData from/to CVContext |
| **DirectEditScreen** (page) | Top-level route component: renders toolbar + WebCVTemplate + sidebar (for tune mode) | Composes useDirectEditor + WebCVTemplate + ContextualControls |
| **WebCVPage** | A4/Letter-sized container with proper dimensions, margins, overflow handling | Wraps WebCVTemplate content in a page-sized box |
| **TemplateStylesheet** (per-template) | CSS Module that reproduces the LaTeX template's typography, spacing, and layout | Imported by WebCVTemplate |

## Data Flow

### Edit Flow (user types on CV)

```
User clicks "Software Engineer" on the CV
  -> EditableField receives focus
  -> Browser's contentEditable handles typing natively
  -> User finishes editing (blur / Enter / Tab)
  -> EditableField reads textContent from DOM
  -> Calls onFieldChange("workExperience[0].title", "Senior Software Engineer")
  -> useDirectEditor updates CVFormData immutably
  -> React re-renders WebCVTemplate with new data
  -> EditableField receives new value prop (but skips DOM update if focused)
```

**Critical detail:** While a field is focused, the component must NOT re-render its DOM content from props. The user is actively typing and the browser's contentEditable is managing the cursor position. Only on blur does the component synchronize. This is the "uncontrolled while focused, controlled while blurred" pattern.

### Add Entry Flow (user clicks "+" button)

```
User hovers over Work Experience section
  -> ContextualControls shows "+" button below last entry
  -> User clicks "+"
  -> useDirectEditor.addWorkEntry() appends empty WorkEntry to formData
  -> React re-renders with new entry
  -> Auto-focus placed on first editable field of new entry
```

### Reorder Flow (user drags a work entry)

```
User grabs drag handle on a work entry card
  -> Uses existing drag-and-drop pattern (data-drag-card attribute)
  -> onDrop resolves source/target indices
  -> useDirectEditor.reorderWorkEntries(from, to)
  -> React re-renders with new order
```

### Download Flow (user clicks Download PDF)

```
User clicks "Download PDF" button
  -> DirectEditScreen calls api.generateLatex(formData) (existing endpoint)
  -> Then calls api.compileLatex(texContent, templateId) (existing endpoint)
  -> Receives base64 PDF
  -> Triggers browser download
  -> NO compilation during editing -- only at download time
```

### AI Tailor Flow (existing, adapted)

```
User enters job description in sidebar tune panel
  -> api.suggestTailorChanges(formData, jobDescription) (existing endpoint)
  -> Returns TailorChange[] with field-level suggestions
  -> User accepts a change -> applyTailorChanges patches CVFormData (existing utility)
  -> useDirectEditor receives new formData
  -> WebCVTemplate re-renders with highlighted changed fields
```

### Data Flow Direction Summary

```
CVFormData (CVContext)
    |
    v [read]
useDirectEditor (local copy, undo stack)
    |
    v [props: value, fieldPath]
WebCVTemplate -> EditableField components
    |
    v [user edits]
EditableField onBlur -> onFieldChange callback
    |
    v [update]
useDirectEditor updates local formData
    |
    v [sync]
CVContext.setFormData (for save/version/AI features)
```

## Patterns to Follow

### Pattern 1: Uncontrolled-While-Focused EditableField

This is the most critical pattern in the entire architecture. contentEditable and React state are fundamentally at odds -- React wants to own the DOM, but contentEditable means the browser owns it during editing.

**What:** An EditableField component that behaves as controlled (React sets content) when not focused, and uncontrolled (browser manages content) when focused.

**When:** Every inline-editable text span on the web CV.

**Example:**
```typescript
interface EditableFieldProps {
  value: string;
  fieldPath: string;
  onFieldChange: (path: string, value: string) => void;
  placeholder?: string;
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'p';
  className?: string;
  multiline?: boolean;
}

function EditableField({
  value, fieldPath, onFieldChange, placeholder, tag: Tag = 'span',
  className, multiline = false,
}: EditableFieldProps) {
  const ref = useRef<HTMLElement>(null);
  const isFocused = useRef(false);

  // Sync DOM from props ONLY when not focused
  useEffect(() => {
    if (!isFocused.current && ref.current) {
      if (ref.current.textContent !== value) {
        ref.current.textContent = value;
      }
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    const newValue = ref.current?.textContent ?? '';
    if (newValue !== value) {
      onFieldChange(fieldPath, newValue);
    }
  }, [value, fieldPath, onFieldChange]);

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === 'Escape') {
      // Revert to original value
      if (ref.current) ref.current.textContent = value;
      ref.current?.blur();
    }
  }, [value, multiline]);

  return (
    <Tag
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      className={className}
      data-field-path={fieldPath}
      data-placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
```

### Pattern 2: Field Path Addressing

Every editable element carries a `data-field-path` attribute that uniquely identifies it within CVFormData. This enables:
- Programmatic focus (AI tailor highlights a field)
- Undo/redo targeting
- Import confidence indicators
- Field-level validation

**What:** Consistent path addressing like `workExperience[0].bullets[2]` on every editable DOM element.

**When:** All editable fields, used by EditableField, ContextualControls, and AI features.

**Example:**
```typescript
// The existing parsePath/setAtPath from formDataPatch.ts is reused.
// useDirectEditor provides a generic field updater:
function updateField(path: string, value: string | string[]) {
  setFormData(prev => {
    const next = structuredClone(prev);
    setAtPath(next as Record<string, unknown>, path, value);
    return next;
  });
}
```

### Pattern 3: CSS-Driven Page Dimensions

The web CV must look like an A4/Letter page. Instead of letting content flow freely, the template renders inside a fixed-dimension container.

**What:** A page container component that enforces real paper dimensions in CSS pixels.

**When:** Always wrapping the WebCVTemplate.

**Example:**
```typescript
// A4 = 210mm x 297mm. At 96 DPI CSS: 1mm = 3.7795px
// Letter = 8.5in x 11in. At 96 DPI CSS: 1in = 96px
const PAGE_SIZES = {
  a4: { width: '210mm', height: '297mm' },
  letter: { width: '8.5in', height: '11in' },
} as const;

function WebCVPage({ size = 'letter', children }: {
  size?: 'a4' | 'letter';
  children: React.ReactNode;
}) {
  const dims = PAGE_SIZES[size];
  return (
    <div className={styles.page} style={{
      width: dims.width,
      minHeight: dims.height,
      // Actual height may exceed one page -- overflow handling later
    }}>
      {children}
    </div>
  );
}
```

### Pattern 4: Template Component Contract

Each web template is a React component that follows a strict contract: it receives CVFormData + editing callbacks and renders the CV using CSS that matches the LaTeX template.

**What:** A standardized interface that all web template components implement.

**When:** Creating each web template (start with med-length-proff-cv).

**Example:**
```typescript
interface WebTemplateProps {
  formData: CVFormData;
  onFieldChange: (path: string, value: string) => void;
  onBulletsChange: (path: string, bullets: string[]) => void;
  onAddEntry: (section: string) => void;
  onRemoveEntry: (section: string, index: number) => void;
  onReorderEntries: (section: string, from: number, to: number) => void;
  isEditing: boolean; // false for preview/print mode -- hides controls
  highlightFields?: Set<string>; // For AI tailor change highlighting
}

// Each template implements this:
function MedLengthProffTemplate(props: WebTemplateProps) { ... }
function McDowellTemplate(props: WebTemplateProps) { ... }
function DeedyResumeTemplate(props: WebTemplateProps) { ... }
```

### Pattern 5: Undo/Redo Stack

Since contentEditable fields are "uncontrolled while focused," the browser's native undo only works within a single field edit. Cross-field undo requires a custom stack.

**What:** An undo/redo history of CVFormData snapshots, managed by useDirectEditor.

**When:** Every field change, entry add/remove, reorder operation.

**Example:**
```typescript
// Inside useDirectEditor:
const [history, setHistory] = useState<CVFormData[]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);

function pushState(newData: CVFormData) {
  setHistory(prev => [...prev.slice(0, historyIndex + 1), newData]);
  setHistoryIndex(prev => prev + 1);
  setFormData(newData);
}

function undo() {
  if (historyIndex > 0) {
    setHistoryIndex(prev => prev - 1);
    setFormData(history[historyIndex - 1]);
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(prev => prev + 1);
    setFormData(history[historyIndex + 1]);
  }
}

// Keyboard shortcut: Cmd+Z / Cmd+Shift+Z
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using a Rich Text Editor Library for Structured Fields
**What:** Implementing the CV editor with Tiptap, Slate, ProseMirror, or Lexical.
**Why bad:** These libraries impose their own document model (paragraphs, marks, nodes) on top of yours. You would need constant bidirectional serialization between the editor's model and CVFormData. Every field update requires converting from your schema to theirs and back. The library fights you because it assumes freeform content structure.
**Instead:** Use plain `contentEditable="plaintext-only"` on individual field elements. The CV's structure is fixed by the template, not user-editable.

### Anti-Pattern 2: Re-rendering contentEditable While User is Typing
**What:** Setting `textContent` or `innerHTML` on a contentEditable element from React state while the user has it focused.
**Why bad:** Destroys cursor position, causes text jumps, breaks IME (international input methods), creates race conditions between user input and React renders.
**Instead:** Only sync DOM-to-state on blur. Only sync state-to-DOM when not focused (the "uncontrolled while focused" pattern).

### Anti-Pattern 3: Pixel-Perfect PDF Match as a Hard Requirement
**What:** Trying to make CSS rendering exactly match LaTeX output pixel-for-pixel.
**Why bad:** LaTeX and CSS use fundamentally different typesetting engines. Line breaking algorithms (Knuth-Plass vs browser-native), font metrics, hyphenation rules, and spacing calculations differ. Chasing pixel-perfect matching leads to fragile CSS hacks that break on font size changes.
**Instead:** Match the visual *impression* -- same fonts, similar spacing, same layout structure, same hierarchy. Accept that line breaks may differ. The PDF output (from LaTeX) is the authoritative final document; the web view is a high-fidelity editing preview.

### Anti-Pattern 4: Debounced State Updates on Every Keystroke
**What:** Firing `onFieldChange` on every `input` event with a debounce.
**Why bad:** Creates unnecessary state churn, makes undo history granular to the point of uselessness (undoing individual characters), and adds complexity for IME support.
**Instead:** Commit on blur (or Enter for single-line fields). This naturally batches an entire field edit into one atomic change, which makes undo/redo intuitive.

### Anti-Pattern 5: Two-Way Template Binding
**What:** Trying to make the web template CSS and LaTeX template stay in sync automatically (e.g., generating CSS from LaTeX class files).
**Why bad:** LaTeX and CSS are completely different layout systems. Automated conversion would be brittle and produce poor results.
**Instead:** Manually create each web template's CSS by visually matching the LaTeX output. Treat the LaTeX template and web template as parallel implementations of the same visual spec, not as derived from each other.

## Web Template to LaTeX Template Correspondence

This is the hardest design challenge. The goal: a user edits their CV in the web view and downloads a PDF that looks essentially the same.

### Strategy: Parallel Implementation with Shared Data

```
CVFormData (shared schema)
     |                    |
     v                    v
WebCVTemplate          Jinja2 LaTeX Template
(React + CSS)          (existing .tex.j2)
     |                    |
     v                    v
Screen rendering       PDF output
(for editing)          (for download)
```

Both the web template and the LaTeX template consume the same CVFormData. They are **parallel implementations** of the same visual design. Neither derives from the other.

### CSS-to-LaTeX Mapping for med-length-proff-cv

The `resume.cls` file defines the visual rules. Here is how each LaTeX concept maps to CSS:

| LaTeX (resume.cls) | CSS Equivalent | Notes |
|---------------------|---------------|-------|
| `\geometry{top=0.3in, bottom=0.3in, left=0.2in, right=0.2in}` | `padding: 0.3in 0.2in;` on page container | Direct mapping |
| `\huge\bfseries\name` (centered) | `font-size: ~24pt; font-weight: bold; text-align: center;` | Approximate; test visually |
| `\MakeUppercase{\textbf{#1}}` (section header) | `text-transform: uppercase; font-weight: bold;` | Direct mapping |
| `\smallskip\hrule` (after section header) | `margin-bottom: 4px; border-bottom: 1px solid black;` | Approximate |
| `\begin{rSubsection}{company}{dates}{title}{location}` | CSS grid: `grid-template-columns: 1fr auto;` two rows | Company+dates on first line, title+location on second |
| `\begin{list}{$\cdot$}{\leftmargin=1em}` | `list-style-type: disc; padding-left: 1em;` or use `::before` with cdot character | Bullet styling |
| `\setlength{\itemsep}{-0.4em}` | `margin-bottom: -0.4em;` or reduced `line-height` | Tight bullet spacing |
| `\usepackage{ebgaramond}` | `font-family: 'EB Garamond', serif;` via Google Fonts | Same typeface family |
| `\usepackage[T1]{fontenc}` | `text-rendering: optimizeLegibility; font-kerning: normal;` | Enables ligatures/kerning |
| `11pt` base size | `font-size: 11pt;` (note: CSS pt = 1/72in, same as TeX) | Direct mapping |

### CSS-to-LaTeX Mapping for mcdowell-cv

| LaTeX (mcdowellcv.cls) | CSS Equivalent | Notes |
|--------------------------|---------------|-------|
| `\geometry{left=0.75in, top=0.6in, right=0.75in, bottom=0.6in}` | `padding: 0.6in 0.75in;` | Direct mapping |
| `\setmainfont{Times New Roman}` | `font-family: 'Times New Roman', serif;` | System font, no loading needed |
| `\LARGE\textls[110]{\textsc{\@name}}` | `font-size: ~17pt; font-variant: small-caps; letter-spacing: 0.11em; font-weight: bold;` | textls[110] = 110/1000em letter spacing |
| Three-column header (tabu) | `display: grid; grid-template-columns: 1fr 2fr 1fr;` | Address left, name center, contacts right |
| `\textsc{\textbf{#1}}` (section header) | `font-variant: small-caps; font-weight: bold;` | Section headers |
| `\hrule height 0.518pt` | `border-bottom: 0.518pt solid black;` | Section separator |
| Three-column subsection header (tabu) | `display: grid; grid-template-columns: 1fr 1fr 1fr;` | Left/center/right aligned |
| `\setlist{leftmargin=*, noitemsep, topsep=-1\parskip}` | `padding-left: 0; margin: 0; list-style-position: inside;` | Compact list styling |
| `\microtype` (letter spacing) | `text-rendering: optimizeLegibility; font-feature-settings: 'liga', 'kern';` | Approximate microtypography |

### Font Strategy

| Template | LaTeX Font | Web Font | Loading |
|----------|-----------|----------|---------|
| med-length-proff-cv | EB Garamond (pdflatex) | EB Garamond via Google Fonts | `<link>` or `@import` |
| mcdowell-cv | Times New Roman (xelatex) | System Times New Roman | No loading needed |
| deedy-resume | Custom fonts in /fonts dir | Self-hosted WOFF2 from same sources | `@font-face` declarations |

### Which Template First

**Start with `med-length-proff-cv`** because:
1. Single-column layout -- simplest CSS (no multi-column complexity like deedy-resume).
2. Uses standard LaTeX commands -- `\begin{rSection}`, `\begin{rSubsection}` map cleanly to semantic HTML.
3. EB Garamond is freely available on Google Fonts -- no font licensing concerns.
4. The `resume.cls` is only 112 lines -- the smallest and most understandable template class.
5. Most professional users will gravitate to this template first.

## Suggested Build Order

Build order matters because components have dependencies. The numbering reflects phases that could each be a milestone boundary.

### Phase 1: Foundation Layer (no editing yet)

Build the read-only web template component that renders CVFormData as HTML/CSS matching the LaTeX output.

1. **WebCVPage** -- page dimension container (A4/Letter)
2. **TemplateStylesheet** -- CSS Module for med-length-proff-cv
3. **MedLengthProffTemplate** -- React component rendering all sections
4. **Visual comparison testing** -- render sample CVFormData, compile LaTeX, compare side-by-side

**Dependencies:** None. Pure frontend. Uses existing CVFormData types.

### Phase 2: Inline Editing Core

Add contentEditable editing to the template.

1. **EditableField** -- the core editable span component
2. **EditableBulletList** -- bullet list with Enter/Backspace/reorder
3. **useDirectEditor** -- central controller hook with field-level updates
4. Wire editing into MedLengthProffTemplate (replace static text with EditableField)

**Dependencies:** Phase 1 (template must render correctly before adding editing).

### Phase 3: Structural Editing

Add/remove entries and sections, drag reordering.

1. **ContextualControls** -- hover "+" buttons, delete buttons
2. **Drag handles** on entries (reuse existing drag-and-drop pattern)
3. **Undo/redo** stack in useDirectEditor
4. **Section reordering** on the CV itself (not just sidebar)

**Dependencies:** Phase 2 (need editing infrastructure before structural operations).

### Phase 4: Route Integration

Replace the existing form builder with the direct edit screen.

1. **DirectEditScreen** -- new route component composing everything
2. **Route changes** -- `/build/form` -> DirectEditScreen instead of CVFormBuilder
3. **AI integration** -- tune sidebar, tailor panel work with useDirectEditor
4. **Version save/load** -- works through CVContext (minimal changes)
5. **Import flow adaptation** -- imported CVFormData loads into web CV

**Dependencies:** Phase 3 (full editing capability before replacing the form builder).

### Phase 5: Additional Templates (future)

1. **McDowellTemplate** -- web version of mcdowell-cv
2. **DeedyResumeTemplate** -- web version of deedy-resume (two-column, hardest)

**Dependencies:** Phase 4 complete, architecture proven.

## Scalability Considerations

| Concern | Current (1 template) | 3 templates | Future (user-created templates) |
|---------|---------------------|-------------|-------------------------------|
| CSS maintenance | One CSS Module, manageable | Three CSS Modules, moderate work | Would need a CSS-in-JS or design token system |
| Template creation effort | ~2-3 days of CSS matching | ~1-2 weeks total | Not viable without a template builder tool |
| Font loading | One Google Font | 2 Google Fonts + self-hosted | Variable, need lazy loading |
| EditableField reuse | Direct use | Same component, different CSS contexts | Same -- the editing layer is template-agnostic |
| Performance | Negligible (one page of DOM) | Negligible | Negligible (CVs are small documents) |

## Sources

- ProseMirror Guide: https://prosemirror.net/docs/guide/ (architecture reference, why NOT to use it) -- HIGH confidence
- React docs on contentEditable: https://react.dev/reference/react-dom/components/common -- HIGH confidence
- MDN contentEditable: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable -- HIGH confidence
- MDN text-rendering: https://developer.mozilla.org/en-US/docs/Web/CSS/text-rendering -- HIGH confidence
- MDN font-kerning: https://developer.mozilla.org/en-US/docs/Web/CSS/font-kerning -- HIGH confidence
- MDN @page rule: https://developer.mozilla.org/en-US/docs/Web/CSS/@page -- HIGH confidence
- Smashing Magazine CSS for Print: https://www.smashingmagazine.com/2015/01/designing-for-print-with-css/ -- MEDIUM confidence (older article but CSS paged media principles stable)
- Tiptap docs: https://tiptap.dev/docs/editor/getting-started/overview -- HIGH confidence (evaluated and rejected)
- Lexical docs: https://lexical.dev/docs/intro -- HIGH confidence (evaluated and rejected)
- Slate.js docs: https://docs.slatejs.org/concepts/01-interfaces -- HIGH confidence (evaluated and rejected)
- Existing codebase: `resume.cls`, `mcdowellcv.cls`, `useFormBuilder.ts`, `formDataPatch.ts` -- HIGH confidence (direct source inspection)

---

*Architecture analysis: 2026-03-29*
