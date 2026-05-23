/**
 * Tier3Review -- Review/accept/reject suggested changes tier body for TunePanel.
 *
 * Handles loading, error, empty, and populated states for the change review
 * flow. Composes ChangeList directly (the ScoreHeader lives in TunePanel's
 * sticky section above, so it is NOT rendered here).
 *
 * Covers: D-07, D-11, D-12.
 */
import type { TailorChange, MatchAnalysis } from '../../../types';
import { ChangeList } from './ChangeList';
import styles from './Tier3Review.module.css';

interface Tier3ReviewProps {
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
  matchAnalysis: MatchAnalysis | null;
  onSave: () => void;
  isSaving: boolean;
  savedSuccessfully: boolean;
  onKeepEditing: () => void;
  onViewInDashboard: () => void;
}

export function Tier3Review({
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
  matchAnalysis,
  onSave,
  isSaving,
  savedSuccessfully,
  onKeepEditing,
  onViewInDashboard,
}: Tier3ReviewProps) {
  const totalChanges = changes.length;
  const reviewedCount = appliedChanges.size + skippedChanges.size;
  const pendingCount = totalChanges - reviewedCount;
  const allReviewed = totalChanges > 0 && pendingCount === 0;

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinnerLg} />
        <span>Generating suggestions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        Could not generate suggestions. Check your connection and try again.
      </div>
    );
  }

  if (totalChanges === 0) {
    return (
      <div className={styles.emptyState}>
        <h3 className={styles.emptyHeading}>No changes suggested</h3>
        <p className={styles.emptyBody}>
          Your CV already matches the job description well. Try a different job posting or edit your CV directly.
        </p>
      </div>
    );
  }

  return (
    <>
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
        showFooter={false}
        matchAnalysis={matchAnalysis}
      />

      {allReviewed && !savedSuccessfully && (
        <div className={styles.reviewedBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>All {totalChanges} changes reviewed. Ready to save?</span>
        </div>
      )}

      {!savedSuccessfully && (
        <div className={styles.saveBarSticky}>
          <button
            className={`${styles.primaryBtn}${allReviewed ? ` ${styles.primaryBtnReady}` : ''}`}
            onClick={onSave}
            disabled={isSaving || appliedChanges.size === 0}
            type="button"
          >
            {isSaving ? (<><span className={styles.spinner} /> Saving...</>) : 'Save Tailored CV'}
          </button>
        </div>
      )}

      {savedSuccessfully && (
        <div className={styles.postSavePrompt}>
          <div className={styles.postSaveIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className={styles.postSaveTitle}>Tailored CV saved</div>
          <div className={styles.postSaveActions}>
            <button
              className={styles.postSaveSecondary}
              onClick={onKeepEditing}
              type="button"
            >
              Keep Editing
            </button>
            <button
              className={styles.postSavePrimary}
              onClick={onViewInDashboard}
              type="button"
            >
              View in Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
