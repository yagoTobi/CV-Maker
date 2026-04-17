# Phase 8: Streamlined Tune Flow - Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/features/direct-edit/components/TunePanel.tsx` | component | request-response | `frontend/src/features/apply-to-job/ApplyToJobScreen.tsx` | exact |
| `frontend/src/features/direct-edit/components/TunePanel.module.css` | config | -- | `frontend/src/features/apply-to-job/ApplyToJobScreen.module.css` + `frontend/src/features/direct-edit/components/ChangePanel.module.css` | exact |
| `frontend/src/features/direct-edit/DirectEditPage.tsx` | component | request-response | self (current version) | exact |
| `frontend/src/features/direct-edit/DirectEditPage.module.css` | config | -- | self (current version) | exact |
| `frontend/src/contexts/EditorActionsContext.tsx` | provider | event-driven | self (current version) | exact |
| `frontend/src/components/NavBar.tsx` | component | event-driven | self (current version) | exact |
| `frontend/src/components/NavBar.module.css` | config | -- | self (current version) | exact |
| `frontend/src/features/dashboard/Dashboard.tsx` | component | CRUD | self (current version) | exact |
| `frontend/src/features/dashboard/Dashboard.module.css` | config | -- | self (current version) | exact |
| `frontend/src/features/landing/LandingScreen.tsx` | component | event-driven | self (current version) | exact |
| `frontend/src/features/landing/TuneExpansionPanel.tsx` | component | event-driven | self (current version) | exact |
| `frontend/src/App.tsx` | config | -- | self (current version) | exact |

## Pattern Assignments

### `frontend/src/features/direct-edit/components/TunePanel.tsx` (NEW -- component, request-response)

**Analog:** `frontend/src/features/apply-to-job/ApplyToJobScreen.tsx`

This is the primary new file. It replaces the standalone ApplyToJobScreen 3-step flow with an inline right panel on the editor page. Almost all logic and state from ApplyToJobScreen migrates here, reorganized as 3 collapsible tiers.

**Imports pattern** (ApplyToJobScreen.tsx lines 1-21):
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useTailor } from '../../hooks/useTailor';
import { useScrollSync } from '../direct-edit/hooks/useScrollSync';
import { MedLengthTemplate } from '../direct-edit/components/MedLengthTemplate';
import { ChangePanel } from '../direct-edit/components/ChangePanel';
import type { CVVersion, CVFormData, MatchAnalysis, CVVersionMeta, SkillItem } from '../../types';
import { scoreColorClass, noop, EMPTY_SET } from '../../utils/cvDisplayUtils';
import styles from './ApplyToJobScreen.module.css';
```

Note: TunePanel lives inside `features/direct-edit/components/`, so relative import paths will differ. It imports from `../../../services/api`, `../../../hooks/useTailor`, etc. Adjust accordingly.

**Props interface pattern** -- derive from ApplyToJobScreen's internal state + what DirectEditPage can provide:
```typescript
// TunePanel receives these from DirectEditPage parent
interface TunePanelProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CVFormData;
  activeVersion: CVVersion | null;
  onFormDataUpdate: (fd: CVFormData) => void;
}
```

**Tier state management pattern** (ApplyToJobScreen.tsx lines 23-57):
```typescript
type Step = 1 | 2 | 3 | 'success';

// Step state
const [step, setStep] = useState<Step>(1);

// Step 1
const [companyName, setCompanyName] = useState('');
const [roleName, setRoleName] = useState('');
const [jobDescription, setJobDescription] = useState('');

// Step 2
const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
const [baselineScore, setBaselineScore] = useState(0);
const [analyzing, setAnalyzing] = useState(false);

