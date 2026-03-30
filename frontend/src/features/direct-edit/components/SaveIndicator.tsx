/**
 * SaveIndicator -- Visual save status indicator.
 *
 * Renders "Saving..." / "Saved" / "Save failed" text in the top-right corner (D-07).
 * Hidden when status is idle. Uses app chrome styling (IBM Plex Sans 13px).
 */
import type { SaveStatus } from '../hooks/useAutoSave';
import styles from './SaveIndicator.module.css';

interface SaveIndicatorProps {
  status: SaveStatus;
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === 'idle') return null;

  const text = status === 'saving' ? 'Saving...'
             : status === 'saved'  ? 'Saved'
             : 'Save failed';

  const className = status === 'saving' ? styles.saving
                  : status === 'saved'  ? styles.saved
                  : styles.error;

  return (
    <div className={`${styles.indicator} ${className}`}>
      {text}
    </div>
  );
}
