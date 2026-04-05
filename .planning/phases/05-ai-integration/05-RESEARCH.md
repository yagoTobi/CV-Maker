# Phase 5: AI Integration - Research

**Researched:** 2026-04-05
**Domain:** AI-powered CV editing workflows -- import, tailor, apply-to-job with side panel review UI
**Confidence:** HIGH

## Summary

Phase 5 integrates three existing AI features (CV import, apply-to-job, tailor suggestions) with the web CV editor built in Phases 2-4. The core technical challenges are: (1) a side panel component with section-aligned change cards and synchronized scrolling alongside the web CV, (2) adapting the existing `useTailor` hook to power both the side panel and the Apply to Job flow, (3) wiring CV import to land directly in the web CV editor, and (4) an editor toolbar for Import/Download/save-status. Backend AI endpoints require no changes unless model swapping achieves measurably better speed.

The codebase is exceptionally well-prepared for this phase. `useTailor` already implements the full accept/skip/undo/editChangeValue queue-based flow. `useImport` manages the complete upload-extract state machine. `applyTailorChanges()` and `computeWordDiff()` are battle-tested utilities. `MedLengthTemplate` uses `data-section` attributes on every `SectionWrapper`, providing the DOM anchors needed for scroll synchronization. The primary work is building the side panel UI and adapting existing page layouts.

**Primary recommendation:** Build the ChangePanel as a new component in `frontend/src/features/direct-edit/components/`, reuse `useTailor` hook as-is for state management, and use `IntersectionObserver` + `data-section` attributes for scroll sync between CV and panel. Keep current Haiku 4.5 model for extraction -- it is already the fastest Claude model on Bedrock and likely meets the sub-2s target for most CVs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** AI-suggested changes appear in a **side panel** to the right of the web CV, not as inline diffs on the CV text. The CV stays clean and readable.
- **D-02:** Each change is a **card** with before/after text, aligned vertically with the corresponding section on the CV. When you scroll the CV, the panel scrolls in sync so cards stay next to their sections.
- **D-03:** The "after" text in each change card is **editable** -- users can tweak the AI suggestion before accepting. Accepted version (original or user-edited) goes into CVFormData.
- **D-04:** Accept/reject buttons on each card. Accepting a change **immediately updates the live web CV** so the user sees the impact in context.
- **D-05:** Word-level diffing (existing `wordDiff.ts`) used within change cards to highlight what changed between before and after text.
- **D-06:** After CV import (PDF/DOCX/JSON upload), extracted data loads **directly into the web CV editor**. No intermediate review step.
- **D-07:** A **dismissible toast/banner** at the top shows import summary: entry counts and overall confidence. User starts editing immediately.
- **D-08:** Per-field confidence hints for low-confidence extractions -- **Claude's Discretion**.
- **D-09:** Apply to Job is **triggered from the dashboard**, not from within the editor. Preserves version hierarchy.
- **D-10:** The tailoring view shows the **web CV (read-only)** on the left with the **side panel** on the right. Users cannot type directly on the CV during tailoring.
- **D-11:** The 3-step progressive flow is preserved: Job Details -> Match Analysis -> Review Changes (web CV + side panel).
- **D-12:** After accepting/rejecting changes, "Save" creates a **child version** under the base CV with job metadata.
- **D-13:** A **slim toolbar** sits above the web CV with actions: "Import CV", "Download PDF", and save status indicator.
- **D-14:** The SaveIndicator moves from fixed corner position into the toolbar.
- **D-15:** Claude's Discretion -- research and select fastest model/provider for sub-2 second responses.
- **D-16:** Persistent top nav bar -- **Phase 6 scope**, decision captured here for reference only.

### Claude's Discretion
- Side panel width and responsive behavior (how it collapses on narrow screens)
- Change card visual design (borders, spacing, animation on accept)
- How match analysis score/gaps display relative to the side panel
- Import toast duration and dismiss behavior
- Per-field confidence hint approach (D-08)
- AI model/provider selection for speed targets (D-15)
- How the side panel opens/closes (slide animation, toggle button placement)

