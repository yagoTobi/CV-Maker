/**
 * useEntryDrag -- Entry-level drag hook for reordering entries within a section.
 *
 * Nearly identical to useSectionDrag but uses [data-drag-entry] instead of
 * [data-drag-section] for the closest selector in onGripMouseDown.
 * All handlers call e.stopPropagation() to prevent bubbling to section-level
 * drag handlers (D-06 entry isolation).
 * Ghost image suppressed via 1x1 transparent canvas (D-05).
 * contentEditable-safe pattern (D-09): dynamic draggable toggling.
 */
import { useRef, useState, useCallback } from 'react';

export function useEntryDrag(onReorder: (from: number, to: number) => void) {
  const dragFromRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);

  const onGripMouseDown = useCallback((e: React.MouseEvent) => {
    const entry = (e.currentTarget as HTMLElement).closest(
      '[data-drag-entry]',
    ) as HTMLElement | null;
    if (entry) entry.draggable = true;
  }, []);

  const onDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.stopPropagation();
    dragFromRef.current = index;
    setDragFromIndex(index);
    setIsDragging(true);

    // Suppress browser ghost image with 1x1 transparent canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 1;
      canvasRef.current.height = 1;
    }
    e.dataTransfer.setDragImage(canvasRef.current, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (dragFromRef.current !== null && dragFromRef.current !== index) {
      setDropIndex(index);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent, index: number) => {
    e.stopPropagation();
    if (dragFromRef.current !== null && dragFromRef.current !== index) {
      onReorder(dragFromRef.current, index);
    }
    dragFromRef.current = null;
    setDropIndex(null);
    setIsDragging(false);
    setDragFromIndex(null);
  }, [onReorder]);

  const onDragEnd = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).draggable = false;
    dragFromRef.current = null;
    setDropIndex(null);
    setIsDragging(false);
    setDragFromIndex(null);
  }, []);

  return {
    onGripMouseDown,
    onDragStart,
    onDragEnter,
    onDragOver,
    onDrop,
    onDragEnd,
    dropIndex,
    isDragging,
    dragFromIndex,
  };
}
