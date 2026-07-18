/**
 * PostSavePrompt -- shown after "Save Tailored CV" succeeds (CONTEXT.md post-save step,
 * Phase 13 D-25). Three forward paths: tune another job, back to the base CV, or the
 * dashboard. Dismiss via backdrop click or Escape. Default focus lands on "View in
 * Dashboard" so Enter takes the common path.
 */
import { useEffect, useRef } from 'react';
import type React from 'react';
import styles from './PostSavePrompt.module.css';

export interface PostSavePromptProps {
  isOpen: boolean;
  onTuneAnotherJob: () => void;
  onBackToOriginal: () => void;
  onViewInDashboard: () => void;
  onDismiss: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function PostSavePrompt({
  isOpen,
  onTuneAnotherJob,
  onBackToOriginal,
  onViewInDashboard,
  onDismiss,
  onDownload,
  isDownloading = false,
}: PostSavePromptProps): React.JSX.Element | null {
  const viewRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) viewRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    // Only dismiss when the backdrop itself is clicked, not a bubbled child click.
    if (e.target === e.currentTarget) onDismiss();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Escape') onDismiss();
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div className={styles.card} role="dialog" aria-modal="true" aria-label="What's next?">
        <h2 className={styles.heading}>{"What's next?"}</h2>
        <p className={styles.sub}>Your tailored CV is saved as a job application.</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onDownload}
            disabled={isDownloading}
          >
            {isDownloading ? 'Generating…' : 'Download PDF'}
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={onTuneAnotherJob}>
            Tune for another job
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={onBackToOriginal}>
            Back to original CV
          </button>
          <button
            ref={viewRef}
            type="button"
            className={styles.primaryBtn}
            onClick={onViewInDashboard}
          >
            View in Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
