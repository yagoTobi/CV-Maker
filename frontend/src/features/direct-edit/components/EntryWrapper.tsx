/**
 * EntryWrapper -- Wraps a single entry (job, education, project, etc.) with a
 * hover-reveal delete button. Optionally shows ConfirmDialog for major entries.
 *
 * Per D-03: X icon appears in top-right on hover. Invisible when not hovering.
 * Per D-04: Major entries show confirmation, minor entries delete instantly.
 *
 * Covers: CONT-02 (delete entry), CONT-03 (confirm major deletes).
 */
import { useState, useCallback } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './EntryWrapper.module.css';

interface EntryWrapperProps {
  onDelete: () => void;
  requireConfirm?: boolean;
  confirmMessage?: string;
  children: React.ReactNode;
}

export function EntryWrapper({
  onDelete,
  requireConfirm = false,
  confirmMessage = 'Delete this entry?',
  children,
}: EntryWrapperProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = useCallback(() => {
    if (requireConfirm) {
      setShowConfirm(true);
    } else {
      onDelete();
    }
  }, [requireConfirm, onDelete]);

  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    onDelete();
  }, [onDelete]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <div className={styles.entryWrap}>
      {children}
      <button
        className={styles.deleteButton}
        onClick={handleDeleteClick}
        aria-label="Delete entry"
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {showConfirm && (
        <ConfirmDialog
          message={confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
