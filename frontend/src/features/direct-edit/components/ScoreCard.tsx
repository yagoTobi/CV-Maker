/**
 * ScoreCard -- Floating bottom-right card showing baseline → current match score.
 *
 * D-21: live evolution as accepts roll in. Three delta states colour-coded
 * (positive / zero / negative) and an additional `neutral` state when no
 * baseline is available yet (pre-Run-CV-tune).
 *
 * Returns null when isVisible is false so DirectEditPage can keep it mounted
 * unconditionally and toggle via the prop.
 */
import type React from 'react';
import styles from './ScoreCard.module.css';

export interface ScoreCardProps {
  /** Baseline match score from the JD analysis; null until tune fetched. */
  baselineScore: number | null;
  /** Live current score, computed in DirectEditPage from accepted changes. */
  currentScore: number;
  /** Total pending+accepted+skipped count (i.e. tailorResponse.changes.length). */
  totalPending: number;
  /** Number of changes the user has accepted so far. */
  acceptedCount: number;
  /** Toggle visibility (DirectEditPage flips this when entering review). */
  isVisible: boolean;
}

export function ScoreCard(props: ScoreCardProps): React.JSX.Element | null {
  const { baselineScore, currentScore, totalPending, acceptedCount, isVisible } = props;

  if (!isVisible) return null;

  const delta = baselineScore !== null ? currentScore - baselineScore : null;
  const deltaClass =
    delta === null
      ? styles.neutral
      : delta > 0
        ? styles.positive
        : delta < 0
          ? styles.negative
          : styles.zero;

  const deltaLabel =
    delta === null
      ? 'Run CV tune to track score evolution'
      : `${delta > 0 ? '+' : ''}${Math.round(delta)}%`;

  const progressDenominator = Math.max(1, totalPending);
  const progressPct = Math.min(100, (acceptedCount / progressDenominator) * 100);

  return (
    <div className={styles.card} role="status" aria-live="polite">
      <div className={styles.scoreRow}>
        <span className={styles.score}>{Math.round(currentScore)}%</span>
        <span className={`${styles.delta} ${deltaClass}`}>{deltaLabel}</span>
      </div>
      <div className={styles.progressLabel}>
        {acceptedCount}/{totalPending} reviewed
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}
