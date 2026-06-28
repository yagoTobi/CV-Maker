/**
 * HighlightContext -- lets each EditableField read its own inline-review highlight spans
 * by fieldPath, without threading props through the whole section tree (WorkSection,
 * EditableBulletList, ...). Provider is mounted around the CV only during Tune review;
 * when absent (the default / legacy editor), useFieldHighlights returns nothing and
 * EditableField behaves exactly as before.
 */
import { createContext, useContext } from 'react';
import type { HighlightSpan } from './EditableField';

export interface HighlightContextValue {
  /** Spans for a given fieldPath, or undefined when that field has no pending change. */
  getSpansFor: (fieldPath: string) => HighlightSpan[] | undefined;
  /** Fired when the user types through a highlighted region (D-16 auto-dismiss). */
  onAutoDismiss?: (changeId: string) => void;
}

export const HighlightContext = createContext<HighlightContextValue | null>(null);

export function useFieldHighlights(fieldPath: string): {
  spans: HighlightSpan[] | undefined;
  onAutoDismiss: ((changeId: string) => void) | undefined;
} {
  const ctx = useContext(HighlightContext);
  if (!ctx) return { spans: undefined, onAutoDismiss: undefined };
  return { spans: ctx.getSpansFor(fieldPath), onAutoDismiss: ctx.onAutoDismiss };
}
