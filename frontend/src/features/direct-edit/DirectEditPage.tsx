/**
 * DirectEditPage -- Top-level page for the web CV editor.
 *
 * Assembles MedLengthTemplate + SaveIndicator + useDirectEditor + useAutoSave
 * into a full-bleed, white-background page. EB Garamond font is loaded here
 * (not globally) so it only applies to the CV editing surface.
 *
 * If formData is not in context (e.g., direct URL navigation), tries to load
 * the most recent saved version. Falls back to an empty template with placeholders.
 *
 * Covers: EDIT-01 through EDIT-06, UX-01, D-05.
 */
import '@fontsource-variable/eb-garamond';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDirectEditor } from './hooks/useDirectEditor';
import { useAutoSave } from './hooks/useAutoSave';
import { usePageBreak } from './hooks/usePageBreak';
import { MedLengthTemplate } from './components/MedLengthTemplate';
import { SaveIndicator } from './components/SaveIndicator';
import { PageBreakIndicator } from './components/PageBreakIndicator';
import { useCVContext } from '../../contexts/CVContext';
import { api } from '../../services/api';
import { generateId } from '../../utils/idHelpers';
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
  const { activeVersion, setFormData, savedVersions } = useCVContext();
  const { formData, updateField, addBullet, removeBullet, addEntry, removeEntry, toggleSection, hiddenSections } = useDirectEditor();
  const saveStatus = useAutoSave(formData, activeVersion?.id ?? null);
  const [isBootstrapping, setIsBootstrapping] = useState(!formData);
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const pageBreakY = usePageBreak(cvContainerRef);

  // Bootstrap formData if context is empty (direct URL navigation / page refresh)
  useEffect(() => {
    if (formData) {
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
          setFormData(full.formData);
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
  }, [formData, savedVersions, setFormData]);

  const handleInput = useCallback(() => {
    // No-op -- useAutoSave watches formData changes directly.
  }, []);

  if (isBootstrapping || !formData) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.page}>
      <SaveIndicator status={saveStatus} />
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
          onInput={handleInput}
        />
        {pageBreakY !== null && <PageBreakIndicator offsetY={pageBreakY} />}
      </div>
    </div>
  );
}
