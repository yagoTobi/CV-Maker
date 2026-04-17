# Phase 2: Core Editing Surface - Research

**Researched:** 2026-03-29
**Domain:** React contentEditable inline editing on a web-rendered CV template with CSS-to-LaTeX visual fidelity
**Confidence:** HIGH

## Summary

Phase 2 builds the core WYSIWYG editing surface: a web-rendered CV (med-length-proff-cv template only) where users click directly on text and edit it inline. The implementation uses native `contentEditable="plaintext-only"` elements mapped to individual CVFormData fields, with an "uncontrolled while focused, controlled while blurred" pattern to prevent React from fighting browser DOM mutations.

The key technical challenges are: (1) the React-contentEditable sync contract -- React must never touch the DOM of a focused editable element, (2) achieving ~95% visual fidelity between CSS rendering and LaTeX PDF output using EB Garamond web font and CSS dimensions derived from resume.cls, and (3) multi-line bullet editing with Enter/Backspace keyboard handling where each bullet is a separate contentEditable element.

**Primary recommendation:** Build the EditableField component with blur-only sync first and validate it works with React 19 before building anything else. This is the highest-risk component in the entire project.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Subtle highlight on focus -- light background tint or thin border appears around the editable field when clicked. Clear but does not break the CV aesthetic.
- **D-02:** Each CVFormData field = one editable region. startDate, endDate, company, title are separate contentEditable elements. Granularity matches the data model, not visual grouping.
- **D-03:** contentEditable="plaintext-only" for all text fields (no rich text).
- **D-04:** "Uncontrolled while focused, controlled while blurred" -- React must not touch DOM of focused contentEditable elements. State sync happens on blur only.
- **D-05:** Full-bleed page layout -- CV fills the viewport width (up to a max-width). No surrounding gray background or drop shadow. Clean, immersive, Notion-like feel.
- **D-06:** Page dimensions use CSS that matches LaTeX margins from resume.cls. Content scrolls naturally with the viewport (no inner scroll).
- **D-07:** Minimal text indicator for save status -- small "Saved" / "Saving..." text in a corner, unobtrusive like Google Docs.
- **D-08:** Debounce-only save trigger -- save after 2-3 seconds of inactivity. Fires while still focused if user pauses typing. No blur-triggered save.
- **D-09:** Target ~95% visual match to LaTeX PDF. Same fonts (EB Garamond), margins, section structure, visual hierarchy. Accept text reflow differences (CSS greedy line-breaking vs LaTeX Knuth-Plass).
- **D-10:** Start with med-length-proff-cv template only. Single column, simplest layout.

### Claude's Discretion
- Component architecture (how to decompose the web template into React components)
- Font loading strategy (Google Fonts, Fontsource, or self-hosted)
- Exact CSS values for matching LaTeX margins/spacing (derive from resume.cls)
- Cursor behavior when tabbing between fields
- Placeholder text content for each field type
- Error handling for font loading failures

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-01 | User can click on any text field in the web CV and edit it inline (contentEditable) | EditableField component with `contentEditable="plaintext-only"`, focus/blur handlers, field-path addressing. Each CVFormData field = one editable region (D-02). |
| EDIT-02 | Web-rendered CV for med-length-proff-cv template visually matches LaTeX PDF output (~95% fidelity) | CSS Module derived from resume.cls dimensions (margins 0.3in/0.2in, 11pt EB Garamond, uppercase bold section headers with hrule, rSubsection grid layout). Fontsource EB Garamond Variable. |
| EDIT-03 | User can edit multi-line bullet points naturally (Enter creates new bullet, Backspace on empty bullet deletes it) | EditableBulletList component: each bullet = separate contentEditable div. onKeyDown handles Enter (split/add) and Backspace (delete empty). |
| EDIT-04 | Empty fields show placeholder text that disappears on focus | CSS `::before` pseudo-element with `content: attr(data-placeholder)` on `:empty` selector. data-placeholder attribute on each EditableField. |
| EDIT-05 | Edits to the web CV update the hidden CVFormData model in real-time | Blur-only sync from EditableField to CVFormData via onFieldChange callback. Debounced input events for auto-save trigger (D-08). |
| EDIT-06 | CVFormData changes re-render the web CV without losing cursor position or focus | "Uncontrolled while focused" pattern: useEffect skips DOM update when isFocused ref is true. Only syncs state-to-DOM on blur. |
| UX-01 | CV auto-saves to backend on debounced CVFormData changes with visible save status indicator | useAutoSave hook with 2-3 second debounce, calls api.saveVersion(). Status indicator ("Saved" / "Saving...") in corner (D-07). |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already in project; contentEditable patterns work with React 19 |
| @fontsource-variable/eb-garamond | 5.2.7 | EB Garamond web font (matches LaTeX template) | Self-hosted WOFF2 via npm, no CDN dependency, variable font with 400-800 weights |
| nanoid | ^5.1.7 | Generate IDs for new bullets | Already in project, used by idHelpers.ts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native contentEditable API | Browser API | Inline text editing | All editable fields on the CV |
| Selection API | Browser API | Cursor position management | Only needed if external state changes require DOM focus restoration |
| CSS Modules | Vite built-in | Template-specific styling | All new components (project convention) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| contentEditable="plaintext-only" | Tiptap 3 / Lexical / Slate | These maintain their own document model; CV editing is structured field editing, not document authoring. 80KB+ bundle for unused features. LOCKED DECISION: do not use. |
| @fontsource-variable/eb-garamond | Google Fonts CDN | CDN adds external dependency and FOUT risk; Fontsource is self-hosted WOFF2 |
| Blur-only sync | Debounced input sync | Blur-only is simpler, avoids cursor position issues, matches D-04 decision |

