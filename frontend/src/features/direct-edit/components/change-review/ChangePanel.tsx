/**
 * ChangePanel -- Standalone side panel for reviewing AI tailor suggestions.
 *
 * Always renders its own toggle, score header, change list, and footer.
 * No hide* props — if you need to suppress chrome, compose ScoreHeader +
 * ChangeList directly (as Tier3Review does inside TunePanel).
 *
 * Covers: D-01 (panel layout), D-02 (scroll sync via data-change-section).
 */
import { useEffect, useRef } from 'react';
import type { TailorChange, MatchAnalysis } from '../../../../types';
import { ScoreHeader } from '../ScoreHeader';
import { ChangeList } from './ChangeList';
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
  companyName?: string;
  roleName?: string;
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
  baselineScore,
  estimatedScore,
  companyName,
  roleName,
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

  const pendingCount = changes.filter(
    c => !appliedChanges.has(c.id) && !skippedChanges.has(c.id)
  ).length;

  const baseScore = baselineScore ?? matchAnalysis?.match_score ?? 0;
  const displayScore = estimatedScore ?? baseScore;

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

      {/* Score header */}
      {matchAnalysis && (
        <ScoreHeader
          matchAnalysis={matchAnalysis}
          displayScore={displayScore}
          baselineScore={baseScore}
          appliedCount={appliedChanges.size}
          rejectedCount={skippedChanges.size}
          pendingCount={pendingCount}
          size="md"
          companyName={companyName}
          roleName={roleName}
        />
      )}

      {/* Fallback header when there's no match analysis */}
      {!matchAnalysis && (
        <div className={styles.header}>
          <span>Review Changes ({changes.length})</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
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

      {/* Change list */}
      {!isLoading && !error && changes.length > 0 && (
        <ChangeList
          changes={changes}
          appliedChanges={appliedChanges}
          skippedChanges={skippedChanges}
          selectedAlternatives={selectedAlternatives}
          isApplying={isApplying}
          pendingCount={pendingCount}
          onAccept={onAccept}
          onSkip={onSkip}
          onUndo={onUndo}
          onAcceptAll={onAcceptAll}
          onSelectAlternative={onSelectAlternative}
          onEditValue={onEditValue}
          showFooter={true}
          matchAnalysis={matchAnalysis}
        />
      )}
    </div>
  );
}
