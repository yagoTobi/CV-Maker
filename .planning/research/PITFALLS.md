# Pitfalls Research

**Domain:** WYSIWYG direct-edit web CV editor (contentEditable inline editing on web-rendered CV templates)
**Researched:** 2026-03-29
**Confidence:** HIGH (contentEditable gotchas), MEDIUM (CSS-to-LaTeX matching), HIGH (data model sync)

## Critical Pitfalls

### Pitfall 1: React Reconciler Fights contentEditable DOM Mutations

**What goes wrong:**
React's virtual DOM reconciler assumes it owns the DOM. When users type into a `contentEditable` element, the browser mutates the DOM directly. On the next React render, React sees the DOM doesn't match its virtual DOM and either: (a) overwrites the user's edits, resetting text to the previous state, or (b) throws the cursor to position 0. React itself warns about this: "React warns if you try to pass React children to an element with `contentEditable={true}` because React will not be able to update its content after user edits."

**Why it happens:**
Developers use `useState` to store editable text and pass it as children to contentEditable elements. Any state change triggers a re-render, which clobbers the browser-managed DOM content. The `react-contenteditable` library explicitly documents: "Using this component with `useState` doesn't work."

**How to avoid:**
- Use `useRef` (not `useState`) for the contentEditable element's innerHTML. Never pass React children into a contentEditable node.
- Set `suppressContentEditableWarning={true}` on the element.
- Sync user edits to CVFormData on `blur` or debounced `input` events -- not on every keystroke. The ref holds the live DOM state; CVFormData holds the committed state.
- Use `dangerouslySetInnerHTML` for initial render only; after mount, let the browser own the DOM subtree.
- Consider `contenteditable="plaintext-only"` where possible (CV text fields are plain text). This avoids rich-text HTML generation entirely and strips formatting on paste.

**Warning signs:**
- Cursor jumps to start of text field while typing
- Typed characters disappear or revert
- Console warning: "A component is `contentEditable` and contains `children` managed by React"
- `useEffect` or `setState` calls happening on every `input` event inside editable regions

**Phase to address:**
Phase 1 (Core editing component). This must be the very first thing validated in a spike. If the React-contentEditable contract is wrong, everything built on top fails.

---

### Pitfall 2: CSS Cannot Match LaTeX Typography (The "Pixel-Perfect" Illusion)

**What goes wrong:**
Teams promise "pixel-perfect" matching between a web CSS rendering and a LaTeX-compiled PDF, then spend weeks chasing 1-2px line-height differences, slightly different glyph widths, and text that wraps at different points. LaTeX uses the Knuth-Plass line-breaking algorithm (globally optimal paragraph layout), while CSS uses a greedy algorithm (locally optimal, line-by-line). The same paragraph will wrap differently. LaTeX also has its own micro-typographic features (ligatures, kerning pairs, optical margin alignment via `microtype`) that CSS cannot replicate.

**Why it happens:**
The templates use specific fonts:
- **med-length-proff-cv**: EB Garamond (available on Google Fonts, but the pdflatex version uses T1-encoded Type 1 outlines with different hinting than the OTF web version)
- **deedy-resume**: Lato + Raleway (available on Google Fonts, shipped as TTF/OTF in the template -- closest match possible)
- **mcdowell-cv**: Times New Roman (system font, but LaTeX uses the fontspec package with xelatex which may handle kerning differently)

Even with the same font file, LaTeX and CSS render text at slightly different widths due to different text layout engines. The LaTeX `resume.cls` uses `\geometry{top=0.3in, bottom=0.3in, left=0.2in, right=0.2in}` -- recreating these exact margins in CSS is straightforward, but text reflow within those margins will differ.

**How to avoid:**
- Redefine "pixel-perfect" as "visually equivalent" -- same font, same margins, same visual hierarchy, same page structure. Expect 1-5% text reflow differences.
- Start with `med-length-proff-cv` which is single-column (easier layout) but note its EB Garamond has the most font-matching risk. Alternatively, start with `mcdowell-cv` (Times New Roman is universally available, single-column, clean layout).
- Load the exact same font files used by the LaTeX templates as `@font-face` web fonts. For Deedy, the TTF files in `cv-templates/deedy-resume/fonts/` can be served directly. For EB Garamond, use the Google Fonts version and accept minor kerning differences.
- Do NOT attempt to match line breaks 1:1. Match the visual structure (sections, spacing ratios, font sizes, weight hierarchy) instead.
- Build a visual regression test: compile the LaTeX PDF, render the web version, screenshot both, overlay them. Accept a tolerance threshold (e.g., structural match within 5px per section).

