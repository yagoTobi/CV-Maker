/**
 * PageCountIndicator -- Discrete page-count status for the NavBar.
 *
 * Shows "1 page" / "N pages" with a small status dot (amber when the CV spills
 * onto more than one page), or "Checking…" while a real compile is in flight.
 * Renders nothing until a count is known. Sits in the editor's top rail rather
 * than overlaying the sheet.
 */
import styles from './PageCountIndicator.module.css';

interface PageCountIndicatorProps {
  pageCount: number | null;
  isChecking: boolean;
  warning?: string | null;
}

export function PageCountIndicator({ pageCount, isChecking, warning = null }: PageCountIndicatorProps) {
  if (pageCount === null && !isChecking) return null;

  const isMulti = pageCount !== null && pageCount > 1;

  return (
    <div
      className={`${styles.indicator}${isMulti ? ` ${styles.multi}` : ''}`}
      aria-live="polite"
      title={isMulti ? 'Your CV spans more than one page' : undefined}
    >
      <span className={styles.dot} aria-hidden="true" />
      {isChecking
        ? 'Checking…'
        : `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`}
      {warning && (
        <span
          className={styles.overflowChip}
          title={warning}
          role="status"
        >
          Text overflow
        </span>
      )}
    </div>
  );
}
