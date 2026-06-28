/**
 * useInlineReview -- orchestration "brain" for the on-CV Grammarly-style review.
 *
 * Composes useChangeHighlights (TailorChange -> DOM range mapping + active tracking) and
 * exposes everything the CV layer + ChangePopover need:
 *   - highlightSpansByFieldPath: spans to feed each EditableField (one whole-field span per
 *     PENDING change -> every change is visible at once, not just the active one [G5]).
 *   - activeChange / activeSeverity / getRect: drive ChangePopover.
 *   - setActiveChange: clicking a highlight anchors the popover [G6].
 *   - acceptActive / skipActive: apply via useTailor, then auto-advance to the next change
 *     in document order [D-20].
 *   - autoDismiss: typing through a highlight skips it [D-16].
 *
 * Whole-field granularity (substring offsets deferred per 13-CONTEXT): startOffset 0,
 * endOffset large -> EditableField clamps to value.length.
 */
import { useCallback, useMemo } from 'react';
import type { RefObject } from 'react';
import type { TailorChange } from '../../../types';
import type { HighlightSpan } from '../components/editor-primitives/EditableField';
import type { Severity } from '../utils/severity';
import { useChangeHighlights } from './useChangeHighlights';
import type { UseTailorReturn } from './useTailor';

/** Whole-field highlight end offset; EditableField clamps this to the field's length. */
const WHOLE_FIELD_END = Number.MAX_SAFE_INTEGER;

/** The slice of useTailor that inline review depends on (keeps the hook loosely coupled). */
export type InlineReviewTailor = Pick<
  UseTailorReturn,
  | 'tailorResponse'
  | 'appliedChanges'
  | 'skippedChanges'
  | 'acceptChange'
  | 'skipChange'
  | 'selectAlternative'
  | 'editChangeValue'
  | 'selectedAlternatives'
>;

export interface UseInlineReviewParams {
  tailor: InlineReviewTailor;
  containerRef: RefObject<HTMLElement | null>;
}

export interface UseInlineReviewResult {
  highlightSpansByFieldPath: Map<string, HighlightSpan[]>;
  activeChange: TailorChange | null;
  activeSeverity: Severity | null;
  getRect: () => DOMRect | null;
  activeSelectedIndex: number;
  setActiveChange: (changeId: string | null) => void;
  acceptActive: (changeId: string) => void;
  skipActive: (changeId: string) => void;
  advance: (direction: 'next' | 'prev') => void;
  close: () => void;
  autoDismiss: (changeId: string) => void;
  selectAlternative: (changeId: string, index: number) => void;
  editChange: (changeId: string, value: string | string[]) => void;
}

export function useInlineReview({
  tailor,
  containerRef,
}: UseInlineReviewParams): UseInlineReviewResult {
  const changes = tailor.tailorResponse?.changes ?? [];

  const {
    activeChangeId,
    setActiveChangeId,
    pendingChanges,
    severityMap,
    getRangeForChange,
    advanceTo,
  } = useChangeHighlights({
    changes,
    applied: tailor.appliedChanges,
    skipped: tailor.skippedChanges,
    containerRef,
  });

  // G5: one whole-field span per PENDING change. One-Suggestion-per-field guarantees no
  // two spans land on the same fieldPath, so each maps to a single span.
  const highlightSpansByFieldPath = useMemo(() => {
    const map = new Map<string, HighlightSpan[]>();
    for (const c of pendingChanges) {
      const severity: Severity = severityMap.get(c.id) ?? 'minor';
      map.set(c.fieldPath, [
        {
          changeId: c.id,
          severity,
          isActive: c.id === activeChangeId,
          startOffset: 0,
          endOffset: WHOLE_FIELD_END,
        },
      ]);
    }
    return map;
  }, [pendingChanges, severityMap, activeChangeId]);

  const activeChange = useMemo(
    () => changes.find((c) => c.id === activeChangeId) ?? null,
    [changes, activeChangeId],
  );

  const activeSeverity: Severity | null = activeChangeId
    ? severityMap.get(activeChangeId) ?? null
    : null;

  // Live rect callback — floating-ui's autoUpdate reads this each tick, so it must
  // re-query the DOM range every call rather than return a stale snapshot.
  const getRect = useCallback(
    (): DOMRect | null =>
      activeChangeId
        ? getRangeForChange(activeChangeId)?.getBoundingClientRect() ?? null
        : null,
    [activeChangeId, getRangeForChange],
  );

  const activeSelectedIndex = activeChangeId
    ? tailor.selectedAlternatives.get(activeChangeId) ?? 0
    : 0;

  // Accept/skip then auto-advance to the next change in document order (D-20).
  const acceptActive = useCallback(
    (changeId: string) => {
      const next = advanceTo('next', changeId);
      void tailor.acceptChange(changeId);
      setActiveChangeId(next);
    },
    [advanceTo, tailor, setActiveChangeId],
  );

  const skipActive = useCallback(
    (changeId: string) => {
      const next = advanceTo('next', changeId);
      tailor.skipChange(changeId);
      setActiveChangeId(next);
    },
    [advanceTo, tailor, setActiveChangeId],
  );

  const advance = useCallback(
    (direction: 'next' | 'prev') => {
      setActiveChangeId(advanceTo(direction, activeChangeId));
    },
    [advanceTo, activeChangeId, setActiveChangeId],
  );

  const close = useCallback(() => setActiveChangeId(null), [setActiveChangeId]);

  // D-16: typing through a highlighted region skips that change.
  const autoDismiss = useCallback(
    (changeId: string) => {
      tailor.skipChange(changeId);
    },
    [tailor],
  );

  return {
    highlightSpansByFieldPath,
    activeChange,
    activeSeverity,
    getRect,
    activeSelectedIndex,
    setActiveChange: setActiveChangeId,
    acceptActive,
    skipActive,
    advance,
    close,
    autoDismiss,
    selectAlternative: tailor.selectAlternative,
    editChange: tailor.editChangeValue,
  };
}