### Deferred Ideas (OUT OF SCOPE)
- **Persistent nav bar implementation** -- Phase 6
- **Per-field AI writing assist** (sparkle icon -> alternatives) -- v2 (AI-08)
- **Real-time match score updates as user edits** -- v2 (AI-09)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | CV Import flow populates the web CV editor | Reuse `useImport` hook, change navigation target from `/build` to DirectEditPage. Toast component for import summary (D-07). |
| AI-02 | Apply to Job flow works with web CV editor | Adapt `ApplyToJobScreen` step 3 to use web CV (read-only) + ChangePanel side panel. Steps 1-2 largely unchanged. |
| AI-03 | AI tailor suggestions appear as section-aligned cards in side panel | New `ChangePanel` component using `useTailor` hook. Cards aligned via `data-section` attribute scroll sync. |
| AI-04 | User can accept/reject individual AI suggestions | `useTailor.acceptChange()` / `skipChange()` already implement this. ChangePanel renders accept/reject buttons per card. |
| AI-05 | CV import extraction responds in under 2 seconds | Current Haiku 4.5 on Bedrock is already fastest Claude option. Measure actual latency; Groq Llama is alternative if needed. |
| AI-06 | Tailor suggestion generation targets sub-2 second | Currently uses Sonnet (quality model). Consider Haiku 4.5 or streaming for perceived speed. May need to accept quality/speed tradeoff. |
| AI-07 | Research and select fastest model/provider for each AI task | See AI Speed section below. Haiku 4.5 for extraction, evaluate Haiku 4.5 vs Sonnet for tailoring. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already in project [VERIFIED: frontend/package.json] |
| TypeScript | ~5.9.3 | Type safety | Already in project [VERIFIED: frontend/package.json] |
| CSS Modules | built-in | Component styling | Project convention -- every component has co-located .module.css [VERIFIED: codebase pattern] |

### Supporting (already available -- no new dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useTailor hook | existing | Tailor state management | Powers ChangePanel accept/skip/undo/edit flow |
| useImport hook | existing | Import state management | Powers CV import upload flow |
| wordDiff.ts | existing | Word-level diffing | Highlight changes in ChangePanel cards |
| formDataPatch.ts | existing | Field-level operations | applyTailorChanges, fieldPathToSection, parsePath, setAtPath |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| IntersectionObserver (scroll sync) | scroll event listener | IntersectionObserver is more performant, doesn't fire on every scroll pixel |
| CSS scroll-snap | Manual scroll sync | scroll-snap doesn't support linked-panel sync, only within a single container |
| Groq API (speed) | Bedrock Haiku 4.5 | Groq is faster for Llama models but adds new dependency, API key, and provider integration |

**Installation:**
```bash
# No new dependencies required. All needed libraries already in project.
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/features/direct-edit/
  components/
    ChangePanel.tsx           # NEW: Side panel with change cards (D-01..D-05)
    ChangePanel.module.css    # NEW: Side panel styling
    ChangeCard.tsx            # NEW: Individual change card (before/after, editable, accept/reject)
    ChangeCard.module.css     # NEW: Card styling with diff highlighting
    EditorToolbar.tsx         # NEW: Toolbar above CV (D-13, D-14)
    EditorToolbar.module.css  # NEW: Toolbar styling
    ImportToast.tsx           # NEW: Dismissible import summary (D-07)
    ImportToast.module.css    # NEW: Toast styling
    # Existing components remain unchanged:
    MedLengthTemplate.tsx
    EditableField.tsx
    SaveIndicator.tsx
    SectionWrapper.tsx
    ...
  hooks/
    useScrollSync.ts          # NEW: IntersectionObserver-based scroll sync between CV and panel
    # Existing hooks remain unchanged:
    useDirectEditor.ts
    useAutoSave.ts
    ...

frontend/src/features/apply-to-job/
  ApplyToJobScreen.tsx        # MODIFIED: Step 3 uses web CV + ChangePanel
  ApplyToJobScreen.module.css # MODIFIED: Layout for CV + panel side-by-side
```