**Warning signs:**
- Spending more than 2 days tweaking `letter-spacing` and `line-height` to match LaTeX output
- Text wrapping differently between web and PDF, causing sections to shift down
- Page overflow in web view where LaTeX fits to one page (LaTeX's paragraph optimizer is more compact)
- QA reports filed as "not matching the PDF" for cosmetic text reflow differences

**Phase to address:**
Phase 1 (First template web rendering). Set the visual fidelity bar explicitly at project start. Document that "visually equivalent" is the target, not "pixel-identical." Build the overlay comparison test early.

---

### Pitfall 3: Cursor Position Lost on Data Model Sync

**What goes wrong:**
User is typing in a bullet point. The `input` event fires, the component syncs the new text to CVFormData, CVFormData update triggers a re-render (because parent state changed), the contentEditable region re-renders, and the cursor position is lost -- jumping to the start of the element or to the end. The user's flow is completely broken.

**Why it happens:**
contentEditable cursor position is stored in the browser's Selection API as a (node, offset) pair. When React re-renders the contentEditable subtree (even if the HTML is identical), the DOM nodes are replaced, and the Selection reference becomes stale. Saving/restoring selection is fragile because:
- Selection anchor and focus can be in different directions (left-to-right vs right-to-left selection)
- Chrome/Safari auto-focus the editing host on programmatic selection changes; Firefox does not
- Text nodes may be split or merged during re-render, making offset calculations wrong

**How to avoid:**
- Never re-render a contentEditable element while it has focus. Use the ref pattern: the DOM is the source of truth while editing, CVFormData is updated on blur.
- If you must sync during editing (e.g., for live preview), save and restore cursor position using a character-offset approach (count characters from start of element, not DOM node offsets). Libraries like `rangy` or manual `TreeWalker` traversal can do this.
- Better yet: use React's `key` prop strategy. Each editable field gets a stable key that doesn't change during editing. Only force a re-render (key change) when the data changes from outside (AI suggestion applied, undo from history, version switch).
- Gate re-renders: if `document.activeElement` is inside the component's contentEditable tree, skip the re-render. Apply the update after blur.

**Warning signs:**
- Any `useEffect` that modifies DOM inside a contentEditable element
- CVFormData `setFormData` calls inside `onInput` handlers (not debounced, not gated by blur)
- Selection.getRangeAt(0) returning unexpected values after component updates
- Users reporting "cursor keeps jumping" during typing

**Phase to address:**
Phase 1 (Core editing component). This is inseparable from Pitfall 1 -- the sync contract between contentEditable and React state must be designed together.

---

### Pitfall 4: Browser-Generated HTML Chaos in contentEditable

**What goes wrong:**
Different browsers produce wildly different HTML when users edit contentEditable content. Pressing Enter produces `<div>` in Chrome, `<br>` in Firefox. Pasting from Word produces deeply nested `<span>` soup. Backspace across block elements produces inconsistent DOM structures. Bold formatting applies `<b>` in some browsers, `<strong>` in others, or inline `<span style="font-weight: bold">`. The Guardian's Scribe project documented dozens of these inconsistencies:
- Chrome applies inline `line-height` styles on backspace/delete
- Firefox places caret outside paragraph elements after multi-paragraph deletions
- Chrome merges pasted `<p>` elements into existing paragraphs; Firefox does not
- Chrome converts `<br>` to `<p>` under certain conditions
- Firefox throws `NS_ERROR_UNEXPECTED` for certain DOM commands when contentEditable is not focused

**Why it happens:**
The contentEditable spec leaves most behavior implementation-defined. Each browser engine has its own editing implementation. There is no standard for what HTML to produce for a given user action.

**How to avoid:**
- Use `contenteditable="plaintext-only"` wherever possible. For a CV editor, most fields are plain text (names, titles, bullet points, dates). This eliminates the HTML generation problem entirely -- the browser strips all formatting on paste and produces only text nodes.
- For the few fields that might need structure (bullet lists), use individual contentEditable elements per bullet rather than one large contentEditable block with HTML list markup. Each bullet is a separate `<div contenteditable="plaintext-only">` element.
- Intercept paste events (`onPaste`) and extract plain text: `e.clipboardData.getData('text/plain')`. Insert it manually rather than letting the browser handle rich paste.
- Normalize HTML on every `input` event if using `contenteditable="true"`: strip all tags except allowed ones, collapse whitespace, normalize line breaks.
- Do NOT use `document.execCommand()` for formatting -- it is deprecated and produces inconsistent results.

**Warning signs:**
- Pasting from Google Docs produces garbled formatting in the CV
- Line breaks behaving differently in Chrome vs Firefox vs Safari
- HTML in the contentEditable element contains unexpected `<span style="...">` wrappers
- CV data has HTML entities or tags leaking into plain text fields in CVFormData

**Phase to address:**
Phase 1 (Core editing component). The `plaintext-only` vs `true` decision must be made per-field upfront. Testing must cover Chrome, Firefox, and Safari paste behavior.

---

### Pitfall 5: Undo/Redo Breaks Across the React-ContentEditable Boundary

**What goes wrong:**
Users press Cmd+Z expecting to undo their last edit. Instead: (a) nothing happens because the browser's native undo stack was destroyed by React re-renders, (b) the undo reverts to a completely wrong state because the browser's undo history includes DOM mutations from React reconciliation (not just user edits), or (c) undo works inside one field but does not work across fields (user edited name, then edited a bullet, Cmd+Z only undoes within the bullet, not back to the name change).

**Why it happens:**
The browser maintains an internal undo stack per contentEditable host. This stack records DOM mutations. When React re-renders and replaces DOM nodes, those replacements are pushed onto the undo stack (or clear it entirely). The `document.execCommand()` method is the only way to make changes that integrate with the native undo buffer, but it is deprecated. The `beforeinput` event fires with `inputType: "historyUndo"` and `inputType: "historyRedo"`, but these are non-cancelable and return empty `getTargetRanges()`, making it impossible to intercept and redirect them reliably in all browsers.

**How to avoid:**
- Build a custom undo/redo stack at the CVFormData level (not the DOM level). Intercept Cmd+Z/Cmd+Shift+Z via `onKeyDown`, `preventDefault()` the browser's native undo, and apply your own undo logic.
- Store CVFormData snapshots on each meaningful edit (blur from a field, or debounced after typing pauses). Use an array of snapshots with a pointer for current position.
- Keep the undo stack shallow -- store diffs (field path + old value + new value) rather than full CVFormData snapshots. This matches the existing `TailorChange` model structure (fieldPath, currentValue, alternatives).
- Disable browser native undo within contentEditable by intercepting the `beforeinput` event for `historyUndo`/`historyRedo` input types. The more reliable approach is keyboard interception.
- Consider a command pattern: every edit is a command object with `execute()` and `undo()` methods, pushed onto a stack.

**Warning signs:**
- Cmd+Z does something unexpected (reverts wrong field, jumps to wrong state)
- Undo stack grows unbounded in memory
- Undo breaks after an AI suggestion is applied (AI changes go through a different code path than user edits)
- Undo/redo works in one browser but not another

**Phase to address:**
Phase 2 (after basic editing works). Undo/redo is not needed for MVP editing but is table-stakes UX. Design the undo architecture before building it -- retrofitting is painful.

---

### Pitfall 6: Drag-and-Drop Conflicts with contentEditable Text Selection

**What goes wrong:**
The existing CV builder has drag-and-drop section reordering using `data-drag-card` attributes and `draggable`. When an element is `draggable`, the browser disables normal text selection within it -- users must hold Alt to select text. This directly conflicts with contentEditable: the user clicks on a bullet point expecting to edit it, but instead initiates a drag operation. Or: the user tries to drag-select text within a bullet point, and instead drags the entire section card.

MDN documents this explicitly: "When an element is made draggable, text or other elements within it can no longer be selected in the normal way by clicking and dragging with the mouse."

**Why it happens:**
The HTML5 drag-and-drop API and contentEditable were designed independently. The `mousedown` event starts both a potential drag operation and a potential text selection. The browser has to guess which one the user intended.

The current codebase uses a grip-handle pattern (`onMouseDown` on grip icon sets `closest('[data-drag-card]').draggable = true`) which partially solves this, but:
- The `draggable` attribute remains true after grip mousedown until `onDragEnd` fires
- If the user clicks the grip then moves to a contentEditable area without completing a drag, `draggable` is still true
- Touch events on mobile have different interaction patterns entirely

**How to avoid:**
- Never set `draggable` on elements that contain contentEditable children. Instead, use a dedicated drag handle (grip icon) that is the ONLY draggable element. The drag handle's drag image can show the full section, but only the handle itself should be `draggable`.
- Use the `onDragStart` event on the handle to set drag data and create the drag image via `e.dataTransfer.setDragImage()`. Drop zones are on the section containers (not on contentEditable children).
- Separate the interaction zones cleanly: grip area = drag, content area = edit. No overlap.
- Consider replacing HTML5 drag-and-drop entirely for reordering. Use a button-based approach (up/down arrows) or a pointer-event-based custom drag implementation that does not fight with contentEditable. Libraries like `@dnd-kit/core` handle this better than native DnD because they use pointer events and transform-based positioning rather than the HTML5 DnD API.
- If keeping native DnD: set `draggable` to `true` ONLY during `mousedown` on the grip handle, and reset to `false` on `mouseup` (not just `dragend`). Add a `mouseup` listener on `document` as a safety net.

**Warning signs:**
- Users cannot select text by click-dragging within an editable field (the section card starts dragging instead)
- Text selection works in some fields but not others (inconsistent `draggable` state)
- Grip handle works for drag but clicking near it accidentally starts a drag operation
- Mobile users cannot interact with the editor at all

**Phase to address:**
Phase 2 (drag-and-drop reordering on the web CV). Must be addressed when adding reordering, but the interaction zone separation should be designed in Phase 1 (the section component structure needs to accommodate it).

---

### Pitfall 7: Data Model Sync Creates Phantom Entries or Loses Edits via Index Drift

**What goes wrong:**
The CVFormData model uses arrays for work experience, education, skills, etc. Each entry in these arrays has a positional index. When the user adds, removes, or reorders entries on the web CV, the indices change. If an AI suggestion is in-flight (e.g., from `/tailor/suggest-changes`) that references `workExperience[2].bullets[1]`, and the user has since deleted `workExperience[1]`, the suggestion's `fieldPath` now points to the wrong entry -- or to an entry that does not exist. The existing `formDataPatch.ts` resolves paths like `workExperience[0].bullets[2]` but does not account for index drift.

**Why it happens:**
The current architecture treats CVFormData as a positional data structure. There are no stable IDs on individual entries (no `workExperience[].id` field). AI suggestions reference entries by array index. Between the time a suggestion is generated and the time a user applies it, the array may have changed.

**How to avoid:**
- Add stable IDs to every array entry in CVFormData. Each `WorkEntry`, `EducationEntry`, `SkillCategory`, `Project`, `Award`, and `AdditionalEntry` should get a unique `id: string` field (UUID or nanoid). This is a data model change but is backward-compatible (existing data without IDs can be migrated by assigning IDs on load).
- AI suggestion `fieldPath` should reference entries by ID, not index: `workExperience[id:abc123].bullets[2]` instead of `workExperience[0].bullets[2]`. Update `formDataPatch.ts` to resolve ID-based paths.
- For contentEditable sync: each editable field maps to a specific path in CVFormData. On blur, write the field's text content to that path. The path should use stable IDs, not array indices.
- For add/remove operations: update CVFormData immediately (not on blur), generate a new ID for added entries, and let React re-render with the new data.

**Warning signs:**
- AI suggestions applying to the wrong bullet point or wrong job
- Deleting a work entry causes the next entry's content to change (index shift)
- Undo after delete restores the wrong entry's content
- "Add entry" creates a blank entry but with another entry's content (stale ref)

**Phase to address:**
Phase 1 (data model design). Adding IDs to CVFormData entries is a prerequisite for reliable editing. Must happen before building the editing layer. Also impacts Phase 3+ when integrating AI features with the new editor.

---

### Pitfall 8: The Two-Column Template (Deedy) Makes contentEditable Layout Nearly Impossible

**What goes wrong:**
The Deedy template uses a `\begin{minipage}[t]{0.33\textwidth}` / `\begin{minipage}[t]{0.66\textwidth}` two-column layout where sections are split across columns. In CSS, this maps to a side-by-side flexbox or grid layout. But the hard part is that Deedy's columns have FIXED section assignments (education and skills on the left, experience on the right) with different styling per column. contentEditable within a two-column CSS layout creates several issues:
- Tab order is confusing (does Tab go down the left column or across to the right?)
- Section reordering is constrained (cannot drag a section from left to right column)
- The left column has no bullet-point editing (skills use a textbullet separator, not an itemize environment)
- Overflow from one column does not flow into the other (unlike LaTeX minipage which clips)

**Why it happens:**
Two-column layouts are fundamentally more complex for contentEditable because the editing context spans two independent DOM subtrees. CSS multi-column layout (`column-count`) could theoretically auto-flow content, but it makes contentEditable cursor navigation bizarre (cursor jumps between columns mid-paragraph).

**How to avoid:**
- Start with a single-column template (`mcdowell-cv` or `med-length-proff-cv`) for the first implementation. The PROJECT.md already says "start with 1 template" -- make sure it is single-column.
- For the Deedy two-column template, treat each column as a separate editing context. The left column is a stack of non-reorderable sections; the right column is a stack of reorderable sections. Section reordering only works within a column, not across columns (matching the LaTeX template's fixed layout constraint already noted in MEMORY.md: "Deedy template: section reordering disabled in UI").
- Do NOT use CSS `column-count` or `column-width` for the two-column layout. Use explicit `display: grid; grid-template-columns: 1fr 2fr` or flexbox with fixed-width children.

**Warning signs:**
- Attempting the Deedy template first instead of a single-column template
- Using CSS multi-column layout for the two-column design
- Users confused about which column they are editing
- Content overflow in the left column pushing content off-screen

**Phase to address:**
Later phase (not Phase 1). Explicitly defer the Deedy template to Phase 3 or later. The single-column template proves the architecture; the two-column template is an expansion.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `innerHTML` to sync contentEditable to CVFormData | Simple string-based sync, no DOM traversal | HTML entities, browser-generated tags, and whitespace leak into form data; XSS risk if not sanitized | Never for `contenteditable="true"`. Acceptable for `contenteditable="plaintext-only"` with `textContent` instead. |
| No stable IDs on CVFormData array entries | No data model migration needed, backwards compatible | Every feature that references entries by index is fragile (undo, AI suggestions, drag-reorder) | Only in a throwaway spike. Must be fixed before production editing. |
| Skipping undo/redo | Faster initial implementation | Users will hit Cmd+Z constantly and get confused when nothing happens (or worse, browser native undo does something unpredictable) | MVP spike only. Must be in place before any user testing. |
| Single large contentEditable block per section | Fewer components, simpler structure | Browser HTML generation chaos for line breaks and formatting. Much harder to map edits back to specific CVFormData fields (which bullet changed?) | Never. Use one contentEditable element per atomic field. |
| Using `document.execCommand()` for formatting | Integrates with browser's native undo stack | Deprecated API, inconsistent results across browsers, will eventually be removed | Never for new code. |
| Storing cursor position as DOM node + offset | Direct browser API, no computation | Breaks when DOM structure changes (React re-render, normalize pass). Use character offset instead. | Only for within-keystroke temporary storage. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| AI Tailor suggestions + contentEditable | Applying a suggestion while user is actively typing in a field causes the edit to be lost and cursor to jump | Check `document.activeElement` before applying. If user is editing a different field than the suggestion targets, apply immediately. If same field, queue the suggestion and apply on blur. |
| CV Import + web editor | Import populates CVFormData but the web editor does not pick up changes because contentEditable elements are ref-based and do not re-render on state change | After import, force a re-mount of the entire editor component (change the React `key` to a new value derived from import timestamp). |
| Version switching + contentEditable | Loading a different version while a field has unsaved edits (ref-based, not yet synced to CVFormData on blur) silently loses the in-progress edit | On version switch, trigger blur on any active contentEditable element first (via `document.activeElement.blur()`), wait for the blur handler to sync, then load the new version. |
| Paste handling + CVFormData types | User pastes multi-line text into a single-line field (e.g., company name), or pastes text with tabs/special characters | Intercept `onPaste`, strip newlines for single-line fields, handle tab characters (replace with spaces or ignore). Validate on sync. |
| Web font loading + initial render | Fonts load asynchronously. Initial render uses fallback font, then FOUT (Flash of Unstyled Text) when web font loads. This shifts text positions, breaking visual alignment. | Use `document.fonts.ready` promise or `FontFaceObserver` to delay rendering until fonts are loaded. Show a skeleton/loading state during font loading. |
| IME (CJK) input + contentEditable sync | Syncing to CVFormData on every `input` event commits incomplete IME compositions, breaking Chinese/Japanese/Korean text input | Track composition state via `compositionstart`/`compositionend` events. Suppress sync during active composition. Only sync after `compositionend` fires. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering entire CV on every keystroke | Visible lag when typing, especially in sections with many entries. React DevTools shows full component tree re-rendering. | Isolate each editable field as a memo'd component. Sync to CVFormData on blur, not on input. Use `React.memo` with custom comparison on section components. | Noticeable with 5+ work entries (20+ editable fields on screen) |
| Saving/restoring Selection on every input event | Input latency above 16ms, dropped keystrokes, cursor jitter | Only save/restore selection when a React re-render is actually needed (not on every keystroke). If using the blur-sync pattern, selection save/restore is rarely needed. | Noticeable on mid-range devices or with complex nested contentEditable structures |
| Full CVFormData deep-comparison on every render | `JSON.stringify(formData)` in dependency arrays or equality checks causes GC pressure and main thread blocking | Use referential equality checks. Split CVFormData into per-section refs. Only compare the section that changed. | Noticeable with large CVs (10+ sections, 50+ fields) |
| CSS `@font-face` loading blocks First Contentful Paint | White screen for 200-500ms while custom fonts download | Use `font-display: swap` for progressive rendering. Preload the primary font with `<link rel="preload" as="font">`. Host fonts locally rather than loading from Google Fonts CDN. | Always on first visit. Repeat visits use cache. |
| Live PDF preview compilation on every edit | Backend hammered with compilation requests. 2-5 second lag per keystroke. | Remove live PDF preview entirely (the web CV IS the preview). Compile PDF only on explicit "Download" action. This is already planned in PROJECT.md: "LaTeX compilation fires only at download time." | Immediately. This is the whole point of the redesign. |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using `innerHTML` to read from contentEditable and inserting it elsewhere without sanitization | XSS if user (or paste) injects `<script>`, `<img onerror>`, or `<a href="javascript:">` tags | Always use `textContent` for plain text fields. For any HTML handling, sanitize with DOMPurify before storage or re-insertion. With `contenteditable="plaintext-only"`, the browser prevents HTML injection at the editing layer. |
| Passing contentEditable text directly to LaTeX compilation without escaping | LaTeX injection: user could craft text containing `\input{/etc/passwd}` or other dangerous commands | The existing `latex_escape` function already handles this. Ensure all text from the web editor passes through `latex_escape` before reaching the LaTeX template. The pipeline CVFormData -> Jinja2 template -> latex_escape already does this. |
| Storing raw HTML from contentEditable in CVFormData | Bloats storage with browser-generated HTML tags, creates inconsistencies across browsers, makes AI processing unreliable | CVFormData fields should store plain text only. Extract `textContent` from contentEditable elements, never `innerHTML`. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual affordance that text is editable | Users do not know they can click and type on the CV. They look for form fields or edit buttons. | Add subtle hover effects (faint border or background highlight on hover). Show a text cursor on hover over editable regions. Add a brief onboarding tooltip: "Click any text to edit." |
| Clicking between editable fields causes unexpected behavior | User clicks whitespace between sections, nothing happens (or focus goes to a random field). Dead zones in the layout confuse users. | Make section headers, labels, and structural elements non-editable. Ensure every clickable area either: (a) focuses an editable field, or (b) is clearly non-interactive. Eliminate ambiguous dead zones. |
| No feedback after editing (did my change save?) | Users type something, look for a "Save" button, worry changes are lost. The hidden CVFormData sync is invisible. | Show a subtle "saved" indicator (checkmark or fade animation) when edits sync to CVFormData. Auto-save to version storage with debounce. Match the behavior users expect from tools like Notion or Google Docs (always saved, never a save button for drafts). |
| Date fields as contentEditable text | Users type dates in inconsistent formats ("Jan 2024", "01/2024", "2024-01", "January 2024"). No validation, no standardization. | Use a hybrid approach: clicking a date shows a structured date picker (month dropdown + year input), not a free-text contentEditable field. The picked date renders as formatted text on the CV. Alternatively, accept free-text dates (current approach) since CVs commonly use varied formats. |
| Adding new entries is not discoverable | User wants to add a new job but cannot figure out how. The "+" button is hidden or too small. | Show a persistent "+" button at the bottom of each section (work, education, etc.). On hover, show a larger "Add [Entry Type]" button. The button should appear in context -- at the bottom of the work section, not in a toolbar. |
| Bullet point editing has no structure | User cannot figure out how to add a new bullet. They press Enter and the cursor goes to a weird place. | Each bullet is a separate editable element. Enter at the end of a bullet creates a new bullet below. Backspace on an empty bullet deletes it. This matches the mental model from Google Docs and Notion. |
| Empty contentEditable elements collapse to zero height | User cannot see or click on an empty field to start typing. The field becomes invisible. | Use CSS `min-height` on editable elements. Show placeholder text via CSS `::before` pseudo-element with `content: attr(data-placeholder)` when the element is empty (`:empty` selector). |
| Data loss on navigation or tab crash | User edits for 20 minutes, navigates away, loses everything. | Debounced auto-save to backend (every 3-5 seconds after last edit). Save to localStorage as crash recovery fallback. `beforeunload` warning for unsaved changes. Show save status indicator. |

## "Looks Done But Isn't" Checklist

- [ ] **contentEditable fields:** Often missing paste handling -- verify paste from Word, Google Docs, and plain text all produce clean text in CVFormData
- [ ] **Undo/redo:** Often missing cross-field undo -- verify that undoing after editing multiple fields reverses in correct order, not just within the last-edited field
- [ ] **Font matching:** Often missing font-weight matching -- verify that bold, semibold, and light weights in the web version match the LaTeX template's weight definitions (Deedy uses Lato Light as the base, Lato Regular as bold -- this is unusual)
- [ ] **Section spacing:** Often missing vertical rhythm -- verify spacing between sections, between entries within a section, and between bullets within an entry all match the LaTeX template's `\vspace` and `\sectionsep` commands
- [ ] **Empty state rendering:** Often missing empty section handling -- verify that a section with zero entries does not render broken (e.g., a section header with no content below it). LaTeX templates have conditionals for this; the web version needs them too.
- [ ] **Tab navigation:** Often missing keyboard navigation -- verify that Tab moves between editable fields in a logical order (name -> email -> phone -> summary -> first job title -> ...). Default browser tab order may not match the visual layout order.
- [ ] **IME input:** Often missing CJK text support -- verify that Chinese/Japanese/Korean input via IME does not trigger premature sync (composition events must be handled: do not sync on `input` during `compositionstart`..`compositionend` sequence)
- [ ] **Multi-page CVs:** Often missing page overflow handling -- verify that a long CV does not just extend infinitely in the web view. LaTeX auto-paginates; the web version needs either: (a) a visual page break indicator, or (b) a warning when content exceeds one page.
- [ ] **Print/export styling:** Often missing -- verify Cmd+P does not show edit controls (add buttons, drag handles, delete icons) in print output. Add `@media print` rules to hide editing UI.
- [ ] **Special characters in web vs LaTeX:** Often missing -- verify ampersands, percent signs, dollar signs, and underscores render correctly in both web and LaTeX (these are LaTeX special characters that `latex_escape` handles, but the web version should display them normally)
- [ ] **Link fields:** Often missing -- verify that URLs in personalInfo.links render as clickable links in the web view but do not create nested contentEditable-within-anchor issues

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| React reconciler clobbers contentEditable (Pitfall 1) | MEDIUM | Refactor to ref-based pattern. Requires changing every editable component but the fix is well-understood. ~2-3 days for a full CV editor. |
| "Pixel-perfect" scope creep (Pitfall 2) | LOW | Redefine target as "visually equivalent." No code changes -- just stop chasing impossible precision. Build the overlay test to prove equivalence. |
| Cursor position lost (Pitfall 3) | HIGH | If the sync architecture is wrong (useState-based instead of ref-based), the entire editing layer needs restructuring. If only missing save/restore logic, it is a targeted fix. |
| Browser HTML chaos (Pitfall 4) | MEDIUM | Retrofitting `plaintext-only` is straightforward if fields are already individual elements. If using one large contentEditable block per section, requires splitting into per-field elements first. |
| Undo/redo broken (Pitfall 5) | HIGH | Building a custom undo stack after the fact requires instrumenting every edit operation. If edits are not already going through a central dispatch, this is a significant refactor. Design it early. |
| Drag-and-drop conflicts (Pitfall 6) | LOW | Switch from HTML5 DnD to @dnd-kit or button-based reordering. The existing grip-handle pattern can be adapted. ~1-2 days. |
| Data model index drift (Pitfall 7) | MEDIUM | Adding IDs to CVFormData entries requires a migration for existing saved versions. The migration itself is simple (assign UUID to each entry on load), but updating all path references (AI suggestions, undo history, formDataPatch.ts) takes effort. |
| Two-column template complexity (Pitfall 8) | HIGH | If attempted too early, you may build a general contentEditable grid system that is overkill. Defer, and when you do build it, use column-specific editing contexts. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| React vs contentEditable (1) | Phase 1: Core editing spike | Typing in any field never causes cursor jump. React DevTools shows no re-renders of focused editable elements. |
| CSS-to-LaTeX matching (2) | Phase 1: First template rendering | Overlay comparison screenshot test passes within tolerance. Visual structure matches (sections, hierarchy, fonts). |
| Cursor position loss (3) | Phase 1: Core editing spike | Type in field A, click field B, click back to field A -- cursor appears at click position, not start. |
| Browser HTML chaos (4) | Phase 1: Core editing component | Paste from Word/Docs into a field, inspect CVFormData -- plain text only, no HTML tags. Test in Chrome, Firefox, Safari. |
| Undo/redo (5) | Phase 2: Edit history | Cmd+Z after editing 3 different fields undoes in reverse order. Undo after AI suggestion reverts the suggestion. |
| Drag-and-drop conflict (6) | Phase 2: Section reordering | Click-drag text selection works within editable fields. Grip handle drag works for section reordering. No interference. |
| Data model index drift (7) | Phase 1: Data model prep | Apply AI suggestion, delete an entry, apply another suggestion -- the second suggestion targets the correct entry. |
| Two-column template (8) | Phase 3+: Additional templates | Deedy template renders with correct column widths. Editing in left column does not affect right column. |

## Sources

- MDN: contentEditable documentation and browser compatibility -- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/contenteditable (HIGH confidence)
- MDN: document.execCommand() deprecation and undo buffer -- https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand (HIGH confidence)
- MDN: Selection API and browser inconsistencies -- https://developer.mozilla.org/en-US/docs/Web/API/Selection (HIGH confidence)
- MDN: CompositionEvent for IME input handling -- https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionstart_event (HIGH confidence)
- MDN: InputEvent.inputType specification (historyUndo/historyRedo) -- https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/inputType (HIGH confidence)
- W3C: Input Events Level 2 spec (46 input types including historyUndo/historyRedo) -- https://w3c.github.io/input-events/ (HIGH confidence)
- Guardian Scribe: Browser inconsistencies in contentEditable (Chrome vs Firefox differences) -- https://github.com/guardian/scribe/blob/master/BROWSERINCONSISTENCIES.md (HIGH confidence)
- react-contenteditable: useState incompatibility documentation -- https://github.com/lovasoa/react-contenteditable (HIGH confidence)
- React docs: contentEditable caveats and suppressContentEditableWarning -- https://react.dev/reference/react-dom/components/common (HIGH confidence)
- Slate.js migration guide (contentEditable abstraction patterns) -- https://github.com/ianstormtaylor/slate (MEDIUM confidence)
- W3C CSS Paged Media spec (CSS vs LaTeX pagination model differences) -- https://www.w3.org/TR/css-page-3/ (HIGH confidence)
- MDN: HTML Drag and Drop API and text selection conflict -- https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API (HIGH confidence)
- Existing codebase analysis: formDataPatch.ts (index-based path resolution), template configs, font files, cls files (HIGH confidence)
- Latin Modern / Computer Modern font availability (OTF available, no WOFF) -- https://ctan.org/tex-archive/fonts/lm (MEDIUM confidence)
- GUST Latin Modern project (relationship to Computer Modern, OTF format) -- https://www.gust.org.pl/projects/e-foundry/latin-modern (MEDIUM confidence)

---
*Pitfalls research for: WYSIWYG direct-edit web CV editor*
*Researched: 2026-03-29*
