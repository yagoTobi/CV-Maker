# Phase 3: Content Management - Research

**Researched:** 2026-03-30
**Domain:** React contentEditable CRUD, hover-reveal UI controls, CSS page break detection
**Confidence:** HIGH

## Summary

Phase 3 adds entry-level CRUD operations (add, delete, toggle visibility) and a page overflow indicator to the existing web CV editing surface built in Phase 2. The technical domain is well-bounded: all mutations target CVFormData through the existing `setFormData` in CVContext, and all UI controls render inside `MedLengthTemplate.tsx` using hover-reveal CSS patterns already established in Phase 2's `EditableField`.

The primary complexity is structural, not technical. MedLengthTemplate currently has 6 section renderers (work, education, skills, projects, awards, additional) totaling ~500 lines. Adding per-entry delete buttons, per-section add buttons, per-section toggle controls, and a page break indicator means touching every section renderer. The key risk is making MedLengthTemplate unmanageable. The recommended approach is to extract reusable "action wrapper" components (EntryWrapper with delete, SectionWrapper with add+toggle) rather than inlining control logic into every renderer.

The CRUD logic itself is well-precedented: `useFormBuilder.ts` already has complete add/remove functions for all entry types (`emptyWorkEntry()`, `addWorkEntry()`, `removeWorkEntry()`, etc.) with the exact factory functions and ID generation patterns needed. These factory functions should be extracted to a shared module so `useDirectEditor` can reuse them.

**Primary recommendation:** Extract factory functions from useFormBuilder to shared utilities, build EntryWrapper/SectionWrapper components for hover-reveal controls, extend useDirectEditor with addEntry/removeEntry/toggleSection, and use ResizeObserver for page break detection.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Contextual "+" buttons appear at the bottom of each section, visible only on hover. When not hovering, the CV looks clean with no UI chrome.
- **D-02:** The hover zone covers the area below the last entry in each section. The button text is contextual: "+ Add work entry", "+ Add education", "+ Add skill category", etc.
- **D-03:** Trash/X icon appears in the top-right corner of an entry when hovering over it. Click to trigger delete.
- **D-04:** Confirmation dialog for "major" entries only -- deleting an entire job, education entry, project, or award shows a confirm prompt. Bullets and individual skills delete instantly without confirmation.
- **D-05:** Section visibility toggle appears in a hover toolbar on the section header. Not visible when not hovering -- keeps the CV clean.
- **D-06:** Hidden sections collapse to a muted label (section name visible but content hidden). Data is preserved in CVFormData. Toggling back restores full content.
- **D-07:** Horizontal dashed line appears at the page break point (11 inches from top) with a "Page 2" label. Content continues below the line.
- **D-08:** The indicator is calculated based on the CV container's scroll height vs the page height (11in equivalent in px).

### Claude's Discretion
- Exact hover zone sizing and transition timing for add buttons
- Confirmation dialog styling (inline vs modal)
- Section toggle icon choice (eye, chevron, or similar)
- Page break calculation method (ResizeObserver, scroll height, etc.)
- Whether empty sections (0 entries) show the add button by default (not just on hover)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | User can add a new entry to any section via contextual "+" button | Factory functions from useFormBuilder, SectionWrapper with hover-reveal add button, useDirectEditor.addEntry |
| CONT-02 | User can delete any entry via contextual delete control (with confirmation for major entries) | EntryWrapper with hover-reveal trash icon, confirmation dialog component, useDirectEditor.removeEntry |
| CONT-03 | User can toggle section visibility on/off without deleting underlying data | hiddenSections state (Set or CVFormData field), SectionWrapper with toggle icon in header hover toolbar |
| CONT-04 | New entries appear in correct position with empty/placeholder content ready to edit | Factory functions create entries with empty strings + stable IDs, placeholders already handled by EditableField |
| UX-02 | Visual indicator when content exceeds page boundary | ResizeObserver on CV container, PageBreakIndicator component at computed pixel offset |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already in project |
| nanoid | 5.1.7 | Stable ID generation for new entries | Already used via `generateId()` in `idHelpers.ts` |
| CSS Modules | N/A | Component-scoped styling | Project convention, all Phase 2 components use .module.css |

