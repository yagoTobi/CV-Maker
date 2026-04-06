# Phase 6: Route Integration - Research

**Researched:** 2026-04-06
**Domain:** React routing, layout components, navigation patterns, dead code removal
**Confidence:** HIGH

## Summary

Phase 6 is primarily a wiring and cleanup phase -- no new libraries, no new backend work, no complex algorithms. The web CV editor (DirectEditPage) already exists and works. The job is to (1) replace CVFormBuilder with DirectEditPage at `/build/form`, (2) create a persistent NavBar layout component that wraps all working pages, (3) fix broken navigation wiring (Dashboard `handleApplyToJob` bug), (4) disable non-supported templates in TemplateSelector, and (5) remove dead code (form-builder folder, editor folder, CVImportUpload, old tests).

The codebase is in clean shape -- `npx tsc --noEmit` passes with zero errors, all existing route components are lazy-loaded, and the context system (CVContext/ToolsContext/AppProvider) already handles formData propagation between pages. The main risk is not the implementation but the dead code removal: ensuring no orphaned imports remain after deleting ~20 files across 3 feature folders.

**Primary recommendation:** Use React Router v7 layout routes with `<Outlet>` to inject the NavBar on all pages except landing. This avoids conditional rendering logic inside each page component and keeps the NavBar as a true shared layout concern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** DirectEditPage replaces CVFormBuilder at `/build/form`. The web CV editor takes over the existing URL -- all existing navigation links (dashboard Open, template select, import redirect) work without URL changes.
- **D-02:** `/direct-edit` route removed. DirectEditPage no longer has a standalone route.
- **D-03:** `/import` route removed. Import only happens through BuildChoiceScreen (`/build/start`) drag-and-drop or EditorToolbar's Import button. No standalone import page.
- **D-04:** Build flow preserved: Landing (`/`) -> BuildChoiceScreen (`/build/start`) -> TemplateSelector (`/build`) -> Web CV Editor (`/build/form`).
- **D-05:** Template selector stays in the build flow. Three templates displayed.
- **D-06:** deedy-resume and mcdowell-cv cards show as disabled with a "Coming soon" badge. Only med-length-proff-cv is clickable. Other web templates deferred to future release.
- **D-07:** New CV starts with realistic placeholder content showing the template shape (e.g., "Your Name", "Software Engineer at Company", sample bullets). User replaces text inline. Phase 2 placeholder mechanism (EDIT-04) already exists -- enrich placeholders to be more realistic.
- **D-08:** Single merged bar across all working pages (not landing). Google Docs-style: logo/nav left, context-specific actions right. One bar, not two (no separate nav + toolbar).
- **D-09:** On editor page (`/build/form`): left side shows "CV Maker" logo + "My CVs" link. Right side shows Import button, Download PDF button, and save status indicator (Saved/Saving...). The current EditorToolbar is replaced by this merged bar.
- **D-10:** On dashboard and other working pages: left side shows "CV Maker" logo + "My CVs" link. Right side shows "+ New CV" button.
- **D-11:** Landing page (`/`) keeps its current standalone branded look with no nav bar. Nav bar appears only after the user starts working.
- **D-12:** Nav bar visual style matches existing design system (CSS variables, color palette, typography from `variables.css`).
- **D-13:** "+ New CV" button in nav bar navigates to `/build/start` (BuildChoiceScreen -- import or start from scratch).
- **D-14:** Dashboard "Tune for a Job" button navigates to `/apply` (3-step Apply to Job flow). Currently navigates to `/build/form` with tune mode -- this needs fixing.
- **D-15:** Dashboard "Open" button navigates to `/build/form` (now DirectEditPage). Loads version formData into CVContext, DirectEditPage reads from context.
- **D-16:** "CV Maker" logo in nav bar navigates to `/` (landing page).
- **D-17:** "My CVs" link in nav bar navigates to `/dashboard`.
- **D-18:** Remove CVFormBuilder component and all form-builder section components (`frontend/src/features/form-builder/`). The split-screen form editing UI is fully replaced.
- **D-19:** Remove old editor/ feature folder (`frontend/src/features/editor/` -- JobInput, MatchAnalysis, MatchSummaryBar, TailorPanel). These old LaTeX editor components are replaced by DirectEditPage + ChangePanel.
- **D-20:** Remove CVImportUpload component (`frontend/src/features/cv-import/`). Import handled by BuildChoiceScreen and EditorToolbar.
- **D-21:** Visual design system (`variables.css`, CSS tokens, color palette), backend (LaTeX compilation, AI endpoints, storage), data model (CVFormData, additionalSections), and all hooks used by DirectEditPage are NOT removed.
- **D-22:** `useFormBuilder` hook -- audit for any functions still used by DirectEditPage or other active code. Remove only unused portions. If useDirectEditor has taken over all responsibilities, the entire hook can be removed.

