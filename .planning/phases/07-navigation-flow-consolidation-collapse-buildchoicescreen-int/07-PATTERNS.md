# Phase 7: Navigation Flow Consolidation - Pattern Map

**Mapped:** 2026-04-15
**Files analyzed:** 10 (4 new, 6 modified/deleted)
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/features/landing/BuildExpansionPanel.tsx` | component | request-response | `frontend/src/features/build-choice/BuildChoiceScreen.tsx` | exact |
| `frontend/src/features/landing/BuildExpansionPanel.module.css` | config | n/a | `frontend/src/features/build-choice/BuildChoiceScreen.module.css` | exact |
| `frontend/src/features/landing/TuneExpansionPanel.tsx` | component | request-response | `frontend/src/features/dashboard/Dashboard.tsx` (version list rendering) | role-match |
| `frontend/src/features/landing/TuneExpansionPanel.module.css` | config | n/a | `frontend/src/features/build-choice/BuildChoiceScreen.module.css` + `frontend/src/features/landing/LandingScreen.module.css` | role-match |
| `frontend/src/features/landing/LandingScreen.tsx` (modified) | component | event-driven | self (current version) | exact |
| `frontend/src/features/landing/LandingScreen.module.css` (modified) | config | n/a | self (current version) | exact |
| `frontend/src/App.tsx` (modified) | route | config | self (current version) | exact |
| `frontend/src/components/NavBar.tsx` (modified) | component | event-driven | self (current version) | exact |
| `frontend/src/features/template-selection/TemplateSelector.tsx` (modified) | component | event-driven | self (current version) | exact |
| `frontend/src/__tests__/import-flow-state.test.tsx` (rewrite) | test | request-response | self (current version) | exact |

## Pattern Assignments

### `frontend/src/features/landing/BuildExpansionPanel.tsx` (component, request-response)

**Analog:** `frontend/src/features/build-choice/BuildChoiceScreen.tsx`

This is a near-direct extraction. BuildChoiceScreen's entire body (minus the page-level container, background, back button, and header) becomes BuildExpansionPanel. The new component is a named export (not default) since it is not a route-level screen.

**Imports pattern** (BuildChoiceScreen.tsx lines 1-5):
```typescript
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useFileUpload } from '../shared/useFileUpload';
import styles from './BuildExpansionPanel.module.css';
```

**Hook setup pattern** (BuildChoiceScreen.tsx lines 11-15):
```typescript
const onValidFile = useCallback((file: File) => {
  cvImport.handleFileSelected(file);
}, [cvImport]);

const upload = useFileUpload(onValidFile, cvImport.isImporting);
```

**Import success effect pattern** (BuildChoiceScreen.tsx lines 18-26):
```typescript
useEffect(() => {
  if (!cvImport.importResult?.success) return;

  setFormData(cvImport.importResult.formData);
  if (cvImport.importResult.source === 'json') {
    cvImport.reset();
  }
  navigate('/build');
}, [cvImport.importResult, navigate, setFormData, cvImport]);
```

**Start from scratch handler pattern** (BuildChoiceScreen.tsx lines 28-32):
```typescript
const handleStartFromScratch = () => {
  setFormData(null);
  setSelectedTemplateForBuild(null);
  navigate('/build');
};
```

**Drop zone CSS class composition pattern** (BuildChoiceScreen.tsx lines 34-38):
```typescript
const dropZoneClasses = [
  styles.dropZone,
  upload.isDragOver && styles.dragOver,
  cvImport.isImporting && styles.uploading,
].filter(Boolean).join(' ');
```

**Error display pattern** (BuildChoiceScreen.tsx line 40):
```typescript
const displayError = cvImport.importError || upload.localError;
```

**Drop zone JSX pattern** (BuildChoiceScreen.tsx lines 58-97 -- entire drop zone with loading/default states):
```typescript
<div
  className={dropZoneClasses}
  onDragOver={upload.onDragOver}
  onDragLeave={upload.onDragLeave}
  onDrop={upload.onDrop}
  onClick={upload.openFilePicker}
