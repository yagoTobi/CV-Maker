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
  inline?: boolean;
  onRetry?: () => void;
}

export function SaveIndicator({ status, inline, onRetry }: SaveIndicatorProps) {
  const text = status === 'saving' ? 'Saving...'
             : status === 'saved'  ? 'Saved'
             : status === 'error'  ? 'Save failed'
             : '';

  const className = status === 'saving' ? styles.saving
                  : status === 'saved'  ? styles.saved
                  : status === 'error'  ? styles.error
                  : styles.idle;

  return (
    <div className={`${styles.indicator} ${className}${inline ? ` ${styles.inline}` : ''}`}>
      <span aria-live="polite" aria-atomic="true">{text}</span>
      {status === 'error' && onRetry && (
        <button
          type="button"
          className={styles.retryBtn}
          onClick={onRetry}
          aria-label="Retry save"
        >
          Retry
        </button>
      )}
    </div>
  );
}
