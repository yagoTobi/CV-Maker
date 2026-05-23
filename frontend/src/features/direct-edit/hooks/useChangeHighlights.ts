/**
 * useChangeHighlights -- maps TailorChange[] to inline DOM ranges for highlight rendering.
 *
 * Implements D-04 (highlight overlay), D-12 (severity inference), D-19 (Prev/Next nav),
 * D-23 (section-level dismiss), D-25 (severity per change for all-reviewed recap).
 *
 * Returns:
 *   - activeChangeId / setActiveChangeId         -> active highlight (popover anchor)
 *   - pendingChanges                              -> changes minus applied minus skipped
 *   - severityMap                                 -> Map<changeId, Severity> for ALL changes
 *   - getRangeForChange(id)                       -> live DOM Range or null
 *   - documentOrderIds                            -> pendingChange ids sorted by [data-field-path] DOM order
 *   - advanceTo(direction, currentId)             -> next/prev id by document order, or null at edges
 *   - dismissSection(sectionKey)                  -> ids of pendingChanges in that section (consumer wires skipChange)
 *
 * Hook input is an OBJECT to keep the call site self-documenting and to match the
 * Wave 0 test scaffold (frontend/src/__tests__/useChangeHighlights.test.ts).
 *
 * SAFETY: getRangeForChange uses CSS.escape on fieldPath before passing to querySelector,
 * defending against AI-emitted paths containing CSS-special characters (T-13-02-04).
 */
import { useState, useCallback, useMemo } from 'react';
import type { RefObject } from 'react';
import type { TailorChange } from '../../../types';
import { fieldPathToSection } from '../../../utils/formDataPatch';
import { inferSeverity, type Severity } from '../utils/severity';

export interface UseChangeHighlightsParams {
  changes: TailorChange[];
  applied: Set<string>;
  skipped: Set<string>;
  containerRef: RefObject<HTMLElement | null>;
}

export interface UseChangeHighlightsResult {
  activeChangeId: string | null;
  setActiveChangeId: (id: string | null) => void;
  pendingChanges: TailorChange[];
  severityMap: Map<string, Severity>;
  getRangeForChange: (id: string) => Range | null;
  documentOrderIds: string[];
  advanceTo: (direction: 'next' | 'prev', currentId: string | null) => string | null;
  dismissSection: (sectionKey: string) => string[];
}

