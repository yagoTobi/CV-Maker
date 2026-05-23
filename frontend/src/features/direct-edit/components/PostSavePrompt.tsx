/**
 * PostSavePrompt -- Three-option modal shown after Save Tailored CV completes (D-25).
 *
 * Structural twin of NamePromptDialog: backdrop (single root) + dialog inside.
 * Backdrop click and Escape both trigger onDismiss. Default focus on
 * "View in Dashboard" per UI-SPEC line 207.
 *
 * Props are aligned with __tests__/PostSavePrompt.test.tsx (Wave 0 contract):
 *   onTuneAnotherJob / onBackToOriginal / onViewInDashboard / onDismiss.
 */
import { useEffect, useRef } from 'react';
import type React from 'react';
import styles from './PostSavePrompt.module.css';

export interface PostSavePromptProps {
  isOpen: boolean;
  /** Optional saved version name displayed in the subhead. */
  savedVersionName?: string;
  onTuneAnotherJob: () => void;
  onBackToOriginal: () => void;
  onViewInDashboard: () => void;
  onDismiss: () => void;
}

export function PostSavePrompt(props: PostSavePromptProps): React.JSX.Element | null {
  const {
    isOpen,
    savedVersionName,
    onTuneAnotherJob,
    onBackToOriginal,
    onViewInDashboard,
    onDismiss,
  } = props;

  const viewBtnRef = useRef<HTMLButtonElement>(null);

  // Default focus on "View in Dashboard" once the dialog opens (UI-SPEC).
  useEffect(() => {
    if (isOpen && viewBtnRef.current) {
      viewBtnRef.current.focus();
    }
  }, [isOpen]);

  // Document-level Escape listener (parity with NamePromptDialog).
  // The test ALSO dispatches keyDown directly on the backdrop element, so we
  // attach a local handler on the root to satisfy that path too.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only fire when clicking the backdrop itself, not its children.
    if (e.target === e.currentTarget) onDismiss();
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="postSaveHeading"
      >
        <h2 id="postSaveHeading" className={styles.heading}>
          What's next?
        </h2>
        {savedVersionName && (
          <p className={styles.savedAs}>Saved as {savedVersionName}</p>
        )}
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.tertiaryButton}
            onClick={onTuneAnotherJob}
          >
            Tune for another job
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onBackToOriginal}
          >
            Back to original CV
          </button>
          <button
            ref={viewBtnRef}
            type="button"
            className={styles.primaryButton}
            onClick={onViewInDashboard}
          >
            View in Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
