# Phase 8: Streamlined Tune Flow - Research

**Researched:** 2026-04-17
**Domain:** React UI layout, multi-tier panel interaction, route migration, dashboard filtering
**Confidence:** HIGH

## Summary

Phase 8 replaces the standalone 3-step `/apply` route (ApplyToJobScreen) with an inline right-panel tune experience embedded directly on the editor page (`/build/form`). The panel has 3 progressive tiers: save-as-base prompt, job details form, and diff review. After saving a tailored CV, the user navigates to a scoped Dashboard view showing only that base CV's group. The `+ New CV` button is removed from the NavBar on non-editor pages.

This is a frontend-only phase with zero backend changes. All existing hooks (`useTailor`, `useScrollSync`), components (`ChangePanel`, `ChangeCard`), and API endpoints are reused as-is. The work is primarily layout restructuring (adding a fixed right panel to DirectEditPage), state management (tier progression logic), and navigation rewiring (replacing `/apply` route references across LandingScreen, Dashboard, TuneExpansionPanel, and NavBar).

**Primary recommendation:** Build the TunePanel as a single component with internal tier state, hosted directly by DirectEditPage. Reuse existing ChangePanel/ChangeCard components inside Tier 3 without modification. Wire the save-as-base flow through the existing `api.saveVersion()` + `useCVContext` rather than introducing new save mechanics.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** The save-as-base prompt appears ONLY when clicking "Tune for Job" and there is no active saved version (CV is unsaved/anonymous). If the user already has an active version (activeVersion is non-null), skip the prompt and go straight to the tune panel.
- **D-02:** The save-as-base prompt collects name only (e.g. "Creative CV"). Role/company belong on the job application, not the base CV. Use the existing SaveCVModal with forceBaseCV=true.
- **D-03:** After saving as base CV, the save panel tier collapses to a summary row and the job form tier automatically opens.
- **D-04:** The entire tune flow lives in a right panel on /build/form. No navigation away from the editor. The CV stays visible on the left throughout all tiers.
- **D-05:** The panel has 3 progressive tiers: Tier 1 (save-as-base), Tier 2 (job form), Tier 3 (diffs).
- **D-06:** Completed tiers collapse to clickable summary rows (user can re-expand to edit). Pattern matches the existing collapsed steps header in ApplyToJobScreen step 3.
- **D-07:** ChangePanel and ChangeCard components already exist -- reuse them in Tier 3. useTailor hook already handles accept/reject/undo state.
- **D-08:** The /apply route is replaced: navigating to /apply redirects to /build/form with the tune panel open. Dashboard "Tune for a Job" button loads the version into the editor and opens the tune panel (via navigation state or query param like ?tune=1).
- **D-09:** TuneExpansionPanel on LandingScreen: clicking a base CV navigates to /build/form with that version loaded and tune panel open. The /apply route no longer exists as a standalone 3-step page after this phase.
- **D-10:** The ApplyToJobScreen component is removed/replaced by the new inline panel.
- **D-11:** After saving the tailored CV, navigate to /dashboard with a filter state (e.g., { baseId: parentVersionId } via React Router location.state). Dashboard renders filtered: shows only that base CV and its job application children. A visible "All CVs" or "Back" control lets the user expand to the full list.
- **D-12:** When the tune panel is open, the NavBar right side keeps "Download PDF" and shows a visual indicator that tuning is active (e.g., "Tune for Job" button becomes visually active/highlighted). The user closes the panel via an X button inside the panel itself.
- **D-13:** The "+ New CV" button is removed from the NavBar on all non-editor pages.

### Claude's Discretion
- Exact visual design of the right panel (width, border, animation for open/close)
- Progress indicator style for the tier transitions (spinner, skeleton, or loading state)
- How the CV left panel handles layout when the right tune panel is open (whether the CV narrows or stays full-width with panel overlaying/beside it)
- Whether the tune panel is a fixed-width sidebar or a percentage-based split
- Animation for tier expand/collapse transitions
- Exact text for the "Tuning active" indicator in the NavBar

