import type { MatchAnalysis as MatchAnalysisType } from '../types';

interface MatchAnalysisProps {
  analysis: MatchAnalysisType | null;
  isLoading: boolean;
  onAnalyze: () => void;
  hasJobDescription: boolean;
}

export function MatchAnalysis({ analysis, isLoading, onAnalyze, hasJobDescription }: MatchAnalysisProps) {
  if (isLoading) {
    return (
      <div className="match-analysis">
        <div className="match-loading">
          <div className="spinner"></div>
          <p>Analyzing your CV against the job posting...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="match-analysis">
        <div className="match-empty">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6" />
              <path d="M9 16h6" />
            </svg>
          </div>
          <p>Enter a job description and click below to see how well your CV matches.</p>
          <button
            className="analyze-match-btn"
            onClick={onAnalyze}
            disabled={!hasJobDescription}
          >
            Analyze Match
          </button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#eab308';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent Match';
    if (score >= 75) return 'Strong Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Needs Improvement';
  };

  const scoreColor = getScoreColor(analysis.match_score);

  return (
    <div className="match-analysis">
      <div className="match-content">
        {/* Top Section: Two Columns */}
        <div className="match-top-row">
          <div className="match-panel">
            <h3>
              <span className="panel-icon requirements-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                </svg>
              </span>
              Job Requirements
            </h3>
            <div className="panel-content">
              <ul className="match-list">
                {analysis.requirements.map((req, i) => (
                  <li key={i} className="requirement-item">{req}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="match-panel">
            <h3>
              <span className="panel-icon missing-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              Topics Missing / Suggestions
            </h3>
            <div className="panel-content">
              {analysis.missing.length > 0 && (
                <div className="subsection">
                  <h4>Gaps to Address</h4>
                  <ul className="match-list missing-list">
                    {analysis.missing.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.missing.length === 0 && (
                <div className="no-gaps">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  No major gaps identified
                </div>
              )}
              <div className="subsection">
                <h4>Suggestions</h4>
                <ul className="match-list suggestions-list">
                  {analysis.suggestions.map((sug, i) => (
                    <li key={i}>{sug}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Likelihood Score */}
        <div className="match-score-panel">
          <div className="score-info">
            <h3>Likelihood Score</h3>
            <p className="score-description">Based on matching skills, experience, and qualifications</p>
            <div className="matching-skills">
              <h4>Your Matching Qualifications</h4>
              <div className="skill-tags">
                {analysis.matching.map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="score-display">
            <div className="score-circle" style={{ borderColor: scoreColor }}>
              <span className="score-percentage" style={{ color: scoreColor }}>
                {analysis.match_score}%
              </span>
            </div>
            <span className="score-label" style={{ color: scoreColor }}>
              {getScoreLabel(analysis.match_score)}
            </span>
          </div>
        </div>
      </div>

      <div className="match-footer">
        <button className="refresh-btn" onClick={onAnalyze}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Re-analyze
        </button>
      </div>
    </div>
  );
}
