/**
 * TunePanel -- Right-side panel with 3 progressive tiers for tuning a CV
 * to a specific job posting.
 *
 * Tier 1: Save-as-Base CV (skipped if activeVersion is non-null)
 * Tier 2: Job Details (company, role, job description) + Analyze Match
 * Tier 3: Review Changes (ChangePanel + useTailor accept/reject) + Save Tailored CV
 *
 * Inline panel on the editor page for job-targeted CV tuning.
 * All tier bodies remain mounted (CSS expand/collapse)
 * to preserve form state across collapse/expand cycles (RESEARCH.md Pitfall 3).
 *
 * Covers: D-01 through D-07, D-11, D-12.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { useCVContext } from '../../../contexts/CVContext';
import { useTailor } from '../../../hooks/useTailor';
import { useScrollSync } from '../hooks/useScrollSync';
import { ChangePanel } from './ChangePanel';
import type { CVFormData, CVVersion, MatchAnalysis } from '../../../types';
import styles from './TunePanel.module.css';

interface TunePanelProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CVFormData;
  activeVersion: CVVersion | null;
  onPreviewUpdate: (fd: CVFormData | null) => void;
  onTier3Active: (active: boolean) => void;
  cvContainerRef: React.RefObject<HTMLDivElement | null>;
  onTuneDetailsChange?: (companyName: string, roleName: string) => void;
}

export function TunePanel({
  isOpen,
  onClose,
  formData,
  activeVersion,
  onPreviewUpdate,
  onTier3Active,
  cvContainerRef,
  onTuneDetailsChange,
}: TunePanelProps) {
  const navigate = useNavigate();
  const { setActiveVersion } = useCVContext();

  // Tier state
  const [activeTier, setActiveTier] = useState<1 | 2 | 3>(() => activeVersion ? 2 : 1);
  const [tier1Complete, setTier1Complete] = useState(() => !!activeVersion);
  const [tier2Complete, setTier2Complete] = useState(false);

  // Tier 1: save-as-base
  const [baseName, setBaseName] = useState('');
  const [savingBase, setSavingBase] = useState(false);

  // Tier 2: job details
  const [companyName, setCompanyName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [baselineScore, setBaselineScore] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  // Tier 3: diff review
  const [previewFormData, setPreviewFormData] = useState<CVFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'before' | 'after'>('after');
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [savedBaseId, setSavedBaseId] = useState<string | null>(null);

  // Refs for scroll sync
  const changePanelRef = useRef<HTMLDivElement>(null);

  // useTailor hook wiring
  const tailor = useTailor({
    originalFormData: formData,
    templateId: formData.templateId,
    onApply: async (newFormData: CVFormData, _newTexContent: string) => {
      setPreviewFormData(newFormData);
      onPreviewUpdate(newFormData);
    },
  });

  // Computed review state
  const totalChanges = tailor.tailorResponse?.changes?.length ?? 0;
  const reviewedCount = tailor.appliedChanges.size + tailor.skippedChanges.size;
  const pendingCount = totalChanges - reviewedCount;
  const allReviewed = totalChanges > 0 && pendingCount === 0;

  // Scroll sync between CV container and change panel
  useScrollSync(cvContainerRef, changePanelRef, activeTier === 3);

  // Notify parent about Tier 3 state changes
  useEffect(() => {
    onTier3Active(activeTier === 3);
    if (activeTier === 3) {
      onPreviewUpdate(previewFormData);
    } else {
      onPreviewUpdate(null);
    }
  }, [activeTier, previewFormData, onPreviewUpdate, onTier3Active]);

  // Surface Tier 2 companyName/roleName to parent for NavBar breadcrumb
  useEffect(() => {
    onTuneDetailsChange?.(companyName, roleName);
  }, [companyName, roleName, onTuneDetailsChange]);

  // Escape key closes the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Tier 1 save (D-01, D-02, D-03)
  const handleSaveBase = useCallback(async () => {
    if (!baseName.trim()) return;
    setSavingBase(true);
    const { texContent } = await api.generateLatex(formData);
    const saved = await api.saveVersion({
      name: baseName.trim(),
      templateId: formData.templateId,
      texContent: texContent || '',
      formData,
    });
    if (saved) {
      // Load the saved version as the active version
      const fullVersion = await api.getVersion(saved.id);
      if (fullVersion) {
        setActiveVersion(fullVersion);
      }
      setTier1Complete(true);
      setActiveTier(2);
    }
    setSavingBase(false);
  }, [baseName, formData, setActiveVersion]);

  // Handle Tier 2 analyze
  const handleAnalyze = useCallback(async () => {
    if (!jobDescription.trim()) return;
    setAnalyzing(true);
    const { texContent } = await api.generateLatex(formData);
    if (!texContent) { setAnalyzing(false); return; }
    const analysis = await api.getMatchAnalysis(texContent, jobDescription, companyName);
    if (analysis) {
      setMatchAnalysis(analysis);
      setBaselineScore(analysis.match_score);
      tailor.setBaselineScore(analysis.match_score);
      setTier2Complete(true);
      setActiveTier(3);
    }
    setAnalyzing(false);
    // Initialize preview and pre-fetch tailor suggestions
    setPreviewFormData(formData);
    tailor.fetchSuggestions(formData, jobDescription, companyName, roleName);
  }, [formData, jobDescription, companyName, roleName, tailor]);

  // Handle Tier 3 save (per D-11)
  const handleSaveTailored = useCallback(async () => {
    const currentVersion = activeVersion;
    if (!currentVersion || !previewFormData) return;
    setSaving(true);
    const { texContent } = await api.generateLatex(previewFormData);
    if (!texContent) { setSaving(false); return; }
    const finalAnalysis = await api.getMatchAnalysis(texContent, jobDescription, companyName);
    const score = finalAnalysis?.match_score ?? tailor.estimatedCurrentScore;
    const versionName = [companyName, roleName].filter(Boolean).join(' ') || 'Job Application';
    const saved = await api.saveVersion({
      name: versionName,
      templateId: currentVersion.templateId,
      texContent,
      formData: previewFormData,
      jobDescription,
      companyName,
      role: roleName,
      matchScore: score,
      baselineMatchScore: baselineScore,
      parentVersionId: currentVersion.id,
    });
    if (saved) {
      setSavedSuccessfully(true);
      setSavedBaseId(currentVersion.id);
    }
    setSaving(false);
  }, [activeVersion, previewFormData, jobDescription, companyName, roleName, baselineScore, tailor.estimatedCurrentScore]);

  const handleViewInDashboard = useCallback(() => {
    if (savedBaseId) {
      navigate('/dashboard', { state: { baseId: savedBaseId } });
    }
  }, [savedBaseId, navigate]);

  const handleKeepEditing = useCallback(() => {
    setSavedSuccessfully(false);
    setSavedBaseId(null);
    onClose();
    tailor.reset();
  }, [onClose, tailor]);

  return (
    <div
      className={`${styles.panel}${isOpen ? '' : ` ${styles.panelClosed}`}`}
      role="complementary"
      aria-label="Tune for job panel"
    >
      {/* Close button */}
      <button
        className={styles.closeBtn}
        onClick={onClose}
        type="button"
        aria-label="Close tune panel"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Tier 1: Save as Base CV */}
      <div className={styles.tier}>
        <div
          className={styles.tierHeader}
          onClick={() => { if (tier1Complete) setActiveTier(1); }}
          role="button"
          aria-expanded={activeTier === 1}
        >
          <span className={`${styles.stepNumber}${tier1Complete ? ` ${styles.completed}` : activeTier === 1 ? ` ${styles.active}` : ''}`}>
            {tier1Complete ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : '1'}
          </span>
          <span className={styles.tierTitle}>Save as Base CV</span>
          {tier1Complete && (
            <span className={styles.tierSummary}>
              Base CV: {activeVersion?.name || baseName}
            </span>
          )}
        </div>
        <div className={`${styles.tierBody}${activeTier === 1 ? ` ${styles.tierBodyOpen}` : ''}`}>
          <div className={styles.tierBodyInner}>
            {activeVersion ? (
              <div className={styles.preCompleted}>
                Already saved as &quot;{activeVersion.name}&quot;
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>CV Name</label>
                  <input
                    className={styles.input}
                    value={baseName}
                    onChange={e => setBaseName(e.target.value)}
                    placeholder="e.g., Creative CV"
                    autoFocus={activeTier === 1 && !activeVersion}
                  />
                </div>
                <button
                  className={styles.primaryBtn}
                  onClick={handleSaveBase}
                  disabled={!baseName.trim() || savingBase}
                  type="button"
                >
                  {savingBase ? (<><span className={styles.spinner} /> Saving...</>) : 'Save as Base CV'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tier 2: Job Details */}
      <div className={styles.tier}>
        <div
          className={styles.tierHeader}
          onClick={() => { if (tier2Complete || tier1Complete) setActiveTier(2); }}
          role="button"
          aria-expanded={activeTier === 2}
        >
          <span className={`${styles.stepNumber}${tier2Complete ? ` ${styles.completed}` : activeTier === 2 ? ` ${styles.active}` : ''}`}>
            {tier2Complete ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : '2'}
          </span>
          <span className={styles.tierTitle}>Job Details</span>
          {tier2Complete && (
            <span className={styles.tierSummary}>
              {companyName}{roleName ? ` ${roleName}` : ''}{baselineScore ? ` ${Math.round(baselineScore)}%` : ''}
            </span>
          )}
        </div>
        <div className={`${styles.tierBody}${activeTier === 2 ? ` ${styles.tierBodyOpen}` : ''}`}>
          <div className={styles.tierBodyInner}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Company Name</label>
                <input
                  className={styles.input}
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g., Google"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Role</label>
                <input
                  className={styles.input}
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  placeholder="e.g., Senior SWE"
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
              type="button"
            >
              {analyzing ? (<><span className={styles.spinner} /> Analyzing...</>) : 'Analyze Match'}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 3: Review Changes */}
      <div className={styles.tier}>
        <div
          className={styles.tierHeader}
          onClick={() => { if (tier2Complete) setActiveTier(3); }}
          role="button"
          aria-expanded={activeTier === 3}
        >
          <span className={`${styles.stepNumber}${activeTier === 3 ? ` ${styles.active}` : ''}`}>
            3
          </span>
          <span className={styles.tierTitle}>Review Changes</span>
        </div>
        <div className={`${styles.tierBody}${activeTier === 3 ? ` ${styles.tierBodyOpen}` : ''}`}>
          <div className={styles.tierBodyInner}>
            {tailor.isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinnerLg} />
                <span>Generating suggestions...</span>
              </div>
            ) : tailor.error ? (
              <div className={styles.errorState}>
                Could not generate suggestions. Check your connection and try again.
              </div>
            ) : (tailor.tailorResponse?.changes?.length ?? 0) === 0 && !tailor.isLoading ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyHeading}>No changes suggested</h3>
                <p className={styles.emptyBody}>Your CV already matches the job description well. Try a different job posting or edit your CV directly.</p>
              </div>
            ) : (
              <>
                {/* Before / After toggle */}
                <div className={styles.viewToggle}>
                  <button
                    className={`${styles.viewToggleBtn}${viewMode === 'before' ? ` ${styles.viewToggleBtnActive}` : ''}`}
                    onClick={() => {
                      setViewMode('before');
                      onPreviewUpdate(formData);
                    }}
                    type="button"
                  >
                    Before
                  </button>
                  <button
                    className={`${styles.viewToggleBtn}${viewMode === 'after' ? ` ${styles.viewToggleBtnActive}` : ''}`}
                    onClick={() => {
                      setViewMode('after');
                      onPreviewUpdate(previewFormData);
                    }}
                    type="button"
                  >
                    After
                  </button>
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
                    onClose={() => setActiveTier(2)}
                    matchAnalysis={matchAnalysis}
                    baselineScore={baselineScore}
                    estimatedScore={tailor.estimatedCurrentScore}
                    companyName={companyName}
                    roleName={roleName}
                    panelRef={changePanelRef}
                    isOpen={true}
                    className={styles.changePanelInline}
                  />
                {allReviewed && !savedSuccessfully && (
                  <div className={styles.reviewedBanner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>All {totalChanges} changes reviewed. Ready to save?</span>
                  </div>
                )}
                {!savedSuccessfully && (
                  <div className={styles.saveBarSticky}>
                    <button
                      className={`${styles.primaryBtn}${allReviewed ? ` ${styles.primaryBtnReady}` : ''}`}
                      onClick={handleSaveTailored}
                      disabled={saving || tailor.appliedChanges.size === 0}
                      type="button"
                    >
                      {saving ? (<><span className={styles.spinner} /> Saving...</>) : 'Save Tailored CV'}
                    </button>
                  </div>
                )}
                {savedSuccessfully && (
                  <div className={styles.postSavePrompt}>
                    <div className={styles.postSaveIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div className={styles.postSaveTitle}>Tailored CV saved</div>
                    <div className={styles.postSaveActions}>
                      <button
                        className={styles.postSaveSecondary}
                        onClick={handleKeepEditing}
                        type="button"
                      >
                        Keep Editing
                      </button>
                      <button
                        className={styles.postSavePrimary}
                        onClick={handleViewInDashboard}
                        type="button"
                      >
                        View in Dashboard
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
