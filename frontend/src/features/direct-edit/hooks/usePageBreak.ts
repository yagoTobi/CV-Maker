/**
 * usePageBreak -- Detects when CV content exceeds one US Letter page (11in)
 * and returns the pixel Y offset where page 2 starts.
 *
 * Returns null if content fits on one page.
 * Uses ResizeObserver for dynamic updates as content changes.
 * Includes a 10px threshold to prevent flicker near the boundary (Pitfall 3).
 *
 * Covers: UX-02, D-07, D-08.
 */
import { useState, useEffect } from 'react';

export function usePageBreak(containerRef: React.RefObject<HTMLElement | null>): number | null {
  const [pageBreakY, setPageBreakY] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Debounce timer to prevent flicker (Pitfall 3 from RESEARCH.md)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function calculate() {
      if (!el) return;
      // Convert 11in to pixels at runtime for correct DPI handling
      // Use a temporary element with CSS 'in' units
      const probe = document.createElement('div');
      probe.style.width = '11in';
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);
      const pageHeightPx = probe.offsetWidth; // 11in in pixels
      document.body.removeChild(probe);

      const contentHeight = el.scrollHeight;
      // 10px threshold to prevent flicker near boundary
      if (contentHeight > pageHeightPx + 10) {
        setPageBreakY(pageHeightPx);
      } else {
        setPageBreakY(null);
      }
    }

    function debouncedCalculate() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(calculate, 80); // 80ms debounce
    }

    const observer = new ResizeObserver(debouncedCalculate);
    observer.observe(el);
    calculate(); // Initial check (not debounced)

    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [containerRef]);

  return pageBreakY;
}
