/**
 * usePageBreak -- Estimates where the CV sheet breaks across multiple US Letter
 * pages and returns the pixel Y offsets (relative to the sheet's top) of every
 * page boundary.
 *
 * This is a *fast, CSS-only estimate* measured directly off the rendered sheet.
 * It is intentionally an approximation: the browser's text layout is not the
 * same engine as pdflatex, so the real page count comes from usePageCount (an
 * actual compile). The two are reconciled in DirectEditPage.
 *
 * Geometry (matches resume.cls + med-length-proff-cv.tex.j2):
 *   - Paper:  US Letter, 11in tall
 *   - Margins: top/bottom 0.3in  ->  usable text band = 10.4in per page
 * A page break therefore falls every 10.4in of *content* (not 11in), offset by
 * the sheet's own top padding.
 *
 * Notes:
 *   - Measures the sheet element (.template), NOT the full-width container, so
 *     `scrollHeight` reflects the actual CV content. (.template must NOT have
 *     min-height: 100vh, which would inflate the measurement.)
 *   - Inch->px conversion is done at runtime via a probe element so browser
 *     zoom (which scales both the probe and the content) stays consistent.
 *   - ResizeObserver + debounce handle live edits; document.fonts.ready handles
 *     the EB Garamond webfont swap that shifts layout after first paint.
 *   - `estPages` (fractional) is exposed so callers can gate the expensive
 *     real-compile page count.
 *
 * Covers: UX-02, D-07, D-08.
 */
import { useState, useEffect } from 'react';

const PAGE_HEIGHT_IN = 11;
const MARGIN_TOP_IN = 0.3;
const MARGIN_BOTTOM_IN = 0.3;
/** Usable text band per page = 10.4in. */
const TEXT_HEIGHT_IN = PAGE_HEIGHT_IN - MARGIN_TOP_IN - MARGIN_BOTTOM_IN;

/** Ignore overflow smaller than this to prevent flicker right at the boundary. */
const FLICKER_THRESHOLD_PX = 10;
const DEBOUNCE_MS = 80;

export interface PageBreakInfo {
  /** Y offset (px, from the sheet's top edge) of each page boundary, in order. */
  offsets: number[];
  /** Fractional estimated page count (contentHeight / pageTextHeight). */
  estPages: number;
}

const EMPTY: PageBreakInfo = { offsets: [], estPages: 0 };

/** Measure how many CSS pixels one inch renders as (zoom-aware). */
function measurePxPerInch(): number {
  const probe = document.createElement('div');
  probe.style.width = '1in';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.height = '0';
  document.body.appendChild(probe);
  const px = probe.offsetWidth;
  document.body.removeChild(probe);
  return px;
}

export function usePageBreak(sheetRef: React.RefObject<HTMLElement | null>): PageBreakInfo {
  const [info, setInfo] = useState<PageBreakInfo>(EMPTY);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return; // initial state is already EMPTY

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function calculate() {
      if (!el || cancelled) return;

      const pxPerInch = measurePxPerInch();
      const pageTextPx = TEXT_HEIGHT_IN * pxPerInch;
      // Guard against a zero/garbage measurement (e.g. jsdom, detached node).
      if (pageTextPx <= 0) {
        setInfo(EMPTY);
        return;
      }

      const cs = getComputedStyle(el);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      const contentHeight = Math.max(0, el.scrollHeight - padTop - padBottom);

      const estPages = contentHeight / pageTextPx;

      const offsets: number[] = [];
      for (let n = 1; n * pageTextPx < contentHeight - FLICKER_THRESHOLD_PX; n++) {
        offsets.push(Math.round(padTop + n * pageTextPx));
      }

      // Skip the state update when nothing meaningful changed, so observing the
      // (absolutely-positioned, zero-height) indicators can't cause churn.
      setInfo((prev) => {
        const sameOffsets =
          prev.offsets.length === offsets.length &&
          prev.offsets.every((v, i) => Math.abs(v - offsets[i]) < 0.5);
        if (sameOffsets && Math.abs(prev.estPages - estPages) < 0.001) {
          return prev;
        }
        return { offsets, estPages };
      });
    }

    function debouncedCalculate() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(calculate, DEBOUNCE_MS);
    }

    const observer = new ResizeObserver(debouncedCalculate);
    observer.observe(el);
    calculate(); // initial (not debounced)

    // Recompute once the CV webfont has loaded -- it shifts vertical metrics.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => calculate()).catch(() => {});
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [sheetRef]);

  return info;
}