### Claude's Discretion
- Nav bar exact height, spacing, and responsive behavior
- "Coming soon" badge visual design on disabled template cards
- How the nav bar transitions between page contexts (e.g., subtle animation or instant swap of right-side actions)
- Exact placeholder content text for new CVs (make it realistic and professional)
- Whether to keep BuildChoiceScreen's current drag-and-drop import or simplify
- Order of dead code removal (remove routes first, then components, then hooks)
- How to handle the `editor/` folder's index.ts barrel exports that other code might reference

### Deferred Ideas (OUT OF SCOPE)
- **Web templates for deedy-resume and mcdowell-cv** -- "Coming soon" in template selector. Future release.
- **Per-field AI writing assist** (sparkle icon) -- v2 requirement (AI-08)
- **Undo/redo** -- v2 requirement (POLISH-01)
- **Mobile optimization** -- out of scope (desktop-first)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROUTE-01 | Web CV editor replaces CVFormBuilder at /build/form route | App.tsx route swap: replace CVFormBuilder lazy import with DirectEditPage. DirectEditPage already handles formData from context + bootstrap fallback. |
| ROUTE-02 | Web CV editor replaces EditorScreen as the primary editing experience | EditorScreen (old LaTeX editor) no longer exists as a route. `/direct-edit` route removed. All editing is through DirectEditPage at `/build/form`. |
| ROUTE-03 | Dashboard version switching loads selected version into web CV editor | Dashboard.handleOpen already calls handleVersionLoad + navigates to `/build/form`. DirectEditPage reads from CVContext on mount. Wiring is already correct. |
| ROUTE-04 | Template selection navigates to web CV editor (not form builder) | TemplateSelector already navigates to `/build/form`. Since DirectEditPage replaces CVFormBuilder at that URL, this works automatically. Add "Coming soon" badge for disabled templates. |
| ROUTE-05 | Build flow end-to-end works: Landing -> Template Select -> Web CV Editor -> Download PDF | Full chain: Landing -> `/build/start` -> `/build` -> `/build/form` (DirectEditPage). DirectEditPage has handleDownload (generateLatex + compilePDF + browser download). End-to-end already functional. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router-dom | 7.13.1 | Client-side routing with layout routes | Already installed. Layout routes via `<Route element={<Layout>}><Route ... /></Route>` + `<Outlet>` pattern [VERIFIED: npm list] |
| React | 19.2.0 | UI framework | Already installed [VERIFIED: codebase] |

### Supporting
No new libraries required for this phase. All tools are already in the stack.

**Installation:**
```bash
# No installation needed -- all dependencies already present
```

## Architecture Patterns

### Recommended Route Structure (After Phase 6)

```
App.tsx routes:
/                       -> LandingScreen (no nav bar)
/dashboard              -> WorkingLayout > Dashboard
/build/start            -> WorkingLayout > BuildChoiceScreen
/build                  -> WorkingLayout > TemplateSelector
/build/form             -> WorkingLayout > DirectEditPage   (was CVFormBuilder)
/apply                  -> WorkingLayout > ApplyToJobScreen
*                       -> NotFound
```

### Pattern 1: Layout Route with Outlet (Nav Bar)

**What:** React Router v7 layout routes wrap child routes with shared UI. A `WorkingLayout` component renders the NavBar + `<Outlet />` for child content. Landing page sits outside this layout.

**When to use:** When multiple routes share a common layout element (nav bar, sidebar, footer) but some routes (landing) do not.

