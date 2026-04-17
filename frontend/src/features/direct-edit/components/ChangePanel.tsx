/**
 * ChangePanel -- Side panel container for reviewing AI tailor suggestions.
 *
 * Renders grouped ChangeCards with match summary header, loading/error/empty
 * states, and accept-all button. Pure renderer -- all state comes from props
 * (useTailor via parent).
 *
 * Reused in DirectEditPage via TunePanel.
 *
 * Covers: D-01 (panel layout), D-02 (scroll sync via data-change-section).
 */
import { useEffect, useRef, useMemo } from 'react';
import type { TailorChange, MatchAnalysis } from '../../../types';
import { fieldPathToSection } from '../../../utils/formDataPatch';
import { ChangeCard } from './ChangeCard';
import styles from './ChangePanel.module.css';

interface ChangePanelProps {
  changes: TailorChange[];
  appliedChanges: Set<string>;
  skippedChanges: Set<string>;
  selectedAlternatives: Map<string, number>;
  isApplying: boolean;
  isLoading: boolean;
  error: string | null;
  onAccept: (changeId: string) => Promise<void>;
  onSkip: (changeId: string) => void;
  onUndo: (changeId: string) => Promise<void>;
  onAcceptAll: () => Promise<void>;
  onSelectAlternative: (changeId: string, index: number) => void;
  onEditValue: (changeId: string, newValue: string | string[]) => void;
  onClose: () => void;
  matchAnalysis?: MatchAnalysis | null;
  baselineScore?: number;
  estimatedScore?: number;
  panelRef?: React.RefObject<HTMLDivElement>;
  isOpen?: boolean;
  className?: string;
}

/** Chevron right SVG icon */
const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/** Spinner for loading state */
const Spinner = () => (
  <div className={styles.spinner} />
);

interface SectionGroup {
  sectionKey: string;
  sectionLabel: string;
  changes: TailorChange[];
}

export function ChangePanel({
  changes,
  appliedChanges,
  skippedChanges,
  selectedAlternatives,
  isApplying,
  isLoading,
  error,
  onAccept,
  onSkip,
  onUndo,
  onAcceptAll,
  onSelectAlternative,
  onEditValue,
  onClose,
  matchAnalysis,
  estimatedScore,
  panelRef: externalPanelRef,
  isOpen = true,
  className: classNameOverride,
}: ChangePanelProps) {
  const internalPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? internalPanelRef;

  // Escape key closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelRef.current?.contains(document.activeElement)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, panelRef]);

  // Group changes by section
  const groups: SectionGroup[] = useMemo(() => {
    const map = new Map<string, SectionGroup>();
    for (const change of changes) {
      const key = fieldPathToSection(change.fieldPath);
      if (!map.has(key)) {
        map.set(key, { sectionKey: key, sectionLabel: change.section, changes: [] });
      }
      map.get(key)!.changes.push(change);
    }
    return Array.from(map.values());
  }, [changes]);

  // Count pending changes for accept-all button
  const pendingCount = changes.filter(
    c => !appliedChanges.has(c.id) && !skippedChanges.has(c.id)
  ).length;

  // Score display
  const displayScore = estimatedScore ?? matchAnalysis?.match_score ?? 0;
  const scoreClass = displayScore >= 80
    ? styles.good
    : displayScore >= 60
      ? styles.medium
      : styles.low;

  return (
    <div
      ref={panelRef}
      className={`${styles.panel}${isOpen ? '' : ` ${styles.closed}`}${classNameOverride ? ` ${classNameOverride}` : ''}`}
      role="complementary"
      aria-label="AI suggestion review panel"
    >
      {/* Toggle button */}
      <button
        className={styles.toggleBtn}
        onClick={onClose}
        aria-label="Close review panel"
        type="button"
      >
        <ChevronIcon />
      </button>

      {/* Header */}
      <div className={styles.header}>
        <span>Review Changes ({changes.length})</span>
      </div>

      {/* Match summary */}
      {matchAnalysis && (
        <div className={styles.matchSummary}>
          <div className={`${styles.scoreCircle} ${scoreClass}`}>
            {displayScore}
          </div>
          <div className={styles.pillsContainer}>
            {matchAnalysis.matching.length > 0 && (
              <div className={styles.pills}>
                {matchAnalysis.matching.map((item, i) => (
                  <span key={`m-${i}`} className={`${styles.pill} ${styles.matched}`}>{item}</span>
                ))}
              </div>
            )}
            {matchAnalysis.missing.length > 0 && (
              <div className={styles.pills}>
                {matchAnalysis.missing.map((item, i) => (
                  <span key={`g-${i}`} className={`${styles.pill} ${styles.missing}`}>{item}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className={styles.loadingState}>
          <Spinner />
          <span>Generating suggestions...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={styles.errorState}>
          Could not generate suggestions. Check your connection and try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && changes.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateHeading}>No changes suggested</div>
          <div className={styles.emptyStateBody}>
            Your CV already matches the job description well. Try a different job posting or edit your CV directly.
          </div>
        </div>
      )}

      {/* Change cards grouped by section */}
      {!isLoading && !error && changes.length > 0 && (
        <>
          {groups.map((group) => (
            <div key={group.sectionKey} className={styles.sectionGroup}>
              <div className={styles.sectionGroupLabel}>{group.sectionLabel}</div>
              {group.changes.map((change) => (
                <ChangeCard
                  key={change.id}
                  change={change}
                  isApplied={appliedChanges.has(change.id)}
                  isSkipped={skippedChanges.has(change.id)}
                  selectedAltIndex={selectedAlternatives.get(change.id) ?? 0}
                  isApplying={isApplying}
                  onAccept={() => onAccept(change.id)}
                  onSkip={() => onSkip(change.id)}
                  onUndo={() => onUndo(change.id)}
                  onSelectAlternative={(index) => onSelectAlternative(change.id, index)}
                  onEditValue={(value) => onEditValue(change.id, value)}
                />
              ))}
            </div>
          ))}

          {/* Accept All Remaining button */}
          <button
            className={styles.acceptAllBtn}
            onClick={onAcceptAll}
            disabled={pendingCount === 0 || isApplying}
            type="button"
          >
            Accept All Remaining
          </button>
        </>
      )}
    </div>
  );
}
