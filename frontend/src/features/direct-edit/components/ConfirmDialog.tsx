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
  /** When true, skip the dimming backdrop and use a transparent click target instead */
  noBackdrop?: boolean;
  /** Additional CSS class appended to the dialog element for caller-controlled positioning */
  dialogClassName?: string;
}

export function ConfirmDialog({ message, onConfirm, onCancel, noBackdrop, dialogClassName }: ConfirmDialogProps) {
  return (
    <>
      {noBackdrop
        ? <div className={styles.backdropTransparent} onClick={onCancel} />
        : <div className={styles.backdrop} onClick={onCancel} />
      }
      <div
        className={dialogClassName ? `${styles.dialog} ${dialogClassName}` : styles.dialog}
        role="alertdialog"
        aria-label={message}
      >
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
