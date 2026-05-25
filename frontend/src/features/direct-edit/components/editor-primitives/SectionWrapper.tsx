/**
 * SectionWrapper -- Wraps a CV section with hover-reveal add button,
 * section visibility toggle, and drag grip handle in the left gutter.
 *
 * Per D-01: Grip handle is absolutely positioned in the left gutter,
 * OUTSIDE the CV content area (left: -28px), matching the EntryWrapper
 * delete button pattern (absolute positioned at right: -24px).
 * Per D-02: Grip appears only on hover.
 * Per D-05: Toggle icon appears on section header hover.
 * Per D-06: Hidden sections collapse to muted label, data preserved.
 *
 * Covers: CONT-01 (add entry), CONT-04 (toggle section), DND-01 (section drag).
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { GripIcon } from './GripIcon';
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
  /** Section index in sectionOrder for drag positioning */
  sectionIndex: number;
  /** Section-level drag handlers from useSectionDrag */
  dragHandlers: {
    onGripMouseDown: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnter: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };
  /** Whether this section is currently being dragged (for opacity) */
  isDragSource?: boolean;
  /** When true, suppress all editing UI (add, toggle, drag grip) */
  readOnly?: boolean;
  /** Callback to permanently remove this section */
  onRemoveSection?: () => void;
  children: ReactNode;
}

/** Trash icon (remove section) */
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

/** Eye icon (section visible) */
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Eye-off icon (section hidden) */
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  sectionIndex,
  dragHandlers,
  isDragSource = false,
  readOnly = false,
  onRemoveSection,
  children,
}: SectionWrapperProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (readOnly) {
    return (
      <div
        className={styles.sectionWrap}
        data-section={sectionKey}
      >
        <div className={styles.sectionHeaderRow}>
          {renderHeader ? renderHeader() : (
            <div className={headerClassName}>{title}</div>
          )}
        </div>
        <div className={styles.sectionContent}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.sectionWrap}${isDragSource ? ` ${styles.dragging}` : ''}`}
      data-section={sectionKey}
      data-drag-section={sectionKey}
      onDragStart={(e) => dragHandlers.onDragStart(e, sectionIndex)}
      onDragEnter={(e) => dragHandlers.onDragEnter(e, sectionIndex)}
      onDragOver={dragHandlers.onDragOver}
      onDrop={(e) => dragHandlers.onDrop(e, sectionIndex)}
      onDragEnd={dragHandlers.onDragEnd}
    >
      <button
        className={styles.gripButton}
        onMouseDown={dragHandlers.onGripMouseDown}
        aria-label={`Drag to reorder ${title} section`}
        type="button"
      >
        <GripIcon />
      </button>
      <div className={styles.sectionHeaderRow}>
        {renderHeader ? renderHeader() : (
          <div className={headerClassName}>{title}</div>
        )}
        <div className={styles.sectionControls}>
          <button
            className={`${styles.toggleButton}${isHidden ? ` ${styles.toggleButtonVisible}` : ''}`}
            onClick={onToggleVisibility}
            aria-label={isHidden ? `Show ${title}` : `Hide ${title}`}
            type="button"
          >
            {isHidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          {onRemoveSection && (
            <button
              className={styles.removeButton}
              onClick={() => setIsConfirming(true)}
              type="button"
              title="Remove section"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
      {isConfirming && (
        <ConfirmDialog
          message={`Remove "${title}" section?`}
          onConfirm={() => { onRemoveSection?.(); setIsConfirming(false); }}
          onCancel={() => setIsConfirming(false)}
          noBackdrop
          dialogClassName={styles.sectionDialog}
        />
      )}

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