**Installation:**
```bash
cd frontend
npm install @fontsource-variable/eb-garamond
```

**Version verification:**
- @fontsource-variable/eb-garamond: 5.2.7 (verified via `npm view` 2026-03-29)
- No other new dependencies required -- contentEditable, Selection API, and CSS Modules are all browser/build-tool built-ins.

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/features/direct-edit/
  DirectEditPage.tsx           # Top-level page component (scrollable CV with save indicator)
  DirectEditPage.module.css    # Page layout CSS (full-bleed, max-width, scroll)
  components/
    EditableField.tsx           # Core: single contentEditable element mapped to one CVFormData field
    EditableField.module.css    # Focus highlight, placeholder styling
    EditableBulletList.tsx      # Bullet list: array of EditableField + Enter/Backspace handling
    EditableBulletList.module.css
    MedLengthTemplate.tsx       # Web rendering of med-length-proff-cv (all sections)
    MedLengthTemplate.module.css # CSS matching resume.cls visual output
    SaveIndicator.tsx           # "Saved" / "Saving..." text
    SaveIndicator.module.css
  hooks/
    useDirectEditor.ts          # Central controller: CVFormData state, field update dispatch, auto-save
```

### Pattern 1: Uncontrolled-While-Focused EditableField

**What:** A contentEditable element that is controlled by React when blurred, and uncontrolled (browser-owned) when focused. This is the single most critical pattern.

**When to use:** Every inline-editable text on the web CV (name, email, company, title, dates, bullets, etc.).

**Example:**
```typescript
// Source: Prior research (ARCHITECTURE.md pattern) + React 19 contentEditable docs
interface EditableFieldProps {
  value: string;
  fieldPath: string;
  onFieldChange: (path: string, value: string) => void;
  placeholder?: string;
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'p';
  className?: string;
  multiline?: boolean;
  onInput?: () => void; // For debounced auto-save trigger
}

function EditableField({
  value, fieldPath, onFieldChange, placeholder, tag: Tag = 'span',
  className, multiline = false, onInput,
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

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    const newValue = ref.current?.textContent ?? '';
    if (newValue !== value) {
      onFieldChange(fieldPath, newValue);
    }
  }, [value, fieldPath, onFieldChange]);

  const handleInput = useCallback(() => {
    onInput?.(); // Notify parent for debounced save
  }, [onInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === 'Escape') {
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
      onInput={handleInput}
      onKeyDown={handleKeyDown}
    />
  );
}
```

### Pattern 2: EditableBulletList with Enter/Backspace

**What:** A list of bullets where each bullet is a separate EditableField div. Enter at the end creates a new bullet below. Backspace on an empty bullet deletes it and moves focus to the previous bullet.

**When to use:** workExperience[i].bullets, education[i].details, project[i].bullets, additionalSections[i].entries[j].bullets.

**Example:**
```typescript
// Source: Research architecture patterns
interface EditableBulletListProps {
  bullets: BulletItem[];
  basePath: string; // e.g., "workExperience[0].bullets"
  onBulletChange: (index: number, text: string) => void;
  onBulletAdd: (afterIndex: number) => void;
  onBulletRemove: (index: number) => void;
  onInput?: () => void;
}

