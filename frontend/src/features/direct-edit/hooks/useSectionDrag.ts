/**
 * useSectionDrag -- Section-level drag hook for reordering sections on the web CV.
 *
 * Adapted from the form-builder's useDrag.ts, scoped to [data-drag-section] elements.
 * Uses the contentEditable-safe pattern (D-09): no `draggable` in JSX,
 * grip onMouseDown sets draggable=true, onDragEnd resets draggable=false.
 * Ghost image suppressed via 1x1 transparent canvas (D-05).
 * All handlers call e.stopPropagation() to prevent bubbling.
 */
import { useRef, useState, useCallback } from 'react';

export function useSectionDrag(onReorder: (from: number, to: number) => void) {
  const dragFromRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);

  const onGripMouseDown = useCallback((e: React.MouseEvent) => {
    const section = (e.currentTarget as HTMLElement).closest(
      '[data-drag-section]',
    ) as HTMLElement | null;
    if (section) section.draggable = true;
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
