/**
 * Tier1SaveBase -- "Save as Base CV" tier body for TunePanel.
 *
 * Shown when activeTier === 1. Handles the name input and save action.
 * If the active version is already set (CV was previously saved), shows
 * a "pre-completed" confirmation message instead of the form.
 *
 * Covers: D-01, D-02, D-03.
 */
import type { CVVersion } from '../../../../types';
import styles from './Tier1SaveBase.module.css';

interface Tier1SaveBaseProps {
  activeVersion: CVVersion | null;
  baseName: string;
  onBaseNameChange: (name: string) => void;
  onSave: () => void;
  isSaving: boolean;
  isAutoFocused: boolean;
}

export function Tier1SaveBase({
  activeVersion,
  baseName,
  onBaseNameChange,
  onSave,
  isSaving,
  isAutoFocused,
}: Tier1SaveBaseProps) {
  return (
    <div className={styles.tierBodyInner}>
      {activeVersion ? (
        <div className={styles.preCompleted}>
          Already saved as &quot;{activeVersion.name}&quot;
        </div>
      ) : (
        <>
          <div className={styles.formGroup}>
            <label className={styles.label}>CV Name</label>
            <input
              className={styles.input}
              value={baseName}
              onChange={e => onBaseNameChange(e.target.value)}
              placeholder="e.g., Creative CV"
              autoFocus={isAutoFocused}
            />
          </div>
          <button
            className={styles.primaryBtn}
            onClick={onSave}
            disabled={!baseName.trim() || isSaving}
            type="button"
          >
            {isSaving ? (<><span className={styles.spinner} /> Saving...</>) : 'Save as Base CV'}
          </button>
        </>
      )}
    </div>
  );
}
