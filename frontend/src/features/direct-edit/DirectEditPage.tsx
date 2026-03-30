/**
 * DirectEditPage -- Top-level page for the web CV editor.
 *
 * Assembles MedLengthTemplate + SaveIndicator + useDirectEditor + useAutoSave
 * into a full-bleed, white-background page. EB Garamond font is loaded here
 * (not globally) so it only applies to the CV editing surface.
 *
 * Covers: EDIT-01 through EDIT-06, UX-01, D-05.
 */
import '@fontsource-variable/eb-garamond';
import { useCallback } from 'react';
import { useDirectEditor } from './hooks/useDirectEditor';
import { useAutoSave } from './hooks/useAutoSave';
import { MedLengthTemplate } from './components/MedLengthTemplate';
import { SaveIndicator } from './components/SaveIndicator';
import { useCVContext } from '../../contexts/CVContext';
import styles from './DirectEditPage.module.css';

export default function DirectEditPage() {
  const { activeVersion } = useCVContext();
  const { formData, updateField, addBullet, removeBullet } = useDirectEditor();
  const saveStatus = useAutoSave(formData, activeVersion?.id ?? null);

  const handleInput = useCallback(() => {
    // No-op -- useAutoSave watches formData changes directly.
    // This callback exists so MedLengthTemplate can signal input events
    // for potential future enhancements (e.g., flush focused field).
  }, []);

  if (!formData) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.page}>
      <SaveIndicator status={saveStatus} />
      <MedLengthTemplate
        formData={formData}
        onFieldChange={updateField}
        onBulletAdd={addBullet}
        onBulletRemove={removeBullet}
        onInput={handleInput}
      />
    </div>
  );
}
