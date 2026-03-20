import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useAppContext } from '../../contexts/AppContext';
import { applyTailorChanges } from '../../utils/formDataPatch';
import { generateCVFilename } from '../../utils/cvFilename';
import type { CVVersion, MatchAnalysis, TailorResponse, TailorChange, CVVersionMeta } from '../../types';
import styles from './ApplyToJobScreen.module.css';

type Step = 1 | 2 | 3 | 'success';

export default function ApplyToJobScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const appCtx = useAppContext();
  const baseVersionId = (location.state as any)?.baseVersionId as string | undefined;

  // Base version
  const [baseVersion, setBaseVersion] = useState<CVVersion | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [companyName, setCompanyName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Step 2
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [baselineScore, setBaselineScore] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  // Step 3 (pre-fetched during step 2)
  const [tailorResponse, setTailorResponse] = useState<TailorResponse | null>(null);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());

  // Save / success
  const [saving, setSaving] = useState(false);
  const [savedVersion, setSavedVersion] = useState<CVVersionMeta | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  // Load base version on mount
  useEffect(() => {
    if (!baseVersionId) {
      setLoadError('No base CV selected. Please go back to the dashboard.');
      return;
    }
    api.getVersion(baseVersionId).then(v => {
      if (!v) {
        setLoadError('Could not load the selected CV version.');
        return;
      }
      if (!v.formData) {
        setLoadError('This CV was edited in the advanced editor. Please rebuild using the form builder to enable AI tailoring.');
        return;
      }
      setBaseVersion(v);
    });
  }, [baseVersionId]);

  // Hand off to the full tune/editor screen with all data prefilled
  const handleOpenInTuneScreen = useCallback(async () => {
    if (!baseVersion) return;
    setAnalyzing(true);

    // Load base CV into AppContext
    appCtx.handleVersionLoad(baseVersion);
    appCtx.setCompanyName(companyName);
    appCtx.setRoleName(roleName);
    appCtx.setJobDescription(jobDescription);

    // Navigate to editor in tune mode — it will auto-compile and user can analyze there
    navigate('/editor', { state: { mode: 'tune' } });
  }, [baseVersion, companyName, roleName, jobDescription, appCtx, navigate]);

  // Step 1 → 2: Analyze (inline flow)
  const handleAnalyze = useCallback(async () => {
    if (!baseVersion?.formData || !jobDescription.trim()) return;
    setAnalyzing(true);

    // Generate LaTeX from form data, then run match analysis
    const { texContent } = await api.generateLatex(baseVersion.formData);
    if (!texContent) {
      setAnalyzing(false);
      return;
    }

    const analysis = await api.getMatchAnalysis(texContent, jobDescription, companyName);
    if (analysis) {
      setMatchAnalysis(analysis);
      setBaselineScore(analysis.match_score);
      setStep(2);
    }
    setAnalyzing(false);

    // Pre-fetch tailor suggestions in parallel
    setTailorLoading(true);
    const tailor = await api.suggestTailorChanges(
      baseVersion.formData, jobDescription, companyName, roleName
    );
    if (tailor) {
      setTailorResponse(tailor);
      setSelectedChanges(new Set(tailor.changes.map(c => c.id)));
    }
    setTailorLoading(false);
  }, [baseVersion, jobDescription, companyName, roleName]);

  // Step 2 → 3: Tailor CV
  const handleTailor = useCallback(() => {
    // If tailor response already loaded, go to step 3
    if (tailorResponse) {
      setStep(3);
    }
    // If still loading, the button will be disabled
  }, [tailorResponse]);

  // Step 3 → success: Apply & Save
  const handleApplyAndSave = useCallback(async () => {
    if (!baseVersion?.formData || !tailorResponse) return;
    setSaving(true);

    const modifiedFormData = applyTailorChanges(
      baseVersion.formData, tailorResponse.changes, selectedChanges
    );

    // Generate new LaTeX and get accurate final score
    const { texContent } = await api.generateLatex(modifiedFormData);
    if (!texContent) {
      setSaving(false);
      return;
    }

    const finalAnalysis = await api.getMatchAnalysis(texContent, jobDescription, companyName);
    const score = finalAnalysis?.match_score ?? tailorResponse.estimatedScore;
    setFinalScore(score);

    const versionName = [companyName, roleName].filter(Boolean).join(' ') || 'Job Application';
    const saved = await api.saveVersion({
      name: versionName,
      templateId: baseVersion.templateId,
      texContent,
      formData: modifiedFormData,
      jobDescription,
      companyName,
      role: roleName,
      matchScore: score,
      baselineMatchScore: baselineScore,
      parentVersionId: baseVersion.id,
    });

    if (saved) {
      setSavedVersion(saved);
      setStep('success');
    }
    setSaving(false);
  }, [baseVersion, tailorResponse, selectedChanges, jobDescription, companyName, roleName, baselineScore]);

  // Toggle change selection
  const toggleChange = (id: string) => {
    setSelectedChanges(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDiff = (id: string) => {
    setExpandedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reset for "Apply to another job"
  const handleApplyAnother = () => {
    setStep(1);
    setCompanyName('');
    setRoleName('');
    setJobDescription('');
    setMatchAnalysis(null);
    setTailorResponse(null);
    setSelectedChanges(new Set());
    setExpandedDiffs(new Set());
    setSavedVersion(null);
  };

  // --- Error / loading states ---
  if (loadError) {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.content}>
          <div className={`${styles.step} ${styles.errorCard}`}>
            <div className={styles.errorIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className={styles.errorTitle}>Cannot Tailor</h2>
            <p className={styles.errorText}>{loadError}</p>
            <button className={styles.secondaryBtn} onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!baseVersion) {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.content}>
          <div className={styles.loadingOverlay}>
            <div className={styles.spinnerDark} />
            <span>Loading base CV...</span>
          </div>
        </div>
      </div>
    );
  }

  const scoreColorClass = (s: number) => s >= 80 ? 'good' : s >= 60 ? 'medium' : 'low';

  // --- Render ---
  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Dashboard
          </button>
          <div>
            <h1 className={styles.title}>Apply to Job</h1>
            <p className={styles.baseName}>Base: {baseVersion.name}</p>
          </div>
        </header>

        {/* Step 1: Job Details */}
        <div className={styles.step}>
          <div
            className={styles.stepHeader}
            onClick={() => { if (step !== 1 && step !== 'success') setStep(1); }}
          >
            <div className={`${styles.stepNumber} ${step === 1 ? styles.active : ''} ${(step === 2 || step === 3 || step === 'success') ? styles.completed : ''}`}>
              {step === 2 || step === 3 || step === 'success' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : '1'}
            </div>
            <span className={`${styles.stepTitle} ${step !== 1 && step !== 'success' ? '' : ''} ${step !== 1 ? '' : ''}`}>
              Job Details
            </span>
            {step !== 1 && companyName && (
              <span className={styles.stepSummary}>{companyName}{roleName ? ` - ${roleName}` : ''}</span>
            )}
          </div>
          {step === 1 && (
            <div className={styles.stepBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Company Name</label>
                  <input
                    className={styles.input}
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Google"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Role</label>
                  <input
                    className={styles.input}
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    placeholder="e.g. Senior SWE"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Job Description *</label>
                <textarea
                  className={styles.textarea}
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                />
              </div>
              <button
                className={styles.primaryBtn}
                onClick={handleAnalyze}
                disabled={!jobDescription.trim() || analyzing}
              >
                {analyzing ? (
                  <><span className={styles.spinner} /> Analyzing...</>
                ) : 'Analyze Match'}
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={handleOpenInTuneScreen}
                disabled={!jobDescription.trim() || analyzing}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                Open in Tune Screen
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Match Analysis */}
        {(step === 2 || step === 3 || step === 'success') && (
          <div className={styles.step}>
            <div
              className={styles.stepHeader}
              onClick={() => { if (step === 3) setStep(2); }}
            >
              <div className={`${styles.stepNumber} ${step === 2 ? styles.active : ''} ${(step === 3 || step === 'success') ? styles.completed : ''}`}>
                {step === 3 || step === 'success' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : '2'}
              </div>
              <span className={styles.stepTitle}>Match Analysis</span>
              {step !== 2 && matchAnalysis && (
                <span className={styles.stepSummary}>Baseline: {Math.round(baselineScore)}%</span>
              )}
            </div>
            {step === 2 && matchAnalysis && (
              <div className={styles.stepBody}>
                <div className={styles.analysisContent}>
                  <div className={styles.scoreSection}>
                    <div className={`${styles.scoreCircle} ${styles[scoreColorClass(baselineScore)]}`}>
                      {Math.round(baselineScore)}%
                    </div>
                    <div className={styles.scoreDetails}>
                      <div className={styles.scoreLabel}>Baseline Match Score</div>
                      <div className={styles.scoreText}>
                        Your CV matches {matchAnalysis.matching.length} of {matchAnalysis.requirements.length} key requirements.
                        {matchAnalysis.missing.length > 0 && ` ${matchAnalysis.missing.length} gap${matchAnalysis.missing.length > 1 ? 's' : ''} identified.`}
                      </div>
                    </div>
                  </div>

                  <div className={styles.pillsSection}>
                    {matchAnalysis.matching.length > 0 && (
                      <div className={styles.pillGroup}>
                        <div className={styles.pillGroupLabel}>Matched</div>
                        <div className={styles.pills}>
                          {matchAnalysis.matching.map((m, i) => (
                            <span key={i} className={`${styles.pill} ${styles.matched}`}>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {matchAnalysis.missing.length > 0 && (
                      <div className={styles.pillGroup}>
                        <div className={styles.pillGroupLabel}>Missing</div>
                        <div className={styles.pills}>
                          {matchAnalysis.missing.map((m, i) => (
                            <span key={i} className={`${styles.pill} ${styles.missing}`}>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {matchAnalysis.suggestions.length > 0 && (
                    <div className={styles.suggestionsList}>
                      {matchAnalysis.suggestions.map((s, i) => (
                        <div key={i} className={styles.suggestionItem}>{s}</div>
                      ))}
                    </div>
                  )}

                  <button
                    className={styles.primaryBtn}
                    onClick={handleTailor}
                    disabled={tailorLoading}
                  >
                    {tailorLoading ? (
                      <><span className={styles.spinner} /> Generating changes...</>
                    ) : 'Tailor CV'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review Changes */}
        {(step === 3 || step === 'success') && tailorResponse && (
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <div className={`${styles.stepNumber} ${step === 3 ? styles.active : ''} ${step === 'success' ? styles.completed : ''}`}>
                {step === 'success' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : '3'}
              </div>
              <span className={styles.stepTitle}>Review Changes</span>
              {step === 'success' && (
                <span className={styles.stepSummary}>{selectedChanges.size} changes applied</span>
              )}
            </div>
            {step === 3 && (
              <div className={styles.stepBody}>
                <div className={styles.changesSummary}>
                  {tailorResponse.summary}
                  <br />
                  <span className={styles.changesSummaryCount}>
                    {selectedChanges.size} of {tailorResponse.changes.length}
                  </span> changes selected
                </div>

                <div className={styles.changesList}>
                  {tailorResponse.changes.map((change: TailorChange) => (
                    <div
                      key={change.id}
                      className={`${styles.changeCard} ${selectedChanges.has(change.id) ? styles.selected : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.changeCheckbox}
                        checked={selectedChanges.has(change.id)}
                        onChange={() => toggleChange(change.id)}
                      />
                      <div className={styles.changeContent}>
                        <div className={styles.changeHeader}>
                          <span className={styles.changeSection}>{change.section}</span>
                          <span className={`${styles.changeType} ${styles[change.changeType]}`}>
                            {change.changeType}
                          </span>
                        </div>
                        <div className={styles.changeDesc}>{change.description}</div>
                        <button
                          className={styles.diffToggle}
                          onClick={() => toggleDiff(change.id)}
                        >
                          {expandedDiffs.has(change.id) ? 'Hide diff' : 'Show diff'}
                        </button>
                        {expandedDiffs.has(change.id) && (
                          <div className={styles.diffView}>
                            <div className={styles.diffOld}>
                              - {Array.isArray(change.currentValue) ? change.currentValue.join(', ') : change.currentValue}
                            </div>
                            <div className={styles.diffNew}>
                              + {Array.isArray(change.newValue) ? change.newValue.join(', ') : change.newValue}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className={styles.primaryBtn}
                  onClick={handleApplyAndSave}
                  disabled={saving || selectedChanges.size === 0}
                >
                  {saving ? (
                    <><span className={styles.spinner} /> Applying & Saving...</>
                  ) : `Apply ${selectedChanges.size} Change${selectedChanges.size !== 1 ? 's' : ''} & Save`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {step === 'success' && savedVersion && (
          <div className={`${styles.step} ${styles.successCard}`}>
            <div className={styles.successIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className={styles.successTitle}>CV Tailored Successfully</h2>
            <p className={styles.successVersion}>
              Saved as "{savedVersion.name || [companyName, roleName].filter(Boolean).join(' ')}"
            </p>
            <div className={styles.scoreDelta}>
              <span className={styles.scoreDeltaOld}>{Math.round(baselineScore)}%</span>
              <span className={styles.scoreDeltaArrow}>&rarr;</span>
              <span className={styles.scoreDeltaNew}>{Math.round(finalScore)}%</span>
            </div>
            <div className={styles.successActions}>
              <button className={styles.primaryBtn} style={{ width: 'auto' }} onClick={handleApplyAnother}>
                Apply to Another Job
              </button>
              <button className={styles.secondaryBtn} onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