>
  {cvImport.isImporting ? (
    <div className={styles.loadingState}>
      <div className={styles.spinner} />
      <p className={styles.progressText}>
        {cvImport.importProgress?.message || 'Processing...'}
      </p>
      {cvImport.importProgress && (
        <div className={styles.progressIndicator}>
          <span className={styles.stepText}>
            Step {cvImport.importProgress.step} of {cvImport.importProgress.totalSteps}
          </span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(cvImport.importProgress.step / cvImport.importProgress.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className={styles.defaultState}>
      <svg className={styles.uploadIcon} width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M40 28V36C40 37.0609 39.5786 38.0783 38.8284 38.8284C38.0783 39.5786 37.0609 40 36 40H12C10.9391 40 9.92172 39.5786 9.17157 38.8284C8.42143 38.0783 8 37.0609 8 36V28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className={styles.dropText}>
        Drag your CV here or <span className={styles.clickText}>click to browse</span>
      </p>
      <p className={styles.helpText}>PDF, DOCX, or JSON &bull; Max 10MB</p>
    </div>
  )}
</div>
```

**Format chips JSX pattern** (BuildChoiceScreen.tsx lines 99-112):
```typescript
<div className={styles.formats}>
  <span className={styles.formatChip}>
    <span className={styles.formatDot} />
    PDF
  </span>
  <span className={styles.formatChip}>
    <span className={styles.formatDot} />
    DOCX
  </span>
  <span className={styles.formatChip}>
    <span className={styles.formatDot} />
    JSON
  </span>
</div>
```

**Error message JSX pattern** (BuildChoiceScreen.tsx lines 114-123):
```typescript
{displayError && (
  <div className={styles.errorMessage}>
    <svg className={styles.errorIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    {displayError}
  </div>
)}
```

**Scratch card JSX pattern** (BuildChoiceScreen.tsx lines 131-148):
```typescript
<button className={styles.scratchCard} onClick={handleStartFromScratch}>
  <div className={styles.scratchIcon}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  </div>
  <div className={styles.scratchBody}>
    <h2>Start from scratch</h2>
    <p>Fill in your details with a guided form and choose a professional template.</p>
  </div>
  <div className={styles.scratchArrow}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  </div>
</button>
```

**Hidden file input pattern** (BuildChoiceScreen.tsx lines 150-157):
```typescript
<input
  ref={upload.fileInputRef}
  type="file"
  hidden
  accept=".pdf,.docx,.json"
  onChange={upload.onFileInputChange}
  disabled={cvImport.isImporting}
/>
```

**Key difference from analog:** BuildExpansionPanel is a named export, not a default export. It receives no props (it reads from context like its analog). It must also call `cvImport.reset()` on mount/expand to clear stale import state (pitfall from RESEARCH.md).

---

### `frontend/src/features/landing/BuildExpansionPanel.module.css` (config)

**Analog:** `frontend/src/features/build-choice/BuildChoiceScreen.module.css`

Copy nearly the entire CSS file. Remove the page-level styles (`.container`, `.background`, `.content`, `.backBtn`, `.header`) since those belong to the parent LandingScreen. Keep all of the following class blocks from BuildChoiceScreen.module.css:

**Drop zone styles** (BuildChoiceScreen.module.css lines 44-73):
```css
.dropZone {
  width: 100%;
  min-height: 200px;
  padding: 2.5rem 2rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.dropZone:hover:not(.uploading) {
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
}

.dropZone.dragOver {
  border-color: var(--accent);
  border-style: solid;
  background: var(--accent-light);
}

.dropZone.uploading {
  cursor: not-allowed;
  pointer-events: none;
  opacity: 0.85;
}
```

**All loading, progress, format, error, divider, scratch card styles** (BuildChoiceScreen.module.css lines 76-310) -- copy verbatim.

**New addition: container wrapper for the expansion panel:**
```css
/* Per UI-SPEC C-02 */
.container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

**New addition: `@keyframes spin`** (BuildChoiceScreen.module.css lines 313-316 -- copy from analog since it won't inherit from the page-level):
```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

**Drop zone min-height adjustment:** Per UI-SPEC C-02, drop zone `min-height: 160px` (reduced from 200px in BuildChoiceScreen since the panel is inline).

---

### `frontend/src/features/landing/TuneExpansionPanel.tsx` (component, request-response)

**Analog (empty state):** `frontend/src/features/dashboard/Dashboard.tsx` lines 356-368 (empty state pattern)
**Analog (CV picker):** `frontend/src/features/dashboard/Dashboard.tsx` lines 372-490 (version list rendering)

**Imports pattern:**
```typescript
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import type { CVVersionMeta } from '../../types';
import styles from './TuneExpansionPanel.module.css';
```

**Base CV derivation pattern** (from RESEARCH.md / CVContext.tsx):
```typescript
const { savedVersions } = useAppContext();
const baseCVs = savedVersions.filter(v => !v.parentVersionId);
```

**Empty state JSX pattern** (Dashboard.tsx lines 356-368, adapted for inline panel):
```typescript
<div className={styles.emptyState}>
  <div className={styles.emptyIcon}>
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  </div>
  <h2>No CV to tune yet</h2>
  <p>Build or import a CV first, then come back to tailor it for a specific role.</p>
  <button className={styles.ctaButton} onClick={onBuildClick}>
    Build my CV
  </button>
</div>
```

**CV picker list pattern** (Dashboard.tsx lines 235-244, simplified for inline picker):
```typescript
{baseCVs.map(cv => (
  <button
    key={cv.id}
    className={styles.cvItem}
    onClick={() => navigate('/apply', { state: { baseVersionId: cv.id } })}
  >
    <span className={styles.cvName}>{cv.name}</span>
    <span className={styles.cvDate}>{formatDate(cv.createdAt)}</span>
    <div className={styles.cvArrow}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </div>
  </button>
))}
```

**Date formatting utility** (Dashboard.tsx lines 17-21):
```typescript
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
```

**Props interface pattern** -- this component needs a callback to trigger the build panel:
```typescript
interface TuneExpansionPanelProps {
  onBuildClick: () => void;
}

export function TuneExpansionPanel({ onBuildClick }: TuneExpansionPanelProps) {
```

---

### `frontend/src/features/landing/TuneExpansionPanel.module.css` (config)

**Analog:** Combination of `BuildChoiceScreen.module.css` (container pattern) + `LandingScreen.module.css` (card/arrow patterns)

**Container pattern** (same as BuildExpansionPanel):
```css
.container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0;
}
```

**CV item hover pattern** (from UI-SPEC C-04):
```css
.cvItem {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-top: 1px solid var(--border-color);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.cvItem:first-child {
  border-top: none;
}

.cvItem:hover {
  background: var(--bg-tertiary);
}
```

**CV arrow transition pattern** (from LandingScreen.module.css lines 146-154):
```css
.cvArrow {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform 0.18s ease, color 0.18s ease;
}

.cvItem:hover .cvArrow {
  transform: translateX(3px);
  color: var(--accent);
}
```

**CTA button pattern** (accent button, from UI-SPEC C-03):
```css
.ctaButton {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ctaButton:hover {
  background: var(--accent-hover);
}
```

---

### `frontend/src/features/landing/LandingScreen.tsx` (modified)

**Analog:** self (current version at `frontend/src/features/landing/LandingScreen.tsx`)

**New state pattern** (from RESEARCH.md Pattern 2):
```typescript
const [expandedPanel, setExpandedPanel] = useState<'build' | 'tune' | null>(null);
```

**New Build click handler** (replaces line 9-12):
```typescript
const handleBuildClick = () => {
  if (expandedPanel === 'build') {
    setExpandedPanel(null);
    return;
  }
  setFormData(null);
  setExpandedPanel('build');
};
```

**New Tune click handler** (replaces lines 14-22):
```typescript
const handleTuneClick = () => {
  const baseCVs = savedVersions.filter(v => !v.parentVersionId);
  if (baseCVs.length === 1) {
    navigate('/apply', { state: { baseVersionId: baseCVs[0].id } });
    return;
  }
  setExpandedPanel(prev => prev === 'tune' ? null : 'tune');
};
```

**Expansion panel rendering pattern** -- insert after the cards div (line 85), before the savedLink:
```typescript
{expandedPanel === 'build' && <BuildExpansionPanel />}
{expandedPanel === 'tune' && (
  <TuneExpansionPanel onBuildClick={() => setExpandedPanel('build')} />
)}
```

**Card expanded state pattern** (class composition for active card):
```typescript
<button
  className={`${styles.card} ${styles.cardPrimary} ${expandedPanel === 'build' ? styles.cardExpanded : ''}`}
  onClick={handleBuildClick}
  aria-expanded={expandedPanel === 'build'}
>
```

**Sequential panel switch pattern** (from RESEARCH.md Open Question 2):
```typescript
// When switching from one panel to another, collapse first then expand
const switchPanel = (target: 'build' | 'tune') => {
  setExpandedPanel(null); // trigger exit animation
  setTimeout(() => {
    setExpandedPanel(target); // trigger enter animation after exit completes
  }, 200);
};
```

---

### `frontend/src/features/landing/LandingScreen.module.css` (modified)

**Analog:** self (current version)

**New expansion panel animation classes** (from UI-SPEC C-02):
```css
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

**New card expanded state** (from UI-SPEC C-05):
```css
.cardExpanded {
  border-color: var(--accent);
  box-shadow: var(--shadow-md), 0 0 0 1px var(--accent);
}

.cardExpanded:hover {
  transform: none;
}

.cardExpanded .cardArrow {
  transform: rotate(90deg);
  color: var(--accent);
}

.cardExpanded:hover .cardArrow {
  transform: rotate(90deg);
}
```

**Card secondary expanded state:**
```css
.cardSecondaryExpanded {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.cardSecondaryExpanded:hover {
  transform: none;
}

.cardSecondaryExpanded .cardArrow {
  transform: rotate(90deg);
  color: var(--accent);
}

.cardSecondaryExpanded:hover .cardArrow {
  transform: rotate(90deg);
}
```

---

### `frontend/src/App.tsx` (modified)

**Analog:** self (current version at `frontend/src/App.tsx`)

**Change 1: Remove lazy import** (line 8):
```typescript
// DELETE this line:
const BuildChoiceScreen = lazy(() => import('./features/build-choice/BuildChoiceScreen'));
```

**Change 2: Remove route** (line 31):
```typescript
// DELETE this line:
<Route path="/build/start" element={<FeatureErrorBoundary><BuildChoiceScreen /></FeatureErrorBoundary>} />
```

No other patterns need extraction -- this is a two-line deletion.

---

### `frontend/src/components/NavBar.tsx` (modified)

**Analog:** self (current version at `frontend/src/components/NavBar.tsx`)

**Change** (line 73):
```typescript
// Before:
onClick={() => navigate('/build/start')}
// After:
onClick={() => navigate('/')}
```

Single-line change. Also update JSDoc comment at line 7 to replace `/build/start` with `/`.

---

### `frontend/src/features/template-selection/TemplateSelector.tsx` (modified)

**Analog:** self (current version at `frontend/src/features/template-selection/TemplateSelector.tsx`)

**Change** (line 46):
```typescript
// Before:
<button className={styles.backBtn} onClick={() => navigate('/build/start')}>
// After:
<button className={styles.backBtn} onClick={() => navigate('/')}>
```

Single-line change.

---

### `frontend/src/__tests__/import-flow-state.test.tsx` (rewrite)

**Analog:** self (current version at `frontend/src/__tests__/import-flow-state.test.tsx`)

**Test setup pattern** (lines 14-45 -- keep exactly):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

vi.mock('../services/api', () => ({
  api: {
    loadUserData: vi.fn().mockResolvedValue(null),
    listVersions: vi.fn().mockResolvedValue({ versions: [], ungrouped: [] }),
    fetchTemplates: vi.fn().mockResolvedValue([
      { id: 'med-length-proff-cv', name: 'Professional CV', description: 'A clean layout', previewUrl: '/preview1.png' },
      { id: 'deedy-resume', name: 'Deedy Resume', description: 'Two column', previewUrl: '/preview2.png' },
      { id: 'mcdowell-cv', name: 'McDowell CV', description: 'ATS friendly', previewUrl: '/preview3.png' },
    ]),
    loadTemplateContent: vi.fn().mockResolvedValue({ content: '\\documentclass{article}', clsContent: null }),
    importCV: vi.fn(),
    generateLatex: vi.fn().mockResolvedValue({ texContent: '\\documentclass{article}\\begin{document}Test\\end{document}' }),
    compileLatex: vi.fn().mockResolvedValue({ success: true, pdf_base64: 'AAAA', page_count: 1 }),
  },
}));

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}
```

**Test block comment pattern** (lines 1-13):
```typescript
/**
 * Integration tests for navigation flow and state management in App.tsx.
 *
 * Updated for Phase 7 inline expansion architecture:
 * - "Build my CV" click expands inline BuildExpansionPanel (no route navigation)
 * - "Tune for a role" click behavior depends on base CV count
 * - /build/start route removed entirely
 * - TemplateSelector back button navigates to / (landing)
 */
```

**Key test patterns to retain:**
- `renderApp()` helper with MemoryRouter
- `waitFor()` around all assertions that depend on lazy-loaded components
- `fireEvent.click()` for user interactions
- `screen.getByText()` and `screen.queryByText()` for element assertions

**New test patterns needed (not in existing analog):**
- Testing inline expansion: click card, then assert panel content appears WITHOUT URL change
- Testing `aria-expanded` attribute on cards
- Testing Tune card branching: mock `listVersions` to return varying numbers of base CVs
- Testing that `/build/start` returns 404

**Mock override pattern for Tune tests** (adapting existing mock):
```typescript
// To test Tune with saved versions, override listVersions before rendering:
const { api } = await import('../services/api');
vi.mocked(api.listVersions).mockResolvedValue({
  versions: [
    { id: 'v1', name: 'My CV', templateId: 'med-length-proff-cv', createdAt: '2026-01-01', children: [] },
  ],
  ungrouped: [],
});
```

---

## Shared Patterns

### Context Access
**Source:** `frontend/src/contexts/AppContext.tsx` lines 55-64
**Apply to:** BuildExpansionPanel, TuneExpansionPanel, LandingScreen (modified)

```typescript
import { useAppContext } from '../../contexts/AppContext';
// Destructure only what's needed:
const { setFormData, setSelectedTemplateForBuild, cvImport, savedVersions } = useAppContext();
```

### File Upload Hook
**Source:** `frontend/src/features/shared/useFileUpload.ts` (entire file)
**Apply to:** BuildExpansionPanel only

```typescript
import { useFileUpload } from '../shared/useFileUpload';
// Usage:
const onValidFile = useCallback((file: File) => {
  cvImport.handleFileSelected(file);
}, [cvImport]);
const upload = useFileUpload(onValidFile, cvImport.isImporting);
```

### CSS Module Import Convention
**Source:** All components in project
**Apply to:** All new `.tsx` files

```typescript
import styles from './ComponentName.module.css';
```

### Named Export Convention (non-route components)
**Source:** `frontend/src/components/NavBar.tsx` line 16, `frontend/src/features/template-selection/TemplateSelector.tsx` line 15
**Apply to:** BuildExpansionPanel, TuneExpansionPanel

```typescript
// Route-level screens use default export
export default function LandingScreen() { ... }

// Sub-components use named export
export function BuildExpansionPanel() { ... }
export function TuneExpansionPanel({ onBuildClick }: TuneExpansionPanelProps) { ... }
```

### CSS Variable Usage
**Source:** `frontend/src/styles/variables.css` (entire file)
**Apply to:** All new `.module.css` files

Key tokens for this phase:
- Backgrounds: `var(--bg-secondary)`, `var(--bg-tertiary)`, `var(--accent-light)`
- Borders: `var(--border-color)`, `var(--border-strong)`
- Text: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- Accent: `var(--accent)`, `var(--accent-hover)`
- Radii: `var(--radius)` (8px), `var(--radius-sm)` (6px), `var(--radius-lg)` (12px)
- Shadows: `var(--shadow-sm)`, `var(--shadow-md)`
- Error: `var(--error)`, `var(--error-light)`

### SVG Icon Convention
**Source:** `frontend/src/features/landing/LandingScreen.tsx` lines 34-40 (logo SVG), `frontend/src/features/build-choice/BuildChoiceScreen.tsx` lines 87-89 (upload icon)
**Apply to:** All new components with icons

All icons are inline SVGs with explicit `width`, `height`, `viewBox`, `fill="none"`, `stroke="currentColor"`, `strokeWidth`, `strokeLinecap="round"`, `strokeLinejoin="round"`. No icon library is used.

### Transition Convention
**Source:** `frontend/src/features/landing/LandingScreen.module.css` line 87
**Apply to:** All new interactive elements

```css
transition: all 0.18s ease;
```

### `@keyframes fadeInUp` Animation
**Source:** `frontend/src/features/landing/LandingScreen.module.css` lines 178-187
**Apply to:** NOT used in expansion panels (panels use max-height/opacity transitions per UI-SPEC C-02)

### Test File Location Convention
**Source:** `frontend/src/__tests__/import-flow-state.test.tsx`
**Apply to:** The rewritten test file stays in the same location

All frontend integration tests live in `frontend/src/__tests__/`. File naming: `camelCase.test.tsx`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All files have close analogs in the existing codebase |

Every new file in this phase is either a direct extraction from BuildChoiceScreen (BuildExpansionPanel) or a simplified adaptation of Dashboard patterns (TuneExpansionPanel). The CSS animation pattern (`max-height` transition for expand/collapse) is new to the codebase but is standard CSS, fully specified in UI-SPEC C-02 and RESEARCH.md, and does not require an existing analog.

## Metadata

**Analog search scope:** `frontend/src/` (features, components, contexts, hooks, styles, __tests__)
**Files scanned:** 15 source files read directly
**Pattern extraction date:** 2026-04-15
