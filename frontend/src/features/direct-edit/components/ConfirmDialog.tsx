/**
 * ConfirmDialog -- Lightweight inline confirmation dialog for major entry deletion.
 *
 * Positioned below the delete button (not a full-screen modal) per Claude's Discretion.
 * Uses app chrome font (IBM Plex Sans) since this is UI chrome, not CV content.
 *
 * Covers: D-04 (confirmation for major deletes).
 */
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <>
      <div className={styles.backdrop} onClick={onCancel} />
      <div className={styles.dialog} role="alertdialog" aria-label={message}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.deleteBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
