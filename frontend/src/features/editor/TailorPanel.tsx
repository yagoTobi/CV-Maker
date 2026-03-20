import { useState } from 'react';
import type { UseTailorReturn } from '../../hooks/useTailor';
import type { TailorChange } from '../../types';
import styles from './TailorPanel.module.css';

interface TailorPanelProps {
  tailor: UseTailorReturn;
  hasFormData: boolean;
}

function formatValue(val: string | string[]): string {
  return Array.isArray(val) ? val.join(', ') : val;
}

function PendingCard({
  change,
  onAccept,
  onSkip,
  isApplying,
}: {
  change: TailorChange;
  onAccept: (id: string) => void;
  onSkip: (id: string) => void;
  isApplying: boolean;
}) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div className={styles.card}>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.sectionBadge}>{change.section}</span>
          <span className={`${styles.typeBadge} ${styles[change.changeType]}`}>
            {change.changeType}
          </span>
        </div>
        <div className={styles.cardDesc}>{change.description}</div>
        <button className={styles.diffToggle} onClick={() => setShowDiff(!showDiff)}>
          {showDiff ? 'Hide diff' : 'Show diff'}
        </button>
        {showDiff && (
          <div className={styles.diffView}>
            <div className={styles.diffOld}>- {formatValue(change.currentValue)}</div>
            <div className={styles.diffNew}>+ {formatValue(change.newValue)}</div>
          </div>
        )}
        <div className={styles.cardActions}>
          <button
            className={styles.acceptBtn}
            onClick={() => onAccept(change.id)}
            disabled={isApplying}
          >
            {isApplying ? <span className={styles.spinnerSm} /> : 'Accept'}
          </button>
          <button className={styles.skipBtn} onClick={() => onSkip(change.id)}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function AppliedCard({
  change,
  onUndo,
  isApplying,
}: {
  change: TailorChange;
  onUndo: (id: string) => void;
  isApplying: boolean;
}) {
  return (
    <div className={`${styles.card} ${styles.applied}`}>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.sectionBadge}>{change.section}</span>
          <span className={`${styles.statusBadge} ${styles.appliedBadge}`}>Applied</span>
        </div>
        <div className={styles.cardDesc}>{change.description}</div>
        <div className={styles.cardActions}>
          <button className={styles.undoBtn} onClick={() => onUndo(change.id)} disabled={isApplying}>
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}

function SkippedCard({
  change,
  onUndo,
}: {
  change: TailorChange;
  onUndo: (id: string) => void;
}) {
  return (
    <div className={`${styles.card} ${styles.skipped}`}>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.sectionBadge}>{change.section}</span>
          <span className={`${styles.statusBadge} ${styles.skippedBadge}`}>Skipped</span>
        </div>
        <div className={styles.cardDesc}>{change.description}</div>
        <div className={styles.cardActions}>
          <button className={styles.undoBtn} onClick={() => onUndo(change.id)}>
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}

export function TailorPanel({ tailor, hasFormData }: TailorPanelProps) {
  const {
    tailorResponse,
    isLoading,
    error,
    appliedChanges,
    skippedChanges,
    pendingChanges,
    isApplying,
    acceptChange,
    skipChange,
    undoChange,
    acceptAllRemaining,
  } = tailor;

  // No formData warning
  if (!hasFormData) {
    return (
      <div className={styles.panel}>
        <div className={styles.warningState}>
          <div className={styles.stateTitle}>Structured data required</div>
          <div className={styles.stateText}>
            AI tailoring requires structured CV data. Build your CV using the form builder first.
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <div className={styles.stateTitle}>Generating suggestions...</div>
          <div className={styles.stateText}>Analyzing your CV against the job requirements.</div>
        </div>
        <div className={styles.skeleton}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.errorState}>
          <div className={styles.stateTitle}>Something went wrong</div>
          <div className={styles.stateText}>{error}</div>
        </div>
      </div>
    );
  }

  // No suggestions yet
  if (!tailorResponse) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className={styles.stateTitle}>No suggestions yet</div>
          <div className={styles.stateText}>
            Enter a job description and click Analyze to get tailored suggestions for your CV.
          </div>
        </div>
      </div>
    );
  }

  // All changes reviewed
  const allReviewed = pendingChanges.length === 0 && tailorResponse.changes.length > 0;

  if (allReviewed) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>{tailorResponse.changes.length} suggested changes</div>
        </div>
        <div className={styles.cardList}>
          {tailorResponse.changes.map(change => {
            if (appliedChanges.has(change.id)) {
              return <AppliedCard key={change.id} change={change} onUndo={undoChange} isApplying={isApplying} />;
            }
            return <SkippedCard key={change.id} change={change} onUndo={undoChange} />;
          })}
        </div>
        <div className={styles.footer}>
          <div className={styles.completionState} style={{ padding: '0.5rem 0' }}>
            <div className={styles.stateTitle}>All changes reviewed</div>
            <div className={styles.stateText}>
              {appliedChanges.size} applied, {skippedChanges.size} skipped
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal state — cards list
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>{tailorResponse.changes.length} suggested changes</div>
        <div className={styles.headerSummary}>{tailorResponse.summary}</div>
      </div>

      <div className={styles.cardList}>
        {tailorResponse.changes.map(change => {
          if (appliedChanges.has(change.id)) {
            return <AppliedCard key={change.id} change={change} onUndo={undoChange} isApplying={isApplying} />;
          }
          if (skippedChanges.has(change.id)) {
            return <SkippedCard key={change.id} change={change} onUndo={undoChange} />;
          }
          return (
            <PendingCard
              key={change.id}
              change={change}
              onAccept={acceptChange}
              onSkip={skipChange}
              isApplying={isApplying}
            />
          );
        })}
      </div>

      {pendingChanges.length > 0 && (
        <div className={styles.footer}>
          <button
            className={styles.acceptAllBtn}
            onClick={acceptAllRemaining}
            disabled={isApplying}
          >
            {isApplying ? (
              <><span className={styles.spinnerSm} /> Applying...</>
            ) : (
              `Accept All Remaining (${pendingChanges.length})`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
