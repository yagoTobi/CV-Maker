# Phase 7: Navigation Flow Consolidation - Research

**Researched:** 2026-04-15
**Domain:** React routing, inline UI expansion, state-driven navigation
**Confidence:** HIGH

## Summary

Phase 7 consolidates navigation by collapsing the standalone `/build/start` route (BuildChoiceScreen) into inline expansion panels on the LandingScreen, reframing Dashboard as management-only (no longer an intermediate Tune flow step), and adding smart Tune-for-role logic that checks base CV count before deciding navigation.

The scope is entirely frontend -- no backend changes needed. The primary technical challenge is implementing animated inline expansion panels on the LandingScreen that host the import drop zone (currently in BuildChoiceScreen) and a lightweight CV picker (new component). The secondary challenge is updating all navigation references to `/build/start` across the codebase, updating the existing integration tests, and changing the TemplateSelector back-button target.

**Primary recommendation:** Reuse existing `useFileUpload` hook and `useImport` hook from context. Build two new subcomponents (BuildExpansionPanel, TuneExpansionPanel) rendered conditionally inside LandingScreen based on `expandedPanel` local state. Remove the `/build/start` route and BuildChoiceScreen entirely. Update NavBar `+ New CV` to navigate to `/` instead of `/build/start`. Update TemplateSelector back button to navigate to `/` instead of `/build/start`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Inline expansion panels | Browser / Client | -- | Pure React state + CSS animation, no server involvement |
| Import drop zone | Browser / Client | API / Backend | File validation is client-side; actual extraction hits backend `/cv-import` |
| Base CV count check (Tune flow) | Browser / Client | -- | `savedVersions` already loaded eagerly in CVContext on mount |
| Route elimination (`/build/start`) | Browser / Client | -- | React Router config change only |
| NavBar target update | Browser / Client | -- | Single `navigate()` call change |
| Dashboard reframing | Browser / Client | -- | No code changes to Dashboard itself; only landing flow changes |

## Standard Stack

### Core

No new libraries needed. This phase uses only existing project dependencies.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.0 | UI framework | Already in project [VERIFIED: frontend/package.json] |
| react-router-dom | ^7.13.1 | Client-side routing | Already in project [VERIFIED: frontend/package.json] |
| CSS Modules | (built-in Vite) | Scoped component styles | Project convention [VERIFIED: all components] |

### Supporting

No new supporting libraries needed. All functionality can be built with existing React APIs and CSS.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS max-height animation | Framer Motion | Adds ~30KB dependency for one animation; CSS max-height + opacity is sufficient per UI-SPEC |
| Local expandedPanel state | URL search params | Adds unnecessary URL complexity for transient UI state; expansion resets on remount naturally |

**Installation:** None required -- all dependencies already present.

## Architecture Patterns

### System Architecture Diagram

```
Landing Screen (/)
  |
  |-- Click "Build my CV" card
  |     |
  |     |-- [toggle expandedPanel = 'build']
  |     |     |
  |     |     +-- BuildExpansionPanel (inline)
  |     |           |-- Drop zone (drag/click -> useFileUpload -> cvImport.handleFileSelected)
  |     |           |     |-- On success: setFormData(importResult.formData) -> navigate('/build')
  |     |           |     +-- On error: show error inline
  |     |           |-- "Start from scratch" card
  |     |           |     +-- setFormData(null), setSelectedTemplateForBuild(null) -> navigate('/build')
  |     |           +-- Format chips (PDF, DOCX, JSON)
  |     |
  |     +-- Click card again -> collapse (expandedPanel = null)
  |
  |-- Click "Tune for a role" card
  |     |
  |     |-- Derive baseCVs = savedVersions.filter(v => !v.parentVersionId)
  |     |-- baseCVs.length === 1 -> navigate('/apply', { state: { baseVersionId } })
  |     |-- baseCVs.length === 0 -> [expandedPanel = 'tune'] -> TuneExpansionPanel (empty state)
  |     +-- baseCVs.length >= 2 -> [expandedPanel = 'tune'] -> TuneExpansionPanel (CV picker)
  |
  +-- "My Saved CVs" link -> navigate('/dashboard')

Template Selector (/build)
  |-- Back button -> navigate('/') [changed from '/build/start']

NavBar (non-editor pages)
  +-- "+ New CV" button -> navigate('/') [changed from '/build/start']
```

### Recommended Project Structure

