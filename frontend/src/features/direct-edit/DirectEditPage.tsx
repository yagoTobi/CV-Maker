/**
 * DirectEditPage -- Top-level page for the web CV editor.
 *
 * Assembles MedLengthTemplate + useDirectEditor + useAutoSave into a full-bleed,
 * white-background page. EB Garamond font is loaded here (not globally) so it
 * only applies to the CV editing surface.
 *
 * The "Tune for Job" flow is the TuneRail (switch-column stepper) mounted beside the CV.
 * During review, AI suggestions render as inline highlights on the (still-editable) CV via
 * HighlightContext, reviewed through a per-change ChangePopover. Orchestration lives in
 * useTuneFlow.
 *
 * If formData is not in context (e.g., direct URL navigation / refresh), it restores the
 * specific version the user was editing (persisted per-tab in sessionStorage).
 *
 * Editor actions (Download PDF, save status, page count) are lifted into EditorActionsContext
 * so the NavBar can render them.
 */
import '@fontsource-variable/eb-garamond';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useLocation } from 'react-router-dom';
import { useDirectEditor } from './hooks/useDirectEditor';
import { useAutoSave } from './hooks/useAutoSave';
import { usePageBreak } from './hooks/usePageBreak';
import { usePageCount } from './hooks/usePageCount';
import { MedLengthTemplate } from './components/MedLengthTemplate';
import { useSetEditorActions } from '../../contexts/EditorActionsContext';
import { useToast } from '../../contexts/ToastContext';
import { TuneRail } from './components/TuneRail';
import { ChangePopover } from './components/change-review/ChangePopover';
import { PostSavePrompt } from './components/PostSavePrompt';
import { HighlightContext } from './components/editor-primitives/HighlightContext';
import type { HighlightContextValue } from './components/editor-primitives/HighlightContext';
import { useTuneFlow } from './hooks/useTuneFlow';
import { useCVContext } from '../../contexts/CVContext';
import { api } from '../../services/api';
import { getStoredActiveVersionId } from '../../utils/activeVersionStorage';
import { generateId } from '../../utils/idHelpers';
import { generateCVFilename } from '../../utils/cvFilename';
import { downloadPdf } from '../../utils/downloadPdf';
import { truncateError } from '../../utils/errorMessages';
import type { CVFormData, CVVersion, CVVersionMeta } from '../../types';
import { NamePromptDialog } from './components/dialogs/NamePromptDialog';
import { loadTuneSession } from './utils/tuneSession';
import { useSectionAssist } from './hooks/useSectionAssist';
import { SectionAssistContext } from './components/editor-primitives/SectionAssistContext';
import { SectionAssistPopover } from './components/section-assist/SectionAssistPopover';
import { resolveSectionContext } from './utils/sectionAssist';
import { applyAssistBullets } from './utils/assistApply';
import type { SectionAssistTarget } from './utils/sectionAssist';
import styles from './DirectEditPage.module.css';

const DEFAULT_TEMPLATE = 'med-length-proff-cv';
const VALID_TEMPLATES = ['med-length-proff-cv', 'deedy-resume', 'mcdowell-cv'];

