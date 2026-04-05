/**
 * EntryWrapper -- Wraps a single entry (job, education, project, etc.) with a
 * hover-reveal delete button and drag grip handle in the left gutter.
 * Optionally shows ConfirmDialog for major entries.
 *
 * Per D-01: Grip handle is absolutely positioned in the left gutter,
 * OUTSIDE the CV content area (left: -28px), mirroring the delete button
 * pattern (absolute at right: -24px).
 * Per D-03: X icon appears in top-right on hover. Invisible when not hovering.
 * Per D-04: Major entries show confirmation, minor entries delete instantly.
 *
 * Covers: CONT-02 (delete entry), CONT-03 (confirm major deletes), DND-02 (entry drag).
 */
import { useState, useCallback } from 'react';
import { GripIcon } from './GripIcon';
import { DropLine } from './DropLine';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './EntryWrapper.module.css';

/** No-op drag handlers for backward compatibility when drag is not wired */
const noopDragHandlers = {
  onGripMouseDown: () => {},
  onDragStart: () => {},
  onDragEnter: () => {},
  onDragOver: () => {},
  onDrop: () => {},
  onDragEnd: () => {},
};

interface EntryWrapperProps {
  onDelete: () => void;
  requireConfirm?: boolean;
  confirmMessage?: string;
  /** Use CSS subgrid layout for grid-child contexts (skills/awards grids) */
  gridItem?: boolean;
  /** Entry index within section for drag positioning */
  entryIndex?: number;
  /** Entry-level drag handlers from useEntryDrag */
  dragHandlers?: {
    onGripMouseDown: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnter: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };
  /** Whether this entry is being dragged */
  isDragSource?: boolean;
  /** Whether to show DropLine before this entry */
  showDropLine?: boolean;
  /** Whether to show grip handle (false for single-entry sections) */
  showGrip?: boolean;
  /** When true, suppress all editing UI (delete button, drag grip) */
  readOnly?: boolean;
  children: React.ReactNode;
}

export function EntryWrapper({
  onDelete,
  requireConfirm = false,
  confirmMessage = 'Delete this entry?',
  gridItem = false,
  entryIndex = 0,
  dragHandlers = noopDragHandlers,
  isDragSource = false,
  showDropLine = false,
  showGrip = true,
  readOnly = false,
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

  const handlers = dragHandlers ?? noopDragHandlers;

  // readOnly mode: render entry content without interactive controls
  if (readOnly) {
    return (
      <div className={gridItem ? styles.entryWrapGrid : styles.entryWrap}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`${gridItem ? styles.entryWrapGrid : styles.entryWrap}${isDragSource ? ` ${styles.dragging}` : ''}`}
      data-drag-entry={entryIndex}
      onDragStart={(e) => handlers.onDragStart(e, entryIndex)}
      onDragEnter={(e) => handlers.onDragEnter(e, entryIndex)}
      onDragOver={handlers.onDragOver}
      onDrop={(e) => handlers.onDrop(e, entryIndex)}
      onDragEnd={handlers.onDragEnd}
    >
      {showDropLine && <DropLine />}
      {showGrip && (
        <button
          className={styles.entryGrip}
          onMouseDown={handlers.onGripMouseDown}
          aria-label="Drag to reorder"
          type="button"
        >
          <GripIcon />
        </button>
      )}
      {children}
      <button
        className={styles.deleteButton}
        onClick={handleDeleteClick}
        aria-label="Delete entry"
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
