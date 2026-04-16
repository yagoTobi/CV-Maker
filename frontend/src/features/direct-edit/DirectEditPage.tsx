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
 * Covers: EDIT-01 through EDIT-06, UX-01, D-05, D-06, D-07, D-13.
 */
import '@fontsource-variable/eb-garamond';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDirectEditor } from './hooks/useDirectEditor';
import { useAutoSave } from './hooks/useAutoSave';
import { usePageBreak } from './hooks/usePageBreak';
import { MedLengthTemplate } from './components/MedLengthTemplate';
import { useSetEditorActions } from '../../contexts/EditorActionsContext';
import { PageBreakIndicator } from './components/PageBreakIndicator';
import { useCVContext } from '../../contexts/CVContext';
import { api } from '../../services/api';
import { generateId } from '../../utils/idHelpers';
import { generateCVFilename } from '../../utils/cvFilename';
import type { CVFormData } from '../../types';
import styles from './DirectEditPage.module.css';

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
  const { activeVersion, setFormData, savedVersions, selectedTemplateForBuild } = useCVContext();
  const { formData, updateField, addBullet, removeBullet, addEntry, removeEntry, toggleSection, hiddenSections, reorderSections, reorderEntries, removeSection } = useDirectEditor();
  const saveStatus = useAutoSave(formData, activeVersion?.id ?? null);
  const [isBootstrapping, setIsBootstrapping] = useState(!formData);
  const [isDownloading, setIsDownloading] = useState(false);
  const setEditorActions = useSetEditorActions();
  const navigate = useNavigate();
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const pageBreakY = usePageBreak(cvContainerRef);

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
      const byteChars = atob(result.pdf_base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateCVFilename({ fullName: formData.personalInfo.fullName });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
    setIsDownloading(false);
  }, [formData]);

  const handleTuneForJob = useCallback(() => {
    navigate('/apply', { state: { baseVersionId: activeVersion?.id } });
  }, [navigate, activeVersion?.id]);

  // Lift editor actions into NavBar via EditorActionsContext
  useEffect(() => {
    setEditorActions({
      onDownload: handleDownload,
      onTuneForJob: handleTuneForJob,
      saveStatus,
      isDownloading,
    });
    return () => setEditorActions(null);
  }, [setEditorActions, handleDownload, handleTuneForJob, saveStatus, isDownloading]);

  if (isBootstrapping || !formData) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.contentArea}>
        <div ref={cvContainerRef} className={styles.cvContainer}>
          <MedLengthTemplate
            formData={formData}
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
          />
          {pageBreakY !== null && <PageBreakIndicator offsetY={pageBreakY} />}
        </div>
      </div>
    </div>
  );
}