function createEmptyFormData(): CVFormData {
  return {
    templateId: DEFAULT_TEMPLATE,
    sectionOrder: ['work', 'education', 'skills', 'projects', 'awards'],
    personalInfo: {
      fullName: '', email: '', phone: '', location: '', links: [],
      summary: '', personalOrder: ['phone', 'email', 'location', 'links'],
    },
    workExperience: [{ id: generateId(), company: '', title: '', startDate: '', endDate: '', location: '', bullets: [{ id: generateId(), text: '' }] }],
    education: [{ id: generateId(), school: '', degree: '', startDate: '', endDate: '', location: '', gpa: '', details: [{ id: generateId(), text: '' }] }],
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

  const { status: saveStatus, retry: retrySave } = useAutoSave(formData, activeVersion?.id ?? null, {
    onNeedName,
    onFirstSave: handleFirstSave,
  });
  const [isBootstrapping, setIsBootstrapping] = useState(!formData);
  const [isDownloading, setIsDownloading] = useState(false);
  const [tunePanelOpen, setTunePanelOpen] = useState(false);
  const setEditorActions = useSetEditorActions();
  const toast = useToast();
  const location = useLocation();
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  // Fast CSS estimate of page boundaries (instant, approximate).
  const { offsets: pageBreakEstimateOffsets, estPages } = usePageBreak(templateRef);
  // Authoritative page count from a real compile. While the tune rail is open we force the
  // compile (bypass the cost-saving gate) so the count reflects the optimisation live.
  const { pageCount, isChecking: isCheckingPageCount, overflowWarning } = usePageCount(formData, estPages, true, tunePanelOpen);

  // Tune flow: orchestration (useTailor + match analysis + save) + on-CV inline review.
  const tuneFlow = useTuneFlow({ formData, activeVersion, cvContainerRef });
  const highlightCtxValue = useMemo<HighlightContextValue>(
    () => ({
      getSpansFor: (fieldPath: string) => tuneFlow.inlineReview.highlightSpansByFieldPath.get(fieldPath),
      onAutoDismiss: tuneFlow.inlineReview.autoDismiss,
    }),
    [tuneFlow.inlineReview.highlightSpansByFieldPath, tuneFlow.inlineReview.autoDismiss],
  );

  const assistSuppressed =
    tunePanelOpen ||
    tuneFlow.tailor.pendingChanges.length > 0 ||
    !!tuneFlow.inlineReview.activeChange;

  const handleAssistApply = useCallback(
    (target: SectionAssistTarget, bullets: string[]) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        return applyAssistBullets(prev, target, bullets);
      });
      setTimeout(() => target.restoreFocusEl?.focus(), 0);
    },
    [setFormData],
  );

  const sectionAssist = useSectionAssist({
    onApply: handleAssistApply,
    formData,
    suppressed: assistSuppressed,
  });

  const assistResolvedCtx = useMemo(
    () =>
      sectionAssist.target && formData
        ? resolveSectionContext(formData, sectionAssist.target.basePath)
        : null,
    [sectionAssist.target, formData],
  );

  const handleCvClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = (e.target as HTMLElement).closest('[data-change-id]');
      const id = el?.getAttribute('data-change-id');
      if (id) tuneFlow.inlineReview.setActiveChange(id);
    },
    [tuneFlow.inlineReview],
  );
  const handleCvMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Clicking a highlight should REVIEW it (open the popover), not drop a cursor into the
    // field. Block the contentEditable focus so the click doesn't enter edit mode.
    if ((e.target as HTMLElement).closest('[data-change-id]')) e.preventDefault();
  }, []);

  // Bootstrap formData if context is empty (direct URL navigation / page refresh)
  useEffect(() => {
    if (formData) {
      // If formData exists but has a sentinel templateId (e.g. from CV import),
      // patch it with the selected template before entering the editor
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
      // Restore ONLY the version the user was explicitly editing (persisted
      // per-tab in sessionStorage). We deliberately do NOT fall back to
      // "most recent saved version" — that surfaced an unrelated CV into what
      // should be a fresh session (cross-CV data bleed), which is especially
      // wrong while there is no per-account separation.
      const activeId = getStoredActiveVersionId();
      if (activeId) {
        const full = await api.getVersion(activeId);
        if (!cancelled && full?.formData) {
          const loadedData = full.formData;
          // Sanitize sentinel/invalid templateIds that would cause backend 400
          if (!loadedData.templateId || !VALID_TEMPLATES.includes(loadedData.templateId)) {
            loadedData.templateId = DEFAULT_TEMPLATE;
          }
          setFormData(loadedData);
          setActiveVersion(full);
          const tuneSession = loadTuneSession(full.id);
          if (tuneSession?.isOpen) {
            setTunePanelOpen(true);
            setTuneCompanyName(tuneSession.companyName);
            setTuneRole(tuneSession.roleName);
          }
          setIsBootstrapping(false);
          return;
        }
      }

      // No known in-progress version → start with an empty template.
      if (!cancelled) {
        setFormData(createEmptyFormData());
        setIsBootstrapping(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [formData, setActiveVersion, setFormData, selectedTemplateForBuild]);

  // Open tune rail from navigation state (e.g., from a landing panel or the Dashboard)
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
      const { texContent, error: genError } = await api.generateLatex(formData);
      if (!texContent || genError) {
        console.error('LaTeX generation failed:', genError);
        toast.error(`Couldn't generate your PDF. ${truncateError(genError)}`);
        setIsDownloading(false);
        return;
      }
      const result = await api.compileLatex(texContent, formData.templateId);
      if (!result.success || !result.pdf_base64) {
        console.error('PDF compilation failed:', result.error);
        toast.error(`PDF compilation failed. ${result.error ? truncateError(result.error) : 'The compiler did not return a PDF.'}`);
        setIsDownloading(false);
        return;
      }
      downloadPdf(result.pdf_base64, generateCVFilename({ fullName: formData.personalInfo.fullName }));
      if (result.warnings?.length) {
        toast.warning(result.warnings.join(' '));
      }
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Download failed. Check your connection and try again.');
    }
    setIsDownloading(false);
  }, [formData, toast]);

  const handleTuneForJob = useCallback(() => {
    setTunePanelOpen(true);
  }, []);

  // Lift editor actions into NavBar via EditorActionsContext
  useEffect(() => {
    const isTunedVersion = !!(activeVersion?.parentVersionId);
    const parentName = isTunedVersion
      ? (savedVersions.find(v => v.id === activeVersion?.parentVersionId)?.name ?? 'Untitled CV')
      : (activeVersion?.name ?? 'Untitled CV');
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
      pageCount,
      isCheckingPageCount,
      onRetrySave: retrySave,
      overflowWarning,
    });
    return () => setEditorActions(null);
  }, [setEditorActions, handleDownload, handleTuneForJob, saveStatus, isDownloading,
      tunePanelOpen, activeVersion, savedVersions, tuneCompanyName, tuneRole,
      pageCount, isCheckingPageCount, retrySave, overflowWarning]);

  if (isBootstrapping || !formData) {
    return <div className={styles.loading}>Loading...</div>;
  }

  // The CV is always editable now (no read-only tune preview); page-break lines hide at 1 page.
  const pageBreakOffsets = pageCount !== 1 ? pageBreakEstimateOffsets : [];

  return (
    <div className={styles.page}>
      <div className={styles.contentArea}>
        <div
          ref={cvContainerRef}
          className={styles.cvContainer}
          onClick={handleCvClick}
          onMouseDown={handleCvMouseDown}
        >
          <SectionAssistContext.Provider
            value={{ requestAssist: sectionAssist.requestAssist, suppressed: assistSuppressed }}
          >
            <HighlightContext.Provider value={highlightCtxValue}>
              <MedLengthTemplate
                ref={templateRef}
                formData={formData}
                readOnly={false}
                onFieldChange={updateField}
                onBulletAdd={addBullet}
                onBulletRemove={removeBullet}
                onAddEntry={addEntry}
                onRemoveEntry={removeEntry}
                onToggleSection={toggleSection}
                hiddenSections={hiddenSections}
                onReorderSections={reorderSections}
                onReorderEntries={reorderEntries}
                onInput={handleInput}
                onRemoveSection={removeSection}
                onAddLink={addLink}
                onRemoveLink={removeLink}
                pageBreakOffsets={pageBreakOffsets}
              />
            </HighlightContext.Provider>
          </SectionAssistContext.Provider>
        </div>
        {tunePanelOpen && (
          <TuneRail
            key={tuneFlow.flowKey}
            activeVersion={activeVersion}
            formData={formData}
            matchAnalysis={tuneFlow.matchAnalysis}
            tailor={tuneFlow.tailor}
            isAnalyzing={tuneFlow.isAnalyzing}
            isSaving={tuneFlow.isSaving}
            onSaveAsBase={tuneFlow.onSaveAsBase}
            onAnalyze={tuneFlow.onAnalyze}
            onSaveTailored={tuneFlow.onSaveTailored}
            onActivateChange={tuneFlow.inlineReview.setActiveChange}
          />
        )}
      </div>
      {tunePanelOpen && (
        <ChangePopover
          activeChange={tuneFlow.inlineReview.activeChange}
          severity={tuneFlow.inlineReview.activeSeverity}
          getRect={tuneFlow.inlineReview.getRect}
          selectedAlternativeIndex={tuneFlow.inlineReview.activeSelectedIndex}
          onAccept={tuneFlow.inlineReview.acceptActive}
          onSkip={tuneFlow.inlineReview.skipActive}
          onAdvance={tuneFlow.inlineReview.advance}
          onClose={tuneFlow.inlineReview.close}
          onSelectAlternative={tuneFlow.inlineReview.selectAlternative}
          onEdit={tuneFlow.inlineReview.editChange}
        />
      )}
      {sectionAssist.isOpen && sectionAssist.target && assistResolvedCtx && (
        <SectionAssistPopover
          sectionType={assistResolvedCtx.sectionType}
          getRect={sectionAssist.target.getRect}
          isLoading={sectionAssist.isLoading}
          error={sectionAssist.error}
          onGenerate={sectionAssist.generate}
          onClose={() => {
            const restoreEl = sectionAssist.target?.restoreFocusEl;
            sectionAssist.close();
            restoreEl?.focus();
          }}
        />
      )}
      <PostSavePrompt
        isOpen={tuneFlow.savedSuccessfully}
        onTuneAnotherJob={tuneFlow.onTuneAnotherJob}
        onBackToOriginal={tuneFlow.onBackToOriginal}
        onViewInDashboard={tuneFlow.onViewInDashboard}
        onDismiss={tuneFlow.onDismissPostSave}
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
