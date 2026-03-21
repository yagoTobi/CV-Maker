import { useRef, useState } from "react";

export function useDrag(onReorder: (from: number, to: number) => void) {
  const dragFromRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Sets draggable=true on the nearest [data-drag-card] ancestor.
  // Cards have NO draggable attribute in JSX — it's only toggled here.
  // This prevents draggable from interfering with text cursor positioning
  // inside child inputs when not actively dragging (key learning #21).
  const onHandleMouseDown = (e: React.MouseEvent) => {
    const card = (e.currentTarget as HTMLElement).closest(
      "[data-drag-card]",
    ) as HTMLElement | null;
    if (card) card.draggable = true;
  };

  const onDragStart = (e: React.DragEvent, i: number) => {
    e.stopPropagation();
    dragFromRef.current = i;
  };
  const onDragEnter = (e: React.DragEvent, i: number) => {
    e.stopPropagation();
    if (dragFromRef.current !== null && dragFromRef.current !== i)
      setDragOver(i);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent, i: number) => {
    e.stopPropagation();
    if (dragFromRef.current !== null && dragFromRef.current !== i)
      onReorder(dragFromRef.current, i);
    dragFromRef.current = null;
    setDragOver(null);
  };
  // Resets draggable=false on the card after drag completes
  const onDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).draggable = false;
    dragFromRef.current = null;
    setDragOver(null);
  };

  return {
    dragOver,
    onHandleMouseDown,
    onDragStart,
    onDragEnter,
    onDragOver,
    onDrop,
    onDragEnd,
  };
}