function EditableBulletList({
  bullets, basePath, onBulletChange, onBulletAdd, onBulletRemove, onInput,
}: EditableBulletListProps) {
  const bulletRefs = useRef<Map<string, HTMLElement>>(new Map());

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Commit current text, add new bullet, focus it
      const el = e.currentTarget as HTMLElement;
      onBulletChange(index, el.textContent ?? '');
      onBulletAdd(index);
      // Focus new bullet after render (via useEffect or requestAnimationFrame)
    }
    if (e.key === 'Backspace' && (e.currentTarget as HTMLElement).textContent === '') {
      e.preventDefault();
      if (bullets.length > 1) {
        onBulletRemove(index);
        // Focus previous bullet after render
      }
    }
  }, [bullets.length, onBulletChange, onBulletAdd, onBulletRemove]);

  return (
    <div className={styles.bulletList}>
      {bullets.map((bullet, i) => (
        <div key={bullet.id} className={styles.bulletItem}>
          <span className={styles.bulletMarker}>.</span>
          <EditableField
            ref={(el) => { if (el) bulletRefs.current.set(bullet.id, el); }}
            value={bullet.text}
            fieldPath={`${basePath}[${i}]`}
            onFieldChange={(_, text) => onBulletChange(i, text)}
            placeholder="Describe an achievement..."
            tag="div"
            multiline={false}
            onInput={onInput}
            onKeyDown={(e) => handleKeyDown(e, i)}
          />
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Auto-Save with Debounce

**What:** A hook that watches CVFormData for changes and auto-saves to the backend after 2-3 seconds of inactivity.

**When to use:** Wrapping the direct edit page to provide persistent auto-save.

**Example:**
```typescript
// Source: D-07, D-08 decisions
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function useAutoSave(formData: CVFormData, versionId: string | null) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    const serialized = JSON.stringify(formData);
    if (serialized === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await api.saveVersion({
          name: formData.personalInfo.fullName || 'Untitled CV',
          templateId: formData.templateId,
          texContent: '', // LaTeX generated at download time
          formData,
        });
        lastSavedRef.current = serialized;
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, 2500); // 2.5 second debounce

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [formData, versionId]);

  return status;
}
```

### Pattern 4: CSS Placeholder for Empty Fields

**What:** Using CSS `::before` pseudo-element to show placeholder text when an editable field is empty.

**When to use:** All EditableField components (EDIT-04).

**Example:**
```css
/* Source: CSS :empty + ::before pattern */
.editableField:empty::before {
  content: attr(data-placeholder);
  color: var(--text-muted);
  pointer-events: none;
  font-style: italic;
}

/* Hide placeholder when focused (even if empty, user is about to type) */
.editableField:focus:empty::before {
  color: transparent;
}
```

### Pattern 5: useDirectEditor Central Controller

**What:** A hook that bridges EditableField callbacks to CVFormData state updates, using the existing useFormBuilder patterns but adapted for field-path-based updates.

**When to use:** The DirectEditPage composes this hook as the single state controller.

**Key design decision:** useDirectEditor wraps the existing CVContext's formData/setFormData rather than creating its own state. This ensures version switching, AI features, and save/load all continue working through CVContext.

```typescript
function useDirectEditor() {
  const { formData, setFormData } = useCVContext();

  const updateField = useCallback((path: string, value: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      setAtPath(next as Record<string, unknown>, path, value);
      return next;
    });
  }, [setFormData]);

  const addBullet = useCallback((basePath: string, afterIndex: number) => {
    // ... insert new BulletItem at afterIndex + 1
  }, [setFormData]);

  const removeBullet = useCallback((basePath: string, index: number) => {
    // ... remove BulletItem at index
  }, [setFormData]);

  return { formData, updateField, addBullet, removeBullet };
}
```

### Anti-Patterns to Avoid

- **Re-rendering contentEditable while user is typing:** Never set textContent/innerHTML on a focused contentEditable element from React state. This destroys cursor position and breaks IME input.
- **Using useState for contentEditable text:** The react-contenteditable library itself documents that "Using this component with useState doesn't work." Use useRef for the DOM element and sync on blur only.
- **Single large contentEditable block per section:** Each editable field must be its own contentEditable element. A single block for an entire work entry makes it impossible to map edits back to specific CVFormData fields.
- **Using document.execCommand():** Deprecated. Produces inconsistent results across browsers.
- **Debounced state updates on every keystroke:** Creates state churn, makes undo granularity useless, breaks IME. Commit on blur.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Web font loading | Custom @font-face declarations | @fontsource-variable/eb-garamond | Self-hosted WOFF2, handles font-display, subsetting, variable axes |
| Unique IDs | Custom UUID generator | nanoid (already in project) | Compact, URL-safe, collision-resistant |
| Deep object updates at path | Manual multi-level spread | Existing setAtPath from formDataPatch.ts | Already handles BulletItem/SkillItem preservation, tested |
| CSS reset / variables | New design system | Existing variables.css | Project already has design tokens |

**Key insight:** This phase has remarkably few external dependencies. The core challenge is browser API usage (contentEditable, Selection API) and CSS craftsmanship (matching resume.cls), not library integration.

## CSS-to-LaTeX Mapping for med-length-proff-cv

These CSS values are derived directly from `cv-templates/med-length-proff-cv/resume.cls` (112 lines).

| LaTeX (resume.cls) | CSS Equivalent | Source |
|--------------------|----------------|--------|
| `\geometry{top=0.3in, bottom=0.3in, left=0.2in, right=0.2in}` | `padding: 0.3in 0.2in;` | resume.cls line 24-28 |
| `\huge\bfseries\name` (centered) | `font-size: 20.74pt; font-weight: bold; text-align: center;` | LaTeX \huge at 11pt base = 20.74pt |
| `\MakeUppercase{\textbf{#1}}` + `\smallskip` + `\hrule` | `text-transform: uppercase; font-weight: bold; margin-bottom: ~3pt; border-bottom: 0.4pt solid black;` | resume.cls line 89-98 |
| `\begin{list}{}{\setlength{\leftmargin}{0.5em}}` | `padding-left: 0.5em;` | resume.cls line 93-95 |
| `\textbf{#1} \hfill {#2}` (rSubsection line 1) | `display: flex; justify-content: space-between;` or CSS grid | resume.cls line 101-102 |
| `\textit{#3} \hfill \textit{#4}` (rSubsection line 2) | `display: flex; justify-content: space-between; font-style: italic;` | resume.cls line 103-105 |
| `\begin{list}{$\cdot$}{\leftmargin=1em}` | `list-style: none; padding-left: 1em;` + `::before { content: "\00B7"; }` | resume.cls line 108 (middle dot) |
| `\setlength{\itemsep}{-0.4em}` | `margin-bottom: -0.4em;` or tight line spacing | resume.cls line 109 |
| `\vspace{0.1em}` (between subsections) | `margin-bottom: 0.1em;` | resume.cls line 112 |
| `\setlength{\parskip}{0.45\baselineskip}` | `margin-bottom: calc(0.45 * 1.2em);` (approx 0.54em) | resume.cls line 31 |
| `11pt` document base size | `font-size: 11pt;` | med-length-proff-cv.tex.j2 line 6 |
| `\usepackage{ebgaramond}` | `font-family: "EB Garamond Variable", serif;` | med-length-proff-cv.tex.j2 line 3 |
| `\definecolor{darkblue}{RGB}{21, 88, 176}` | `color: rgb(21, 88, 176);` for links | med-length-proff-cv.tex.j2 line 21 |
| `\enspace{}|\enspace{}` (personal info separator) | Rendered as ` | ` with en-space padding | med-length-proff-cv.tex.j2 line 28 |
| `\centerline{#1}` (address) | `text-align: center;` | resume.cls line 66 |

### Font Size Reference (LaTeX at 11pt base)

| LaTeX Command | Size |
|--------------|------|
| `\normalsize` | 11pt |
| `\small` | 10pt |
| `\large` | 12pt |
| `\Large` | 14.4pt |
| `\LARGE` | 17.28pt |
| `\huge` | 20.74pt |

### Full-Bleed Layout (D-05, D-06)

The CV should fill the viewport width up to a max-width, with no surrounding "page" shadow or gray canvas. CSS approach:

```css
.directEditPage {
  max-width: 8.5in; /* Letter width */
  margin: 0 auto;
  padding: 0.3in 0.2in; /* Match resume.cls margins */
  background: white;
  min-height: 100vh;
  font-family: "EB Garamond Variable", "EB Garamond", Georgia, serif;
  font-size: 11pt;
  text-rendering: optimizeLegibility;
  font-kerning: normal;
  line-height: 1.2;
  color: black;
}
```

This differs from the fixed-dimension page container in ARCHITECTURE.md research (which used `width: 8.5in; height: 11in` with drop shadow). The user chose full-bleed (D-05), so no page border, no shadow, no gray background.

## Common Pitfalls

### Pitfall 1: React Re-Renders Clobber Focused contentEditable Elements

**What goes wrong:** React reconciler sees DOM doesn't match virtual DOM (because user typed), overwrites user's text, cursor jumps to position 0.
**Why it happens:** Using useState for editable text, or passing React children into contentEditable elements.
**How to avoid:** Use useRef for the DOM element. Set `suppressContentEditableWarning`. Only sync DOM-to-state on blur. Only sync state-to-DOM when `isFocused.current === false`.
**Warning signs:** Cursor jumps while typing; characters disappear; React console warning about contentEditable children.

### Pitfall 2: Empty contentEditable Collapses to Zero Height

**What goes wrong:** An empty contentEditable div has no text content, so it collapses to 0px height. User cannot see or click on it.
**Why it happens:** No intrinsic sizing when element has no content.
**How to avoid:** Set `min-height: 1.2em` (or one line height) on all editable elements. Use CSS `::before` with `data-placeholder` for visual affordance (EDIT-04).
**Warning signs:** Empty fields invisible on the CV; clicking in the area does nothing.

### Pitfall 3: Browser HTML Inconsistencies on Paste

**What goes wrong:** Pasting from Word/Google Docs brings rich HTML into contentEditable. Different browsers produce different DOM structures for the same paste.
**Why it happens:** contentEditable="true" preserves rich text on paste.
**How to avoid:** Use `contentEditable="plaintext-only"` (D-03 decision). This strips ALL formatting on paste automatically. Browser support: Chrome 51+, Safari 5+, Firefox 136+. All modern browsers covered per project constraints.
**Warning signs:** HTML tags or styled spans appearing in CVFormData text fields.

### Pitfall 4: IME (CJK) Input Breaks on Premature Sync

**What goes wrong:** Chinese/Japanese/Korean input via IME composes characters over multiple keystrokes. Syncing to CVFormData during composition commits incomplete text.
**Why it happens:** Input events fire during IME composition, but the text is not final until `compositionend`.
**How to avoid:** Track composition state with `compositionstart`/`compositionend` events. Skip any sync during active composition. The blur-only sync pattern (D-04) largely avoids this since blur won't fire during composition, but onInput for auto-save trigger must also be gated.
**Warning signs:** CJK characters appearing incorrectly; double characters; composition window disappearing.

### Pitfall 5: Auto-Save Fires Before Blur Commits Text

**What goes wrong:** User is typing in a field (not yet blurred). Debounce timer fires and saves CVFormData -- but the current text is still only in the DOM ref, not in CVFormData (because D-04 says blur-only sync). The saved version is missing the user's latest edits.
**Why it happens:** D-08 says debounce fires "while still focused if user pauses typing," but D-04 says sync on blur only. These two decisions create a gap.
**How to avoid:** The auto-save trigger should read the current text from the focused element's `textContent` and update CVFormData before saving. Implementation: when debounce fires, check if any element is focused (via document.activeElement), read its textContent, commit to formData, then save. Alternatively, use onInput to update formData during editing (not just on blur) but gate the React re-render with the isFocused check so the DOM is not clobbered.
**Warning signs:** Saved version missing recently-typed text; "Saved" indicator shows but text reverts on page reload.

### Pitfall 6: Bullet Focus After Add/Remove Requires Async Timing

**What goes wrong:** User presses Enter to add a new bullet. The new bullet is added to CVFormData, React re-renders, but the focus does not move to the new bullet.
**Why it happens:** The new bullet's DOM element does not exist yet when the Enter handler runs. Focus must be set AFTER React commits the new DOM.
**How to avoid:** Use a `useEffect` that watches for newly added bullets (compare previous and current bullet arrays by length or IDs) and focuses the new element. Or use `requestAnimationFrame` / `setTimeout(0)` after the state update to focus. Store a "pending focus" ref that the effect picks up.
**Warning signs:** New bullet appears but cursor stays in the old bullet; user has to manually click the new bullet.

## Code Examples

### Template Section Rendering (med-length-proff-cv Work Section)

```typescript
// Source: Derived from med-length-proff-cv.tex.j2 lines 41-52 + resume.cls rSubsection
function WorkSection({ entries, onFieldChange, onInput }: {
  entries: WorkEntry[];
  onFieldChange: (path: string, value: string) => void;
  onInput: () => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className={styles.rSection}>
      <h2 className={styles.sectionHeader}>Experience</h2>
      {entries.map((job, i) => (
        <div key={job.id} className={styles.rSubsection}>
          {/* Line 1: Company (bold) ... Dates (bold, right-aligned) */}
          <div className={styles.subsectionLine1}>
            <EditableField
              value={job.company}
              fieldPath={`workExperience[${i}].company`}
              onFieldChange={onFieldChange}
              placeholder="Company Name"
              tag="span"
              className={styles.bold}
              onInput={onInput}
            />
            <span className={styles.dateRange}>
              <EditableField
                value={job.startDate}
                fieldPath={`workExperience[${i}].startDate`}
                onFieldChange={onFieldChange}
                placeholder="Start"
                tag="span"
                className={styles.bold}
                onInput={onInput}
              />
              {(job.startDate || job.endDate) && <span> -- </span>}
              <EditableField
                value={job.endDate}
                fieldPath={`workExperience[${i}].endDate`}
                onFieldChange={onFieldChange}
                placeholder="End"
                tag="span"
                className={styles.bold}
                onInput={onInput}
              />
            </span>
          </div>
          {/* Line 2: Title (italic) ... Location (italic, right-aligned) */}
          <div className={styles.subsectionLine2}>
            <EditableField
              value={job.title}
              fieldPath={`workExperience[${i}].title`}
              onFieldChange={onFieldChange}
              placeholder="Job Title"
              tag="span"
              className={styles.italic}
              onInput={onInput}
            />
            <EditableField
              value={job.location}
              fieldPath={`workExperience[${i}].location`}
              onFieldChange={onFieldChange}
              placeholder="Location"
              tag="span"
              className={styles.italic}
              onInput={onInput}
            />
          </div>
          {/* Bullets */}
          <EditableBulletList
            bullets={job.bullets}
            basePath={`workExperience[${i}].bullets`}
            onBulletChange={(bi, text) =>
              onFieldChange(`workExperience[${i}].bullets[${bi}]`, text)
            }
            onBulletAdd={(afterIndex) => /* addBullet logic */ undefined}
            onBulletRemove={(bi) => /* removeBullet logic */ undefined}
            onInput={onInput}
          />
        </div>
      ))}
    </section>
  );
}
```

### CSS for rSubsection Layout

```css
/* Source: resume.cls rSubsection environment (lines 101-112) */
.rSubsection {
  margin-bottom: 0.1em;
}

.subsectionLine1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.subsectionLine2 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-style: italic;
}

.sectionHeader {
  text-transform: uppercase;
  font-weight: bold;
  font-size: 11pt; /* same as body -- LaTeX \MakeUppercase does not change size */
  margin-bottom: 3pt;
  border-bottom: 0.4pt solid black;
  padding-bottom: 2pt;
}

.bulletList {
  list-style: none;
  padding-left: 1em;
}

.bulletItem {
  display: flex;
  align-items: flex-start;
  margin-bottom: -0.4em; /* matches \itemsep{-0.4em} */
}

.bulletMarker {
  margin-right: 0.5em;
  user-select: none;
}

.bulletMarker::before {
  content: "\00B7"; /* middle dot, matches LaTeX $\cdot$ */
}
```

### Focus Highlight (D-01)

```css
/* Source: D-01 decision -- subtle highlight on focus */
.editableField {
  outline: none;
  border-radius: 2px;
  transition: background-color 0.15s ease;
  padding: 1px 2px;
  margin: -1px -2px; /* compensate padding to maintain layout */
  cursor: text;
}

.editableField:focus {
  background-color: rgba(59, 130, 246, 0.08); /* accent blue at 8% opacity */
}

.editableField:hover:not(:focus) {
  background-color: rgba(59, 130, 246, 0.04); /* lighter on hover */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| contentEditable="true" with innerHTML | contentEditable="plaintext-only" | Firefox 136 (Feb 2026) completed cross-browser support | Eliminates browser HTML chaos for plain text fields |
| react-contenteditable library | Direct ref-based pattern | Always was better; library documents its own useState incompatibility | Zero-dependency, full control |
| document.execCommand() for undo | Custom state history | execCommand deprecated since ~2021 | Must build custom undo (deferred to v2 per REQUIREMENTS.md) |
| Google Fonts CDN | Fontsource self-hosted npm packages | Fontsource 5.x (2024) | Eliminates external CDN dependency, better FOUT control |
| text-wrap: balance | text-wrap: pretty (Chrome 117+) | 2023 | Better line breaking in CSS, closer to LaTeX Knuth-Plass |

**Deprecated/outdated:**
- `document.execCommand()`: Deprecated. Do not use for any editing operations.
- `react-contenteditable` npm package: Works but adds unnecessary abstraction. Direct ref pattern is simpler and more predictable.

## Browser Compatibility Summary

| API | Chrome | Firefox | Safari | Status |
|-----|--------|---------|--------|--------|
| `contentEditable="plaintext-only"` | 51+ | 136+ | 5+ | 97% global coverage |
| `beforeinput` event | 60+ | 87+ | 13+ | Baseline since March 2021 |
| Selection API | All modern | All modern | All modern | Widely supported |
| CSS `text-wrap: pretty` | 117+ | Not yet | Not yet | Progressive enhancement only |
| `document.fonts.ready` | 35+ | 41+ | 10+ | Widely supported |

All required APIs are available in modern browsers per project constraint ("Modern browsers only").

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDIT-01 | Click text field, edit inline | unit (component) | `cd frontend && npx vitest run src/__tests__/EditableField.test.tsx -x` | Wave 0 |
| EDIT-02 | Visual match to LaTeX (~95%) | manual | Visual inspection + screenshot comparison | Manual-only: CSS rendering cannot be unit tested in jsdom |
| EDIT-03 | Enter creates bullet, Backspace deletes empty | unit (component) | `cd frontend && npx vitest run src/__tests__/EditableBulletList.test.tsx -x` | Wave 0 |
| EDIT-04 | Empty fields show placeholder | unit (component) | `cd frontend && npx vitest run src/__tests__/EditableField.test.tsx -x` (check data-placeholder attr) | Wave 0 |
| EDIT-05 | Edits update CVFormData | unit (hook) | `cd frontend && npx vitest run src/__tests__/useDirectEditor.test.ts -x` | Wave 0 |
| EDIT-06 | Re-render without cursor loss | unit (component) | `cd frontend && npx vitest run src/__tests__/EditableField.test.tsx -x` (focus + prop change test) | Wave 0 |
| UX-01 | Auto-save with debounce + indicator | unit (hook) | `cd frontend && npx vitest run src/__tests__/useAutoSave.test.ts -x` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green + TypeScript clean + manual visual inspection

### Wave 0 Gaps

- [ ] `frontend/src/__tests__/EditableField.test.tsx` -- covers EDIT-01, EDIT-04, EDIT-06
- [ ] `frontend/src/__tests__/EditableBulletList.test.tsx` -- covers EDIT-03
- [ ] `frontend/src/__tests__/useDirectEditor.test.ts` -- covers EDIT-05
- [ ] `frontend/src/__tests__/useAutoSave.test.ts` -- covers UX-01

**Note:** contentEditable behavior in jsdom is limited -- jsdom does not implement the full editing API. Tests will focus on: (a) component renders with correct attributes, (b) blur callback fires onFieldChange with correct path/value, (c) useEffect skips DOM update when isFocused is true, (d) keyboard handlers call correct callbacks. Full contentEditable behavior (actual typing, cursor position) requires browser-based E2E tests (not in scope for this phase).

## Open Questions

1. **Auto-save vs blur-sync gap (Pitfall 5)**
   - What we know: D-04 says blur-only sync. D-08 says save fires on debounce while focused.
   - What's unclear: Should the debounced save read from the DOM directly, or should we allow onInput to update formData (with isFocused guard)?
   - Recommendation: Use onInput to update formData during editing (not just blur), but gate the React re-render with the isFocused ref so DOM is not clobbered. This makes auto-save always have current data. The "uncontrolled while focused" pattern still applies to DOM rendering, not to state updates.

2. **Skills section: comma-separated text in contentEditable**
   - What we know: SkillCategory.skills is SkillItem[]. In the LaTeX template, skills are rendered as `category: skill1, skill2, skill3`. In the form builder, they're edited as a comma-separated text field.
   - What's unclear: Should the web CV show skills as a single editable text field (comma-separated) or as individual editable skill items?
   - Recommendation: Single editable text field per skill category (matching how users think about skills). Parse on blur using existing `updateSkillsText` logic from useFormBuilder.

3. **personalInfo.links rendering**
   - What we know: Links are rendered as `\href{url}{label}` in LaTeX, appearing as clickable text. In contentEditable, clicking a link would navigate away instead of editing it.
   - What's unclear: How to make link labels editable without triggering navigation?
   - Recommendation: Render link labels as regular editable text (not anchor tags) in the personal info bar. The URL is edited separately if needed (not visible on the CV surface). Links are only hyperlinked in the final PDF output.

## Sources

### Primary (HIGH confidence)
- `cv-templates/med-length-proff-cv/resume.cls` -- All CSS values derived from direct file read (112 lines)
- `backend/latex_templates/med-length-proff-cv.tex.j2` -- Section structure, font, color definitions
- `frontend/src/types/index.ts` -- CVFormData, BulletItem, SkillItem type definitions
- `frontend/src/hooks/useFormBuilder.ts` -- Existing CRUD operations, factory functions
- `frontend/src/utils/formDataPatch.ts` -- setAtPath, parsePath for field-path resolution
- `.planning/research/STACK.md` -- contentEditable approach validation, font research
- `.planning/research/ARCHITECTURE.md` -- Component architecture, data flow patterns
- `.planning/research/PITFALLS.md` -- React + contentEditable gotchas, browser inconsistencies
- MDN contentEditable docs -- Browser compatibility, plaintext-only support
- Can I Use contentEditable plaintext-only -- 97% global browser coverage, Firefox 136+
- MDN beforeinput event -- Baseline Widely Available since March 2021
- npm view @fontsource-variable/eb-garamond -- Version 5.2.7 confirmed

### Secondary (MEDIUM confidence)
- CSS text-wrap: pretty -- Chrome 117+ only, progressive enhancement
- Guardian Scribe browser inconsistencies -- Referenced in PITFALLS.md, documents Chrome/Firefox differences

### Tertiary (LOW confidence)
- None -- all findings verified through primary or secondary sources.

## Project Constraints (from CLAUDE.md)

- **CSS Modules:** All components must use co-located `.module.css` files (project convention)
- **TypeScript strict mode:** All types must be correct, `noUnusedLocals`, `noUnusedParameters`
- **Feature directory structure:** Components live in `frontend/src/features/{feature-name}/`
- **Named exports for reusable components, default exports for route-level screens**
- **Domain contexts:** New code should prefer `useCVContext()`, `useJobContext()`, `useToolsContext()` over `useAppContext()`
- **Tests in `frontend/src/__tests__/`** with `.test.ts` / `.test.tsx` suffix
- **Run `npx tsc --noEmit` from `frontend/` dir** to type-check
- **ESLint flat config** -- code must pass `npx eslint`
- **No path aliases** -- all imports use relative paths `../`, `../../`
- **Barrel files** in hooks/ -- new hooks should be exported from `frontend/src/hooks/index.ts`
- **GSD workflow enforcement** -- do not make repo edits outside GSD workflow
- **Event handlers:** `handle` + action naming (e.g., `handleFieldChange`, `handleBulletAdd`)
- **Boolean state:** `is` prefix (e.g., `isSaving`, `isFocused`)
- **CSS class names:** camelCase (e.g., `.sectionHeader`, `.bulletItem`, `.editableField`)
- **CSS transitions:** `transition: all 0.18s ease;` for hover states

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Only new dependency is @fontsource-variable/eb-garamond (5.2.7 verified). All other tech is browser built-in or already in project.
- Architecture: HIGH -- Component decomposition follows established project patterns. contentEditable approach validated in prior research with code examples.
- Pitfalls: HIGH -- All 6 pitfalls are well-documented in prior research (PITFALLS.md) with prevention strategies. The auto-save/blur-sync gap (Pitfall 5) is the one novel concern.
- CSS fidelity: MEDIUM -- CSS values derived directly from resume.cls, but actual rendering comparison requires manual visual testing. Text reflow will differ due to Knuth-Plass vs greedy line-breaking.

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain -- browser APIs and React 19 patterns are not changing)

---
*Phase: 02-core-editing-surface*
*Research completed: 2026-03-29*
