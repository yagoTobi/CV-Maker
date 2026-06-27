/**
 * DirectEditPage -- Top-level page for the web CV editor.
 *
 * Assembles MedLengthTemplate + useDirectEditor + useAutoSave into a full-bleed,
 * white-background page. EB Garamond font is loaded here (not globally) so it
 * only applies to the CV editing surface.
 *
 * If formData is not in context (e.g., direct URL navigation / refresh), it
 * restores the specific version the user was editing (persisted per-tab in
 * sessionStorage). It does NOT fall back to "most recent saved version" — that
 * would surface an unrelated CV. Falls back to an empty template otherwise.
 *
 * Editor actions (Download PDF, save status) are lifted into
 * EditorActionsContext so the NavBar can render them.
 *
 * Covers: EDIT-01 through EDIT-06, UX-01, D-05, D-06, D-07, D-13.
 */
import '@fontsource-variable/eb-garamond';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDirectEditor } from './hooks/useDirectEditor';
import { useAutoSave } from './hooks/useAutoSave';
import { usePageBreak } from './hooks/usePageBreak';
import { MedLengthTemplate } from './components/MedLengthTemplate';
import { useSetEditorActions } from '../../contexts/EditorActionsContext';
import { PageBreakIndicator } from './components/PageBreakIndicator';
import { TunePanel } from './components/tune-tiers/TunePanel';
import { useCVContext } from '../../contexts/CVContext';
import { api } from '../../services/api';
import { getStoredActiveVersionId } from '../../utils/activeVersionStorage';
import { generateId } from '../../utils/idHelpers';
import { generateCVFilename } from '../../utils/cvFilename';
import { downloadPdf } from '../../utils/downloadPdf';
import { noop, EMPTY_SET } from '../../utils/cvDisplayUtils';
import type { CVFormData, SkillItem, CVVersion, CVVersionMeta } from '../../types';
import { NamePromptDialog } from './components/dialogs/NamePromptDialog';
import { loadTuneSession } from './utils/tuneSession';
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

  const saveStatus = useAutoSave(formData, activeVersion?.id ?? null, {
    onNeedName,
    onFirstSave: handleFirstSave,
  });
  const [isBootstrapping, setIsBootstrapping] = useState(!formData);
  const [isDownloading, setIsDownloading] = useState(false);
  const [tunePanelOpen, setTunePanelOpen] = useState(false);
  const [previewFormData, setPreviewFormData] = useState<CVFormData | null>(null);
  const [isTier3Active, setIsTier3Active] = useState(false);
  const setEditorActions = useSetEditorActions();
  const location = useLocation();
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const pageBreakY = usePageBreak(cvContainerRef);

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

  // Open tune panel from navigation state (e.g., from TuneExpansionPanel or Dashboard)
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
    });
    return () => setEditorActions(null);
  }, [setEditorActions, handleDownload, handleTuneForJob, saveStatus, isDownloading,
      tunePanelOpen, activeVersion, savedVersions, tuneCompanyName, tuneRole]);

  // Callback handlers for TunePanel communication
  const handlePreviewUpdate = useCallback((fd: CVFormData | null) => {
    setPreviewFormData(fd);
  }, []);

  const handleTier3Active = useCallback((active: boolean) => {
    setIsTier3Active(active);
  }, []);

  // Compute display values for MedLengthTemplate
  const displayFormData = isTier3Active && previewFormData ? previewFormData : formData;
  const isReadOnly = isTier3Active;
  const noopFieldChange = noop as (path: string, value: string | SkillItem[]) => void;

  if (isBootstrapping || !formData) {
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
            onBulletAdd={isReadOnly ? noop as (basePath: string, afterIndex: number) => string | void : addBullet}
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
          />
          {pageBreakY !== null && !isReadOnly && <PageBreakIndicator offsetY={pageBreakY} />}
        </div>
      </div>
      <TunePanel
        isOpen={tunePanelOpen}
        onToggle={() => setTunePanelOpen(prev => !prev)}
        formData={formData}
        activeVersion={activeVersion}
        onPreviewUpdate={handlePreviewUpdate}
        onTier3Active={handleTier3Active}
        cvContainerRef={cvContainerRef}
        onTuneDetailsChange={(company, role) => {
          setTuneCompanyName(company);
          setTuneRole(role);
        }}
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