### Pattern 1: Scroll Synchronization via IntersectionObserver
**What:** Track which CV section is visible and scroll the panel to align the corresponding change cards.
**When to use:** When the side panel is open alongside the web CV during tailoring.
**Example:**
```typescript
// useScrollSync.ts
// Observe data-section elements on the CV, scroll panel to matching cards
function useScrollSync(
  cvContainerRef: RefObject<HTMLElement>,
  panelRef: RefObject<HTMLElement>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !cvContainerRef.current || !panelRef.current) return;

    const sections = cvContainerRef.current.querySelectorAll('[data-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length === 0) return;

        const sectionKey = (visible[0].target as HTMLElement).dataset.section;
        // Scroll panel to first card matching this section
        const card = panelRef.current?.querySelector(`[data-change-section="${sectionKey}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
      { root: null, threshold: 0.3 }
    );

    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [cvContainerRef, panelRef, enabled]);
}
```
[ASSUMED -- pattern based on standard IntersectionObserver usage]

### Pattern 2: Read-Only MedLengthTemplate via Prop
**What:** Pass a `readOnly` flag to MedLengthTemplate that disables all contentEditable handlers and editing UI (add buttons, delete buttons, drag grips, toggle buttons).
**When to use:** In the Apply to Job tailoring view (D-10) where the CV is displayed but not directly editable.
**Example:**
```typescript
// MedLengthTemplate.tsx -- add readOnly prop
interface MedLengthTemplateProps {
  formData: CVFormData;
  readOnly?: boolean;  // NEW
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  // ... other existing props become optional when readOnly is true
}
```
[VERIFIED: MedLengthTemplate.tsx currently has no readOnly prop; SectionWrapper uses data-section attribute]

### Pattern 3: ChangePanel Reuse Between Editor and Apply-to-Job
**What:** The ChangePanel component is used in two contexts: (a) within the editor when triggered from a future "Tune" action, and (b) in the Apply to Job screen for step 3 (Review Changes). Same component, different parent layouts.
**When to use:** Whenever tailor suggestions need review.
**Example:**
```typescript
// ChangePanel takes useTailor return value as props -- it doesn't own state
interface ChangePanelProps {
  changes: TailorChange[];
  appliedChanges: Set<string>;
  skippedChanges: Set<string>;
  selectedAlternatives: Map<string, number>;
  isApplying: boolean;
  onAccept: (changeId: string) => Promise<void>;
  onSkip: (changeId: string) => void;
  onUndo: (changeId: string) => Promise<void>;
  onSelectAlternative: (changeId: string, index: number) => void;
  onEditValue: (changeId: string, newValue: string | string[]) => void;
  matchAnalysis?: MatchAnalysis;
  baselineScore?: number;
  estimatedScore?: number;
}
```
[VERIFIED: useTailor hook returns exactly these values]

### Pattern 4: Editor Toolbar as Layout Wrapper
**What:** The toolbar sits above the CV content and contains Import, Download, and SaveIndicator. It changes the DirectEditPage layout from single-column CV to toolbar + CV stack.
**When to use:** Always visible in the editor (DirectEditPage).
**Example:**
```typescript
// DirectEditPage layout change:
// BEFORE: <div className={styles.page}><SaveIndicator /><div ref={cvContainerRef}>...
// AFTER:
<div className={styles.page}>
  <EditorToolbar
    saveStatus={saveStatus}
    onImport={handleImportClick}
    onDownload={handleDownloadClick}
  />
  <div ref={cvContainerRef} className={styles.cvContainer}>
    <MedLengthTemplate ... />
  </div>