**Example:**
```typescript
// Source: React Router v7 layout route pattern [VERIFIED: react-router-dom 7.13.1]
import { Outlet } from 'react-router-dom';
import { NavBar } from './components/NavBar';

function WorkingLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}

// In App.tsx:
<Routes>
  <Route path="/" element={<LandingScreen />} />
  <Route element={<WorkingLayout />}>
    <Route path="/dashboard" element={<FeatureErrorBoundary><Dashboard /></FeatureErrorBoundary>} />
    <Route path="/build/start" element={<FeatureErrorBoundary><BuildChoiceScreen /></FeatureErrorBoundary>} />
    <Route path="/build" element={<FeatureErrorBoundary><TemplateSelector /></FeatureErrorBoundary>} />
    <Route path="/build/form" element={<FeatureErrorBoundary><DirectEditPage /></FeatureErrorBoundary>} />
    <Route path="/apply" element={<FeatureErrorBoundary><ApplyToJobScreen /></FeatureErrorBoundary>} />
  </Route>
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Pattern 2: Context-Aware NavBar Actions

**What:** The NavBar renders different right-side actions depending on the current route. Use `useLocation()` to determine which action set to render.

**When to use:** When a shared layout element needs route-specific behavior without tight coupling to child components.

**Example:**
```typescript
// Source: Standard React Router pattern [VERIFIED: codebase uses useLocation in ApplyToJobScreen]
import { useLocation, useNavigate } from 'react-router-dom';

