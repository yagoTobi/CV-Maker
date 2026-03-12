import { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import type { MatchAnalysis } from '../../types';
import styles from './JobTuningPanel.module.css';

interface JobTuningPanelProps {
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
}

export function JobTuningPanel({ onAnalyze, isAnalyzing }: JobTuningPanelProps) {
  const { companyName, setCompanyName, jobDescription, setJobDescription, chat } = useAppContext();
  const [localCompany, setLocalCompany] = useState(companyName);
  const [localJobDesc, setLocalJobDesc] = useState(jobDescription);

  const handleAnalyze = async () => {
    setCompanyName(localCompany);
    setJobDescription(localJobDesc);
    await onAnalyze();
  };

  const hasJobDescription = localJobDesc.trim().length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Job Input Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Job Details</h3>
          <div className={styles.inputGroup}>
            <label htmlFor="tune-company" className={styles.label}>Company</label>
            <input
              id="tune-company"
              type="text"
              className={styles.input}
              value={localCompany}
              onChange={(e) => setLocalCompany(e.target.value)}
              placeholder="Company name..."
              maxLength={100}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="tune-job-desc" className={styles.label}>Job Description</label>
            <textarea
              id="tune-job-desc"
              className={styles.textarea}
              value={localJobDesc}
              onChange={(e) => setLocalJobDesc(e.target.value)}
              placeholder="Paste the full job description here..."
              maxLength={50000}
              rows={8}
            />
          </div>
          <button
            className={styles.analyzeBtn}
            onClick={handleAnalyze}
            disabled={isAnalyzing || !hasJobDescription}
          >
            {isAnalyzing ? (
              <>
                <div className={styles.btnSpinner} />
                Analyzing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Analyze Match
              </>
            )}
          </button>
        </div>

        {/* Match Analysis Section */}
        {chat.isLoadingMatch && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Analyzing your CV against the job posting...</p>
          </div>
        )}

        {!chat.isLoadingMatch && chat.matchAnalysis && (
          <MatchAnalysisDisplay analysis={chat.matchAnalysis} onReanalyze={handleAnalyze} />
        )}

        {!chat.isLoadingMatch && !chat.matchAnalysis && !isAnalyzing && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h6" />
                <path d="M9 16h6" />
              </svg>
            </div>
            <p>Enter a job description above and click "Analyze Match" to see how well your CV aligns with the job requirements.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface MatchAnalysisDisplayProps {
  analysis: MatchAnalysis;
  onReanalyze: () => void;
}

function MatchAnalysisDisplay({ analysis, onReanalyze }: MatchAnalysisDisplayProps) {
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
    <div className={styles.analysisContainer}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Match Score</h3>
        <div className={styles.scoreCard}>
          <div className={styles.scoreCircle} style={{ borderColor: scoreColor }}>
            <span className={styles.scorePercentage} style={{ color: scoreColor }}>
              {analysis.match_score}%
            </span>
          </div>
          <div className={styles.scoreInfo}>
            <span className={styles.scoreLabel} style={{ color: scoreColor }}>
              {getScoreLabel(analysis.match_score)}
            </span>
            <p className={styles.scoreDescription}>Based on matching skills, experience, and qualifications</p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Your Matching Qualifications</h3>
        {analysis.matching.length > 0 ? (
          <div className={styles.tags}>
            {analysis.matching.map((skill, i) => (
              <span key={i} className={styles.tag}>{skill}</span>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>No strong matches identified</p>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Missing Keywords & Topics</h3>
        {analysis.missing.length > 0 ? (
          <ul className={styles.list}>
            {analysis.missing.map((item, i) => (
              <li key={i} className={styles.missingItem}>{item}</li>
            ))}
          </ul>
        ) : (
          <div className={styles.noGaps}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            No major gaps identified
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>AI Suggestions</h3>
        <ul className={styles.list}>
          {analysis.suggestions.map((suggestion, i) => (
            <li key={i} className={styles.suggestionItem}>{suggestion}</li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Job Requirements</h3>
        <ul className={styles.list}>
          {analysis.requirements.map((req, i) => (
            <li key={i} className={styles.requirementItem}>{req}</li>
          ))}
        </ul>
      </div>

      <button className={styles.reanalyzeBtn} onClick={onReanalyze}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        Re-analyze
      </button>
    </div>
  );
}
