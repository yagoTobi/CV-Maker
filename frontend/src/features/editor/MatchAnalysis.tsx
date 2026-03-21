import type { MatchAnalysis as MatchAnalysisType } from '../../types';
import styles from './MatchAnalysis.module.css';

interface MatchAnalysisProps {
  analysis: MatchAnalysisType | null;
  isLoading: boolean;
  onAnalyze: () => void;
  hasJobDescription: boolean;
}

export function MatchAnalysis({ analysis, isLoading, onAnalyze, hasJobDescription }: MatchAnalysisProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Analyzing your CV against the job posting...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6" />
              <path d="M9 16h6" />
            </svg>
          </div>
          <p>Enter a job description and click below to see how well your CV matches.</p>
          <button
            className={styles.analyzeBtn}
            onClick={onAnalyze}
            disabled={!hasJobDescription}
          >
            Analyze Match
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {analysis.missing.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionLabel}>Gaps to address</h4>
            <div className={styles.tagList}>
              {analysis.missing.map((item, i) => (
                <span key={i} className={`${styles.tag} ${styles.gapTag}`}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {analysis.suggestions.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionLabel}>Suggestions</h4>
            <ul className={styles.suggestionList}>
              {analysis.suggestions.map((sug, i) => (
                <li key={i}>{sug}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