function NavBar({ editorActions }: { editorActions?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isEditorPage = location.pathname === '/build/form';

  return (
    <nav className={styles.navBar}>
      <div className={styles.leftGroup}>
        <button onClick={() => navigate('/')} className={styles.logo}>CV Maker</button>
        <button onClick={() => navigate('/dashboard')} className={styles.navLink}>My CVs</button>
      </div>
      <div className={styles.rightGroup}>
        {isEditorPage ? editorActions : (
          <button onClick={() => navigate('/build/start')} className={styles.newCvBtn}>+ New CV</button>
        )}
      </div>
    </nav>
  );
}
```

### Pattern 3: Prop Drilling Editor Actions to NavBar

**What:** DirectEditPage passes Import/Download/SaveIndicator as a render prop or via context to the NavBar. This avoids duplicating the download/import logic.

**When to use:** When the NavBar needs access to page-specific state (saveStatus, isDownloading, isImporting) that lives in the page component.

**Recommended approach:** Use a lightweight "NavBar actions" context or render prop pattern:

```typescript
// NavBarActionsContext approach (Claude's discretion -- simpler than render props)
const NavBarActionsContext = createContext<ReactNode>(null);

function WorkingLayout() {
  const [actions, setActions] = useState<ReactNode>(null);
  return (
    <NavBarActionsContext.Provider value={{ actions, setActions }}>
      <NavBar actions={actions} />
      <Outlet />
    </NavBarActionsContext.Provider>
  );
}

// In DirectEditPage:
const { setActions } = useNavBarActions();
useEffect(() => {
  setActions(
    <>
      <ImportButton ... />
      <DownloadButton ... />
      <SaveIndicator ... />
    </>
  );
  return () => setActions(null);
}, [deps]);
```

**Alternative (simpler):** Since the NavBar already knows the route via `useLocation`, it can render action buttons directly and lift the handlers into the page component via a shared context. The key insight is that DirectEditPage already has `handleImportClick`, `handleDownload`, and `saveStatus` -- these just need to be accessible to the NavBar.

### Pattern 4: Dead Code Removal Order

**What:** Systematic removal of old components to avoid cascading import errors.

**Recommended order:**
1. **Routes first:** Remove `/direct-edit`, `/import` routes and their lazy imports from App.tsx. Replace CVFormBuilder import with DirectEditPage.
2. **Feature folders:** Delete `features/form-builder/`, `features/editor/`, `features/cv-import/` directories.
3. **Hook cleanup:** Audit `useFormBuilder` -- if no active code imports it (only deleted code did), remove it and its test file.
4. **Test cleanup:** Remove `resize-handle.test.tsx` (imports CVFormBuilder), remove `useFormBuilder.test.ts` if hook is removed.
5. **TypeScript verify:** Run `npx tsc --noEmit` after each major deletion to catch orphaned imports.

### Anti-Patterns to Avoid
- **Conditional nav bar inside each page:** Do NOT add `{showNavBar && <NavBar />}` to every page component. Use layout routes instead.
- **Removing dead code before fixing routes:** Deleting CVFormBuilder before wiring DirectEditPage into `/build/form` will break the app. Route swap comes first.
- **Moving EditorToolbar logic into NavBar verbatim:** The current EditorToolbar is 67 lines of JSX. Extract the logic (handlers, state) but redesign the UI for the merged nav bar.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared layout across routes | Conditional rendering per page | React Router layout routes + `<Outlet>` | Built-in, zero-dependency, standard pattern |
| Route-specific nav actions | Global state for nav bar content | `useLocation()` path check or lightweight context | Simple, declarative, no over-engineering |

**Key insight:** This phase is about wiring existing pieces together, not building new functionality. Resist the urge to refactor beyond what the decisions require.

## Common Pitfalls

### Pitfall 1: Breaking Dashboard handleOpen After Route Swap
**What goes wrong:** Dashboard.handleOpen calls `handleVersionLoad` then navigates to `/build/form`. If DirectEditPage's bootstrap logic re-fetches data from API (overwriting context), the loaded version data is lost.
**Why it happens:** DirectEditPage's bootstrap `useEffect` runs on mount and overwrites formData if `savedVersions.length > 0`.
**How to avoid:** DirectEditPage already checks `if (formData)` before bootstrapping -- if context has formData, it skips the API fetch. This works because `handleVersionLoad` sets formData in context BEFORE navigation. Verify this flow in tests.
**Warning signs:** Opening a version from dashboard shows wrong data or empty template.

### Pitfall 2: Orphaned Imports After Dead Code Removal
**What goes wrong:** Deleting `features/form-builder/` leaves dangling imports in App.tsx, test files, or other modules.
**Why it happens:** Grep/search misses dynamic imports, barrel re-exports, or type-only imports.
**How to avoid:** Run `npx tsc --noEmit` after EVERY deletion batch. Use the verified import audit (below) as a checklist.
**Warning signs:** TypeScript compilation fails with "Cannot find module" errors.

### Pitfall 3: handleApplyToJob Navigation Bug
**What goes wrong:** Dashboard "Tune for a Job" navigates to `/build/form` with `{ state: { mode: 'tune' } }` instead of `/apply` with `{ state: { baseVersionId } }`.
**Why it happens:** The old form builder had a tune mode; the new flow uses `/apply` directly.
**How to avoid:** Fix Dashboard.handleApplyToJob to navigate to `/apply` with `{ state: { baseVersionId: baseId } }`. This matches what ApplyToJobScreen expects.
**Warning signs:** "Tune for a Job" opens the web CV editor instead of the 3-step apply flow.

### Pitfall 4: NavBar Height Pushing CV Content Down
**What goes wrong:** Adding a fixed/sticky NavBar above DirectEditPage pushes the CV content down, breaking the page break indicator calculation.
**Why it happens:** The current EditorToolbar is 48px sticky. Replacing it with a NavBar of different height changes the document offset.
**How to avoid:** Match the NavBar height to the current EditorToolbar (48px) or adjust `usePageBreak` calculations to account for the new offset.
**Warning signs:** Page break indicator appears at wrong position, or content overflows without warning.

### Pitfall 5: useFormBuilder Re-export of DEFAULT_PERSONAL_ORDER
**What goes wrong:** Removing `useFormBuilder.ts` breaks imports of `DEFAULT_PERSONAL_ORDER` in other files.
**Why it happens:** `useFormBuilder.ts` re-exports `DEFAULT_PERSONAL_ORDER` from `entryFactories.ts`. The form-builder's PersonalSection imports it from useFormBuilder. However, PersonalSection is dead code (being deleted). The canonical source is `utils/entryFactories.ts`.
**How to avoid:** Check that after deletion, no surviving code imports `DEFAULT_PERSONAL_ORDER` from `useFormBuilder`. The `MedLengthTemplate` defines its own local constant.
**Warning signs:** TypeScript errors referencing DEFAULT_PERSONAL_ORDER after useFormBuilder deletion.

## Code Examples

### Route Swap in App.tsx
```typescript
// BEFORE (current):
const CVFormBuilder = lazy(() => import('./features/form-builder/CVFormBuilder'));
const CVImportUpload = lazy(() => import('./features/cv-import/CVImportUpload'));
const DirectEditPage = lazy(() => import('./features/direct-edit/DirectEditPage'));

// Route:
<Route path="/build/form" element={<FeatureErrorBoundary><CVFormBuilder /></FeatureErrorBoundary>} />
<Route path="/import" element={<FeatureErrorBoundary><CVImportUpload /></FeatureErrorBoundary>} />
<Route path="/direct-edit" element={<FeatureErrorBoundary><DirectEditPage /></FeatureErrorBoundary>} />

// AFTER (phase 6):
const DirectEditPage = lazy(() => import('./features/direct-edit/DirectEditPage'));
// CVFormBuilder, CVImportUpload removed

// Route (inside WorkingLayout):
<Route path="/build/form" element={<FeatureErrorBoundary><DirectEditPage /></FeatureErrorBoundary>} />
// /import and /direct-edit routes removed entirely
```

### Dashboard handleApplyToJob Fix
```typescript
// BEFORE (broken):
const handleApplyToJob = useCallback(async (baseId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  const version = await api.getVersion(baseId);
  if (version) {
    handleVersionLoad(version);
    setSelectedTemplateForBuild(version.templateId);
    navigate('/build/form', { state: { mode: 'tune' } });
  }
}, [handleVersionLoad, setSelectedTemplateForBuild, navigate]);

// AFTER (fixed per D-14):
const handleApplyToJob = useCallback(async (baseId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  navigate('/apply', { state: { baseVersionId: baseId } });
}, [navigate]);
```

### Template Selector "Coming Soon" Pattern
```typescript
// Source: D-06, existing TemplateSelector.tsx
const SUPPORTED_TEMPLATES = new Set(['med-length-proff-cv']);

const handleSelect = (templateId: string) => {
  if (!SUPPORTED_TEMPLATES.has(templateId)) return; // guard
  setSelectedId(templateId);
  setSelectedTemplateForBuild(templateId);
  setTimeout(() => navigate('/build/form'), 300);
};

// In card rendering:
<article
  className={`${styles.card} ${!SUPPORTED_TEMPLATES.has(template.id) ? styles.disabled : ''}`}
  onClick={() => handleSelect(template.id)}
>
  {!SUPPORTED_TEMPLATES.has(template.id) && (
    <span className={styles.comingSoon}>Coming soon</span>
  )}
  {/* ... rest of card */}
</article>
```

## Dead Code Audit

### Import Dependency Map (verified via grep)

**`features/form-builder/` -- Imported by:**
| File | Import | Safe to remove? |
|------|--------|-----------------|
| `App.tsx:10` | `lazy(() => import('./features/form-builder/CVFormBuilder'))` | YES -- route swap removes this |
| `__tests__/resize-handle.test.tsx:17` | `import { CVFormBuilder } from '../features/form-builder'` | YES -- test file removed with feature |

**`features/editor/` -- Imported by:**
| File | Import | Safe to remove? |
|------|--------|-----------------|
| None | `editor/index.ts` barrel exists but zero consumers | YES -- completely orphaned |

**`features/cv-import/` -- Imported by:**
| File | Import | Safe to remove? |
|------|--------|-----------------|
| `App.tsx:11` | `lazy(() => import('./features/cv-import/CVImportUpload'))` | YES -- route removal removes this |

**`hooks/useFormBuilder.ts` -- Imported by:**
| File | Import | Safe to remove? |
|------|--------|-----------------|
| `features/form-builder/CVFormBuilder.tsx:4` | `import { useFormBuilder } from "../../hooks/useFormBuilder"` | YES -- form builder being deleted |
| `features/form-builder/types.ts:1` | `import type { useFormBuilder }` | YES -- form builder being deleted |
| `features/form-builder/sections/PersonalSection.tsx:2` | `import { DEFAULT_PERSONAL_ORDER }` | YES -- form builder being deleted |
| `__tests__/useFormBuilder.test.ts` | Test file for the hook | YES -- test file removed with hook |
| `utils/entryFactories.ts:5` | Comment reference only, not an import | NO ACTION needed |
| `direct-edit/components/MedLengthTemplate.tsx:122` | Comment reference only, not an import | NO ACTION needed |

**Conclusion:** `useFormBuilder.ts` can be fully removed. No surviving production code imports it. [VERIFIED: grep audit]

### Files to Delete (27 files total)

**features/form-builder/ (17 files):**
- CVFormBuilder.tsx, CVFormBuilder.module.css
- ImportBanner.tsx, ImportBanner.module.css
- index.ts, types.ts
- components/Field.tsx, components/GripIcon.tsx, components/useDrag.ts
- sections/index.ts, sections/PersonalSection.tsx, sections/WorkSection.tsx, sections/EducationSection.tsx, sections/SkillsSection.tsx, sections/ProjectsSection.tsx, sections/AwardsSection.tsx, sections/AdditionalSectionView.tsx

**features/editor/ (5 files):**
- index.ts, JobInput.tsx, JobInput.module.css, MatchAnalysis.tsx, MatchAnalysis.module.css, MatchSummaryBar.tsx, MatchSummaryBar.module.css, TailorPanel.tsx, TailorPanel.module.css (9 files)

**features/cv-import/ (3 files):**
- CVImportUpload.tsx, CVImportUpload.module.css, index.ts

**hooks/ (1 file):**
- useFormBuilder.ts (if fully orphaned after form-builder deletion)

**tests/ (2 files):**
- __tests__/resize-handle.test.tsx (imports CVFormBuilder)
- __tests__/useFormBuilder.test.ts (tests useFormBuilder hook)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CVFormBuilder split-screen (form + PDF preview) | DirectEditPage inline editing (WYSIWYG) | Phase 2-5 | DirectEditPage is fully built and tested |
| EditorScreen LaTeX editor | Removed as primary editing surface | Phase 6 | Only LaTeX compilation at download time |
| Standalone /import route | Import via BuildChoiceScreen + EditorToolbar | Phase 5 | CVImportUpload page is dead code |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | NavBar at 48px height will not break usePageBreak calculations | Common Pitfalls #4 | Page break indicator shows at wrong position -- fixable during implementation |
| A2 | `handleVersionLoad` sets formData in context before React Router navigates, so DirectEditPage reads it on mount without re-fetching | Common Pitfalls #1 | Dashboard Open would show stale/empty data -- low risk, existing behavior works |
| A3 | No code outside the deleted folders imports from useFormBuilder in production | Dead Code Audit | TypeScript compilation failure -- verified via grep, HIGH confidence |

## Open Questions

1. **NavBar actions pattern: context vs render prop vs simple route detection?**
   - What we know: DirectEditPage has handleImportClick, handleDownload, saveStatus that the NavBar needs. Other pages just show "+ New CV".
   - What's unclear: The cleanest way to pass editor-specific actions to a layout-level NavBar without over-engineering.
   - Recommendation: Use a simple pattern: NavBar detects `/build/form` via `useLocation()` and renders editor actions. DirectEditPage lifts its handlers into a small `EditorActionsContext` that NavBar reads. This avoids props-through-outlet complexity.

2. **Should BackButton navigation patterns change?**
   - What we know: Dashboard has a "Home" back button. TemplateSelector has a "Back" button to `/build/start`. BuildChoiceScreen has "Back" to `/`.
   - What's unclear: With the NavBar providing "CV Maker" (home) and "My CVs" (dashboard) links, are per-page back buttons redundant?
   - Recommendation: Keep per-page back buttons for now -- they provide specific contextual navigation that the nav bar's general links don't replace. The nav bar provides always-accessible navigation, while back buttons guide the build flow.

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
| ROUTE-01 | DirectEditPage renders at /build/form | integration | `cd frontend && npx vitest run src/__tests__/routeIntegration.test.tsx -x` | Wave 0 |
| ROUTE-02 | /direct-edit route no longer exists (404) | integration | Same file as above | Wave 0 |
| ROUTE-03 | Dashboard Open loads version into editor | integration | Same file as above | Wave 0 |
| ROUTE-04 | Template selection navigates to editor; disabled templates blocked | unit | `cd frontend && npx vitest run src/__tests__/templateSelector.test.tsx -x` | Wave 0 |
| ROUTE-05 | End-to-end build flow routing | integration | Same as ROUTE-01 test file | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green + `npx tsc --noEmit` clean before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/__tests__/routeIntegration.test.tsx` -- covers ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-05 (verify routes render correct components, removed routes 404)
- [ ] `frontend/src/__tests__/templateSelector.test.tsx` -- covers ROUTE-04 (disabled templates, "Coming soon" badge)
- [ ] Remove `frontend/src/__tests__/resize-handle.test.tsx` -- imports deleted CVFormBuilder
- [ ] Remove `frontend/src/__tests__/useFormBuilder.test.ts` -- tests deleted hook

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- no auth changes |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | no | No new user inputs -- existing validation unchanged |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

No new threat patterns introduced. This phase only changes frontend routing and removes dead UI code. No new API endpoints, no new data flows, no new user inputs.

## Sources

### Primary (HIGH confidence)
- Codebase grep/read: All import dependency analysis, file listings, code patterns verified against actual source files
- `npm list react-router-dom` -- version 7.13.1 confirmed
- `npx tsc --noEmit` -- zero TypeScript errors confirmed

### Secondary (MEDIUM confidence)
- React Router v7 layout routes with `<Outlet>` -- standard pattern since React Router v6, carried forward into v7 [ASSUMED: based on training knowledge of React Router, but not verified against Context7 in this session]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, everything already installed and verified
- Architecture: HIGH - layout route pattern is well-established; codebase already uses React Router v7
- Pitfalls: HIGH - all identified through direct code reading and import auditing
- Dead code audit: HIGH - exhaustive grep verification of every import path

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no external dependencies changing)
