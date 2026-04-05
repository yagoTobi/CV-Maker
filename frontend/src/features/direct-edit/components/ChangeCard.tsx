/**
 * ChangeCard -- Individual change card with word-level diff, editable textarea,
 * accept/reject/undo buttons, and alternative selector.
 *
 * Renders a single TailorChange in one of three states: pending, applied, or skipped.
 * All state comes from props (useTailor via ChangePanel). The card is a pure renderer.
 *
 * Covers: D-03 (editable suggestion), D-04 (accept/reject flow), D-05 (alternatives).
 */
import { useState } from 'react';
import type { TailorChange } from '../../../types';
import { computeWordDiff } from '../../../utils/wordDiff';
import { fieldPathToSection } from '../../../utils/formDataPatch';
import styles from './ChangeCard.module.css';

interface ChangeCardProps {
  change: TailorChange;
  isApplied: boolean;
  isSkipped: boolean;
  selectedAltIndex: number;
  isApplying: boolean;
  onAccept: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onSelectAlternative: (index: number) => void;
  onEditValue: (value: string | string[]) => void;
}

function toDisplayString(value: string | string[]): string {
  return Array.isArray(value) ? value.join(', ') : value;
}

function toEditString(value: string | string[]): string {
  return Array.isArray(value) ? value.join('\n') : value;
}

export function ChangeCard({
  change,
  isApplied,
  isSkipped,
  selectedAltIndex,
  isApplying,
  onAccept,
  onSkip,
  onUndo,
  onSelectAlternative,
  onEditValue,
}: ChangeCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const sectionKey = fieldPathToSection(change.fieldPath);
  const activeAlt = change.alternatives[selectedAltIndex] ?? change.alternatives[0];
  const oldText = toDisplayString(change.currentValue);
  const newText = activeAlt ? toDisplayString(activeAlt.value) : oldText;
  const diffSegments = computeWordDiff(oldText, newText);

  // Separate segments for Before/After display
  const beforeSegments = diffSegments.filter(s => s.type === 'same' || s.type === 'removed');
  const afterSegments = diffSegments.filter(s => s.type === 'same' || s.type === 'added');

  const isPending = !isApplied && !isSkipped;

  // Determine card state CSS class
  let stateClass = '';
  if (isApplied) stateClass = ` ${styles.applied}`;
  else if (isSkipped) stateClass = ` ${styles.skipped}`;

  // Determine change type pill CSS class
  const pillClass = styles[change.changeType] || '';

  const handleEditBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    // If the original value was an array, split by newlines
    if (Array.isArray(change.currentValue)) {
      onEditValue(raw.split('\n').filter(Boolean));
    } else {
      onEditValue(raw);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`${styles.card}${stateClass}`}
      data-change-section={sectionKey}
    >
      {/* Header: section badge + change type pill */}
      <div className={styles.header}>
        <span className={styles.sectionBadge}>{change.section}</span>
        <span className={`${styles.changeTypePill} ${pillClass}`}>{change.changeType}</span>
      </div>

      {/* Description */}
      <div className={styles.description}>{change.description}</div>

      {/* Diff view */}
      <div className={styles.diffView}>
        <div className={styles.diffBlock}>
          <div className={styles.diffLabel}>Before:</div>
          <div className={styles.diffContent}>
            {beforeSegments.map((seg, i) => (
              seg.type === 'removed' ? (
                <span key={i} className={styles.diffRemoved}>{seg.text}</span>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            ))}
          </div>
        </div>
        <div className={styles.diffBlock}>
          <div className={styles.diffLabel}>After:</div>
          <div className={styles.diffContent}>
            {afterSegments.map((seg, i) => (
              seg.type === 'added' ? (
                <span key={i} className={styles.diffAdded}>{seg.text}</span>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Edit suggestion link + textarea (D-03) */}
      {isPending && (
        <>
          {!isEditing && (
            <button
              className={styles.editLink}
              onClick={() => setIsEditing(true)}
              type="button"
            >
              Edit suggestion
            </button>
          )}
          {isEditing && (
            <textarea
              className={styles.editTextarea}
              defaultValue={activeAlt ? toEditString(activeAlt.value) : ''}
              onBlur={handleEditBlur}
              aria-label={`Edit suggestion for ${change.section}: ${change.description}`}
              autoFocus
            />
          )}
        </>
      )}

      {/* Alternative selector (if multiple alternatives) */}
      {isPending && change.alternatives.length > 1 && (
        <div className={styles.alternatives}>
          {change.alternatives.map((alt, idx) => (
            <button
              key={idx}
              className={`${styles.altTab}${idx === selectedAltIndex ? ` ${styles.altTabActive}` : ''}`}
              onClick={() => onSelectAlternative(idx)}
              type="button"
            >
              {alt.label}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        {isPending && (
          <>
            <button
              className={styles.rejectBtn}
              onClick={onSkip}
              disabled={isApplying}
              aria-label={`Reject change: ${change.description}`}
              type="button"
            >
              Reject
            </button>
            <button
              className={styles.acceptBtn}
              onClick={onAccept}
              disabled={isApplying}
              aria-label={`Accept change: ${change.description}`}
              type="button"
            >
              Accept
            </button>
          </>
        )}
        {(isApplied || isSkipped) && (
          <button
            className={styles.undoBtn}
            onClick={onUndo}
            disabled={isApplying}
            type="button"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
