import { useState, useEffect } from 'react';
import type { UseTailorReturn } from '../../hooks/useTailor';
import type { TailorChange } from '../../types';
import { computeWordDiff } from '../../utils/wordDiff';
import styles from './TailorPanel.module.css';

interface TailorPanelProps {
  tailor: UseTailorReturn;
  hasFormData: boolean;
  onGoToField?: (fieldPath: string) => void;
}

const LOADING_MESSAGES = [
  "Reading your CV...",
  "Comparing against job requirements...",
  "Identifying improvement opportunities...",
  "Generating tailored suggestions...",
];

function formatValue(val: string | string[]): string {
  return Array.isArray(val) ? val.join(', ') : val;
}

function InlineDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const segments = computeWordDiff(oldText, newText);
  return (
    <div className={styles.inlineDiff}>
      {segments.map((seg, i) => (
        <span key={i} className={styles[seg.type]}>{seg.text}</span>
      ))}
    </div>
  );
}

function PendingCard({
  change,
  selectedAltIndex,
  onSelectAlt,
  onAccept,
  onSkip,
  onEdit,
  onGoToField,
  isApplying,
}: {
  change: TailorChange;
  selectedAltIndex: number;
  onSelectAlt: (id: string, index: number) => void;
  onAccept: (id: string) => void;
  onSkip: (id: string) => void;
  onEdit: (id: string, newValue: string | string[]) => void;
  onGoToField?: (fieldPath: string) => void;
  isApplying: boolean;
}) {
  const [showDiff, setShowDiff] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const selectedAlt = change.alternatives[selectedAltIndex] ?? change.alternatives[0];
  const currentText = formatValue(change.currentValue);
  const newText = selectedAlt ? formatValue(selectedAlt.value) : '';

  const handleStartEdit = () => {
    setEditValue(newText);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== newText) {
      onEdit(change.id, Array.isArray(change.currentValue) ? trimmed.split(', ') : trimmed);
    }
    setEditing(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.sectionBadge}>{change.section}</span>
          <span className={`${styles.typeBadge} ${styles[change.changeType]}`}>
            {change.changeType}
          </span>
          {onGoToField && (
            <button className={styles.goToFieldBtn} onClick={() => onGoToField(change.fieldPath)}>
              Edit in form
            </button>
          )}
        </div>
        <div className={styles.cardDesc}>{change.description}</div>

        {/* Alternative pills */}
        {change.alternatives.length > 1 && (
          <div className={styles.altPills}>
            {change.alternatives.map((alt, idx) => (
              <button
                key={idx}
                className={`${styles.altPill} ${idx === selectedAltIndex ? styles.altPillActive : ''}`}
                onClick={() => onSelectAlt(change.id, idx)}
              >
                {alt.label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.cardToggles}>
          <button className={styles.diffToggle} onClick={() => setShowDiff(!showDiff)}>
            {showDiff ? 'Hide changes' : 'Show changes'}
          </button>
          <button className={styles.diffToggle} onClick={editing ? handleSaveEdit : handleStartEdit}>
            {editing ? 'Save edit' : 'Edit'}
          </button>
        </div>

        {showDiff && !editing && currentText && newText && (
          <InlineDiff oldText={currentText} newText={newText} />
        )}

        {editing && (
          <textarea
            className={styles.editArea}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            rows={3}
            autoFocus
          />
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

function ReviewedCard({
  change,
  status,
  onUndo,
  isApplying,
}: {
  change: TailorChange;
  status: 'applied' | 'skipped';
  onUndo: (id: string) => void;
  isApplying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isApplied = status === 'applied';

  const truncatedDesc = change.description.length > 60
    ? change.description.slice(0, 60) + '...'
    : change.description;

  if (!expanded) {
    return (
      <div
        className={`${styles.compactCard} ${styles[status]}`}
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(true); }}
      >
        <span className={styles.compactIcon}>{isApplied ? '\u2713' : '\u2013'}</span>
        <span className={styles.compactSection}>{change.section}</span>
        <span className={styles.compactDesc}>{truncatedDesc}</span>
        <svg className={styles.compactChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles[status]}`}>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.sectionBadge}>{change.section}</span>
          <span className={`${styles.statusBadge} ${isApplied ? styles.appliedBadge : styles.skippedBadge}`}>
            {isApplied ? 'Applied' : 'Skipped'}
          </span>
          <button
            className={styles.collapseBtn}
            onClick={e => { e.stopPropagation(); setExpanded(false); }}
            title="Collapse"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6"/>
            </svg>
          </button>
        </div>
        <div className={styles.cardDesc}>{change.description}</div>
        <div className={styles.cardActions}>
          <button className={styles.undoBtn} onClick={() => onUndo(change.id)} disabled={isApplied && isApplying}>
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}

export function TailorPanel({ tailor, hasFormData, onGoToField }: TailorPanelProps) {
  const {
    tailorResponse,
    isLoading,
    error,
    appliedChanges,
    skippedChanges,
    pendingChanges,
    selectedAlternatives,
    isApplying,
    acceptChange,
    skipChange,
    undoChange,
    acceptAllRemaining,
    selectAlternative,
    editChangeValue,
  } = tailor;

  // Rotating loading messages
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMessageIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoading]);

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
          <div className={styles.stateTitle}>{LOADING_MESSAGES[loadingMessageIndex]}</div>
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
            const status = appliedChanges.has(change.id) ? 'applied' as const : 'skipped' as const;
            return <ReviewedCard key={change.id} change={change} status={status} onUndo={undoChange} isApplying={isApplying} />;
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
            return <ReviewedCard key={change.id} change={change} status="applied" onUndo={undoChange} isApplying={isApplying} />;
          }
          if (skippedChanges.has(change.id)) {
            return <ReviewedCard key={change.id} change={change} status="skipped" onUndo={undoChange} isApplying={isApplying} />;
          }
          return (
            <PendingCard
              key={change.id}
              change={change}
              selectedAltIndex={selectedAlternatives.get(change.id) ?? 0}
              onSelectAlt={selectAlternative}
              onAccept={acceptChange}
              onSkip={skipChange}
              onEdit={editChangeValue}
              onGoToField={onGoToField}
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
