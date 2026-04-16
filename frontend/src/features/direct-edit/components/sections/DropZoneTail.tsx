import { useEntryDrag } from '../../hooks/useEntryDrag';

export function DropZoneTail({
  entryCount,
  entryDrag,
}: {
  entryCount: number;
  entryDrag: ReturnType<typeof useEntryDrag>;
}) {
  if (!entryDrag.isDragging) return null;
  return (
    <div
      style={{ minHeight: '12px' }}
      onDragEnter={(e) => {
        e.stopPropagation();
        e.preventDefault();
        entryDrag.onDragEnter(e, entryCount);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => entryDrag.onDrop(e, entryCount)}
    />
  );
}