### Deferred Ideas (OUT OF SCOPE)
- Score updating live as user edits in the CV (re-computing match score in real-time as user accepts/rejects diffs -- v2 AI-09)
- Multiple simultaneous tune sessions (only one tune panel open at a time is the v1 model)

</user_constraints>

## Project Constraints (from CLAUDE.md)

- CSS Modules for all styling (co-located `.module.css` files, camelCase class names)
- No path aliases (relative imports only)
- PascalCase components, camelCase hooks with `use` prefix
- `interface` for object shapes, `type` for unions
- `verbatimModuleSyntax: true` -- explicit `type` keyword for type-only imports
- API methods return null/failure values, never throw
- Default exports for route-level screen components, named exports for reusable components
- CSS variables from `variables.css` for all design tokens
- Inline SVG for icons (no icon library)
- GSD workflow enforcement for all changes

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tune panel rendering + tier state | Browser / Client | -- | Pure UI state management, no server involvement |
| Save-as-base prompt | Browser / Client | API / Backend | Frontend collects name, backend persists via existing `POST /cv-versions` |
| Match analysis + tailor suggestions | API / Backend | Browser / Client | AI endpoints (`/chat/match-analysis`, `/tailor/suggest-changes`) do processing; frontend displays results |
| Diff review (accept/reject) | Browser / Client | API / Backend | `useTailor` manages local state; `api.generateLatex()` regenerates LaTeX on each accept |
| Save tailored CV | Browser / Client | API / Backend | Frontend orchestrates save flow, backend persists via existing `POST /cv-versions` |
| Dashboard filtered view | Browser / Client | -- | Client-side filtering of already-fetched version list |
| Route migration (/apply removal) | Browser / Client | -- | React Router configuration change |
| NavBar state changes | Browser / Client | -- | EditorActionsContext extension, CSS class toggles |

## Standard Stack

### Core