</div>
```
[VERIFIED: DirectEditPage currently renders SaveIndicator as fixed-position overlay]

### Anti-Patterns to Avoid
- **Duplicating useTailor logic in ChangePanel:** ChangePanel must be a pure renderer that receives state via props. State management stays in useTailor.
- **Using contentEditable for editable change card values:** Change card editable text (D-03) should use a standard `<textarea>` or `<input>`, not contentEditable. ContentEditable is for the CV document; form-like editing uses form elements.
- **Overriding scroll behavior with CSS scroll-snap:** Scroll sync between two independent panels cannot use scroll-snap. Must be done programmatically.
- **Making MedLengthTemplate aware of tailoring state:** The template renders formData -- it should not know whether changes came from AI or user edits. The accept flow updates formData, and MedLengthTemplate re-renders naturally.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Word-level diffing | Custom diff algorithm | `computeWordDiff()` from `wordDiff.ts` | Already built, LCS-based, tested in project |
| Tailor accept/skip/undo state | Custom state machine | `useTailor` hook | Queue-based sequential application, handles edge cases |
| Field-path resolution | Custom path parser | `parsePath`, `setAtPath`, `getAtPath` from `formDataPatch.ts` | Handles structured arrays (BulletItem/SkillItem), ID preservation |
| Section mapping from field paths | Custom regex | `fieldPathToSection()` from `formDataPatch.ts` | Already maps fieldPath to section keys matching SectionWrapper data-section |
| CV form data patching | Manual structuredClone + mutations | `applyTailorChanges()` | Handles alternatives, structured arrays, deep cloning |

**Key insight:** This phase is primarily a UI integration task. Nearly all business logic and data manipulation utilities already exist. The risk is in building redundant logic rather than connecting existing pieces.

## AI Speed Analysis (D-15, AI-05, AI-06, AI-07)

### Current Setup
| Task | Model | Model ID | Expected Latency |
|------|-------|----------|-----------------|
| CV Extraction (import) | Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | 3-8s for typical CV [ASSUMED] |
| Tailor Suggestions | Claude Sonnet 4.6 | `us.anthropic.claude-sonnet-4-6` | 5-15s for full analysis [ASSUMED] |
| Match Analysis | Claude Sonnet 4.6 | `us.anthropic.claude-sonnet-4-6` | 3-8s [ASSUMED] |

### Alternative Providers Evaluated
| Provider | Model | Speed | Quality | Integration Effort |
|----------|-------|-------|---------|-------------------|
| AWS Bedrock Haiku 4.5 | Claude Haiku 4.5 | Fast (current extraction model) | Good for structured extraction | None -- already integrated |
| AWS Bedrock Llama 4 Scout 17B | Llama 4 Scout 17B | Likely faster TTFB than Sonnet | Lower quality for complex JSON | Medium -- same Bedrock API, new model ID, adjust prompts |
| Groq | Llama 3.3 70B | ~280 tok/s, very low TTFB | Good but needs prompt tuning | High -- new API client, new env vars, new dependency |
| Groq | Llama 3.1 8B | ~560 tok/s, ultra-low TTFB | Insufficient for quality CV analysis | High + quality risk |

[VERIFIED: Bedrock model IDs from AWS docs. ASSUMED: Latency numbers based on general knowledge of Claude model performance. CITED: Groq speeds from console.groq.com/docs/models]

### Speed Recommendation
1. **CV Extraction (AI-05):** Keep Haiku 4.5 on Bedrock. It is already the fastest Claude model available. For PDF extraction, latency is dominated by document processing, not token generation. Measure actual latency before switching providers.

2. **Tailor Suggestions (AI-06):** This is the bottleneck. Sonnet is used for quality but is slow. Two strategies:
   - **Strategy A (recommended):** Try Haiku 4.5 for tailor suggestions. It may produce acceptable quality for structured JSON output at much lower latency. Run quality comparison tests.
   - **Strategy B:** Keep Sonnet but stream the response and show cards progressively as they arrive. This provides perceived speed even if total time is >2s.
   - **Strategy C:** Add Groq as a secondary provider for tailor suggestions using Llama 3.3 70B. This adds infrastructure complexity but offers the fastest raw throughput.

3. **Match Analysis:** Keep Sonnet. This runs before tailor suggestions (step 2 of Apply to Job) and user expects a brief wait. Not a sub-2s target.

**Practical approach for D-15:** Start with Strategy A -- swap tailor to Haiku 4.5 and measure quality/speed. If quality is insufficient, fall back to Strategy B (streaming). Groq (Strategy C) is the nuclear option if Bedrock latency is fundamentally too slow, but it adds significant integration work.

### Backend Changes for Speed (if needed)
```python
# bedrock.py -- add model constant for tailor
MODEL_HAIKU_FAST = "us.anthropic.claude-haiku-4-5-20251001-v1:0"  # For tailor suggestions if speed needed

