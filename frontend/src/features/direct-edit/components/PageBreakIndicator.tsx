/**
 * PageBreakIndicator -- Dashed line with "Page 2" label rendered at the
 * computed page break offset (11 inches from the top of the CV container).
 *
 * Positioned absolutely inside a position:relative wrapper so the line
 * overlays the CV content at the correct Y offset.
 *
 * Covers: UX-02, D-07.
 */
import styles from './PageBreakIndicator.module.css';

interface PageBreakIndicatorProps {
  offsetY: number; // Pixel offset from top of container
}

export function PageBreakIndicator({ offsetY }: PageBreakIndicatorProps) {
  return (
    <div
      className={styles.indicator}
      style={{ top: `${offsetY}px` }}
      aria-label="Page break - content below this line is on page 2"
    >
      <span className={styles.label}>Page 2</span>
    </div>
  );
}
