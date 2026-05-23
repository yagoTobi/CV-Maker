/**
 * DirectEditPage -- Top-level page for the web CV editor.
 *
 * Assembles MedLengthTemplate + useDirectEditor + useAutoSave into a full-bleed,
 * white-background page. EB Garamond font is loaded here (not globally) so it
 * only applies to the CV editing surface.
 *
 * If formData is not in context (e.g., direct URL navigation), tries to load
 * the most recent saved version. Falls back to an empty template with placeholders.
 *
 * Editor actions (Download PDF, save status) are lifted into
 * EditorActionsContext so the NavBar can render them.
 *
 * Phase 13 Plan 04 integration: owns useTailor + useChangeHighlights, mounts
 * TuneRail (replaces TunePanel JSX; the import is preserved per W-01 ownership
 * boundary — Plan 05 deletes TunePanel.tsx). Wires ChangePopover + ScoreCard +
 * PostSavePrompt + delegated click handler + auto-advance scroll.
 *
 * Covers: EDIT-01 through EDIT-06, UX-01, D-05, D-06, D-07, D-13, D-20, D-25.
 */
import '@fontsource-variable/eb-garamond';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDirectEditor } from './hooks/useDirectEditor';
import { useAutoSave } from './hooks/useAutoSave';
import { usePageBreak } from './hooks/usePageBreak';
import { useTailor } from '../../hooks/useTailor';
import { useChangeHighlights } from './hooks/useChangeHighlights';
import { MedLengthTemplate } from './components/MedLengthTemplate';
import { useSetEditorActions } from '../../contexts/EditorActionsContext';
import { PageBreakIndicator } from './components/PageBreakIndicator';
// W-01 ownership boundary: keep TunePanel imported so Plan 05 owns deletion.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TunePanel } from './components/TunePanel';
import { TuneRail } from './components/TuneRail';
import { ChangePopover } from './components/ChangePopover';
import { ScoreCard } from './components/ScoreCard';
import { PostSavePrompt } from './components/PostSavePrompt';
import type { HighlightSpan } from './components/EditableField';
import { useCVContext } from '../../contexts/CVContext';
import { api } from '../../services/api';
import { generateId } from '../../utils/idHelpers';
import { generateCVFilename } from '../../utils/cvFilename';
import { downloadPdf } from '../../utils/downloadPdf';
import { noop, EMPTY_SET } from '../../utils/cvDisplayUtils';
import type { CVFormData, SkillItem, CVVersion, CVVersionMeta, MatchAnalysis, TailorChange } from '../../types';
import { NamePromptDialog } from './components/NamePromptDialog';
import styles from './DirectEditPage.module.css';

// Reference TunePanel so the import survives the W-01 audit even when
// `noUnusedLocals` is on. The actual rail mounted at runtime is TuneRail.
void TunePanel;

const DEFAULT_TEMPLATE = 'med-length-proff-cv';

function createEmptyFormData(): CVFormData {
  return {
    templateId: DEFAULT_TEMPLATE,
    sectionOrder: ['work', 'education', 'skills', 'projects', 'awards'],
    personalInfo: {
      fullName: '', email: '', phone: '', location: '', links: [],
      summary: '', personalOrder: ['phone', 'email', 'location', 'links'],
    },
    workExperience: [{ id: generateId(), company: '', title: '', startDate: '', endDate: '', location: '', bullets: [{ id: generateId(), text: '' }] }],
    education: [{ id: generateId(), school: '', degree: '', startDate: '', endDate: '', location: '', gpa: '', details: [] }],
    skills: [{ id: generateId(), category: '', skills: [] }],
    projects: [],
    awards: [],
    additionalSections: [],
  };
}