// Local state for the read-only CV preview
const [previewFormData, setPreviewFormData] = useState<CVFormData | null>(null);
```

For TunePanel, replace `Step` with a tier concept. Tier 1 is skipped when `activeVersion !== null` (D-01). Map `step` to `activeTier: 1 | 2 | 3` plus `tier1Complete`, `tier2Complete` booleans for collapse tracking.

**useTailor hook wiring pattern** (ApplyToJobScreen.tsx lines 63-71):
```typescript
const tailor = useTailor({
  originalFormData: baseVersion?.formData ?? null,
  templateId: baseVersion?.templateId ?? null,
  onApply: async (newFormData: CVFormData) => {
    setPreviewFormData(newFormData);
  },
});
```

In TunePanel, `originalFormData` comes from the `formData` prop (from DirectEditPage/useDirectEditor) and `templateId` from `formData.templateId`. The `onApply` callback updates `previewFormData` state (then passed back up to DirectEditPage to swap the CV display).

**Analyze handler pattern** (ApplyToJobScreen.tsx lines 102-123):
```typescript
const handleAnalyze = useCallback(async () => {
  if (!baseVersion?.formData || !jobDescription.trim()) return;
  setAnalyzing(true);

  const { texContent } = await api.generateLatex(baseVersion.formData);
  if (!texContent) { setAnalyzing(false); return; }

  const analysis = await api.getMatchAnalysis(texContent, jobDescription, companyName);
  if (analysis) {
    setMatchAnalysis(analysis);
    setBaselineScore(analysis.match_score);
    setStep(2);
  }
  setAnalyzing(false);

  // Pre-fetch tailor suggestions via hook
  tailor.fetchSuggestions(baseVersion.formData, jobDescription, companyName, roleName);
}, [baseVersion, jobDescription, companyName, roleName, tailor]);
```

**Save tailored CV handler pattern** (ApplyToJobScreen.tsx lines 131-163):
```typescript
const handleSaveTailoredCV = useCallback(async () => {
  if (!baseVersion?.formData || !previewFormData) return;
  setSaving(true);

  const { texContent } = await api.generateLatex(previewFormData);
  if (!texContent) { setSaving(false); return; }

  const finalAnalysis = await api.getMatchAnalysis(texContent, jobDescription, companyName);
  const score = finalAnalysis?.match_score ?? tailor.estimatedCurrentScore;
  setFinalScore(score);

  const versionName = [companyName, roleName].filter(Boolean).join(' ') || 'Job Application';
  const saved = await api.saveVersion({
    name: versionName,
    templateId: baseVersion.templateId,
    texContent,
    formData: previewFormData,
    jobDescription,
    companyName,
    role: roleName,
    matchScore: score,
    baselineMatchScore: baselineScore,
    parentVersionId: baseVersion.id,
  });

  if (saved) {
    setSavedVersion(saved);
    setStep('success');
  }
  setSaving(false);
}, [baseVersion, previewFormData, jobDescription, companyName, roleName, baselineScore, tailor.estimatedCurrentScore]);
```

For TunePanel, after save success, navigate to Dashboard with scoped filter:
```typescript
navigate('/dashboard', { state: { baseId: parentVersionId } });
```

**Collapsed steps header pattern** (ApplyToJobScreen.tsx lines 239-258):
```typescript
<div className={styles.collapsedSteps}>
  <div className={styles.collapsedStep} onClick={() => setStep(1)}>
    <span className={`${styles.stepNumber} ${styles.completed}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </span>
    <span className={styles.stepTitle}>Job Details</span>
    <span className={styles.stepSummary}>{companyName}{roleName ? ` - ${roleName}` : ''}</span>
  </div>
  <div className={styles.collapsedStep} onClick={() => setStep(2)}>
    <span className={`${styles.stepNumber} ${styles.completed}`}>
      <svg ... />
    </span>
    <span className={styles.stepTitle}>Match Analysis</span>
    <span className={styles.stepSummary}>Baseline: {Math.round(baselineScore)}%</span>
  </div>
</div>
```

This is the exact UI pattern for tier collapse/expand in TunePanel. Each tier, when complete, shows a clickable summary row with check icon + title + summary text. Clicking re-expands.

**Step body with form fields pattern** (ApplyToJobScreen.tsx lines 341-381):
```typescript
{step === 1 && (
  <div className={styles.stepBody}>
    <div className={styles.formRow}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Company Name</label>
        <input className={styles.input} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Google" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Role</label>
        <input className={styles.input} value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Senior SWE" />
      </div>
    </div>
    <div className={styles.formGroup}>
      <label className={styles.label}>Job Description *</label>
      <textarea className={styles.textarea} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the full job description here..." />
    </div>
    <button className={styles.primaryBtn} onClick={handleAnalyze} disabled={!jobDescription.trim() || analyzing}>
      {analyzing ? (<><span className={styles.spinner} /> Analyzing...</>) : 'Analyze Match'}
    </button>
  </div>
)}
```

Reuse this exact form structure for Tier 2 (job form) in TunePanel.

**ChangePanel integration in Step 3** (ApplyToJobScreen.tsx lines 279-299):
```typescript
<ChangePanel
  changes={tailor.tailorResponse?.changes ?? []}
  appliedChanges={tailor.appliedChanges}
  skippedChanges={tailor.skippedChanges}
  selectedAlternatives={tailor.selectedAlternatives}
  isApplying={tailor.isApplying}
  isLoading={false}
  error={tailor.error}
  onAccept={tailor.acceptChange}
  onSkip={tailor.skipChange}
  onUndo={tailor.undoChange}
  onAcceptAll={tailor.acceptAllRemaining}
  onSelectAlternative={tailor.selectAlternative}
  onEditValue={tailor.editChangeValue}
  onClose={() => setStep(2)}
  matchAnalysis={matchAnalysis}
  baselineScore={baselineScore}
  estimatedScore={tailor.estimatedCurrentScore}
  panelRef={changePanelRef}
  isOpen={true}
/>
```

Reuse this exact prop wiring for Tier 3 in TunePanel. Key difference: ChangePanel will be embedded inline within TunePanel (not as a fixed-position side panel). Override ChangePanel's `.panel` CSS to remove `position: fixed` via a wrapper className or parent CSS override.

**Read-only CV preview in Step 3 pattern** (ApplyToJobScreen.tsx lines 262-276):
```typescript
<MedLengthTemplate
  formData={previewFormData}
  readOnly={true}
  onFieldChange={noopFieldChange}
  onBulletAdd={noop as (basePath: string, afterIndex: number) => void}
  onBulletRemove={noop as (basePath: string, index: number) => void}
  onAddEntry={noop as (sectionKey: string) => void}
  onRemoveEntry={noop as (sectionKey: string, index: number) => void}
  onToggleSection={noop as (sectionKey: string) => void}
  hiddenSections={EMPTY_SET}
  onReorderSections={noop as (from: number, to: number) => void}
  onReorderEntries={noop as (sectionKey: string, from: number, to: number) => void}
/>
```

TunePanel communicates `previewFormData` and `readOnly=true` back to DirectEditPage via callback props so DirectEditPage can swap the MedLengthTemplate rendering mode.

---

### `frontend/src/features/direct-edit/components/TunePanel.module.css` (NEW -- config)

**Analog:** `frontend/src/features/apply-to-job/ApplyToJobScreen.module.css` + `frontend/src/features/direct-edit/components/ChangePanel.module.css`

**Panel slide-in pattern** (ChangePanel.module.css lines 1-21):
```css
.panel {
  width: 360px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 16px;
  position: fixed;
  right: 0;
  top: 48px;
  z-index: 40;
  transform: translateX(0);
  transition: transform 200ms ease-out;
}

.panel.closed {
  transform: translateX(100%);
  transition: transform 200ms ease-in;
}
```

TunePanel should use the same fixed-right-side-panel approach. Width should be 400px (slightly wider than ChangePanel's 360px to accommodate form inputs). The `top: 48px` aligns with NavBar height.

**Step card + form styling** (ApplyToJobScreen.module.css lines 72-211):
```css
.step {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  margin-bottom: 1rem;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.stepHeader {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.stepNumber { /* ... step number circle */ }
.stepNumber.active { border-color: var(--accent); color: var(--accent); }
.stepNumber.completed { border-color: var(--success); background: var(--success); color: white; }

.stepBody { padding: 0 1.25rem 1.25rem; }
.formGroup { margin-bottom: 1rem; }
.formRow { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.label { font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); }
.input { /* standard input styling with var(--border-color) */ }
.textarea { composes: input; min-height: 140px; resize: vertical; }
.primaryBtn { /* accent background, white text, full-width */ }
```

Port these into TunePanel.module.css, adapting for the panel context (no background grid, tier cards instead of standalone step cards).

**Tier expand/collapse animation** (LandingScreen.module.css lines 178-207):
```css
.expansionPanel {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.expansionPanelOpen {
  grid-template-rows: 1fr;
  opacity: 1;
}

.expansionPanelInner {
  overflow: hidden;
}
```

This CSS-only expand/collapse pattern (using `grid-template-rows: 0fr` to `1fr`) is the recommended approach for tier body transitions in TunePanel.

**Close button pattern** (ChangePanel.module.css lines 23-44):
```css
.toggleBtn {
  position: absolute;
  left: -16px;
  top: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 41;
}
```

Use the same circular close button pattern for TunePanel's X button (D-12).

---

### `frontend/src/features/direct-edit/DirectEditPage.tsx` (MODIFY -- component, request-response)

**Analog:** self (current version at lines 51-200)

**Current handleTuneForJob** (line 158-160):
```typescript
const handleTuneForJob = useCallback(() => {
  navigate('/apply', { state: { baseVersionId: activeVersion?.id } });
}, [navigate, activeVersion?.id]);
```

Replace with:
```typescript
const handleTuneForJob = useCallback(() => {
  setTunePanelOpen(true);
}, []);
```

**Current editor actions registration** (lines 163-171):
```typescript
useEffect(() => {
  setEditorActions({
    onDownload: handleDownload,
    onTuneForJob: handleTuneForJob,
    saveStatus,
    isDownloading,
  });
  return () => setEditorActions(null);
}, [setEditorActions, handleDownload, handleTuneForJob, saveStatus, isDownloading]);
```

Extend with `isTuning`:
```typescript
useEffect(() => {
  setEditorActions({
    onDownload: handleDownload,
    onTuneForJob: handleTuneForJob,
    saveStatus,
    isDownloading,
    isTuning: tunePanelOpen,
  });
  return () => setEditorActions(null);
}, [setEditorActions, handleDownload, handleTuneForJob, saveStatus, isDownloading, tunePanelOpen]);
```

**New state needed in DirectEditPage:**
```typescript
const [tunePanelOpen, setTunePanelOpen] = useState(false);
const [previewFormData, setPreviewFormData] = useState<CVFormData | null>(null);
```

**Location state reading pattern** -- read `tune` flag from navigation state (same pattern as ApplyToJobScreen lines 31-32):
```typescript
const location = useLocation();
const locationState = location.state as { tune?: boolean; baseVersionId?: string } | null;

useEffect(() => {
  if (locationState?.tune) {
    setTunePanelOpen(true);
  }
}, [locationState]);
```

**Content area layout modification** -- current render (lines 177-199):
```typescript
return (
  <div className={styles.page}>
    <div className={styles.contentArea}>
      <div ref={cvContainerRef} className={styles.cvContainer}>
        <MedLengthTemplate ... />
        {pageBreakY !== null && <PageBreakIndicator offsetY={pageBreakY} />}
      </div>
    </div>
  </div>
);
```

Add TunePanel alongside CV:
```typescript
return (
  <div className={styles.page}>
    <div className={`${styles.contentArea}${tunePanelOpen ? ` ${styles.contentAreaWithPanel}` : ''}`}>
      <div ref={cvContainerRef} className={styles.cvContainer}>
        <MedLengthTemplate
          formData={isTier3Active ? previewFormData! : formData}
          readOnly={isTier3Active}
          ...
        />
      </div>
    </div>
    {tunePanelOpen && (
      <TunePanel
        isOpen={tunePanelOpen}
        onClose={() => setTunePanelOpen(false)}
        formData={formData}
        activeVersion={activeVersion}
        onFormDataUpdate={setPreviewFormData}
      />
    )}
  </div>
);
```

---

### `frontend/src/features/direct-edit/DirectEditPage.module.css` (MODIFY -- config)

**Analog:** self (current version)

**Current contentArea** (line 18-21):
```css
.contentArea {
  display: flex;
  /* CV takes full width; ChangePanel slot added alongside in future plan */
}
```

Add panel-aware class:
```css
.contentAreaWithPanel {
  padding-right: 400px; /* Width of TunePanel */
  transition: padding-right 200ms ease-out;
}
```

This mirrors the `twoPanelContent` padding-right approach from ApplyToJobScreen.module.css (line 380-381):
```css
.twoPanelContent {
  display: flex;
  gap: 32px;
  position: relative;
  min-height: calc(100vh - 200px);
  padding-right: 392px;
}
```

---

### `frontend/src/contexts/EditorActionsContext.tsx` (MODIFY -- provider, event-driven)

**Analog:** self (current version at lines 1-45)

**Current interface** (lines 13-18):
```typescript
interface EditorActions {
  onDownload: () => void;
  onTuneForJob: () => void;
  saveStatus: SaveStatus;
  isDownloading: boolean;
}
```

Add `isTuning`:
```typescript
interface EditorActions {
  onDownload: () => void;
  onTuneForJob: () => void;
  saveStatus: SaveStatus;
  isDownloading: boolean;
  isTuning: boolean;  // NEW: Phase 8
}
```

No other changes needed. The provider, `useEditorActions()`, and `useSetEditorActions()` all stay the same.

---

### `frontend/src/components/NavBar.tsx` (MODIFY -- component, event-driven)

**Analog:** self (current version at lines 1-83)

**Current editor-page right group** (lines 43-69):
```typescript
{isEditorPage ? (
  <>
    <button className={styles.accentBtn} onClick={editorActions.onDownload} disabled={editorActions.isDownloading} type="button">
      {editorActions.isDownloading ? (<><span className={styles.spinnerWhite} /> Generating...</>) : 'Download PDF'}
    </button>
    <button className={styles.ghostBtn} onClick={editorActions.onTuneForJob} type="button">
      Tune for Job
    </button>
    <SaveIndicator status={editorActions.saveStatus} inline />
  </>
) : (
  <button className={styles.ghostBtn} onClick={() => navigate('/')} type="button">
    + New CV
  </button>
)}
```

Modifications:
1. Add `isTuning` active state to the "Tune for Job" button
2. Remove the `+ New CV` button from non-editor pages (D-13)

```typescript
const isTuning = editorActions?.isTuning ?? false;

// For "Tune for Job" button:
<button
  className={`${styles.ghostBtn}${isTuning ? ` ${styles.ghostBtnActive}` : ''}`}
  onClick={editorActions.onTuneForJob}
  type="button"
>
  Tune for Job
</button>

// Non-editor: remove the + New CV button entirely
{isEditorPage ? (
  <> ... </>
) : null}
```

---

### `frontend/src/components/NavBar.module.css` (MODIFY -- config)

**Analog:** self (current version)

**Current ghostBtn** (lines 71-96):
```css
.ghostBtn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 6px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1.5;
}
```

Add active state for tuning indicator:
```css
.ghostBtnActive {
  background: var(--accent-light);
  color: var(--accent);
  border-color: var(--accent);
}
```

This follows the pattern of `.navLinkActive` (lines 66-69) which uses `color: var(--accent)` and `font-weight: 600`.

---

### `frontend/src/features/dashboard/Dashboard.tsx` (MODIFY -- component, CRUD)

**Analog:** self (current version at lines 1-504)

**Current handleApplyToJob** (lines 87-90):
```typescript
const handleApplyToJob = useCallback((baseId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  navigate('/apply', { state: { baseVersionId: baseId } });
}, [navigate]);
```

Change to load version and navigate to editor with tune state:
```typescript
const handleApplyToJob = useCallback(async (baseId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  const version = await api.getVersion(baseId);
  if (version) {
    handleVersionLoad(version);
    setSelectedTemplateForBuild(version.templateId);
    navigate('/build/form', { state: { tune: true } });
  }
}, [handleVersionLoad, setSelectedTemplateForBuild, navigate]);
```

**New: location.state filter pattern** -- read `baseId` from navigation state for scoped view (D-11):
```typescript
const location = useLocation();
const filterBaseId = (location.state as { baseId?: string } | null)?.baseId;

const displayedBases = filterBaseId
  ? baseCvs.filter(b => b.id === filterBaseId)
  : baseCvs;
```

**New: breadcrumb when filtered** -- pattern follows existing header structure (lines 321-335):
```typescript
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

**Breadcrumb styling** -- follows `.backBtn` pattern (Dashboard.module.css lines 29-48):
```css
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.8125rem;
}

.breadcrumb button {
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  padding: 0;
}

.breadcrumb button:hover {
  text-decoration: underline;
}

.breadcrumbSep {
  color: var(--text-muted);
}

.breadcrumbCurrent {
  color: var(--text-primary);
  font-weight: 500;
}
```

---

### `frontend/src/features/landing/LandingScreen.tsx` (MODIFY -- component, event-driven)

**Analog:** self (current version at lines 1-167)

**Current handleTuneClick with single-CV shortcut** (lines 38-55):
```typescript
const handleTuneClick = useCallback(() => {
  if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
  const baseCVs = savedVersions.filter(v => !v.parentVersionId);
  if (baseCVs.length === 1) {
    navigate('/apply', { state: { baseVersionId: baseCVs[0].id } });
    return;
  }
  // ... expansion panel logic
}, [expandedPanel, savedVersions, navigate]);
```

Change the single-CV shortcut to load version and navigate to editor:
```typescript
if (baseCVs.length === 1) {
  const version = await api.getVersion(baseCVs[0].id);
  if (version) {
    handleVersionLoad(version);
    setSelectedTemplateForBuild(version.templateId);
    navigate('/build/form', { state: { tune: true } });
  }
  return;
}
```

Note: `handleTuneClick` must become `async` and `api`, `handleVersionLoad`, `setSelectedTemplateForBuild` added to deps.

---

### `frontend/src/features/landing/TuneExpansionPanel.tsx` (MODIFY -- component, event-driven)

**Analog:** self (current version at lines 1-56)

**Current navigation on CV item click** (line 42):
```typescript
onClick={() => navigate('/apply', { state: { baseVersionId: cv.id } })}
```

Change to load version and navigate to editor with tune state. Follow the same pattern as Dashboard's `handleOpen` (Dashboard.tsx lines 76-85):
```typescript
onClick={async () => {
  const version = await api.getVersion(cv.id);
  if (version) {
    handleVersionLoad(version);
    setSelectedTemplateForBuild(version.templateId);
    navigate('/build/form', { state: { tune: true } });
  }
}}
```

Requires adding `handleVersionLoad`, `setSelectedTemplateForBuild` from `useAppContext()` and `api` import.

---

### `frontend/src/App.tsx` (MODIFY -- config)

**Analog:** self (current version at lines 1-41)

**Current /apply route** (line 32):
```typescript
<Route path="/apply" element={<FeatureErrorBoundary><ApplyToJobScreen /></FeatureErrorBoundary>} />
```

Replace with redirect to editor with tune state. Use React Router's `Navigate` component:
```typescript
import { Navigate } from 'react-router-dom';

// Replace /apply route:
<Route path="/apply" element={<Navigate to="/build/form" state={{ tune: true }} replace />} />
```

Remove the lazy import for ApplyToJobScreen:
```typescript
// DELETE:
const ApplyToJobScreen = lazy(() => import('./features/apply-to-job/ApplyToJobScreen'));
```

---

## Shared Patterns

### useTailor Hook Wiring
**Source:** `frontend/src/hooks/useTailor.ts` (full file, 239 lines)
**Apply to:** TunePanel (Tier 3)

The hook is used as-is without modification. Key interface:
```typescript
const tailor = useTailor({
  originalFormData: formData,       // CVFormData from context
  templateId: formData.templateId,  // Template ID string
  onApply: async (newFormData: CVFormData, _newTexContent: string) => {
    setPreviewFormData(newFormData);
  },
});

// Call fetchSuggestions from Tier 2 analyze handler:
tailor.fetchSuggestions(formData, jobDescription, companyName, roleName);

// Wire to ChangePanel in Tier 3:
<ChangePanel
  changes={tailor.tailorResponse?.changes ?? []}
  appliedChanges={tailor.appliedChanges}
  ...all other props from tailor...
/>
```

### useScrollSync Hook Wiring
**Source:** `frontend/src/features/direct-edit/hooks/useScrollSync.ts` (full file, 70 lines)
**Apply to:** TunePanel (Tier 3, scroll sync between CV preview and embedded ChangePanel)

```typescript
const cvPreviewRef = useRef<HTMLDivElement>(null);
const changePanelRef = useRef<HTMLDivElement>(null);

useScrollSync(cvPreviewRef, changePanelRef, isTier3Active);
```

Refs must be passed down: `cvPreviewRef` to the CV container in DirectEditPage, `changePanelRef` to ChangePanel's `panelRef` prop.

### CSS Variables and Design Tokens
**Source:** `frontend/src/styles/variables.css`
**Apply to:** All new CSS files (TunePanel.module.css)

All colors, spacing, shadows, and border radii must use CSS variables:
- `var(--bg-secondary)`, `var(--border-color)`, `var(--accent)`, `var(--accent-light)`
- `var(--radius-sm)`, `var(--radius-lg)`, `var(--shadow-sm)`
- `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- `var(--success)`, `var(--success-light)`, `var(--error)`, `var(--error-light)`

### Navigation State Pattern
**Source:** `frontend/src/features/apply-to-job/ApplyToJobScreen.tsx` lines 27-32
**Apply to:** DirectEditPage (reading `tune` state), Dashboard (reading `baseId` state), LandingScreen (passing `tune` state), TuneExpansionPanel (passing `tune` state)

```typescript
// Defining the state shape:
interface LocationState {
  tune?: boolean;
  baseVersionId?: string;
  baseId?: string;
}

// Reading:
const location = useLocation();
const locationState = location.state as LocationState | null;

// Writing:
navigate('/build/form', { state: { tune: true } });
navigate('/dashboard', { state: { baseId: parentVersionId } });

// Clearing (important for "All CVs" breadcrumb):
navigate('/dashboard', { state: null, replace: true });
```

### Noop Handler Pattern for Read-Only MedLengthTemplate
**Source:** `frontend/src/features/apply-to-job/ApplyToJobScreen.tsx` lines 215, 264-276
**Apply to:** DirectEditPage when Tier 3 is active

```typescript
import { noop, EMPTY_SET } from '../../utils/cvDisplayUtils';

const noopFieldChange = noop as (path: string, value: string | SkillItem[]) => void;

<MedLengthTemplate
  formData={previewFormData}
  readOnly={true}
  onFieldChange={noopFieldChange}
  onBulletAdd={noop as (basePath: string, afterIndex: number) => void}
  onBulletRemove={noop as (basePath: string, index: number) => void}
  onAddEntry={noop as (sectionKey: string) => void}
  onRemoveEntry={noop as (sectionKey: string, index: number) => void}
  onToggleSection={noop as (sectionKey: string) => void}
  hiddenSections={EMPTY_SET}
  onReorderSections={noop as (from: number, to: number) => void}
  onReorderEntries={noop as (sectionKey: string, from: number, to: number) => void}
/>
```

### Spinner Pattern
**Source:** `frontend/src/features/apply-to-job/ApplyToJobScreen.module.css` lines 527-555
**Apply to:** TunePanel.module.css

```css
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Version Loading Pattern (from Dashboard)
**Source:** `frontend/src/features/dashboard/Dashboard.tsx` lines 76-85
**Apply to:** TuneExpansionPanel, LandingScreen (when loading a version before navigating to editor)

```typescript
const handleOpen = useCallback(async (id: string) => {
  setLoadingId(id);
  const version = await api.getVersion(id);
  setLoadingId(null);
  if (version) {
    handleVersionLoad(version);
    setSelectedTemplateForBuild(version.templateId);
    navigate('/build/form');
  }
}, [handleVersionLoad, setSelectedTemplateForBuild, navigate]);
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| -- | -- | -- | All files have exact or self-analogs. No files lack patterns. |

Phase 8 is a reorganization of existing patterns into a new container (TunePanel), plus navigation rewiring. Every component and pattern has a direct existing analog in the codebase.

## Metadata

**Analog search scope:** `frontend/src/` -- features/, components/, contexts/, hooks/, styles/
**Files scanned:** 16 source files read, 4 CSS files read
**Pattern extraction date:** 2026-04-17
