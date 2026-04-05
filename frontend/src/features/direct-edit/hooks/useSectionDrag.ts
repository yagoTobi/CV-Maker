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
  /** Track the actual DOM element made draggable so we can reliably reset it */
  const dragElRef = useRef<HTMLElement | null>(null);
  /** Ref mirror of dropIndex so onDragEnd always reads the latest value */
  const dropIndexRef = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);

  /** Reset draggable attribute on the tracked element and clear all state */
  const cleanup = useCallback(() => {
    if (dragElRef.current) {
      dragElRef.current.draggable = false;
      dragElRef.current = null;
    }
    dragFromRef.current = null;
    dropIndexRef.current = null;
    setDropIndex(null);
    setIsDragging(false);
    setDragFromIndex(null);
  }, []);

  const onGripMouseDown = useCallback((e: React.MouseEvent) => {
    const section = (e.currentTarget as HTMLElement).closest(
      '[data-drag-section]',
    ) as HTMLElement | null;
    if (section) {
      section.draggable = true;
      dragElRef.current = section;
    }
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
      dropIndexRef.current = index;
      setDropIndex(index);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent, _index: number) => {
    e.stopPropagation();
    e.preventDefault();
    // Reorder moved to onDragEnd for reliability — contentEditable elements
    // can absorb drop events, but onDragEnd always fires on the dragged element.
  }, []);

  const onDragEnd = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    if (dragFromRef.current !== null && dropIndexRef.current !== null && dragFromRef.current !== dropIndexRef.current) {
      onReorder(dragFromRef.current, dropIndexRef.current);
    }
    cleanup();
  }, [onReorder, cleanup]);

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
