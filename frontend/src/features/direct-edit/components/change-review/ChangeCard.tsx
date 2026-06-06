import { useState } from 'react';
import type { TailorChange } from '../../../../types';
import { fieldPathToSection } from '../../../../utils/formDataPatch';
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
  const [isExpanded, setIsExpanded] = useState(false);

  const sectionKey = fieldPathToSection(change.fieldPath);
  const activeAlt = change.alternatives[selectedAltIndex] ?? change.alternatives[0];
  const oldText = toDisplayString(change.currentValue);
  const newText = activeAlt ? toDisplayString(activeAlt.value) : oldText;

  const isPending = !isApplied && !isSkipped;

  let stateClass = '';
  if (isApplied) stateClass = ` ${styles.applied}`;
  else if (isSkipped) stateClass = ` ${styles.skipped}`;

  const handleEditBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    if (Array.isArray(change.currentValue)) {
      onEditValue(raw.split('\n').filter(Boolean));
    } else {
      onEditValue(raw);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`${styles.card}${stateClass}${isExpanded ? ` ${styles.expanded}` : ''}`}
      data-change-section={sectionKey}
    >
      {/* Collapsed header — always visible, click to expand */}
      <div
        className={styles.cardHeader}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className={styles.cardHeaderLeft}>
          <div className={styles.title}>{change.description}</div>
        </div>
        <svg
          className={`${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded body — Before/After, alternatives, actions */}
      {isExpanded && (
        <div className={styles.cardBody}>
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

          {isPending && (
            <>
              {!isEditing && (
                <button className={styles.editLink} onClick={() => setIsEditing(true)} type="button">
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

          <div className={styles.beforeBlock}>
            <div className={styles.blockLabel}>BEFORE</div>
            <div className={styles.blockContent}>{oldText}</div>
          </div>

          <div className={styles.afterBlock}>
            <div className={styles.blockLabel}>AFTER</div>
            <div className={styles.blockContent}>{newText}</div>
          </div>

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
      )}
    </div>
  );
}
