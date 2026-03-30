/**
 * SectionWrapper -- Wraps a CV section with hover-reveal add button and
 * section visibility toggle.
 *
 * Per D-01: Add button appears at bottom of section on hover, invisible otherwise.
 * Per D-02: Button text is contextual ("+ Add work entry", etc.).
 * Per D-05: Toggle icon appears on section header hover.
 * Per D-06: Hidden sections collapse to muted label, data preserved.
 *
 * Covers: CONT-01 (add entry), CONT-04 (toggle section).
 */
import type { ReactNode } from 'react';
import styles from './SectionWrapper.module.css';

interface SectionWrapperProps {
  sectionKey: string;
  title: string;
  isHidden: boolean;
  isEmpty: boolean;
  onToggleVisibility: () => void;
  onAddEntry: () => void;
  addLabel: string;
  headerClassName?: string;
  renderHeader?: () => ReactNode;
  children: ReactNode;
}

/** Eye icon (section visible) */
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Eye-off icon (section hidden) */
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export function SectionWrapper({
  sectionKey,
  title,
  isHidden,
  isEmpty,
  onToggleVisibility,
  onAddEntry,
  addLabel,
  headerClassName,
  renderHeader,
  children,
}: SectionWrapperProps) {
  return (
    <div className={styles.sectionWrap} data-section={sectionKey}>
      <div className={styles.sectionHeaderRow}>
        {renderHeader ? renderHeader() : (
          <div className={headerClassName}>{title}</div>
        )}
        <button
          className={`${styles.toggleButton}${isHidden ? ` ${styles.toggleButtonVisible}` : ''}`}
          onClick={onToggleVisibility}
          aria-label={isHidden ? `Show ${title}` : `Hide ${title}`}
          type="button"
        >
          {isHidden ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {isHidden ? (
        <div className={styles.hiddenLabel}>{title} (hidden)</div>
      ) : (
        <>
          <div className={styles.sectionContent}>
            {children}
          </div>
          <button
            className={`${styles.addButton}${isEmpty ? ` ${styles.addButtonVisible}` : ''}`}
            onClick={onAddEntry}
            type="button"
          >
            {addLabel}
          </button>
        </>
      )}
    </div>
  );
}
