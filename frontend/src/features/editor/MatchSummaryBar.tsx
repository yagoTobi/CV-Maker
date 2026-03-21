import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchAnalysis as MatchAnalysisType } from '../../types';
import { MatchAnalysis } from './MatchAnalysis';
import styles from './MatchSummaryBar.module.css';

interface MatchSummaryBarProps {
  analysis: MatchAnalysisType;
  isLoading: boolean;
  onReanalyze: () => void;
  hasJobDescription: boolean;
  estimatedScore?: number;
  companyName?: string;
  roleName?: string;
  reviewedCount?: number;
  totalChanges?: number;
}

function getScoreColor(score: number) {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Weak';
}

const LOW_MATCH_THRESHOLD = 40;

export function MatchSummaryBar({ analysis, isLoading, onReanalyze, hasJobDescription, estimatedScore, companyName, roleName, reviewedCount = 0, totalChanges = 0 }: MatchSummaryBarProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const scoreColor = getScoreColor(analysis.match_score);
  const gapCount = analysis.missing.length;
  const matchCount = analysis.matching.length;
  const showEstimated = estimatedScore != null && estimatedScore > 0 && Math.round(estimatedScore) !== analysis.match_score;
  const showNewBaseBanner = analysis.match_score < LOW_MATCH_THRESHOLD && !bannerDismissed;

  return (
    <div className={styles.wrapper}>
      <button className={styles.bar} onClick={() => setExpanded(!expanded)}>
        <div className={styles.scoreBadge} style={{ background: scoreColor }}>
          {analysis.match_score}%
        </div>
        <span className={styles.scoreLabel} style={{ color: scoreColor }}>
          {getScoreLabel(analysis.match_score)}
        </span>
        {showEstimated && (
          <>
            <span className={styles.estimatedArrow}>&rarr;</span>
            <span className={styles.estimatedScore}>est. {Math.round(estimatedScore!)}%</span>
          </>
        )}
        <span className={styles.separator} />
        <span className={styles.stats}>
          {gapCount > 0 && (
            <span className={styles.gaps}>{gapCount} gap{gapCount !== 1 ? 's' : ''}</span>
          )}
          {gapCount > 0 && matchCount > 0 && <span className={styles.dot}>&middot;</span>}
          {matchCount > 0 && (
            <span className={styles.matches}>{matchCount} matched</span>
          )}
        </span>
        {totalChanges > 0 && (
          <>
            <span className={styles.separator} />
            <span className={`${styles.progress} ${reviewedCount === totalChanges ? styles.progressComplete : ''}`}>
              {reviewedCount}/{totalChanges}
            </span>
          </>
        )}
        <svg
          className={`${styles.chevron} ${expanded ? styles.chevronUp : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      <div className={`${styles.details} ${expanded ? styles.detailsOpen : ''}`}>
        <MatchAnalysis
          analysis={analysis}
          isLoading={isLoading}
          onAnalyze={onReanalyze}
          hasJobDescription={hasJobDescription}
        />
      </div>
      {showNewBaseBanner && (
        <div className={styles.newBaseBanner}>
          <div className={styles.bannerContent}>
            <svg className={styles.bannerIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div className={styles.bannerText}>
              <strong>Low match score.</strong> Your current CV may be too different from this
              {roleName ? ` ${roleName}` : ''} role{companyName ? ` at ${companyName}` : ''}.
              Consider creating a dedicated base CV for this type of position.
            </div>
          </div>
          <div className={styles.bannerActions}>
            <button
              className={styles.bannerBtn}
              onClick={() => navigate('/build/start')}
            >
              Create New Base CV
            </button>
            <button
              className={styles.bannerDismiss}
              onClick={() => setBannerDismissed(true)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
