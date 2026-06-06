/**
 * GapPromptChips — chip array seeded by match-analysis `missing[]` (D-04).
 * Click a chip to reveal an inline textarea (D-05). On blur, emits the array
 * of clarifications restricted to chips the user actually typed into (D-06).
 *
 * T-13-03-02: textarea has maxLength={500} as defense in depth alongside
 * the backend Pydantic validator added in Plan 01.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import styles from './GapPromptChips.module.css';

export interface GapPromptChipsProps {
  /** Missing-from-CV requirements returned by /chat/match-analysis. */
  missing: string[];
  /** Called on textarea blur with the array of typed clarifications (touched chips only). */
  onClarificationsChange: (clarifications: string[]) => void;
}

const MAX_CLARIFICATION_LENGTH = 500;

export function GapPromptChips({
  missing,
  onClarificationsChange,
}: GapPromptChipsProps): React.JSX.Element {
  // NOTE: `missing` reference changes (e.g. fresh match-analysis arriving
  // with a new chip set) are handled by remounting via React `key=` from the
  // parent. Auto-resetting in this component would require setState-in-render
  // (lint error) or setState-in-effect (cascading-render lint error) under
  // React 19's stricter rules.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [values, setValues] = useState<string[]>(() => missing.map(() => ''));
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-focus the textarea when it opens.
  useEffect(() => {
    if (expandedIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expandedIndex]);

  const emitClarifications = useCallback(
    (latestValues: string[]) => {
      const trimmed = latestValues.map((v) => v.trim()).filter(Boolean);
      onClarificationsChange(trimmed);
    },
    [onClarificationsChange],
  );

  const handleChipClick = useCallback((i: number) => {
    setExpandedIndex((prev) => (prev === i ? null : i));
  }, []);

  const handleChange = useCallback(
    (i: number) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setValues((vs) => vs.map((x, idx) => (idx === i ? next : x)));
    },
    [],
  );

  const handleBlur = useCallback(() => {
    emitClarifications(values);
    // Collapse on blur so re-clicking the same chip cleanly re-opens it.
    setExpandedIndex(null);
  }, [emitClarifications, values]);

  if (missing.length === 0) {
    return (
      <div className={styles.chipArray}>
        <h4 className={styles.emptyHeading}>No gaps detected</h4>
      </div>
    );
  }

  return (
    <div className={styles.chipArray}>
      {missing.map((gap, i) => {
        const isExpanded = expandedIndex === i;
        const chipClass = [styles.chip, isExpanded ? styles.chipExpanded : '']
          .filter(Boolean)
          .join(' ');
        return (
          <div key={`${gap}-${i}`} className={isExpanded ? styles.chipGroup : styles.chipWrap}>
            <button
              type="button"
              className={chipClass}
              onClick={() => handleChipClick(i)}
              aria-expanded={isExpanded}
              aria-label={gap}
            >
              {gap}
            </button>
            {isExpanded && (
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={values[i] ?? ''}
                onChange={handleChange(i)}
                onBlur={handleBlur}
                placeholder="Click to add details"
                aria-label={`Add details for ${gap}`}
                maxLength={500}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Exported for downstream tests / consumers that want to align caps.
export const GAP_PROMPT_MAX_LENGTH = MAX_CLARIFICATION_LENGTH;
