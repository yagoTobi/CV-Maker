/**
 * PageBreakIndicator -- Dashed line with a "Page N" label rendered at a
 * computed page-break offset, measured from the top of the CV sheet.
 *
 * Positioned absolutely inside the position:relative sheet (.template) so the
 * line spans the full page width at the correct Y offset.
 *
 * Covers: UX-02, D-07.
 */
import styles from './PageBreakIndicator.module.css';

interface PageBreakIndicatorProps {
  /** Pixel offset from the top of the sheet. */
  offsetY: number;
  /** Label shown at the break, e.g. "Page 2". */
  label: string;
}

export function PageBreakIndicator({ offsetY, label }: PageBreakIndicatorProps) {
  return (
    <div
      className={styles.indicator}
      style={{ top: `${offsetY}px` }}
      aria-label={`Page break - content below this line is on ${label}`}
    >
      <span className={styles.label}>{label}</span>
    </div>
  );
}
