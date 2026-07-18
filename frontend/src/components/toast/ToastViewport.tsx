/**
 * ToastViewport -- fixed, bottom-center stack of the active toasts.
 *
 * Rendered inside <ToastProvider>. Each toast item carries its OWN ARIA role
 * (error -> "alert", warning/success -> "status"); the container has NO
 * aria-live, so screen-reader announcements come only from the per-item roles.
 */
import type { ToastItem } from '../../contexts/ToastContext';
import styles from './ToastViewport.module.css';

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport}>
      {toasts.map((t) => {
        const action = t.action;
        return (
          <div key={t.id} role={t.role} className={`${styles.toast} ${styles[t.variant]}`}>
            <span className={styles.message}>{t.message}</span>
            {action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  action.onClick();
                  onDismiss(t.id);
                }}
              >
                {action.label}
              </button>
            )}
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Dismiss notification"
              onClick={() => onDismiss(t.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