# tailor.py -- change model_id
# FROM: model_id=MODEL_SONNET
# TO:   model_id=MODEL_HAIKU_FAST (if quality is acceptable)
```
[VERIFIED: bedrock.py already has MODEL_HAIKU constant pointing to haiku-4-5]

## Common Pitfalls

### Pitfall 1: Stale Closure in useTailor acceptChange
**What goes wrong:** `acceptChange` uses `appliedChanges` from closure, which may be stale when queued operations resolve.
**Why it happens:** The queue pattern serializes accepts, but React state may not have updated between queue items.
**How to avoid:** The current implementation already handles this correctly -- it creates `new Set(appliedChanges)` inside the queued function. But any modifications to the hook must preserve this pattern.
**Warning signs:** Accepting change A then immediately B results in B not having A in its applied set.

### Pitfall 2: Scroll Sync Causing Infinite Loops
**What goes wrong:** Panel scroll-to-card triggers the IntersectionObserver which triggers another scroll.
**Why it happens:** Programmatic scrolling fires scroll events that the observer reacts to.
**How to avoid:** Use a `isAutoScrolling` ref flag. Set it before programmatic scroll, clear it after scroll completes (use a timeout or `scrollend` event). Skip observer callbacks when flag is set.
**Warning signs:** Panel and CV oscillate between positions.

### Pitfall 3: MedLengthTemplate readOnly Prop Breaking Drag Handlers
**What goes wrong:** Adding `readOnly` prop but forgetting to suppress drag handlers, leading to error when drag callbacks are undefined.
**Why it happens:** MedLengthTemplate passes `onReorderSections`, `onReorderEntries` etc. to SectionWrapper/EntryWrapper. In readOnly mode these may be undefined.
**How to avoid:** When `readOnly` is true, provide no-op defaults for all callback props. Or conditionally render SectionWrapper vs a simpler ReadOnlySection wrapper.
**Warning signs:** Runtime errors in the tailoring view when hovering over sections.

### Pitfall 4: Import Navigation Race Condition
**What goes wrong:** User imports a CV, navigates to editor, but formData hasn't been set in context yet.
**Why it happens:** `CVImportUpload` calls `setFormData()` and `navigate()` in the same effect. Navigation may resolve before React commits the state update.
**How to avoid:** Set formData in context first, then navigate in a subsequent effect that depends on formData being non-null. Or use navigation state to pass the import result.
**Warning signs:** DirectEditPage shows "Loading..." or empty template after import.

### Pitfall 5: Editor Toolbar z-index Conflicts with SaveIndicator
**What goes wrong:** SaveIndicator currently uses `position: fixed; z-index: 100;`. Moving it into the toolbar requires removing fixed positioning, or both the old and new indicators render.
**Why it happens:** SaveIndicator.module.css uses fixed positioning. Toolbar integration means making it a flow element.
**How to avoid:** Remove `position: fixed` from SaveIndicator when it is rendered inside the toolbar. The toolbar itself provides the positioning context.
**Warning signs:** Two save indicators visible, or indicator hidden behind toolbar.

### Pitfall 6: ApplyToJobScreen Step 3 Layout Complexity
**What goes wrong:** Replacing the checkbox list (step 3) with web CV + side panel creates a drastically different layout that doesn't fit within the existing stepped card design.
**Why it happens:** Steps 1-2 are narrow card layouts. Step 3 needs a wide, two-panel layout.
**How to avoid:** Step 3 transitions to a full-width layout (possibly a separate view/route) rather than trying to fit two panels inside the existing card container.
**Warning signs:** CV is too small to read, or panel is too narrow for change cards.

## Code Examples

### ChangeCard Component (verified pattern from existing codebase)
```typescript
// Uses computeWordDiff from existing wordDiff.ts
import { computeWordDiff, type DiffSegment } from '../../../utils/wordDiff';
import type { TailorChange } from '../../../types';

