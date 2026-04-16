import type { ReactNode } from 'react';
import { useEntryDrag } from '../../hooks/useEntryDrag';

export function EntryDragContainer({
  onReorder,
  children,
}: {
  onReorder: (from: number, to: number) => void;
  children: (entryDrag: ReturnType<typeof useEntryDrag>) => ReactNode;
}) {
  const entryDrag = useEntryDrag(onReorder);
  return <>{children(entryDrag)}</>;
}