No new libraries needed. This phase uses only existing project dependencies.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | Component rendering, state management | Already installed [VERIFIED: codebase] |
| react-router-dom | ^7.13.1 | Route definitions, navigation, location.state | Already installed [VERIFIED: codebase] |
| CSS Modules | built-in (Vite) | Component styling | Project convention [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fontsource-variable/eb-garamond | installed | CV content font | Already loaded in DirectEditPage [VERIFIED: codebase] |

### Alternatives Considered

None. This phase adds no new dependencies.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### System Architecture Diagram

```
User clicks "Tune for Job"
         |
         v
   [DirectEditPage]
         |
    +----+----+
    |         |
    v         v
[CV Preview] [TunePanel (new)]
(left side)   (right side, 400px fixed)
                  |
            +-----+-----+-----+
            |           |           |
            v           v           v
       [Tier 1]    [Tier 2]    [Tier 3]
     Save-as-Base  Job Details  Review Changes
            |           |           |
            v           v           v
      api.saveVersion  api.getMatchAnalysis  useTailor.acceptChange
      + useCVContext   + useTailor.fetch     + ChangePanel/ChangeCard
            |           |           |
            v           v           v
       [Collapse]  [Collapse]  [Save Tailored CV]
                                    |
                                    v
                            navigate('/dashboard',
                              { state: { baseId } })
                                    |
                                    v
                             [Dashboard (filtered)]
                              baseId filter from
                              location.state
```

### Recommended Project Structure

```
frontend/src/
  features/
    direct-edit/
      DirectEditPage.tsx          # MODIFY: add tunePanelOpen state, render TunePanel
      DirectEditPage.module.css   # MODIFY: add panelOpen contentArea padding
      components/
        TunePanel.tsx             # NEW: right-side panel with 3 tiers
        TunePanel.module.css      # NEW: panel layout, tier styling
        ChangePanel.tsx           # UNCHANGED: reused in Tier 3
        ChangeCard.tsx            # UNCHANGED: reused in Tier 3
        MedLengthTemplate.tsx     # UNCHANGED: readOnly when Tier 3 active
      hooks/
        useDirectEditor.ts        # UNCHANGED
        useAutoSave.ts            # UNCHANGED
        useScrollSync.ts          # UNCHANGED: reused for Tier 3 scroll sync
    apply-to-job/
      ApplyToJobScreen.tsx        # DELETE: replaced by TunePanel
      ApplyToJobScreen.module.css # DELETE: replaced by TunePanel
    dashboard/
      Dashboard.tsx               # MODIFY: add baseId filter from location.state
      Dashboard.module.css        # MODIFY: add breadcrumb styling
      SaveCVModal.tsx             # UNCHANGED: used indirectly for reference
    landing/
      LandingScreen.tsx           # MODIFY: update handleTuneClick navigation
      TuneExpansionPanel.tsx      # MODIFY: navigate to /build/form with tune state
  components/
    NavBar.tsx                    # MODIFY: remove "+ New CV", add tuning active state
    NavBar.module.css             # MODIFY: add ghostBtnActive styling
    WorkingLayout.tsx             # UNCHANGED
  contexts/
    EditorActionsContext.tsx       # MODIFY: add isTuning to EditorActions interface
    CVContext.tsx                  # UNCHANGED
  App.tsx                         # MODIFY: replace /apply route with redirect
```

### Pattern 1: Progressive Tier Panel (TunePanel)

**What:** A fixed-position right sidebar with stacked expandable/collapsible tiers that reveal progressively as the user completes each step.

**When to use:** Multi-step inline workflows that must keep a primary content area (the CV) visible throughout.

**Example:**
```typescript
// Source: ApplyToJobScreen collapsedSteps pattern [VERIFIED: codebase]
// TunePanel manages which tier is expanded via activeTier state

interface TunePanelProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CVFormData;
  activeVersion: CVVersion | null;
  onFormDataUpdate: (fd: CVFormData) => void;
}

// Internal state:
// activeTier: 1 | 2 | 3
// tier1Complete: boolean (save-as-base done)
// tier2Complete: boolean (analysis done)
// companyName, roleName, jobDescription: string
// matchAnalysis: MatchAnalysis | null
// analyzing: boolean
// useTailor hook for Tier 3
```

### Pattern 2: Route-level State Passing via location.state

**What:** React Router's `location.state` to pass transient UI state (like `tune=true` or `baseId`) between routes without URL query parameters.

**When to use:** When the state is ephemeral (should not survive a page refresh or be bookmarkable) and drives UI behavior on the target page.

**Example:**
```typescript
// Source: Existing ApplyToJobScreen pattern [VERIFIED: codebase]
// From TuneExpansionPanel:
navigate('/build/form', { state: { tune: true, baseVersionId: cv.id } });

// In DirectEditPage:
const location = useLocation();
const locationState = location.state as { tune?: boolean; baseVersionId?: string } | null;

useEffect(() => {
  if (locationState?.tune) {
    // Load the base version if baseVersionId provided
    // Open the tune panel
    setTunePanelOpen(true);
  }
}, [locationState]);
```

### Pattern 3: EditorActionsContext Extension

**What:** Extend the existing lightweight context to communicate tune panel state from DirectEditPage up to NavBar.

**When to use:** When the NavBar needs to reflect editor-specific state (download status, tuning state) without prop drilling.

**Example:**
```typescript
// Source: Existing EditorActionsContext [VERIFIED: codebase]
interface EditorActions {
  onDownload: () => void;
  onTuneForJob: () => void;
  saveStatus: SaveStatus;
  isDownloading: boolean;
  isTuning: boolean;  // NEW: added for Phase 8
}
```

### Anti-Patterns to Avoid

- **Nesting ChangePanel inside another ChangePanel:** Tier 3 should render match analysis summary + ChangeCard list directly, using ChangePanel as its container component. Do not wrap a ChangePanel inside the TunePanel's own scrollable area -- this creates nested scroll regions.
- **Creating a new save mechanism for Tier 1:** The save-as-base flow should call the same `api.saveVersion()` path that the existing auto-save and SaveCVModal use. Do not invent a new save endpoint or flow.
- **Separate route for the tune panel:** The entire tune flow must live on `/build/form`. Do not create `/build/form/tune` or any sub-route.
- **Modifying useTailor hook internals:** The hook is already designed as a pure state machine with `fetchSuggestions`, `acceptChange`, `skipChange`, `undoChange`, `reset`. Use it as-is; do not modify its interface.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tier expand/collapse | Custom height animation JS | CSS `max-height` transition + `overflow: hidden` | CSS-only approach matches existing expansion panels in codebase [VERIFIED: LandingScreen expansionPanel pattern] |
| Diff review UI | New diff component | Existing ChangePanel + ChangeCard | Already built, tested in Phase 5, handles all edge cases [VERIFIED: codebase] |
| Accept/reject state | New tailor state machine | Existing useTailor hook | Queue-based accept serialization, abort handling already solved [VERIFIED: codebase] |
| Scroll sync | New intersection observer | Existing useScrollSync hook | Anti-jitter pattern already implemented [VERIFIED: codebase] |
| Save version | New save endpoint | Existing api.saveVersion() | Backend POST /cv-versions already handles all fields [VERIFIED: codebase] |
| Panel slide animation | JS animation library | CSS transform + transition | Existing ChangePanel.module.css pattern: translateX + 200ms ease [VERIFIED: codebase] |

**Key insight:** Phase 8 is primarily a layout and navigation restructuring task. Almost all business logic components (useTailor, ChangePanel, ChangeCard, useScrollSync, api methods) are already built and tested. The work is assembling them into a new container (TunePanel) and rewiring navigation.

## Common Pitfalls

### Pitfall 1: Stale formData in useTailor After Save-as-Base

**What goes wrong:** Tier 1 saves the CV (creating an activeVersion), but useTailor's `originalFormData` ref still holds a stale snapshot. Accept/reject operations then write changes against the wrong baseline.

**Why it happens:** useTailor captures `originalFormData` in `baseFormDataRef` at `fetchSuggestions()` call time. If formData changes between panel open and suggestion fetch (e.g., due to the save-as-base updating context), the ref may be stale.

**How to avoid:** Only call `useTailor.fetchSuggestions()` in Tier 2's analyze handler, AFTER Tier 1 completes. By that point, formData in context is stable. Use the `formData` from `useCVContext()` at the moment of the call, not a captured closure.

**Warning signs:** After accepting changes, the CV preview shows unexpected data or reverts prior edits.

### Pitfall 2: Race Condition Between Save-as-Base and Auto-Save

**What goes wrong:** User opens tune panel with unsaved CV. Tier 1 triggers `api.saveVersion()` for the base CV. Meanwhile, `useAutoSave` also triggers a debounced save (its timer fires). Two concurrent saves create duplicate versions.

**Why it happens:** `useAutoSave` has a 2.5s debounce timer that may be in-flight when the user clicks "Save as Base CV". Both fire `api.saveVersion()`.

**How to avoid:** When Tier 1 save is triggered, either (a) clear the auto-save timer by setting formData to the exact same reference (no-op for debounce), or (b) use the auto-save's `isSavingRef` guard to serialize. The simplest approach: Tier 1 save result updates `activeVersion` in context, and subsequent auto-saves update that version rather than creating new ones. Since auto-save currently always creates NEW versions (POST, not PATCH), this is actually safe -- the Tier 1 save creates the version, and later auto-saves create additional snapshots. The duplicate is harmless but slightly noisy.

**Warning signs:** Dashboard shows duplicate entries with slightly different timestamps.

### Pitfall 3: Panel State Lost on Re-expand

**What goes wrong:** User collapses a completed tier, then re-expands it. The form inputs in that tier are reset to empty.

**Why it happens:** If tier body components unmount when collapsed (conditional rendering `{activeTier === 2 && <Tier2Body />}`), React destroys state.

**How to avoid:** Keep all tier bodies mounted but hidden (CSS `display: none` or `max-height: 0; overflow: hidden`). Use CSS-only collapse rather than conditional rendering. Alternatively, lift all form state (companyName, roleName, jobDescription) to the TunePanel parent so tier components read from shared state.

**Warning signs:** Expanding a previously-completed tier shows empty form fields.

### Pitfall 4: CV Preview Not Switching to ReadOnly in Tier 3

**What goes wrong:** User reaches Tier 3 (diff review) but can still edit the CV inline. Edits conflict with the tailor accept/reject flow.

**Why it happens:** DirectEditPage renders MedLengthTemplate without a `readOnly` prop by default. Tier 3 needs the CV to become a read-only preview showing `previewFormData` (with accepted changes) instead of the editable `formData`.

**How to avoid:** When Tier 3 is active, DirectEditPage must:
1. Switch from `formData` (from useDirectEditor) to `previewFormData` (from useTailor's onApply callback)
2. Pass `readOnly={true}` to MedLengthTemplate
3. Pass noop handlers for all editing callbacks (addBullet, removeBullet, etc.)

This matches the existing pattern in ApplyToJobScreen Step 3 exactly. [VERIFIED: ApplyToJobScreen.tsx lines 262-276]

**Warning signs:** User edits CV during diff review, causing state conflicts between tailor changes and manual edits.

### Pitfall 5: Navigation State Not Cleared After Dashboard Render

**What goes wrong:** User navigates from save -> scoped dashboard -> clicks "All CVs" -> but location.state still has `baseId`, so the filter persists.

**Why it happens:** React Router preserves location.state across `navigate()` calls unless explicitly cleared.

**How to avoid:** The "All CVs" click handler must use `navigate('/dashboard', { state: null, replace: true })` to explicitly clear the state. Using `replace: true` prevents the filtered view from being in the browser history stack.

**Warning signs:** "All CVs" link doesn't actually show all CVs; requires browser back button.

### Pitfall 6: useTailor onApply Signature Mismatch

**What goes wrong:** useTailor's `onApply` callback has the signature `(newFormData: CVFormData, newTexContent: string) => Promise<void>`. The ApplyToJobScreen only uses `newFormData` (sets previewFormData). If the TunePanel implementation forgets to accept both arguments, TypeScript will catch it -- but the `texContent` argument is unused and could cause confusion.

**Why it happens:** useTailor internally calls `api.generateLatex()` and passes both formData and texContent to onApply. The caller is expected to handle both.

**How to avoid:** Implement onApply with both parameters; simply ignore texContent if not needed:
```typescript
onApply: async (newFormData: CVFormData, _newTexContent: string) => {
  setPreviewFormData(newFormData);
}
```

**Warning signs:** TypeScript compile error on `onApply` signature.

## Code Examples

### TunePanel Integration in DirectEditPage

```typescript
// Source: Pattern derived from existing DirectEditPage + ApplyToJobScreen [VERIFIED: codebase]

// In DirectEditPage, add:
const [tunePanelOpen, setTunePanelOpen] = useState(false);
const [previewFormData, setPreviewFormData] = useState<CVFormData | null>(null);

// Tier 3 active = show preview, not editable formData
const isTier3Active = tunePanelOpen && /* tier === 3 */;
const displayFormData = isTier3Active ? previewFormData : formData;

// Replace handleTuneForJob:
const handleTuneForJob = useCallback(() => {
  setTunePanelOpen(true);
}, []);

// Extend editor actions:
useEffect(() => {
  setEditorActions({
    onDownload: handleDownload,
    onTuneForJob: handleTuneForJob,
    saveStatus,
    isDownloading,
    isTuning: tunePanelOpen,
  });
  return () => setEditorActions(null);
}, [/* deps */]);
```

### Dashboard Scoped View

```typescript
// Source: Pattern derived from existing Dashboard [VERIFIED: codebase]

// In Dashboard component:
const location = useLocation();
const filterBaseId = (location.state as { baseId?: string } | null)?.baseId;

// Filter baseCvs when baseId is present:
const displayedBases = filterBaseId
  ? baseCvs.filter(b => b.id === filterBaseId)
  : baseCvs;

// Breadcrumb when filtered:
{filterBaseId && (
  <div className={styles.breadcrumb}>
    <button onClick={() => navigate('/dashboard', { state: null, replace: true })}>
      All CVs
    </button>
    <span className={styles.breadcrumbSep}> / </span>
    <span className={styles.breadcrumbCurrent}>{displayedBases[0]?.name}</span>
  </div>
)}
```

### NavBar Tuning Active State

```typescript
// Source: Existing NavBar pattern [VERIFIED: codebase]

// In NavBar, read isTuning from editor actions:
const isTuning = editorActions?.isTuning ?? false;

// For the "Tune for Job" button:
<button
  className={`${styles.ghostBtn}${isTuning ? ` ${styles.ghostBtnActive}` : ''}`}
  onClick={editorActions.onTuneForJob}
  type="button"
>
  Tune for Job
</button>

// CSS for active state:
// .ghostBtnActive {
//   background: var(--accent-light);
//   color: var(--accent);
//   border-color: var(--accent);
// }
```

### TuneExpansionPanel Navigation Update

```typescript
// Source: Existing TuneExpansionPanel [VERIFIED: codebase]

// Change from:
// navigate('/apply', { state: { baseVersionId: cv.id } })

// To:
// First load the version, then navigate with tune state
onClick={async () => {
  const version = await api.getVersion(cv.id);
  if (version) {
    handleVersionLoad(version);
    setSelectedTemplateForBuild(version.templateId);
    navigate('/build/form', { state: { tune: true } });
  }
}}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate /apply 3-step page | Inline right panel on editor page | Phase 8 | User stays on editor, CV always visible, fewer navigation transitions |
| SaveCVModal for base CV creation | Tier 1 inline form in tune panel | Phase 8 | Streamlined flow, no modal overlay during tuning |
| "+ New CV" button on all non-editor pages | Button removed from non-editor pages | Phase 8 | Less visual noise during focused workflows |
| Full dashboard after save | Scoped dashboard (filtered to base CV group) | Phase 8 | User sees relevant context immediately after save |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CSS max-height transition is sufficient for tier expand/collapse animation (no JS animation needed) | Architecture Patterns | Low -- fallback is simple conditional rendering with no animation |
| A2 | The ChangePanel component can be embedded inside TunePanel Tier 3 without scroll conflict | Architecture Patterns | Medium -- if the panel and tier both have overflow-y: auto, nested scroll could be janky. May need to remove ChangePanel's own scroll and let TunePanel handle it |
| A3 | Dashboard filtering via location.state is preserved correctly through React Router v7 | Code Examples | Low -- location.state is a standard React Router feature, verified in existing codebase usage |

## Open Questions (RESOLVED)

1. **ChangePanel Scroll Context Inside TunePanel**
   - What we know: ChangePanel has `overflow-y: auto` on its own `.panel` class. TunePanel also needs to be scrollable.
   - What's unclear: Whether nesting two scrollable areas causes UX problems (nested scroll traps).
   - Recommendation: When embedding ChangePanel in Tier 3, strip the panel's fixed positioning and overflow styling. The TunePanel acts as the scroll container; Tier 3 content flows naturally within it. This may require a minor CSS override or a `className` prop on ChangePanel to remove fixed positioning.

2. **Version Loading for Tune-from-Dashboard Flow**
   - What we know: Dashboard `handleApplyToJob` currently navigates to `/apply` with `baseVersionId` in state. The new flow must load the version into the editor AND open the tune panel.
   - What's unclear: Whether loading a version into CVContext from Dashboard (via `handleVersionLoad`) and then navigating to `/build/form` with `{ tune: true }` is atomic enough, or if there's a race with DirectEditPage's bootstrap logic.
   - Recommendation: Navigate with `{ tune: true, baseVersionId: id }` in state. DirectEditPage's bootstrap effect checks for `baseVersionId`, loads it if formData is null, then opens the tune panel. This is the same pattern ApplyToJobScreen currently uses.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map

Phase 8 has no formal requirement IDs (TBD in REQUIREMENTS.md). Tests map to CONTEXT.md decisions:

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| D-01 | Tune panel skips Tier 1 when activeVersion is non-null | unit | `cd frontend && npx vitest run src/__tests__/tunePanel.test.tsx -t "skips tier 1"` | No -- Wave 0 |
| D-05 | TunePanel renders 3 tiers with progressive reveal | unit | `cd frontend && npx vitest run src/__tests__/tunePanel.test.tsx -t "three tiers"` | No -- Wave 0 |
| D-08 | /apply route redirects to /build/form | unit | `cd frontend && npx vitest run src/__tests__/routing.test.tsx -t "apply redirect"` | No -- Wave 0 |
| D-11 | Dashboard filters by baseId from location.state | unit | `cd frontend && npx vitest run src/__tests__/dashboard.test.tsx -t "filtered view"` | No -- Wave 0 |
| D-13 | NavBar hides "+ New CV" on non-editor pages | unit | `cd frontend && npx vitest run src/__tests__/navBar.test.tsx -t "no new cv"` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `frontend/src/__tests__/tunePanel.test.tsx` -- covers D-01, D-05, D-06, D-07
- [ ] `frontend/src/__tests__/dashboardFiltered.test.tsx` -- covers D-11
- [ ] No framework install needed (Vitest already configured)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable (no auth in this phase) |
| V3 Session Management | No | Not applicable |
| V4 Access Control | No | Not applicable |
| V5 Input Validation | Yes | Existing Pydantic models on backend validate all save requests; frontend passes data through existing api.saveVersion() which is already validated |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for React + CSS Modules

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via dangerouslySetInnerHTML | Tampering | Not used in this phase (contentEditable is existing, not new) |
| Open redirect via location.state | Spoofing | location.state is local to the browser, not URL-based; no redirect vulnerability |
| CSRF on save version | Tampering | Existing CORS + same-origin policy; no new endpoints |

No new security concerns in this phase -- all API calls use existing validated endpoints.

## Sources

### Primary (HIGH confidence)
- Codebase files: ApplyToJobScreen.tsx, DirectEditPage.tsx, ChangePanel.tsx, ChangeCard.tsx, useTailor.ts, NavBar.tsx, Dashboard.tsx, TuneExpansionPanel.tsx, LandingScreen.tsx, App.tsx, EditorActionsContext.tsx, useScrollSync.ts, useAutoSave.ts, useDirectEditor.ts, CVContext.tsx, types/index.ts -- all read and analyzed in this research session
- 08-CONTEXT.md -- user decisions from /gsd-discuss-phase
- 08-UI-SPEC.md -- UI design contract approved by user

### Secondary (MEDIUM confidence)
- None needed -- this is an internal refactoring phase using only existing project code

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing code verified by reading
- Architecture: HIGH -- pattern directly mirrors existing ApplyToJobScreen layout, CSS, and hooks
- Pitfalls: HIGH -- identified from reading actual code paths and understanding the data flow

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable -- internal project code, not external libraries)