### Supporting (no new dependencies)
No new npm packages are required for this phase. Everything is built with:
- Native browser APIs: `contentEditable`, `ResizeObserver`, `window.getComputedStyle`
- React primitives: `useState`, `useCallback`, `useEffect`, `useRef`
- Existing project utilities: `generateId()`, `setAtPath()`, `getAtPath()`

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ResizeObserver for page break | IntersectionObserver + sentinel div | ResizeObserver fires on any size change (content add/delete); IntersectionObserver requires a fixed sentinel which is less reliable when content height changes dynamically. Use ResizeObserver. |
| Inline confirmation prompt | window.confirm() | window.confirm blocks the thread and looks native/ugly. Use a small inline or modal component matching existing app styling. |
| CSS :hover for control visibility | JavaScript mouseenter/mouseleave state | CSS :hover is simpler and more performant. JavaScript event state is needed only if hover behavior must be persisted (e.g., keeping controls visible while a menu is open). Start with CSS, fall back to JS only if needed for confirmation dialogs. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/features/direct-edit/
  components/
    MedLengthTemplate.tsx          # Modified: uses SectionWrapper/EntryWrapper
    MedLengthTemplate.module.css   # Modified: add/delete/toggle hover styles
    SectionWrapper.tsx             # NEW: section container with add button + toggle
    SectionWrapper.module.css      # NEW
    EntryWrapper.tsx               # NEW: entry container with delete button
    EntryWrapper.module.css        # NEW
    ConfirmDialog.tsx              # NEW: confirmation for major deletes
    ConfirmDialog.module.css       # NEW
    PageBreakIndicator.tsx         # NEW: dashed line at page boundary
    PageBreakIndicator.module.css  # NEW
    EditableField.tsx              # Unchanged
    EditableBulletList.tsx         # Unchanged
    SaveIndicator.tsx              # Unchanged
  hooks/
    useDirectEditor.ts             # Modified: add addEntry, removeEntry, toggleSection
    useAutoSave.ts                 # Unchanged
    usePageBreak.ts                # NEW: ResizeObserver-based page break detection
  DirectEditPage.tsx               # Modified: pass new callbacks, render PageBreakIndicator
  DirectEditPage.module.css        # Unchanged
frontend/src/utils/
  entryFactories.ts                # NEW: extracted empty*() factories from useFormBuilder
```

### Pattern 1: Hover-Reveal Controls via CSS
**What:** Add/delete/toggle controls are invisible by default, appear on parent hover via CSS `.parent:hover .control { opacity: 1 }`.
**When to use:** All add buttons, delete buttons, and section toggle icons.
**Example:**
```css
/* SectionWrapper: add button at bottom, visible on hover */
.sectionWrap:hover .addButton {
  opacity: 1;
}

.addButton {
  opacity: 0;
  transition: opacity 0.15s ease;
  /* Use existing interaction color language from Phase 2 */
  color: var(--text-muted);
  cursor: pointer;
  border: none;
  background: none;
  font-family: "EB Garamond Variable", "EB Garamond", Georgia, serif;
  font-size: 11pt;
  padding: 4px 8px;
}

.addButton:hover {
  color: var(--accent);
}
```

```tsx
// SectionWrapper component
interface SectionWrapperProps {
  sectionKey: string;
  title: string;
  isHidden: boolean;
  onToggleVisibility: () => void;
  onAddEntry: () => void;
  addLabel: string; // "+ Add work entry", "+ Add education", etc.
  children: React.ReactNode;
}

function SectionWrapper({
  sectionKey, title, isHidden, onToggleVisibility,
  onAddEntry, addLabel, children,
}: SectionWrapperProps) {
  return (
    <div className={styles.sectionWrap} data-section={sectionKey}>
      <div className={styles.sectionHeaderRow}>
        <div className={styles.sectionHeader}>{title}</div>
        <button
          className={styles.toggleButton}
          onClick={onToggleVisibility}
          aria-label={isHidden ? `Show ${title}` : `Hide ${title}`}
        >
          {/* Eye icon or similar */}
        </button>
      </div>
      {!isHidden && (
        <>
          <div className={styles.sectionContent}>{children}</div>
          <button className={styles.addButton} onClick={onAddEntry}>
            {addLabel}
          </button>
        </>
      )}
      {isHidden && (
        <div className={styles.hiddenLabel}>{title} (hidden)</div>
      )}
    </div>
  );
}
```

### Pattern 2: EntryWrapper with Delete Control
**What:** Each entry (job, education, etc.) is wrapped in a component that renders a delete button on hover.
**When to use:** Work entries, education entries, projects, awards, additional section entries.
**Example:**
```tsx
interface EntryWrapperProps {
  onDelete: () => void;
  requireConfirm?: boolean; // true for "major" entries
  confirmMessage?: string;
  children: React.ReactNode;
}

