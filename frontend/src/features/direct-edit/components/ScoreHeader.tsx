/**
 * ScoreHeader -- Shared score display component.
 *
 * Renders: score circle, label, delta, change counts, collapsible pill
 * summary, and optionally a Before/After view toggle.
 *
 * Used by:
 *   - TunePanel (Tier 3 sticky header) — compact size, with view toggle
 *   - ChangePanel (standalone score header) — default size, no view toggle
 */
import type { MatchAnalysis } from '../../../types';
import { scoreLabel, scoreColorTier } from '../utils/scoreLabel';
import styles from './ScoreHeader.module.css';

interface ScoreHeaderProps {
  matchAnalysis: MatchAnalysis;
  displayScore: number;
  baselineScore: number;
  appliedCount: number;
  rejectedCount: number;
  pendingCount: number;
  /** 'sm' = 48px circle (TunePanel compact), 'md' = 56px circle (ChangePanel). Defaults to 'md'. */
  size?: 'sm' | 'md';
  /** Show the company/role context bar above the score row. */
  companyName?: string;
  roleName?: string;
  /** If provided, renders the Before/After view toggle. */
  viewMode?: 'before' | 'after';
  onViewModeChange?: (mode: 'before' | 'after') => void;
}

export function ScoreHeader({
  matchAnalysis,
  displayScore,
  baselineScore,
  appliedCount,
  rejectedCount,
  pendingCount,
  size = 'md',
  companyName,
  roleName,
  viewMode,
  onViewModeChange,
}: ScoreHeaderProps) {
  const label = scoreLabel(displayScore);
  const tier = scoreColorTier(displayScore);
  const delta = baselineScore > 0 ? displayScore - baselineScore : 0;
  const isCompact = size === 'sm';
  const totalChanges = appliedCount + rejectedCount + pendingCount;

  return (
    <div className={styles.scoreHeader}>
      {/* Context bar — company + role label */}
      {(companyName || roleName) && (
        <div className={styles.contextBar}>
          MATCH SCORE{companyName ? ` · ${companyName}` : ''}{roleName ? ` · ${roleName}` : ''}
        </div>
      )}

      {/* Score circle + meta */}
      <div className={styles.scoreRow}>
        <div className={`${styles.scoreCircle} ${styles[tier]} ${isCompact ? styles.sizeSm : styles.sizeMd}`}>
          {Math.round(displayScore)}%
        </div>
        <div className={styles.scoreMeta}>
          <div className={`${styles.scoreLabel}${isCompact ? ` ${styles.compact}` : ''}`}>{label}</div>
          {delta > 0 && (
            <div className={`${styles.deltaLine}${isCompact ? ` ${styles.compact}` : ''}`}>
              &#x2191; +{Math.round(delta)} pts estimated
            </div>
          )}
          {totalChanges > 0 && (
            <div className={`${styles.changeCounts}${isCompact ? ` ${styles.compact}` : ''}`}>
              {appliedCount} accepted · {rejectedCount} rejected · {pendingCount} remaining
            </div>
          )}
        </div>
      </div>

      {/* Collapsible pill summary */}
      <details className={`${styles.pillDetails}${isCompact ? ` ${styles.compact}` : ''}`}>
        <summary className={`${styles.pillSummary}${isCompact ? ` ${styles.compact}` : ''}`}>
          <span className={styles.pillMatched}>{matchAnalysis.matching.length} matched</span>
          <span className={styles.pillSep}> · </span>
          <span className={styles.pillMissing}>{matchAnalysis.missing.length} gaps</span>
        </summary>
        <div className={styles.pillsExpanded}>
          {matchAnalysis.matching.length > 0 && (
            <div className={styles.pills}>
              {matchAnalysis.matching.map((item, i) => (
                <span key={`m-${i}`} className={`${styles.pill}${isCompact ? ` ${styles.compact}` : ''} ${styles.pillMatchedBg}`}>
                  {item}
                </span>
              ))}
            </div>
          )}
          {matchAnalysis.missing.length > 0 && (
            <div className={styles.pills}>
              {matchAnalysis.missing.map((item, i) => (
                <span key={`g-${i}`} className={`${styles.pill}${isCompact ? ` ${styles.compact}` : ''} ${styles.pillMissingBg}`}>
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Before / After toggle — only when caller passes viewMode + handler */}
      {onViewModeChange && viewMode && (appliedCount + rejectedCount) > 0 && (
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn}${viewMode === 'before' ? ` ${styles.viewToggleBtnActive}` : ''}`}
            onClick={() => onViewModeChange('before')}
            type="button"
          >
            Before
          </button>
          <button
            className={`${styles.viewToggleBtn}${viewMode === 'after' ? ` ${styles.viewToggleBtnActive}` : ''}`}
            onClick={() => onViewModeChange('after')}
            type="button"
          >
            After
          </button>
        </div>
      )}
    </div>
  );
}