export default function DirectEditPage() {
  const { activeVersion, setFormData, savedVersions, selectedTemplateForBuild,
          setActiveVersion, setSavedVersions } = useCVContext();
  const { formData, updateField, addBullet, removeBullet, addEntry, removeEntry, toggleSection, hiddenSections, reorderSections, reorderEntries, removeSection, addLink, removeLink } = useDirectEditor();
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [tuneCompanyName, setTuneCompanyName] = useState(activeVersion?.companyName ?? '');
  const [tuneRole, setTuneRole] = useState(activeVersion?.role ?? '');
  const [jdText, setJdText] = useState('');
  const namePromiseRef = useRef<((name: string) => void) | null>(null);

  const onNeedName = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      namePromiseRef.current = resolve;
      setIsNamePromptOpen(true);
    });
  }, []);

  const handleNameSubmit = useCallback((name: string) => {
    setIsNamePromptOpen(false);
    namePromiseRef.current?.(name || 'My CV');
    namePromiseRef.current = null;
  }, []);

  const handleNameDismiss = useCallback(() => {
    setIsNamePromptOpen(false);
    namePromiseRef.current?.('Untitled CV');
    namePromiseRef.current = null;
  }, []);

  const handleFirstSave = useCallback((version: CVVersion) => {
    setActiveVersion(version);
    const meta: CVVersionMeta = {
      id: version.id,
      name: version.name,
      templateId: version.templateId,
      jobDescription: version.jobDescription,
      companyName: version.companyName,
      role: version.role,
      matchScore: version.matchScore,
      baselineMatchScore: version.baselineMatchScore,
      parentVersionId: version.parentVersionId,
      createdAt: version.createdAt,
    };
    setSavedVersions([meta, ...savedVersions]);
  }, [setActiveVersion, setSavedVersions, savedVersions]);

  const saveStatus = useAutoSave(formData, activeVersion?.id ?? null, {
    onNeedName,
    onFirstSave: handleFirstSave,
  });
  const [isBootstrapping, setIsBootstrapping] = useState(!formData);
  const [isDownloading, setIsDownloading] = useState(false);
  const [tunePanelOpen, setTunePanelOpen] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [baselineScore, setBaselineScoreState] = useState<number | null>(null);
  const [isPostSaveOpen, setIsPostSaveOpen] = useState(false);
  const [savedTailoredName, setSavedTailoredName] = useState('');
  const setEditorActions = useSetEditorActions();
  const navigate = useNavigate();
  const location = useLocation();
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const pageBreakY = usePageBreak(cvContainerRef);

  // Page-level useTailor instance. TuneRail + ChangePopover + ScoreCard all
  // consume the SAME hook so accept/skip is a single source of truth.
  const tailor = useTailor({
    originalFormData: formData ?? null,
    templateId: formData?.templateId ?? null,
    onApply: useCallback(async (newFormData: CVFormData) => {
      // Apply previewed change set to the live editor (Plan 02 D-15).
      setFormData(newFormData);
    }, [setFormData]),
  });

  const tailorResponse = tailor.tailorResponse;
  const tailorChanges: TailorChange[] = useMemo(
    () => tailorResponse?.changes ?? [],
    [tailorResponse],
  );

  const highlights = useChangeHighlights({
    changes: tailorChanges,
    applied: tailor.appliedChanges,
    skipped: tailor.skippedChanges,
    containerRef: cvContainerRef,
  });

  // Bootstrap formData if context is empty (direct URL navigation / page refresh)
  useEffect(() => {
    if (formData) {
      // If formData exists but has a sentinel templateId (e.g. from CV import),
      // patch it with the selected template before entering the editor
      const VALID_TEMPLATES = ['med-length-proff-cv', 'deedy-resume', 'mcdowell-cv'];
      if (!VALID_TEMPLATES.includes(formData.templateId) && selectedTemplateForBuild) {
        setFormData({ ...formData, templateId: selectedTemplateForBuild });
      }
      setIsBootstrapping(false);
      return;
    }

    // User came from template selector — start fresh with chosen template
    if (selectedTemplateForBuild) {
      const empty = createEmptyFormData();
      empty.templateId = selectedTemplateForBuild;
      setFormData(empty);
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      // Try loading the most recent saved version
      if (savedVersions.length > 0) {
        const mostRecent = savedVersions[0];
        const full = await api.getVersion(mostRecent.id);
        if (!cancelled && full?.formData) {
          const loadedData = full.formData;
          // Sanitize sentinel/invalid templateIds that would cause backend 400
          if (!loadedData.templateId || !['med-length-proff-cv', 'deedy-resume', 'mcdowell-cv'].includes(loadedData.templateId)) {
            loadedData.templateId = DEFAULT_TEMPLATE;
          }
          setFormData(loadedData);
          setIsBootstrapping(false);
          return;
        }
      }

      // Fall back to empty template with placeholders
      if (!cancelled) {
        setFormData(createEmptyFormData());
        setIsBootstrapping(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [formData, savedVersions, setFormData, selectedTemplateForBuild]);

  // Open tune rail from navigation state (e.g., from TuneExpansionPanel or Dashboard)
  useEffect(() => {
    const locationState = location.state as { tune?: boolean } | null;
    if (locationState?.tune) {
      setTunePanelOpen(true);
      // Clear the state so refreshing doesn't re-open
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleInput = useCallback(() => {
    // No-op -- useAutoSave watches formData changes directly.
  }, []);

  /** Generate LaTeX, compile to PDF, and trigger browser download */
  const handleDownload = useCallback(async () => {
    if (!formData) return;
    setIsDownloading(true);
    try {
      // Step 1: Generate LaTeX from formData
      const { texContent, error: genError } = await api.generateLatex(formData);
      if (!texContent || genError) {
        console.error('LaTeX generation failed:', genError);
        setIsDownloading(false);
        return;
      }
      // Step 2: Compile LaTeX to PDF
      const result = await api.compileLatex(texContent, formData.templateId);
      if (!result.success || !result.pdf_base64) {
        console.error('PDF compilation failed:', result.error);
        setIsDownloading(false);
        return;
      }
      // Step 3: Trigger browser download
      downloadPdf(result.pdf_base64, generateCVFilename({ fullName: formData.personalInfo.fullName }));
    } catch (err) {
      console.error('Download failed:', err);
    }
    setIsDownloading(false);
  }, [formData]);

  const handleTuneForJob = useCallback(() => {
    setTunePanelOpen(true);
  }, []);

  // ---- Phase 13 D-* handlers ----

  /**
   * D-22 / Phase 12 D-01 lock: setBaselineScore(matchResult.match_score) MUST
   * fire BEFORE any further AI call. The TuneRail does NOT call setBaselineScore
   * directly — this is the canonical site preserved per Phase 12 D-01.
   */
  const handleAnalyze = useCallback(async (jd: string, company: string, role: string) => {
    if (!formData) return;
    setIsAnalyzing(true);
    setJdText(jd);
    setTuneCompanyName(company);
    setTuneRole(role);
    try {
      const { texContent } = await api.generateLatex(formData);
      if (!texContent) return;
      const analysis = await api.getMatchAnalysis(texContent, jd, company);
      if (analysis) {
        // Phase 12 D-01 lock — set baseline BEFORE any further AI call.
        tailor.setBaselineScore(analysis.match_score);
        setBaselineScoreState(analysis.match_score);
        setMatchAnalysis(analysis);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [formData, tailor]);

  const handleRunTune = useCallback(async (clarifications: string[]) => {
    if (!formData) return;
    await tailor.fetchSuggestions(formData, jdText, tuneCompanyName, tuneRole, clarifications);
  }, [formData, tailor, jdText, tuneCompanyName, tuneRole]);

  const handleSaveBase = useCallback(async (name: string) => {
    if (!formData) return;
    const { texContent } = await api.generateLatex(formData);
    const saved = await api.saveVersion({
      name,
      templateId: formData.templateId,
      texContent: texContent || '',
      formData,
    });
    if (saved) {
      const fullVersion = await api.getVersion(saved.id);
      if (fullVersion) setActiveVersion(fullVersion);
    }
  }, [formData, setActiveVersion]);

  const handleReRunConfirm = useCallback(async () => {
    tailor.reset();
    setMatchAnalysis(null);
    setBaselineScoreState(null);
  }, [tailor]);

  const handleAccept = useCallback(async (changeId: string) => {
    await tailor.acceptChange(changeId);
    const next = highlights.advanceTo('next', changeId);
    highlights.setActiveChangeId(next);
  }, [tailor, highlights]);

  const handleSkip = useCallback((changeId: string) => {
    tailor.skipChange(changeId);
    const next = highlights.advanceTo('next', changeId);
    highlights.setActiveChangeId(next);
  }, [tailor, highlights]);

  const handleAdvance = useCallback((direction: 'next' | 'prev') => {
    const next = highlights.advanceTo(direction, highlights.activeChangeId);
    highlights.setActiveChangeId(next);
  }, [highlights]);

  /** D-16 first-keystroke auto-dismiss inside a highlighted region. */
  const handleAutoDismiss = useCallback((changeId: string) => {
    tailor.skipChange(changeId);
  }, [tailor]);

  const handleHighlightClick = useCallback((changeId: string) => {
    // T-13-04-01 mitigation: validate the changeId is one of the live ids in
    // the tailorResponse before dispatching. Stale DOM after re-render could
    // surface an orphan id; treat as no-op.
    const known = tailorChanges.some((c) => c.id === changeId);
    if (!known) return;
    highlights.setActiveChangeId(changeId);
  }, [tailorChanges, highlights]);

  const handleSaveTailored = useCallback(async () => {
    if (!formData || !activeVersion) return;
    const { texContent } = await api.generateLatex(formData);
    if (!texContent) return;
    const finalAnalysis = await api.getMatchAnalysis(texContent, jdText, tuneCompanyName);
    const score = finalAnalysis?.match_score ?? tailor.estimatedCurrentScore;
    const versionName = [tuneCompanyName, tuneRole].filter(Boolean).join(' ') || 'Job Application';
    const saved = await api.saveVersion({
      name: versionName,
      templateId: activeVersion.templateId,
      texContent,
      formData,
      jobDescription: jdText,
      companyName: tuneCompanyName,
      role: tuneRole,
      matchScore: score,
      // Phase 12 D-28 baseline-score-on-create lock — preserve the baseline at
      // save time so the dashboard can show before/after delta later.
      baselineMatchScore: baselineScore ?? undefined,
      parentVersionId: activeVersion.id,
    });
    if (saved) {
      setSavedTailoredName(versionName);
      setIsPostSaveOpen(true);
    }
  }, [formData, activeVersion, jdText, tuneCompanyName, tuneRole, tailor.estimatedCurrentScore, baselineScore]);

  const handlePostSaveDismiss = useCallback(() => setIsPostSaveOpen(false), []);
  const handlePostSaveTuneAnother = useCallback(() => {
    setIsPostSaveOpen(false);
    tailor.reset();
    setMatchAnalysis(null);
    setBaselineScoreState(null);
  }, [tailor]);
  const handlePostSaveBackToOriginal = useCallback(() => {
    setIsPostSaveOpen(false);
    if (activeVersion?.parentVersionId) {
      navigate('/build/form');
    }
  }, [activeVersion, navigate]);
  const handlePostSaveViewDashboard = useCallback(() => {
    setIsPostSaveOpen(false);
    navigate('/dashboard');
  }, [navigate]);

  // Lift editor actions into NavBar via EditorActionsContext
  useEffect(() => {
    const isTunedVersion = !!(activeVersion?.parentVersionId);
    const parentName = isTunedVersion
      ? (savedVersions.find(v => v.id === activeVersion?.parentVersionId)?.name ?? 'Untitled CV')
      : (activeVersion?.name ?? 'Untitled CV');
    const totalChanges = tailorChanges.length;
    const isReviewing = tailorResponse !== null && totalChanges > 0;
    setEditorActions({
      onDownload: handleDownload,
      onTuneForJob: handleTuneForJob,
      saveStatus,
      isDownloading,
      isTuning: tunePanelOpen,
      isTunedVersion,
      cvName: parentName,
      tuneCompanyName: isTunedVersion ? (tuneCompanyName || activeVersion?.companyName || '') : tuneCompanyName,
      tuneRole: isTunedVersion ? (tuneRole || activeVersion?.role || '') : tuneRole,
      isReviewing,
      acceptedCount: tailor.appliedChanges.size,
      totalChanges,
      onSaveTailored: isReviewing ? handleSaveTailored : null,
    });
    return () => setEditorActions(null);
  }, [setEditorActions, handleDownload, handleTuneForJob, saveStatus, isDownloading,
      tunePanelOpen, activeVersion, savedVersions, tuneCompanyName, tuneRole,
      tailorResponse, tailorChanges.length, tailor.appliedChanges.size, handleSaveTailored]);

  // ---- Highlight maps for MedLengthTemplate (W-02 MVP whole-field scope) ----
  const highlightSpansByPath = useMemo<Map<string, HighlightSpan[]>>(() => {
    const map = new Map<string, HighlightSpan[]>();
    if (tailorChanges.length === 0 || !formData) return map;
    for (const c of tailorChanges) {
      // Whole-field highlight: startOffset=0, endOffset = field text length.
      // Substring-precise offsets are deferred (W-02 MVP scope).
      if (c.changeType !== 'modify') continue;
      if (tailor.appliedChanges.has(c.id) || tailor.skippedChanges.has(c.id)) continue;
      const severity = highlights.severityMap.get(c.id);
      if (!severity) continue;
      const fieldText = typeof c.currentValue === 'string'
        ? c.currentValue
        : Array.isArray(c.currentValue)
          ? c.currentValue.join(' ')
          : '';
      const span: HighlightSpan = {
        changeId: c.id,
        severity,
        isActive: highlights.activeChangeId === c.id,
        startOffset: 0,
        endOffset: fieldText.length,
      };
      const list = map.get(c.fieldPath) ?? [];
      list.push(span);
      map.set(c.fieldPath, list);
    }
    return map;
  }, [tailorChanges, tailor.appliedChanges, tailor.skippedChanges, highlights.severityMap,
      highlights.activeChangeId, formData]);

  const addChangeByPath = useMemo<Map<string, TailorChange>>(() => {
    const map = new Map<string, TailorChange>();
    for (const c of tailorChanges) {
      if (c.changeType !== 'add') continue;
      // Add changes target a bullet-list path like workExperience[0].bullets.
      const bulletListMatch = c.fieldPath.match(/^(.*\.bullets)(\[\d+\])?$/);
      const listPath = bulletListMatch ? bulletListMatch[1]! : c.fieldPath;
      map.set(listPath, c);
    }
    return map;
  }, [tailorChanges]);

  const deleteChangeIdsByBulletId = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    if (!formData) return map;
    for (const c of tailorChanges) {
      if (c.changeType !== 'remove') continue;
      // Extract bullet index from path workExperience[i].bullets[j]; resolve to bullet.id.
      const m = c.fieldPath.match(/^workExperience\[(\d+)\]\.bullets\[(\d+)\]$/);
      if (!m) continue;
      const wi = parseInt(m[1]!, 10);
      const bi = parseInt(m[2]!, 10);
      const bullet = formData.workExperience[wi]?.bullets[bi];
      if (bullet?.id) map.set(bullet.id, c.id);
    }
    return map;
  }, [tailorChanges, formData]);

  // ---- Delegated click handler on the CV container (D-13) ----
  useEffect(() => {
    const node = cvContainerRef.current;
    if (!node) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const hit = target?.closest('[data-change-id]') as HTMLElement | null;
      if (!hit) return;
      const id = hit.dataset.changeId;
      if (id) handleHighlightClick(id);
    };
    node.addEventListener('click', onClick);
    return () => node.removeEventListener('click', onClick);
  }, [handleHighlightClick]);

  // ---- Auto-advance scroll (D-20) ----
  useEffect(() => {
    if (!highlights.activeChangeId) return;
    const range = highlights.getRangeForChange(highlights.activeChangeId);
    const el = range?.startContainer.parentElement ?? null;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlights.activeChangeId, highlights]);

  // ---- Compute display values ----
  const noopFieldChange = noop as (path: string, value: string | SkillItem[]) => void;
  const isReadOnly = false; // Plan 04 deprecates Tier 3 read-only preview; live edits during review.
  const displayFormData = formData;
  const activeChange = highlights.activeChangeId
    ? tailorChanges.find((c) => c.id === highlights.activeChangeId) ?? null
    : null;
  const activeSeverity = activeChange
    ? (highlights.severityMap.get(activeChange.id) ?? null)
    : null;
  const activeRange = highlights.activeChangeId
    ? highlights.getRangeForChange(highlights.activeChangeId)
    : null;
  const anchorRect = activeRange ? activeRange.getBoundingClientRect() : null;

  const totalChanges = tailorChanges.length;
  const isReviewing = tailorResponse !== null && totalChanges > 0;
  const currentScore = tailor.estimatedCurrentScore || (baselineScore ?? 0);

  if (isBootstrapping || !formData || !displayFormData) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.contentArea}${tunePanelOpen ? ` ${styles.contentAreaWithPanel}` : ''}`}>
        <div ref={cvContainerRef} className={styles.cvContainer}>
          <MedLengthTemplate
            formData={displayFormData}
            readOnly={isReadOnly}
            onFieldChange={isReadOnly ? noopFieldChange : updateField}
            onBulletAdd={isReadOnly ? noop as (basePath: string, afterIndex: number) => void : addBullet}
            onBulletRemove={isReadOnly ? noop as (basePath: string, index: number) => void : removeBullet}
            onAddEntry={isReadOnly ? noop as (sectionKey: string) => void : addEntry}
            onRemoveEntry={isReadOnly ? noop as (sectionKey: string, index: number) => void : removeEntry}
            onToggleSection={isReadOnly ? noop as (sectionKey: string) => void : toggleSection}
            hiddenSections={isReadOnly ? EMPTY_SET : hiddenSections}
            onReorderSections={isReadOnly ? noop as (from: number, to: number) => void : reorderSections}
            onReorderEntries={isReadOnly ? noop as (sectionKey: string, from: number, to: number) => void : reorderEntries}
            onInput={isReadOnly ? undefined : handleInput}
            onRemoveSection={isReadOnly ? undefined : removeSection}
            onAddLink={isReadOnly ? undefined : addLink}
            onRemoveLink={isReadOnly ? undefined : removeLink}
            highlightSpansByPath={highlightSpansByPath}
            addChangeByPath={addChangeByPath}
            deleteChangeIdsByBulletId={deleteChangeIdsByBulletId}
            onAutoDismiss={handleAutoDismiss}
            onHighlightClick={handleHighlightClick}
          />
          {pageBreakY !== null && !isReadOnly && <PageBreakIndicator offsetY={pageBreakY} />}
        </div>
      </div>
      {tunePanelOpen && (
        <TuneRail
          formData={formData}
          activeVersion={activeVersion}
          tailor={tailor}
          matchAnalysis={matchAnalysis}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
          onSaveBase={handleSaveBase}
          onRunTune={handleRunTune}
          onReRunConfirm={handleReRunConfirm}
          onSaveTailored={handleSaveTailored}
          onClose={() => setTunePanelOpen(false)}
        />
      )}
      <ChangePopover
        activeChange={activeChange}
        severity={activeSeverity}
        anchorRect={anchorRect}
        onAccept={handleAccept}
        onSkip={handleSkip}
        onAdvance={handleAdvance}
        onClose={() => highlights.setActiveChangeId(null)}
      />
      <ScoreCard
        baselineScore={baselineScore}
        currentScore={currentScore}
        totalPending={totalChanges}
        acceptedCount={tailor.appliedChanges.size}
        isVisible={isReviewing}
      />
      <PostSavePrompt
        isOpen={isPostSaveOpen}
        savedVersionName={savedTailoredName}
        onTuneAnotherJob={handlePostSaveTuneAnother}
        onBackToOriginal={handlePostSaveBackToOriginal}
        onViewInDashboard={handlePostSaveViewDashboard}
        onDismiss={handlePostSaveDismiss}
      />
      {isNamePromptOpen && (
        <NamePromptDialog
          isOpen={isNamePromptOpen}
          onSubmit={handleNameSubmit}
          onDismiss={handleNameDismiss}
        />
      )}
    </div>
  );
}
