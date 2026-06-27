/**
 * TunePanel -- Right-side panel with 3 progressive tiers for tuning a CV
 * to a specific job posting.
 *
 * Tier 1: Baseline CV (skipped if activeVersion is non-null)
 * Tier 2: Job target (company, role, job description) + fit analysis
 * Tier 3: Pick changes (Tier3Review + useTailor accept/reject) + save application
 *
 * Inline panel on the editor page for job-targeted CV tuning.
 * All tier bodies remain mounted (CSS expand/collapse)
 * to preserve form state across collapse/expand cycles (RESEARCH.md Pitfall 3).
 *
 * Covers: D-01 through D-07, D-11, D-12.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import { useCVContext } from '../../../../contexts/CVContext';
import { useTailor } from '../../hooks/useTailor';
import { useScrollSync } from '../../hooks/useScrollSync';
import { ScoreHeader } from '../ScoreHeader';
import { Tier1SaveBase } from './Tier1SaveBase';
import { Tier2JobDetails } from './Tier2JobDetails';
import { Tier3Review } from './Tier3Review';
import type { AdditionalExperience, CVFormData, CVVersion, MatchAnalysis, UserProfile } from '../../../../types';
import type { GapEvidence } from '../change-review/GapPromptChips';
import { loadTuneSession, saveTuneSession } from '../../utils/tuneSession';
import styles from './TunePanel.module.css';

interface TunePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  formData: CVFormData;
  activeVersion: CVVersion | null;
  onPreviewUpdate: (fd: CVFormData | null) => void;
  onTier3Active: (active: boolean) => void;
  cvContainerRef: React.RefObject<HTMLDivElement | null>;
  onTuneDetailsChange?: (companyName: string, roleName: string) => void;
}

export function TunePanel({
  isOpen,
  onToggle,
  formData,
  activeVersion,
  onPreviewUpdate,
  onTier3Active,
  cvContainerRef,
  onTuneDetailsChange,
}: TunePanelProps) {
  const navigate = useNavigate();
  const { userProfile, setUserProfile, setActiveVersion } = useCVContext();
  const restoredTuneSession = useMemo(() => loadTuneSession(activeVersion?.id), [activeVersion?.id]);

  // Tier state
  const [activeTier, setActiveTier] = useState<1 | 2 | 3>(() => restoredTuneSession?.activeTier ?? (activeVersion ? 2 : 1));
  const [tier1Complete, setTier1Complete] = useState(() => !!activeVersion);
  const [tier2Complete, setTier2Complete] = useState(() => restoredTuneSession?.tier2Complete ?? false);

  // Sync tier state when activeVersion appears after mount (e.g. auto-save creates it)
  useEffect(() => {
    if (activeVersion && !tier1Complete) {
      setTier1Complete(true);
      setActiveTier(2);
    }
  }, [activeVersion, tier1Complete]);

  // Tier 1: save-as-base
  const [baseName, setBaseName] = useState('');
  const [savingBase, setSavingBase] = useState(false);

  // Tier 2: job details
  const [companyName, setCompanyName] = useState(() => restoredTuneSession?.companyName ?? '');
  const [roleName, setRoleName] = useState(() => restoredTuneSession?.roleName ?? '');
  const [jobDescription, setJobDescription] = useState(() => restoredTuneSession?.jobDescription ?? '');
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(() => restoredTuneSession?.matchAnalysis ?? null);
  const [baselineScore, setBaselineScore] = useState(() => restoredTuneSession?.baselineScore ?? 0);
  const [analyzing, setAnalyzing] = useState(false);

  // Tier 3: diff review
  const [previewFormData, setPreviewFormData] = useState<CVFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'before' | 'after'>('after');
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [savedBaseId, setSavedBaseId] = useState<string | null>(null);
  const [userClarifications, setUserClarifications] = useState<string[]>(() => restoredTuneSession?.userClarifications ?? []);
  const [evidenceEntries, setEvidenceEntries] = useState<GapEvidence[]>(() => restoredTuneSession?.evidenceEntries ?? []);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceSaved, setEvidenceSaved] = useState(false);

  // Ref for scroll sync
  const changePanelRef = useRef<HTMLDivElement>(null);

  // useTailor hook wiring
  const tailor = useTailor({
    originalFormData: formData,
    templateId: formData.templateId,
    onApply: async (newFormData: CVFormData) => {
      setPreviewFormData(newFormData);
      onPreviewUpdate(newFormData);
    },
  });
  const { restoreSuggestions } = tailor;

  const restoredTailorSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const versionId = activeVersion?.id;
    if (!versionId || restoredTailorSessionIdRef.current === versionId) return;
    const restored = loadTuneSession(versionId);
    if (!restored) return;

    setActiveTier(restored.activeTier);
    setTier2Complete(restored.tier2Complete);
    setCompanyName(restored.companyName);
    setRoleName(restored.roleName);
    setJobDescription(restored.jobDescription);
    setMatchAnalysis(restored.matchAnalysis);
    setBaselineScore(restored.baselineScore);
    setUserClarifications(restored.userClarifications);
    setEvidenceEntries(restored.evidenceEntries);
    if (restored.tailorResponse) {
      restoreSuggestions(
        formData,
        restored.tailorResponse,
        restored.appliedChangeIds,
        restored.skippedChangeIds,
        restored.selectedAlternatives,
      );
    }
    restoredTailorSessionIdRef.current = versionId;
  }, [activeVersion?.id, formData, restoreSuggestions]);

  useEffect(() => {
    saveTuneSession(activeVersion?.id, {
      isOpen,
      activeTier,
      tier2Complete,
      companyName,
      roleName,
      jobDescription,
      matchAnalysis,
      baselineScore,
      tailorResponse: tailor.tailorResponse,
      appliedChangeIds: Array.from(tailor.appliedChanges),
      skippedChangeIds: Array.from(tailor.skippedChanges),
      selectedAlternatives: Array.from(tailor.selectedAlternatives.entries()),
      userClarifications,
      evidenceEntries,
    });
  }, [
    activeVersion?.id,
    activeTier,
    baselineScore,
    companyName,
    evidenceEntries,
    isOpen,
    jobDescription,
    matchAnalysis,
    roleName,
    tailor.appliedChanges,
    tailor.selectedAlternatives,
    tailor.skippedChanges,
    tailor.tailorResponse,
    tier2Complete,
    userClarifications,
  ]);

  // Computed review state
  const totalChanges = tailor.tailorResponse?.changes?.length ?? 0;
  const reviewedCount = tailor.appliedChanges.size + tailor.skippedChanges.size;
  const pendingCount = totalChanges - reviewedCount;

  // Score display values for sticky ScoreHeader
  const displayScore = tailor.estimatedCurrentScore ?? baselineScore;

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
      if (e.key === 'Escape') onToggle();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle]);

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
    setUserClarifications([]);
    setEvidenceEntries([]);
    setEvidenceSaved(false);
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
    setPreviewFormData(formData);
    tailor.fetchSuggestions(formData, jobDescription, companyName, roleName);
  }, [formData, jobDescription, companyName, roleName, tailor]);

  const handleEvidenceChange = useCallback((evidence: GapEvidence[]) => {
    setEvidenceEntries(evidence);
    setEvidenceSaved(false);
  }, []);

  const handleRefreshSuggestions = useCallback(async () => {
    if (userClarifications.length === 0) return;
    setPreviewFormData(formData);
    onPreviewUpdate(formData);
    await tailor.fetchSuggestions(formData, jobDescription, companyName, roleName, userClarifications);
  }, [companyName, formData, jobDescription, onPreviewUpdate, roleName, tailor, userClarifications]);

  const handleSaveEvidence = useCallback(async () => {
    if (evidenceEntries.length === 0) return;
    setSavingEvidence(true);

    const source = [companyName, roleName].filter(Boolean).join(' ') || undefined;
    const newExperiences: AdditionalExperience[] = evidenceEntries.map((entry) => ({
      topic: entry.topic,
      description: entry.description,
      added_from_job: source,
    }));
    const currentProfile: UserProfile = userProfile ?? {
      additional_experiences: [],
      skills_mentioned: [],
      conversation_history: [],
    };
    const seen = new Set(
      currentProfile.additional_experiences.map((entry) => `${entry.topic}\n${entry.description}`),
    );
    const uniqueNewExperiences = newExperiences.filter((entry) => {
      const key = `${entry.topic}\n${entry.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueNewExperiences.length === 0) {
      setEvidenceSaved(true);
      setSavingEvidence(false);
      return;
    }

    const nextProfile: UserProfile = {
      ...currentProfile,
      additional_experiences: [
        ...currentProfile.additional_experiences,
        ...uniqueNewExperiences,
      ],
    };

    try {
      await api.saveUserData(nextProfile);
      setUserProfile(nextProfile);
      setEvidenceSaved(true);
    } catch (err) {
      console.error('[TunePanel:saveEvidence]', err);
    } finally {
      setSavingEvidence(false);
    }
  }, [companyName, evidenceEntries, roleName, setUserProfile, userProfile]);

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
    onToggle();
    tailor.reset();
  }, [onToggle, tailor]);

  const handleViewModeChange = useCallback((mode: 'before' | 'after') => {
    setViewMode(mode);
    if (mode === 'before') {
      onPreviewUpdate(formData);
    } else {
      onPreviewUpdate(previewFormData);
    }
  }, [formData, previewFormData, onPreviewUpdate]);

  const showScoreHeader = activeTier === 3
    && (totalChanges > 0)
    && !tailor.isLoading
    && !tailor.error
    && matchAnalysis !== null;

  return (
    <div
      className={`${styles.panel}${isOpen ? '' : ` ${styles.panelClosed}`}`}
      role="complementary"
      aria-label="Apply to job panel"
    >
      {/* Toggle button — left-side arrow, flips when closed */}
      <button
        className={styles.toggleBtn}
        onClick={onToggle}
        type="button"
        aria-label={isOpen ? 'Collapse tune panel' : 'Expand tune panel'}
      >
        <svg
          className={`${styles.toggleBtnIcon}${!isOpen ? ` ${styles.toggleBtnIconClosed}` : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className={styles.panelScroll} ref={changePanelRef}>
        {/* Sticky top section — all 3 tier headers + score header freeze here in Tier 3 */}
        <div className={activeTier === 3 ? styles.stickyScoreHeader : undefined}>
          {activeTier === 3 ? (
            <div className={styles.progressStrip} aria-label="Application setup progress">
              <span
                className={styles.progressStep}
                onClick={() => setActiveTier(1)}
                role="button"
                tabIndex={0}
                title={activeVersion?.name || baseName || 'Baseline CV'}
              >
                <span className={`${styles.progressDot} ${styles.progressDotDone}`}>✓</span>
                <span className={styles.progressLabel}>Base</span>
              </span>
              <span className={styles.progressSep}>/</span>
              <span
                className={styles.progressStep}
                onClick={() => setActiveTier(2)}
                role="button"
                tabIndex={0}
                title={[companyName, roleName].filter(Boolean).join(' ') || 'Target job'}
              >
                <span className={`${styles.progressDot} ${styles.progressDotDone}`}>✓</span>
                <span className={styles.progressLabel}>Job</span>
              </span>
              <span className={styles.progressSep}>/</span>
              <span
                className={`${styles.progressStep} ${styles.progressStepActive}`}
                onClick={() => setActiveTier(3)}
                role="button"
                tabIndex={0}
              >
                <span className={`${styles.progressDot} ${styles.progressDotActive}`}>3</span>
                <span className={styles.progressLabel}>Review</span>
              </span>
            </div>
          ) : (
            <>
          {/* Tier 1 header + body */}
          <div className={`${styles.tier}${tier1Complete && activeTier !== 1 ? ` ${styles.tierCompact}` : ''}`}>
            <div
              className={`${styles.tierHeader}${tier1Complete && activeTier !== 1 ? ` ${styles.tierHeaderCompact}` : ''}`}
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
              <span className={styles.tierTitle}>Baseline CV</span>
              {tier1Complete && (
                <span className={styles.tierSummary}>
                  {activeVersion?.name || baseName}
                </span>
              )}
            </div>
            <div className={`${styles.tierBody}${activeTier === 1 ? ` ${styles.tierBodyOpen}` : ''}${tier1Complete && activeTier !== 1 ? ` ${styles.tierBodyHidden}` : ''}`}>
              <Tier1SaveBase
                activeVersion={activeVersion}
                baseName={baseName}
                onBaseNameChange={setBaseName}
                onSave={handleSaveBase}
                isSaving={savingBase}
                isAutoFocused={activeTier === 1 && !activeVersion}
              />
            </div>
          </div>

          {/* Tier 2 header + body */}
          <div className={`${styles.tier}${tier2Complete && activeTier !== 2 ? ` ${styles.tierCompact}` : ''}`}>
            <div
              className={`${styles.tierHeader}${tier2Complete && activeTier !== 2 ? ` ${styles.tierHeaderCompact}` : ''}`}
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
              <span className={styles.tierTitle}>Target job</span>
              {tier2Complete && (
                <span className={styles.tierSummary}>
                  {companyName}{roleName ? ` ${roleName}` : ''}{baselineScore ? ` ${Math.round(baselineScore)}%` : ''}
                </span>
              )}
            </div>
            <div className={`${styles.tierBody}${activeTier === 2 ? ` ${styles.tierBodyOpen}` : ''}${tier2Complete && activeTier !== 2 ? ` ${styles.tierBodyHidden}` : ''}`}>
              <Tier2JobDetails
                companyName={companyName}
                onCompanyNameChange={setCompanyName}
                roleName={roleName}
                onRoleNameChange={setRoleName}
                jobDescription={jobDescription}
                onJobDescriptionChange={setJobDescription}
                onAnalyze={handleAnalyze}
                isAnalyzing={analyzing}
              />
            </div>
          </div>

          {/* Tier 3 header */}
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
              <span className={styles.tierTitle}>Pick changes</span>
            </div>
          </div>
            </>
          )}

          {/* Score header — inside sticky block, only in Tier 3 when data is ready */}
          {showScoreHeader && (
            <ScoreHeader
              matchAnalysis={matchAnalysis}
              displayScore={displayScore}
              baselineScore={baselineScore}
              appliedCount={tailor.appliedChanges.size}
              rejectedCount={tailor.skippedChanges.size}
              pendingCount={pendingCount}
              size="sm"
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          )}
        </div>

        {/* Tier 3 content — scrollable below the sticky header */}
        {activeTier === 3 && (
          <Tier3Review
            changes={tailor.tailorResponse?.changes ?? []}
            appliedChanges={tailor.appliedChanges}
            skippedChanges={tailor.skippedChanges}
            selectedAlternatives={tailor.selectedAlternatives}
            isApplying={tailor.isApplying}
            isLoading={tailor.isLoading}
            error={tailor.error}
            onAccept={tailor.acceptChange}
            onAcceptMany={tailor.acceptChanges}
            onSkip={tailor.skipChange}
            onUndo={tailor.undoChange}
            onAcceptAll={tailor.acceptAllRemaining}
            onSelectAlternative={tailor.selectAlternative}
            onEditValue={tailor.editChangeValue}
            matchAnalysis={matchAnalysis}
            onClarificationsChange={setUserClarifications}
            onEvidenceChange={handleEvidenceChange}
            onRefreshSuggestions={handleRefreshSuggestions}
            onSaveEvidence={handleSaveEvidence}
            evidenceCount={evidenceEntries.length}
            isSavingEvidence={savingEvidence}
            evidenceSaved={evidenceSaved}
            onSave={handleSaveTailored}
            isSaving={saving}
            savedSuccessfully={savedSuccessfully}
            onKeepEditing={handleKeepEditing}
            onViewInDashboard={handleViewInDashboard}
          />
        )}
      </div>
    </div>
  );
}
