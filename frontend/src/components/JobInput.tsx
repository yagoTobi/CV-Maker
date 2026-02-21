interface JobInputProps {
  companyName: string;
  jobDescription: string;
  onCompanyNameChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export function JobInput({
  companyName,
  jobDescription,
  onCompanyNameChange,
  onJobDescriptionChange,
  onAnalyze,
  isAnalyzing,
}: JobInputProps) {
  return (
    <div className="job-input">
      <div className="input-row">
        <div className="input-group">
          <label htmlFor="company-name">Company</label>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="Company name..."
          />
        </div>
        <div className="input-group">
          <label htmlFor="job-title">Role / Title</label>
          <input
            id="job-title"
            type="text"
            placeholder="Job title..."
          />
        </div>
      </div>
      <div className="input-group description-group">
        <label htmlFor="job-description">Description</label>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Paste the full job description here..."
        />
      </div>
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing || !jobDescription.trim()}
        className="analyze-btn"
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Job Posting'}
      </button>
    </div>
  );
}