/** Locate the field element for a fieldPath inside the CV container, with CSS.escape safety. */
function findFieldEl(
  container: HTMLElement | null,
  fieldPath: string,
): HTMLElement | null {
  if (!container) return null;
  const safe = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(fieldPath)
    : fieldPath.replace(/(["\\[\]])/g, '\\$1');
  return container.querySelector<HTMLElement>(`[data-field-path="${safe}"]`);
}

/** Walk text nodes inside `el`. */
function* textNodes(el: Node): Generator<Text> {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    yield node as Text;
    node = walker.nextNode();
  }
}

/**
 * Try to find the substring `needle` inside the text content of `el` and return a Range
 * spanning that substring. Returns a collapsed end-of-element Range when needle is empty
 * or not found.
 */
function rangeForSubstring(el: HTMLElement, needle: string): Range {
  const range = document.createRange();
  if (!needle) {
    range.selectNodeContents(el);
    range.collapse(false);
    return range;
  }
  // Build offset map across text nodes.
  const nodes: Text[] = [];
  let total = '';
  for (const t of textNodes(el)) {
    nodes.push(t);
    total += t.textContent ?? '';
  }
  const idx = total.indexOf(needle);
  if (idx === -1) {
    // Fallback: select entire element contents.
    range.selectNodeContents(el);
    return range;
  }
  // Locate the text node containing idx and idx+needle.length.
  const startGlobal = idx;
  const endGlobal = idx + needle.length;
  let consumed = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  for (const t of nodes) {
    const len = (t.textContent ?? '').length;
    if (!startNode && consumed + len >= startGlobal) {
      startNode = t;
      startOffset = startGlobal - consumed;
    }
    if (!endNode && consumed + len >= endGlobal) {
      endNode = t;
      endOffset = endGlobal - consumed;
      break;
    }
    consumed += len;
  }
  if (startNode && endNode) {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
  } else {
    range.selectNodeContents(el);
  }
  return range;
}

export function useChangeHighlights(
  params: UseChangeHighlightsParams,
): UseChangeHighlightsResult {
  const { changes, applied, skipped, containerRef } = params;

  const [activeChangeId, setActiveChangeId] = useState<string | null>(null);

  const pendingChanges = useMemo(
    () => changes.filter((c) => !applied.has(c.id) && !skipped.has(c.id)),
    [changes, applied, skipped],
  );

  // Severity map covers ALL changes (not just pending) — accepted/skipped still need
  // severity for the all-reviewed recap state (D-25).
  const severityMap = useMemo<Map<string, Severity>>(() => {
    const m = new Map<string, Severity>();
    for (const c of changes) {
      m.set(c.id, inferSeverity(c));
    }
    return m;
  }, [changes]);

  // Document order: query [data-field-path] in DOM order, then sort pendingChanges
  // by indexOf(fieldPath). DOM is a live side input — read containerRef.current
  // during render to get the most recent layout. Same pattern as useTailor.ts
  // baselineScoreRef.current usage (codebase convention for derived ref values).
  // When ref is null or no [data-field-path] matches, fall back to pending order.
  const documentOrderIds = useMemo<string[]>(() => {
    const container = containerRef.current;
    if (!container) return pendingChanges.map((c) => c.id);
    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>('[data-field-path]'),
    );
    const orderMap = new Map<string, number>();
    nodes.forEach((n, i) => {
      const path = n.getAttribute('data-field-path');
      if (path && !orderMap.has(path)) orderMap.set(path, i);
    });
    const FALLBACK = Number.MAX_SAFE_INTEGER;
    return [...pendingChanges]
      .sort((a, b) => {
        const ai = orderMap.get(a.fieldPath) ?? FALLBACK;
        const bi = orderMap.get(b.fieldPath) ?? FALLBACK;
        return ai - bi;
      })
      .map((c) => c.id);
  }, [pendingChanges, containerRef]);

  const getRangeForChange = useCallback(
    (id: string): Range | null => {
      const change = changes.find((c) => c.id === id);
      if (!change) return null;
      const container = containerRef.current;
      if (!container) return null;
      const fieldEl = findFieldEl(container, change.fieldPath);
      if (!fieldEl) return null;

      if (change.changeType === 'add') {
        const r = document.createRange();
        r.selectNodeContents(fieldEl);
        r.collapse(false); // collapsed at end (insertion point)
        return r;
      }
      if (change.changeType === 'remove') {
        const r = document.createRange();
        r.selectNodeContents(fieldEl);
        return r;
      }
      // modify: try to find substring matching currentValue's display string;
      // fall back to whole-field range when not found.
      const needle =
        typeof change.currentValue === 'string'
          ? change.currentValue
          : Array.isArray(change.currentValue)
            ? change.currentValue.join(' ')
            : '';
      return rangeForSubstring(fieldEl, needle);
    },
    [changes, containerRef],
  );

  const advanceTo = useCallback(
    (direction: 'next' | 'prev', currentId: string | null): string | null => {
      if (documentOrderIds.length === 0) return null;
      if (currentId === null) {
        return direction === 'next'
          ? (documentOrderIds[0] ?? null)
          : (documentOrderIds[documentOrderIds.length - 1] ?? null);
      }
      const idx = documentOrderIds.indexOf(currentId);
      if (idx === -1) {
        return direction === 'next'
          ? (documentOrderIds[0] ?? null)
          : (documentOrderIds[documentOrderIds.length - 1] ?? null);
      }
      const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= documentOrderIds.length) return null;
      return documentOrderIds[nextIdx] ?? null;
    },
    [documentOrderIds],
  );

  const dismissSection = useCallback(
    (sectionKey: string): string[] => {
      const ids: string[] = [];
      for (const c of pendingChanges) {
        if (fieldPathToSection(c.fieldPath) === sectionKey) {
          ids.push(c.id);
        }
      }
      return ids;
    },
    [pendingChanges],
  );

  return {
    activeChangeId,
    setActiveChangeId,
    pendingChanges,
    severityMap,
    getRangeForChange,
    documentOrderIds,
    advanceTo,
    dismissSection,
  };
}