interface ChangeCardProps {
  change: TailorChange;
  isApplied: boolean;
  isSkipped: boolean;
  selectedAltIndex: number;
  isApplying: boolean;
  onAccept: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onSelectAlternative: (index: number) => void;
  onEditValue: (value: string | string[]) => void;
}

function renderDiff(oldText: string, newText: string): React.ReactNode {
  const segments = computeWordDiff(oldText, newText);
  return segments.map((seg, i) => (
    <span key={i} className={styles[seg.type]}>{seg.text}</span>
  ));
}
```
[VERIFIED: computeWordDiff signature and DiffSegment type from wordDiff.ts]

### fieldPathToSection Mapping for Card Alignment
```typescript
// Already exists in formDataPatch.ts -- maps field paths to section keys
import { fieldPathToSection } from '../../../utils/formDataPatch';

// Usage: group changes by section for panel card alignment
const changesBySection = changes.reduce((acc, change) => {
  const section = fieldPathToSection(change.fieldPath);
  if (!acc[section]) acc[section] = [];
  acc[section].push(change);
  return acc;
}, {} as Record<string, TailorChange[]>);
```
[VERIFIED: fieldPathToSection exists in formDataPatch.ts, maps 'workExperience' to 'work', etc.]

### Import Toast Pattern
```typescript
// Dismissible toast showing import summary
interface ImportToastProps {
  summary: ImportSummary;
  confidence: ImportConfidence;
  onDismiss: () => void;
}

