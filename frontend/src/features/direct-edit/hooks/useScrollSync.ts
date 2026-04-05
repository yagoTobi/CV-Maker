/**
 * useScrollSync -- Watches visible CV sections via IntersectionObserver
 * and scrolls the ChangePanel to align cards with the topmost visible section.
 *
 * Direction: CV scroll drives panel scroll (one-way). Panel scroll does NOT
 * drive CV scroll.
 *
 * Anti-jitter: isAutoScrolling ref flag prevents observer -> scroll -> observer loops.
 * Per RESEARCH.md Pitfall 2: the flag prevents the observer from reacting to its own
 * programmatic scroll, which would cause infinite scroll loops.
 */
import { useEffect, useRef, type RefObject } from 'react';

export function useScrollSync(
  cvContainerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean
): void {
  const isAutoScrolling = useRef(false);

  useEffect(() => {
    if (!enabled || !cvContainerRef.current || !panelRef.current) return;

    const cvContainer = cvContainerRef.current;
    const panel = panelRef.current;

    // Query all section elements in the CV container
    const sectionElements = cvContainer.querySelectorAll('[data-section]');
    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip if we triggered this scroll programmatically
        if (isAutoScrolling.current) return;

        // Filter to intersecting entries
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length === 0) return;

        // Sort by boundingClientRect.top ascending to find topmost visible section
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const sectionKey = (visible[0].target as HTMLElement).dataset.section;
        if (!sectionKey) return;

        // Find the first matching card in the panel
        const card = panel.querySelector(`[data-change-section="${sectionKey}"]`);
        if (!card) return;

        // Set anti-jitter flag before programmatic scroll
        isAutoScrolling.current = true;
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Clear flag after scroll settles (150ms debounce)
        setTimeout(() => {
          isAutoScrolling.current = false;
        }, 150);
      },
      { root: null, threshold: 0.3 }
    );

    // Observe all section elements
    sectionElements.forEach((el) => observer.observe(el));

    // Cleanup: disconnect observer
    return () => {
      observer.disconnect();
    };
  }, [enabled, cvContainerRef, panelRef]);
}
