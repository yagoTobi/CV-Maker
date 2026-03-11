import styles from './JobInput.module.css';

interface JobInputProps {
  companyName: string;
  jobDescription: string;
  onCompanyNameChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  hasAnalyzed?: boolean;
}

export function JobInput({
  companyName,
  jobDescription,
  onCompanyNameChange,
  onJobDescriptionChange,
  onAnalyze,
  isAnalyzing,
  hasAnalyzed = false,
}: JobInputProps) {
  const getButtonText = () => {
    if (isAnalyzing) return 'Analyzing...';
    if (hasAnalyzed) return 'Re-analyse';
    return 'Analyze Job Posting';
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputRow}>
        <div className={styles.inputGroup}>
          <label htmlFor="company-name">Company</label>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="Company name..."
            maxLength={100}
          />
        </div>
      </div>
      <div className={`${styles.inputGroup} ${styles.descriptionGroup}`}>
        <label htmlFor="job-description">Description</label>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Paste the full job description here..."
          maxLength={50000}
        />
      </div>
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing || !jobDescription.trim()}
        className={`${styles.analyzeBtn} ${hasAnalyzed ? styles.reanalyze : ''}`}
      >
        {hasAnalyzed && !isAnalyzing && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        )}
        {getButtonText()}
      </button>
    </div>
  );
}