function EntryWrapper({
  onDelete, requireConfirm = false, confirmMessage, children,
}: EntryWrapperProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (requireConfirm) {
      setShowConfirm(true);
    } else {
      onDelete();
    }
  };

  return (
    <div className={styles.entryWrap}>
      <button
        className={styles.deleteButton}
        onClick={handleDelete}
        aria-label="Delete entry"
      >
        {/* X or trash icon */}
      </button>
      {children}
      {showConfirm && (
        <ConfirmDialog
          message={confirmMessage ?? 'Delete this entry?'}
          onConfirm={() => { onDelete(); setShowConfirm(false); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
```

### Pattern 3: Extract Factory Functions from useFormBuilder
**What:** The `empty*()` factory functions (emptyWorkEntry, emptyEducationEntry, etc.) are currently private to useFormBuilder.ts. Extract them to a shared `entryFactories.ts` utility so useDirectEditor can reuse them.
**When to use:** When addEntry is called from useDirectEditor.
**Example:**
```typescript
// frontend/src/utils/entryFactories.ts
import { generateId } from './idHelpers';
import type { WorkEntry, EducationEntry, SkillCategory, Project, Award, AdditionalEntry, AdditionalSection, BulletItem } from '../types';

export function emptyBullet(): BulletItem {
  return { id: generateId(), text: '' };
}

export function emptyWorkEntry(): WorkEntry {
  return { id: generateId(), company: '', title: '', startDate: '', endDate: '', location: '', bullets: [emptyBullet()] };
}

export function emptyEducationEntry(): EducationEntry {
  return { id: generateId(), school: '', degree: '', startDate: '', endDate: '', location: '', gpa: '', details: [] };
}

// ... etc for all entry types
```

### Pattern 4: Section Visibility via Hidden Sections State
**What:** Track which sections are hidden in a `Set<string>` state. Hidden sections still exist in CVFormData but are visually collapsed. The state can live in DirectEditPage or useDirectEditor.
**When to use:** Section toggle (CONT-03).
**Example:**
```typescript
// In useDirectEditor or DirectEditPage
const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());

const toggleSection = useCallback((sectionKey: string) => {
  setHiddenSections(prev => {
    const next = new Set(prev);
    if (next.has(sectionKey)) {
      next.delete(sectionKey);
    } else {
      next.add(sectionKey);
    }
    return next;
  });
}, []);
```

**Design choice -- where to store hiddenSections:**
- **Option A: Component state in DirectEditPage** -- Simplest. Hidden state is ephemeral (resets on page reload). Good for "temporary hide while editing" use case.
- **Option B: In CVFormData** -- Persists across sessions. Requires adding a `hiddenSections?: string[]` field to the CVFormData type and backend model.

**Recommendation:** Start with Option A (component state). If persistence is needed later, it is a small migration to add to CVFormData. The CONTEXT.md does not mention persistence requirements for hidden sections.

### Pattern 5: Page Break Detection with ResizeObserver
**What:** Detect when CV content exceeds one US Letter page (11 inches) and render a dashed line indicator at that boundary.
**When to use:** UX-02 page overflow indicator.
**Example:**
```typescript
// frontend/src/features/direct-edit/hooks/usePageBreak.ts
import { useState, useEffect, useRef, useCallback } from 'react';

/** Returns the pixel offset where page 2 starts (null if content fits on one page). */
export function usePageBreak(containerRef: React.RefObject<HTMLElement | null>) {
  const [pageBreakY, setPageBreakY] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function calculate() {
      // Convert 11in to pixels using CSS computed style
      // The container has padding of 0.3in top + 0.3in bottom = 0.6in
      // Page content area = 11in - 0.6in = 10.4in (but the full page is 11in)
      // We measure 11in from the top of the container
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '11in';
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      document.body.appendChild(tempDiv);
      const pageHeightPx = tempDiv.offsetWidth; // 11in in pixels
      document.body.removeChild(tempDiv);

      const contentHeight = el.scrollHeight;
      if (contentHeight > pageHeightPx) {
        setPageBreakY(pageHeightPx);
      } else {
        setPageBreakY(null);
      }
    }

    const observer = new ResizeObserver(calculate);
    observer.observe(el);
    calculate(); // Initial check

    return () => observer.disconnect();
  }, [containerRef]);

  return pageBreakY;
}
```

### Anti-Patterns to Avoid

- **Inlining add/delete/toggle logic into every section renderer:** MedLengthTemplate is already ~500 lines. Don't add 20+ lines of control logic per section. Use wrapper components.
- **Using positional indices as keys when adding/deleting entries:** Phase 1 added stable IDs to all entries. Use `entry.id` as the React key, not the array index. This is already done in MedLengthTemplate.
- **Storing hidden section state in the DOM:** Don't use `display: none` and check visibility from the DOM. Keep it in React state.
- **Blocking the main thread for page break calculation:** ResizeObserver callbacks fire asynchronously. Don't use synchronous layout reads in a loop.
- **Using window.confirm() for delete confirmation:** It blocks the thread and looks inconsistent with the app. Use a lightweight component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique IDs for new entries | Custom counter/UUID generator | `generateId()` from `idHelpers.ts` (nanoid) | Already established in Phase 1, consistent with existing data model |
| Entry factory functions | New factory logic in useDirectEditor | Extract from `useFormBuilder.ts` existing factories | 9 factory functions already exist and are tested implicitly through useFormBuilder tests |
| Hover state management | Custom mouseenter/mouseleave with useState | CSS `:hover` pseudo-class | More performant, no state updates, simpler code. JS fallback only if needed for dialogs. |
| Page size conversion (inches to pixels) | Hardcoded pixel values | CSS units (`11in`) computed at runtime | Handles different DPI/zoom levels correctly |

**Key insight:** The CRUD operations are already implemented in `useFormBuilder.ts`. The work is (a) extracting those patterns to be reusable, (b) wiring them into `useDirectEditor`, and (c) building the hover-reveal UI layer. There is very little novel logic.

## Common Pitfalls

### Pitfall 1: MedLengthTemplate Becomes Unmanageable
**What goes wrong:** Adding add/delete/toggle controls to every section renderer makes the component 1000+ lines and impossible to modify.
**Why it happens:** Phase 2 inlined all section rendering into one component for simplicity. Phase 3 adds significantly more per-section logic.
**How to avoid:** Extract SectionWrapper and EntryWrapper components. MedLengthTemplate stays as the layout coordinator; each section renderer passes children to wrapper components.
**Warning signs:** Any single section renderer exceeding 40 lines.

### Pitfall 2: Delete Removes Entry but React Crashes on Missing Ref
**What goes wrong:** Deleting an entry removes it from CVFormData, but an EditableField still has a stale ref/focus, causing a crash or visual glitch.
**Why it happens:** React's reconciliation runs before the browser can blur the focused element inside the deleted entry.
**How to avoid:** Delete handler should blur any focused element inside the entry before removing it from state. Or simply ensure the entry's key is the stable ID so React properly unmounts it.
**Warning signs:** Console errors about "Cannot read properties of null" after deletion.

### Pitfall 3: Page Break Indicator Flickers During Typing
**What goes wrong:** ResizeObserver fires on every keystroke (because content height changes), causing the page break line to appear/disappear rapidly.
**Why it happens:** Each character typed can change the scroll height by a few pixels, oscillating around the boundary.
**How to avoid:** Debounce the ResizeObserver callback (50-100ms), or use a small threshold (e.g., content must exceed page height by at least 10px before showing the indicator).
**Warning signs:** Visual flicker of the dashed line while typing near the page boundary.

### Pitfall 4: Hidden Section Toggle Breaks sectionOrder Loop
**What goes wrong:** Toggling a section hidden removes it from rendering, but when toggled back, it appears in the wrong position.
**Why it happens:** If hidden sections are filtered out of sectionOrder instead of just visually collapsed.
**How to avoid:** Hidden sections remain in sectionOrder. The rendering loop checks `hiddenSections.has(key)` and renders the collapsed label instead of full content. Never filter sectionOrder.
**Warning signs:** Sections appearing in different order after hide/show cycle.

### Pitfall 5: Adding Entry to Empty Section Creates No Visible Section
**What goes wrong:** User wants to add a project, but the Projects section doesn't appear because `renderProjectsSection` returns `null` when `entries.length === 0`.
**Why it happens:** Phase 2 intentionally hides empty sections (matching LaTeX template behavior). But Phase 3 needs empty sections to be addable.
**How to avoid:** The add button for sections with 0 entries should still be visible (either always-visible or in a dedicated "Add Section" UI). Per CONTEXT.md Claude's Discretion: "Whether empty sections (0 entries) show the add button by default (not just on hover)" -- recommendation is yes, show it by default for empty sections.
**Warning signs:** User has no way to add the first project/award if section never renders.

### Pitfall 6: structuredClone Deep Copy Performance
**What goes wrong:** Every entry add/delete creates a full deep copy of the entire CVFormData via structuredClone.
**Why it happens:** useDirectEditor.updateField already uses `structuredClone(prev)` for immutable updates.
**How to avoid:** For Phase 3 this is fine -- CVFormData is small (< 100 entries). Only flag if profiling shows it as a bottleneck. The existing pattern is correct for immutability.
**Warning signs:** Noticeable lag (>100ms) on add/delete operations with very large CVs.

## Code Examples

Verified patterns from existing codebase:

### Adding an Entry to CVFormData (from useFormBuilder)
```typescript
// Source: frontend/src/hooks/useFormBuilder.ts lines 195-197
const addWorkEntry = useCallback(() => {
  setFormData(prev => ({ ...prev, workExperience: [...prev.workExperience, emptyWorkEntry()] }));
}, []);
```

### Removing an Entry from CVFormData (from useFormBuilder)
```typescript
// Source: frontend/src/hooks/useFormBuilder.ts lines 206-208
const removeWorkEntry = useCallback((index: number) => {
  setFormData(prev => ({ ...prev, workExperience: prev.workExperience.filter((_, i) => i !== index) }));
}, []);
```

### Adding an Additional Section (from useFormBuilder -- includes sectionOrder update)
```typescript
// Source: frontend/src/hooks/useFormBuilder.ts lines 434-445
const addAdditionalSection = useCallback(() => {
  setFormData(prev => {
    const currentSections = prev.additionalSections || [];
    const newSection = emptyAdditionalSection(currentSections.length);
    const newSectionId = `additional-${currentSections.length}`;
    return {
      ...prev,
      additionalSections: [...currentSections, newSection],
      sectionOrder: [...(prev.sectionOrder || DEFAULT_SECTION_ORDER), newSectionId],
    };
  });
}, []);
```

### Existing Hover Highlight Pattern (from EditableField.module.css)
```css
/* Source: frontend/src/features/direct-edit/components/EditableField.module.css */
.editableField:hover:not(:focus) {
  background-color: rgba(59, 130, 246, 0.04);
}
```

### Entry Key Pattern (from MedLengthTemplate)
```tsx
// Source: frontend/src/features/direct-edit/components/MedLengthTemplate.tsx line 199
{entries.map((job, i) => (
  <div key={job.id} className={styles.subsection}>
    {/* ... */}
  </div>
))}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | addEntry creates correct empty entry at end of section array | unit | `cd frontend && npx vitest run src/__tests__/useDirectEditor.test.ts -x` | Needs extension |
| CONT-01 | "+" button renders on section hover, fires addEntry callback | unit | `cd frontend && npx vitest run src/__tests__/SectionWrapper.test.tsx -x` | Wave 0 |
| CONT-02 | removeEntry removes entry at given index from correct section array | unit | `cd frontend && npx vitest run src/__tests__/useDirectEditor.test.ts -x` | Needs extension |
| CONT-02 | Delete button renders on entry hover, fires onDelete callback | unit | `cd frontend && npx vitest run src/__tests__/EntryWrapper.test.tsx -x` | Wave 0 |
| CONT-02 | Confirmation dialog appears for "major" entry deletes | unit | `cd frontend && npx vitest run src/__tests__/EntryWrapper.test.tsx -x` | Wave 0 |
| CONT-03 | toggleSection adds/removes section key from hidden set | unit | `cd frontend && npx vitest run src/__tests__/useDirectEditor.test.ts -x` | Needs extension |
| CONT-03 | Hidden section renders collapsed label, not content | unit | `cd frontend && npx vitest run src/__tests__/SectionWrapper.test.tsx -x` | Wave 0 |
| CONT-04 | New entry has correct structure with empty strings and stable ID | unit | `cd frontend && npx vitest run src/__tests__/entryFactories.test.ts -x` | Wave 0 |
| UX-02 | usePageBreak returns pixel offset when content exceeds 11in | unit | `cd frontend && npx vitest run src/__tests__/usePageBreak.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/__tests__/entryFactories.test.ts` -- covers CONT-04 (correct empty entry structure)
- [ ] `frontend/src/__tests__/SectionWrapper.test.tsx` -- covers CONT-01, CONT-03 (add button, toggle visibility)
- [ ] `frontend/src/__tests__/EntryWrapper.test.tsx` -- covers CONT-02 (delete button, confirmation dialog)
- [ ] `frontend/src/__tests__/usePageBreak.test.ts` -- covers UX-02 (page break detection)
- [ ] Extend `frontend/src/__tests__/useDirectEditor.test.ts` -- covers CONT-01, CONT-02, CONT-03 (addEntry, removeEntry, toggleSection)

## Open Questions

1. **Should hiddenSections persist in CVFormData?**
   - What we know: CONTEXT.md D-06 says "Data is preserved in CVFormData" and "Toggling back restores full content" -- this refers to section *data* preservation, not the hidden state itself.
   - What's unclear: Whether the user expects hidden sections to remain hidden after page reload / version switch.
   - Recommendation: Start with ephemeral state (component-level). Add CVFormData persistence as a follow-up if users request it. Lower implementation cost, no backend change, no type migration.

2. **How should empty sections (0 entries) be represented?**
   - What we know: Currently `renderWorkSection` returns `null` when `entries.length === 0`. Phase 3 needs users to be able to add the first entry to any section.
   - What's unclear: Whether empty standard sections (skills, projects, awards) should always show their header + add button, or only after user explicitly adds the section.
   - Recommendation: For sections that already have entries in formData (even if empty array), always show the section header with the add button visible by default (not hover-only). For sections with no array (e.g., projects when `formData.projects` is undefined or empty), show them but with the add button always visible. This matches the Phase 2 empty template which initializes with empty arrays for all sections.

3. **Icon choice for section toggle and delete**
   - What we know: No icon library in the project. Phase 2 explicitly stated "no icons in this phase."
   - What's unclear: Whether to add an icon library or use Unicode/SVG.
   - Recommendation: Use inline SVG icons (3-5 simple icons: X/trash for delete, eye/eye-off for toggle). No icon library dependency. Keep them as small React components or inline SVG in JSX.

## Sources

### Primary (HIGH confidence)
- `frontend/src/hooks/useFormBuilder.ts` -- All CRUD patterns and factory functions (add/remove/reorder for every entry type)
- `frontend/src/features/direct-edit/hooks/useDirectEditor.ts` -- Current state controller (updateField, addBullet, removeBullet)
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` -- Current section rendering (all 6 section renderers)
- `frontend/src/features/direct-edit/components/EditableField.module.css` -- Existing hover highlight pattern
- `frontend/src/types/index.ts` -- Complete CVFormData type definition with all entry interfaces
- `.planning/phases/02-core-editing-surface/02-UI-SPEC.md` -- Phase 2 visual contract (interaction colors, typography, spacing)
- `.planning/phases/03-content-management/03-CONTEXT.md` -- User decisions D-01 through D-08

### Secondary (MEDIUM confidence)
- MDN ResizeObserver API -- Standard browser API, well-supported in modern browsers (project targets modern browsers only per CLAUDE.md)
- CSS `:hover` pseudo-class behavior with nested elements -- Standard CSS, well-understood

### Tertiary (LOW confidence)
- None -- all patterns are verified from existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, all existing project tools
- Architecture: HIGH -- Patterns directly derived from existing useFormBuilder CRUD and Phase 2 components
- Pitfalls: HIGH -- Identified from direct code reading (empty section rendering, ref lifecycle, sectionOrder integrity)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- no external dependency changes)
