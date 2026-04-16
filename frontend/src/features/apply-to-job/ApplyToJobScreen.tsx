/**
 * ApplyToJobScreen -- 3-step flow for tailoring a base CV to a specific job.
 *
 * Steps 1-2 use a narrow card layout (job details + match analysis).
 * Step 3 transitions to a full-width two-panel layout with a read-only
 * MedLengthTemplate on the left and a ChangePanel on the right.
 *
 * Accept/reject on ChangePanel cards immediately updates the read-only CV
 * preview. Save creates a child version with job metadata.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useTailor } from '../../hooks/useTailor';
import { useScrollSync } from '../direct-edit/hooks/useScrollSync';
import { MedLengthTemplate } from '../direct-edit/components/MedLengthTemplate';
import { ChangePanel } from '../direct-edit/components/ChangePanel';
import type { CVVersion, CVFormData, MatchAnalysis, CVVersionMeta, SkillItem } from '../../types';
import { scoreColorClass, noop, EMPTY_SET } from '../../utils/cvDisplayUtils';
import styles from './ApplyToJobScreen.module.css';
import '@fontsource-variable/eb-garamond';

type Step = 1 | 2 | 3 | 'success';

interface LocationState {
  baseVersionId?: string;
}

export default function ApplyToJobScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const baseVersionId = (location.state as LocationState)?.baseVersionId;

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

  // Local state for the read-only CV preview
  const [previewFormData, setPreviewFormData] = useState<CVFormData | null>(null);

  // Save / success
  const [saving, setSaving] = useState(false);
  const [savedVersion, setSavedVersion] = useState<CVVersionMeta | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  // Refs for scroll sync
  const cvPreviewRef = useRef<HTMLDivElement>(null);
  const changePanelRef = useRef<HTMLDivElement>(null);

  // useTailor hook -- onApply updates the read-only CV preview
  const tailor = useTailor({
    originalFormData: baseVersion?.formData ?? null,
    templateId: baseVersion?.templateId ?? null,
    onApply: async (newFormData: CVFormData) => {
      setPreviewFormData(newFormData);
    },
  });

  // Scroll sync between CV preview and ChangePanel
  useScrollSync(cvPreviewRef, changePanelRef, step === 3);

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

  // Initialize previewFormData when baseVersion loads
  useEffect(() => {
    if (baseVersion?.formData) {
      setPreviewFormData(baseVersion.formData);
    }
  }, [baseVersion]);

  // Step 1 -> 2: Analyze (inline flow)
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

    // Pre-fetch tailor suggestions via hook
    tailor.fetchSuggestions(baseVersion.formData, jobDescription, companyName, roleName);
  }, [baseVersion, jobDescription, companyName, roleName, tailor]);

  // Step 2 -> 3: Tailor CV
  const handleTailor = useCallback(() => {
    if (tailor.tailorResponse) setStep(3);
  }, [tailor.tailorResponse]);

  // Step 3 -> success: Save tailored CV
  const handleSaveTailoredCV = useCallback(async () => {
    if (!baseVersion?.formData || !previewFormData) return;
    setSaving(true);

    // Generate LaTeX from the current preview (with accepted changes applied)
    const { texContent } = await api.generateLatex(previewFormData);
    if (!texContent) { setSaving(false); return; }

    // Get final match score
    const finalAnalysis = await api.getMatchAnalysis(texContent, jobDescription, companyName);
    const score = finalAnalysis?.match_score ?? tailor.estimatedCurrentScore;
    setFinalScore(score);

    const versionName = [companyName, roleName].filter(Boolean).join(' ') || 'Job Application';
    const saved = await api.saveVersion({
      name: versionName,
      templateId: baseVersion.templateId,
      texContent,
      formData: previewFormData,
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
  }, [baseVersion, previewFormData, jobDescription, companyName, roleName, baselineScore, tailor.estimatedCurrentScore]);

  // Reset for "Apply to another job"
  const handleApplyAnother = () => {
    setStep(1);
    setCompanyName('');
    setRoleName('');
    setJobDescription('');
    setMatchAnalysis(null);
    setSavedVersion(null);
    setPreviewFormData(baseVersion?.formData ?? null);
    tailor.reset();
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

  // Noop field change handler typed for MedLengthTemplate
  const noopFieldChange = noop as (path: string, value: string | SkillItem[]) => void;

  // --- Render ---
  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={step === 3 ? styles.contentWide : styles.content}>
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

        {/* Step 3: Full-width two-panel layout */}
        {step === 3 && (
          <div className={styles.reviewLayout}>
            {/* Collapsed steps header */}
            <div className={styles.collapsedSteps}>
              <div className={styles.collapsedStep} onClick={() => setStep(1)}>
                <span className={`${styles.stepNumber} ${styles.completed}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                <span className={styles.stepTitle}>Job Details</span>
                <span className={styles.stepSummary}>{companyName}{roleName ? ` - ${roleName}` : ''}</span>
              </div>
              <div className={styles.collapsedStep} onClick={() => setStep(2)}>
                <span className={`${styles.stepNumber} ${styles.completed}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                <span className={styles.stepTitle}>Match Analysis</span>
                <span className={styles.stepSummary}>Baseline: {Math.round(baselineScore)}%</span>
              </div>
            </div>

            {/* Two-panel content */}
            <div className={styles.twoPanelContent}>
              <div ref={cvPreviewRef} className={styles.cvPreviewPanel}>
                {previewFormData && (
                  <MedLengthTemplate
                    formData={previewFormData}
                    readOnly={true}
                    onFieldChange={noopFieldChange}
                    onBulletAdd={noop as (basePath: string, afterIndex: number) => void}
                    onBulletRemove={noop as (basePath: string, index: number) => void}
                    onAddEntry={noop as (sectionKey: string) => void}
                    onRemoveEntry={noop as (sectionKey: string, index: number) => void}
                    onToggleSection={noop as (sectionKey: string) => void}
                    hiddenSections={EMPTY_SET}
                    onReorderSections={noop as (from: number, to: number) => void}
                    onReorderEntries={noop as (sectionKey: string, from: number, to: number) => void}
                  />
                )}
              </div>
              <ChangePanel
                changes={tailor.tailorResponse?.changes ?? []}
                appliedChanges={tailor.appliedChanges}
                skippedChanges={tailor.skippedChanges}
                selectedAlternatives={tailor.selectedAlternatives}
                isApplying={tailor.isApplying}
                isLoading={false}
                error={tailor.error}
                onAccept={tailor.acceptChange}
                onSkip={tailor.skipChange}
                onUndo={tailor.undoChange}
                onAcceptAll={tailor.acceptAllRemaining}
                onSelectAlternative={tailor.selectAlternative}
                onEditValue={tailor.editChangeValue}
                onClose={() => setStep(2)}
                matchAnalysis={matchAnalysis}
                baselineScore={baselineScore}
                estimatedScore={tailor.estimatedCurrentScore}
                panelRef={changePanelRef}
                isOpen={true}
              />
            </div>

            {/* Save button at bottom */}
            <div className={styles.saveBar}>
              <button
                className={styles.primaryBtn}
                onClick={handleSaveTailoredCV}
                disabled={saving || tailor.appliedChanges.size === 0}
              >
                {saving ? (
                  <><span className={styles.spinner} /> Saving...</>
                ) : 'Save Tailored CV'}
              </button>
            </div>
          </div>
        )}

        {/* Steps 1 and 2 (only visible when not in step 3) */}
        {step !== 3 && (
          <>
            {/* Step 1: Job Details */}
            <div className={styles.step}>
              <div
                className={styles.stepHeader}
                onClick={() => { if (step !== 1 && step !== 'success') setStep(1); }}
              >
                <div className={`${styles.stepNumber} ${step === 1 ? styles.active : ''} ${(step === 2 || step === 'success') ? styles.completed : ''}`}>
                  {step === 2 || step === 'success' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : '1'}
                </div>
                <span className={styles.stepTitle}>
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
                </div>
              )}
            </div>

            {/* Step 2: Match Analysis */}
            {(step === 2 || step === 'success') && (
              <div className={styles.step}>
                <div
                  className={styles.stepHeader}
                  onClick={() => { if (step !== 2 && step !== 'success') setStep(2); }}
                >
                  <div className={`${styles.stepNumber} ${step === 2 ? styles.active : ''} ${step === 'success' ? styles.completed : ''}`}>
                    {step === 'success' ? (
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
                        disabled={tailor.isLoading}
                      >
                        {tailor.isLoading ? (
                          <><span className={styles.spinner} /> Generating changes...</>
                        ) : 'Tailor CV'}
                      </button>
                    </div>
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
                  Saved as &quot;{savedVersion.name || [companyName, roleName].filter(Boolean).join(' ')}&quot;
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
          </>
        )}
      </div>
    </div>
  );
}