// Auto-dismiss after 8 seconds, with manual dismiss button
function ImportToast({ summary, confidence, onDismiss }: ImportToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  // ...render summary counts and confidence level
}
```
[ASSUMED -- standard toast pattern]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline contentEditable diffs | Side panel with change cards (D-01) | User decision this phase | Keeps CV clean; cards provide focused review UI |
| Form builder as import target | Web CV editor as import target (D-06) | User decision this phase | Direct editing starts immediately after import |
| Checkbox list for tailor review | Accept/reject buttons per card with word-level diff (D-04, D-05) | User decision this phase | More granular control, visual feedback |

**Deprecated/outdated:**
- TailorPanel from form-builder: The old form-builder had its own tailor panel. This is replaced by ChangePanel integrated with the web CV editor.
- ImportBanner: The current ImportBanner component in form-builder is replaced by ImportToast in the web CV editor.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Haiku 4.5 extraction latency is 3-8s for typical CV | AI Speed Analysis | If much slower, need Groq or optimized prompts |
| A2 | Sonnet tailor suggestion latency is 5-15s | AI Speed Analysis | If already <2s, no model change needed |
| A3 | Haiku 4.5 produces acceptable quality for tailor suggestions | AI Speed Analysis | If quality drops significantly, must keep Sonnet + streaming |
| A4 | IntersectionObserver threshold 0.3 provides good scroll sync UX | Architecture Patterns | May need tuning -- too sensitive causes jitter, too insensitive causes lag |
| A5 | 8-second auto-dismiss for import toast is appropriate | Code Examples | User may want more or less time; make configurable |

## Open Questions

1. **Actual Bedrock latency measurements**
   - What we know: Haiku 4.5 is the fastest Claude model on Bedrock. Sonnet is used for quality tasks.
   - What's unclear: Actual P50/P95 latency for extraction and tailor calls with real CV payloads.
   - Recommendation: Measure before optimizing. Add timing logs to backend endpoints. If extraction is already <2s, no change needed for AI-05.

2. **ApplyToJobScreen Step 3 Layout Transition**
   - What we know: Steps 1-2 are narrow card layouts. Step 3 needs web CV + side panel (wide layout).
   - What's unclear: Whether step 3 should remain in the same page component or navigate to a separate full-width view.
   - Recommendation: Keep in same component but step 3 expands to full viewport width, hiding the step indicators or moving them to a compact header.

3. **Side Panel Width and Responsive Behavior**
   - What we know: CV is max-width 8.5in. Side panel needs ~300-400px for readable change cards.
   - What's unclear: Behavior on screens narrower than CV + panel combined (~1200px minimum).
   - Recommendation: On narrow screens, panel becomes a bottom sheet or overlay. On desktop, fixed right panel with CV scrolling independently.

4. **Tailor Suggestions Quality with Haiku 4.5**
   - What we know: Currently uses Sonnet for quality. Haiku is untested for this task.
   - What's unclear: Whether Haiku can produce the structured JSON with good alternative suggestions.
   - Recommendation: Test with 3-5 real CVs before committing to model change. Compare suggestion quality.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | Import flow sets formData and navigates to editor | unit | `cd frontend && npx vitest run src/__tests__/importToEditor.test.ts -x` | Wave 0 |
| AI-02 | Apply to Job step 3 renders web CV + ChangePanel | unit | `cd frontend && npx vitest run src/__tests__/applyToJobReview.test.tsx -x` | Wave 0 |
| AI-03 | ChangePanel renders grouped cards aligned by section | unit | `cd frontend && npx vitest run src/__tests__/ChangePanel.test.tsx -x` | Wave 0 |
| AI-04 | Accept/reject on ChangeCard triggers useTailor methods | unit | `cd frontend && npx vitest run src/__tests__/ChangeCard.test.tsx -x` | Wave 0 |
| AI-05 | Import extraction latency | manual-only | Manual: measure backend response time | N/A -- requires live Bedrock |
| AI-06 | Tailor suggestion latency | manual-only | Manual: measure backend response time | N/A -- requires live Bedrock |
| AI-07 | Model selection research | docs | Research document (this file) | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/__tests__/ChangePanel.test.tsx` -- covers AI-03
- [ ] `frontend/src/__tests__/ChangeCard.test.tsx` -- covers AI-04
- [ ] `frontend/src/__tests__/importToEditor.test.ts` -- covers AI-01 (import -> editor navigation)
- [ ] `frontend/src/__tests__/applyToJobReview.test.tsx` -- covers AI-02 (step 3 with web CV)
- [ ] `frontend/src/__tests__/EditorToolbar.test.tsx` -- covers D-13 toolbar rendering

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- no auth changes in this phase |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A -- same X-User-Id pattern |
| V5 Input Validation | yes | Pydantic models on backend (existing), TypeScript types on frontend |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via editable change card values | Tampering | Change card uses `<textarea>` / `<input>` (not innerHTML). React auto-escapes text content. |
| AI prompt injection via job description | Tampering | Backend already sanitizes and uses system prompt separation. No changes needed. |
| Large file upload DoS | Denial of Service | Backend already limits to 10MB (`MAX_FILE_SIZE`). No changes needed. |

## Sources

### Primary (HIGH confidence)
- **Codebase verification** -- Read all referenced source files: useTailor.ts, useImport.ts, formDataPatch.ts, wordDiff.ts, DirectEditPage.tsx, ApplyToJobScreen.tsx, MedLengthTemplate.tsx, SectionWrapper.tsx, bedrock.py, cv_extractor.py, tailor.py, api.ts, Dashboard.tsx, CVContext.tsx, types/index.ts
- **AWS Bedrock docs** -- models-supported.html for model IDs and availability
- **Groq docs** -- console.groq.com/docs/models for speed/pricing comparison

### Secondary (MEDIUM confidence)
- IntersectionObserver API -- standard Web API, well-documented on MDN

### Tertiary (LOW confidence)
- Bedrock latency estimates (A1, A2) -- based on general knowledge, not measured in this project
- Haiku quality for tailor tasks (A3) -- untested assumption

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- patterns derived from direct codebase reading, all referenced files verified
- Pitfalls: HIGH -- identified from actual code patterns and known React/contentEditable issues
- AI Speed: MEDIUM -- model IDs verified, but latency claims are assumed and need measurement

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable codebase, no fast-moving external dependencies)
