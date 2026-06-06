/**
 * Tier2JobDetails -- Job description input + match analysis trigger tier body.
 *
 * Shown when activeTier === 2. Handles company name, role, and job description
 * fields, then triggers job-fit analysis.
 *
 * Covers: D-04, D-05, D-06.
 */
import styles from './Tier2JobDetails.module.css';

interface Tier2JobDetailsProps {
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  roleName: string;
  onRoleNameChange: (value: string) => void;
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export function Tier2JobDetails({
  companyName,
  onCompanyNameChange,
  roleName,
  onRoleNameChange,
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  isAnalyzing,
}: Tier2JobDetailsProps) {
  return (
    <div className={styles.tierBodyInner}>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Company Name</label>
          <input
            className={styles.input}
            value={companyName}
            onChange={e => onCompanyNameChange(e.target.value)}
            placeholder="e.g., Google"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Role</label>
          <input
            className={styles.input}
            value={roleName}
            onChange={e => onRoleNameChange(e.target.value)}
            placeholder="e.g., Senior SWE"
          />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Job Description *</label>
        <textarea
          className={styles.textarea}
          value={jobDescription}
          onChange={e => onJobDescriptionChange(e.target.value)}
          placeholder="Paste the full job description here..."
        />
      </div>
      <button
        className={styles.primaryBtn}
        onClick={onAnalyze}
        disabled={!jobDescription.trim() || isAnalyzing}
        type="button"
      >
        {isAnalyzing ? (<><span className={styles.spinner} /> Analyzing...</>) : 'Find best fit'}
      </button>
    </div>
  );
}