```
frontend/src/
├── features/
│   ├── landing/
│   │   ├── LandingScreen.tsx          # Modified: add expansion state + render panels
│   │   ├── LandingScreen.module.css   # Modified: add expansion panel styles + card active states
│   │   ├── BuildExpansionPanel.tsx     # NEW: drop zone + start from scratch (extracted from BuildChoiceScreen)
│   │   ├── BuildExpansionPanel.module.css  # NEW
│   │   ├── TuneExpansionPanel.tsx      # NEW: empty state OR CV picker
│   │   └── TuneExpansionPanel.module.css   # NEW
│   └── build-choice/                  # DELETED entirely after migration
│       ├── BuildChoiceScreen.tsx
│       ├── BuildChoiceScreen.module.css
│       └── index.ts
├── components/
│   └── NavBar.tsx                     # Modified: change /build/start to /
└── features/
    └── template-selection/
        └── TemplateSelector.tsx        # Modified: back button target / -> /
```

### Pattern 1: Inline Expansion with CSS max-height Animation

**What:** Animate panel open/close using `max-height` + `opacity` transitions, avoiding layout-measurement-based JS animation.

**When to use:** UI-SPEC C-02 specifies `max-height` transition from 0 to measured height over 250ms ease-out for enter, and to 0 over 200ms ease-in for exit.

**Example:**
```css
/* Source: UI-SPEC C-02 enter/exit animation spec */
.panel {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 200ms ease-in, opacity 150ms ease-in;
}

.panelExpanded {
  max-height: 600px; /* generous upper bound */
  opacity: 1;
  transition: max-height 250ms ease-out, opacity 200ms ease-out;
}
```

**Practical note:** Using a fixed generous `max-height` (e.g., 600px) is simpler than measuring actual height with refs, and the visual difference is imperceptible when the value is within 2x of actual content height. The BuildExpansionPanel content is approximately 350-400px tall. [ASSUMED]

### Pattern 2: Accordion-Style Toggle State

**What:** `expandedPanel: 'build' | 'tune' | null` local state variable in LandingScreen. Only one panel expanded at a time.

**When to use:** Per UI-SPEC S-01, default is `null`, toggled on card click.

**Example:**
```typescript
// Source: UI-SPEC S-01 state requirement
const [expandedPanel, setExpandedPanel] = useState<'build' | 'tune' | null>(null);

const handleBuildClick = () => {
  setExpandedPanel(prev => prev === 'build' ? null : 'build');
  if (expandedPanel !== 'build') {
    setFormData(null); // Per I-01.6
  }
};
```

### Pattern 3: Base CV Derivation (Client-Side)

**What:** Filter `savedVersions` to find base CVs (no parentVersionId).

**When to use:** Tune card click needs to know how many base CVs exist.

**Example:**
```typescript
// Source: UI-SPEC S-02
const baseCVs = savedVersions.filter(v => !v.parentVersionId);
```

**Key fact:** `savedVersions` is loaded eagerly on app mount in CVProvider (CVContext.tsx:40-58). By the time the user clicks "Tune for a role", the data is already available -- no additional API call needed. [VERIFIED: CVContext.tsx]

### Anti-Patterns to Avoid

- **Sequential animation with setTimeout:** Do not use `setTimeout` to sequence the collapse-then-expand animation when switching panels. Instead, use CSS transitions on both panels simultaneously -- one exits while the other enters. The UI-SPEC says "Exit animation completes before enter animation starts" (C-05), but this can be achieved with staggered CSS `transition-delay` rather than imperative JS timing. [ASSUMED]
- **Measuring actual DOM height for max-height:** Using `useRef` + `getBoundingClientRect()` to set exact max-height is fragile (content may reflow on mobile, during import loading state, etc.). A generous fixed value is more robust. [ASSUMED]
- **Creating a new route for the CV picker:** The Tune expansion panel should be inline on the landing page, not a new route. The UI-SPEC explicitly states this replaces the intermediate Dashboard step.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload + drag/drop | Custom drag handlers | `useFileUpload` hook (already exists at `features/shared/useFileUpload.ts`) | Already handles drag-over state, file validation, error clearing [VERIFIED: useFileUpload.ts] |
| Import progress + API call | Custom import logic | `cvImport` from `useAppContext()` (via `useImport` hook) | Already manages `isImporting`, `importProgress`, `importError`, `importResult` state [VERIFIED: useImport.ts] |
| File validation | Manual extension/size checks | `useFileUpload` internal `validateFile` | Already validates extensions (.pdf, .docx, .json) and 10MB limit [VERIFIED: useFileUpload.ts:4-18] |
| Version filtering | Custom API endpoint | `savedVersions.filter(v => !v.parentVersionId)` | Data already in memory from CVContext eager load [VERIFIED: CVContext.tsx] |

**Key insight:** BuildChoiceScreen's entire logic is `useFileUpload` + `cvImport` from context + a "Start from scratch" button. All of these can be directly reused in the BuildExpansionPanel without any refactoring of the hooks themselves.

## Common Pitfalls

### Pitfall 1: Stale savedVersions on Landing

**What goes wrong:** User creates a CV (navigates away from landing), comes back to landing, clicks "Tune for a role" -- but `savedVersions` still has the old count.
**Why it happens:** `savedVersions` is loaded once on CVProvider mount (useEffect with `[]` deps). If the user navigates away and back, the LandingScreen remounts but CVProvider does NOT remount (it's in AppProvider wrapping all routes).
**How to avoid:** `savedVersions` is also updated by `handleSaveVersion` in ToolsContext which calls `setSavedVersions(prev => [meta, ...prev])`. Additionally, Dashboard's `syncVersionsToApp` updates it after any CRUD operation. So after a save or dashboard interaction, the count should be current. However, if the user creates a version via auto-save in the editor and navigates straight back to landing without going through Dashboard, the count should be accurate since auto-save calls `handleSaveVersion`. Verify this data flow during implementation.
**Warning signs:** Tune card shows "No CV to tune yet" when the user just saved one.

### Pitfall 2: Import State Leaking Between Expansions

**What goes wrong:** User starts an import (drag file onto drop zone), then collapses the Build panel before import completes. The import keeps running in the background via `useImport`. When the panel re-expands, stale import state (error/result) is visible.
**Why it happens:** `useImport` lives in ToolsContext, which persists across LandingScreen remounts. Its state (`importResult`, `importError`) persists until explicitly reset.
**How to avoid:** Call `cvImport.reset()` when the Build panel expands (on `expandedPanel` changing to `'build'`). BuildChoiceScreen doesn't currently do this -- it only resets on successful JSON import. The expansion panel should be more careful.
**Warning signs:** Old error messages appearing in a fresh expansion.

### Pitfall 3: Card Arrow Rotation CSS Conflict

**What goes wrong:** The existing `.cardArrow` has a `:hover` translateX(3px) animation. When the card is in "expanded" state, the arrow should rotate 90deg per UI-SPEC C-05. If both hover and expanded transforms are active, they could conflict.
**Why it happens:** CSS `transform` is a single property -- hover's `translateX(3px)` and expanded's `rotate(90deg)` cannot coexist without combining them.
**How to avoid:** When expanded, override the hover transform: `.cardExpanded .cardArrow { transform: rotate(90deg); }` and `.cardExpanded:hover .cardArrow { transform: rotate(90deg); }` (suppress the translateX on hover when expanded).
**Warning signs:** Arrow jumps or flickers on hover when panel is expanded.

### Pitfall 4: Test File Expects Removed Route

**What goes wrong:** `import-flow-state.test.tsx` has 13 tests, many of which navigate to `/build/start` and expect "Build your CV" heading from BuildChoiceScreen.
**Why it happens:** Tests were written for the old navigation architecture with a separate BuildChoiceScreen.
**How to avoid:** Tests must be rewritten to reflect the new inline expansion architecture. The test file also has a pre-existing failure: it checks for `'Tune for a job'` but the actual card text is `'Tune for a role'` (verified by running the test suite -- 1 failure).
**Warning signs:** `npm run test` fails after route removal.

### Pitfall 5: TemplateSelector Back Button Regression

**What goes wrong:** TemplateSelector's back button navigates to `/build/start`. After removing that route, clicking Back from template selector would hit the 404 NotFound component.
**Why it happens:** Direct string reference to the old route in TemplateSelector.tsx line 46.
**How to avoid:** Change the `navigate('/build/start')` call in TemplateSelector to `navigate('/')`. This changes the Back behavior from "go back to choice screen" to "go back to landing." This is correct because the choice screen no longer exists as a standalone page.
**Warning signs:** Clicking "Back" from template selector shows 404.

### Pitfall 6: Sequential Panel Switch Animation Timing

**What goes wrong:** UI-SPEC C-05 says "Exit animation completes before enter animation starts (sequential, not simultaneous). Total switch time: ~400ms." Naive implementation with `expandedPanel` state swap would instantly show the new panel.
**Why it happens:** React state updates are synchronous -- setting `expandedPanel` from `'build'` to `'tune'` immediately hides the build panel and shows the tune panel, with no delay between.
**How to avoid:** Use a two-phase state update: (1) set `expandedPanel = null` to trigger exit animation, (2) after exit animation duration (~200ms), set `expandedPanel = 'tune'` to trigger enter animation. Use `setTimeout` or `onTransitionEnd` callback for the delay.
**Warning signs:** Panels switch instantly without the sequential animation.

## Code Examples

### Existing BuildChoiceScreen Logic to Extract

The BuildChoiceScreen component (161 lines) can be decomposed into:

```typescript
// Source: [VERIFIED: BuildChoiceScreen.tsx]
// Key patterns to reuse in BuildExpansionPanel:

// 1. File upload hook setup
const onValidFile = useCallback((file: File) => {
  cvImport.handleFileSelected(file);
}, [cvImport]);
const upload = useFileUpload(onValidFile, cvImport.isImporting);

// 2. Import success effect (navigate on result)
useEffect(() => {
  if (!cvImport.importResult?.success) return;
  setFormData(cvImport.importResult.formData);
  if (cvImport.importResult.source === 'json') {
    cvImport.reset();
  }
  navigate('/build');
}, [cvImport.importResult, navigate, setFormData, cvImport]);

// 3. Start from scratch handler
const handleStartFromScratch = () => {
  setFormData(null);
  setSelectedTemplateForBuild(null);
  navigate('/build');
};
```

### NavBar Change

```typescript
// Source: [VERIFIED: NavBar.tsx:73]
// Before:
onClick={() => navigate('/build/start')}
// After:
onClick={() => navigate('/')}
```

### TemplateSelector Back Button Change

```typescript
// Source: [VERIFIED: TemplateSelector.tsx:46]
// Before:
<button className={styles.backBtn} onClick={() => navigate('/build/start')}>
// After:
<button className={styles.backBtn} onClick={() => navigate('/')}>
```

### App.tsx Route Removal

```typescript
// Source: [VERIFIED: App.tsx:31]
// Remove this line:
<Route path="/build/start" element={<FeatureErrorBoundary><BuildChoiceScreen /></FeatureErrorBoundary>} />
// Also remove the lazy import at line 8
```

### LandingScreen Tune Logic

```typescript
// Source: [VERIFIED: LandingScreen.tsx:14-22, UI-SPEC I-02/I-03/I-04]
// Current:
const handleTuneForJob = () => {
  if (savedVersions.length > 0) {
    navigate('/dashboard');
  } else {
    navigate('/build/start');
  }
};

// New:
const handleTuneClick = () => {
  const baseCVs = savedVersions.filter(v => !v.parentVersionId);
  if (baseCVs.length === 1) {
    navigate('/apply', { state: { baseVersionId: baseCVs[0].id } });
    return;
  }
  // 0 or 2+ base CVs: toggle expansion panel
  setExpandedPanel(prev => prev === 'tune' ? null : 'tune');
};
```

### CSS Animation Pattern

```css
/* Source: UI-SPEC C-02 animation spec */
.expansionPanel {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 200ms ease-in, opacity 150ms ease-in;
}

.expansionPanelOpen {
  max-height: 600px;
  opacity: 1;
  transition: max-height 250ms ease-out, opacity 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .expansionPanel,
  .expansionPanelOpen {
    transition: none;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate BuildChoiceScreen route | Inline expansion on Landing | Phase 7 (this phase) | Fewer route transitions, faster perceived flow |
| Dashboard as Tune intermediate step | Smart navigate based on base CV count | Phase 7 (this phase) | Skip unnecessary step when only 1 base CV |
| `/build/start` route | Route eliminated | Phase 7 (this phase) | One fewer lazy-loaded component |

**Deprecated/outdated:**
- `BuildChoiceScreen` component: replaced by `BuildExpansionPanel` inline in LandingScreen
- `/build/start` route: eliminated entirely
- `LandingScreen.handleBuildCV` navigating to `/build/start`: replaced by inline expansion toggle
- `LandingScreen.handleTuneForJob` navigating to `/dashboard`: replaced by smart base CV check

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fixed max-height of ~600px is sufficient for BuildExpansionPanel content | Architecture Patterns | If content is taller (e.g., long error message + loading state), panel would clip. Mitigate by testing with worst-case content |
| A2 | Sequential panel switch can use setTimeout(200ms) between collapse/expand | Common Pitfalls | If CSS transition duration changes, the timeout becomes out of sync. Consider onTransitionEnd event instead |
| A3 | No `prefers-reduced-motion` exists in current codebase (first introduction) | Code Examples | Need to verify it works with project's CSS Modules setup -- should be standard CSS |

## Open Questions

1. **TemplateSelector Back Button Destination**
   - What we know: Currently navigates to `/build/start`. After removal, the closest equivalent is `/` (landing).
   - What's unclear: Should the back button from TemplateSelector return to landing with the Build panel expanded, or just go to landing in default state?
   - Recommendation: Navigate to `/` in default state. The expansion state is local to LandingScreen and will be lost on remount. This is acceptable -- the user is "starting over" by going back.

2. **Sequential Panel Switch Implementation**
   - What we know: UI-SPEC C-05 says exit completes before enter starts (~400ms total).
   - What's unclear: Whether `setTimeout` or CSS `transition-delay` or `onTransitionEnd` is the most robust approach.
   - Recommendation: Use `setTimeout` with the exit animation duration as the delay. It's simpler and more predictable than `onTransitionEnd` (which can fire for sub-properties). The 200ms delay is small enough that timing drift won't be noticeable.

3. **Pre-existing Test Failure**
   - What we know: `import-flow-state.test.tsx` line 58 checks for `'Tune for a job'` but the card text is `'Tune for a role'`. This test was already failing before Phase 7.
   - What's unclear: Whether to fix this as part of Phase 7 or leave it.
   - Recommendation: Fix it as part of Phase 7 since the entire test file needs to be rewritten anyway for the new navigation flow.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx` |
| Full suite command | `cd frontend && npm run test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Build card click expands inline panel (not route navigate) | integration | `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x` | Exists but needs full rewrite |
| NAV-02 | Import via drop zone on landing works end-to-end | integration | Same test file | Exists but needs rewrite |
| NAV-03 | Tune card with 1 base CV navigates to /apply directly | integration | Same test file | New test needed |
| NAV-04 | Tune card with 0 base CVs shows empty state panel | integration | Same test file | New test needed |
| NAV-05 | Tune card with 2+ base CVs shows CV picker | integration | Same test file | New test needed |
| NAV-06 | /build/start route no longer exists (404 or redirect) | integration | Same test file | Existing test needs update |
| NAV-07 | NavBar "+ New CV" navigates to / (not /build/start) | integration | Same test file | New test needed |
| NAV-08 | TemplateSelector Back navigates to / | integration | Same test file | Existing test needs update |

### Sampling Rate

- **Per task commit:** `cd frontend && npx vitest run src/__tests__/import-flow-state.test.tsx -x`
- **Per wave merge:** `cd frontend && npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `frontend/src/__tests__/import-flow-state.test.tsx` -- full rewrite needed to cover new inline expansion flow and Tune card branching logic
- [ ] Fix pre-existing "Tune for a job" vs "Tune for a role" text mismatch in tests

## Security Domain

This phase introduces no new security concerns:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes (import file validation) | Existing `useFileUpload` validates file type + size client-side; backend validates server-side [VERIFIED: useFileUpload.ts] |
| V6 Cryptography | no | -- |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious file upload via drop zone | Tampering | Same mitigation as current BuildChoiceScreen: client-side extension check + backend extraction sanitization. No change in Phase 7 |

## Sources

### Primary (HIGH confidence)

- `frontend/src/App.tsx` -- current route definitions [VERIFIED: direct code read]
- `frontend/src/features/landing/LandingScreen.tsx` -- current landing screen component [VERIFIED: direct code read]
- `frontend/src/features/build-choice/BuildChoiceScreen.tsx` -- component being replaced [VERIFIED: direct code read]
- `frontend/src/features/shared/useFileUpload.ts` -- file upload hook to reuse [VERIFIED: direct code read]
- `frontend/src/hooks/useImport.ts` -- import hook API [VERIFIED: direct code read]
- `frontend/src/contexts/CVContext.tsx` -- savedVersions eager loading [VERIFIED: direct code read]
- `frontend/src/contexts/ToolsContext.tsx` -- cvImport instance location [VERIFIED: direct code read]
- `frontend/src/components/NavBar.tsx` -- current /build/start reference [VERIFIED: direct code read]
- `frontend/src/features/template-selection/TemplateSelector.tsx` -- back button reference [VERIFIED: direct code read]
- `frontend/src/features/dashboard/Dashboard.tsx` -- Dashboard behavior [VERIFIED: direct code read]
- `frontend/src/__tests__/import-flow-state.test.tsx` -- existing integration tests [VERIFIED: direct code read + test execution]
- `07-UI-SPEC.md` -- UI design contract for this phase [VERIFIED: direct read]

### Secondary (MEDIUM confidence)

- CSS `max-height` animation pattern -- standard CSS technique, widely documented [ASSUMED: based on training data, well-established pattern]

### Tertiary (LOW confidence)

None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing project dependencies
- Architecture: HIGH -- straightforward React component decomposition with verified code paths
- Pitfalls: HIGH -- identified through direct code reading and test execution; the import state leak and test failures are concrete verified issues

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable -- no external dependency changes expected)
